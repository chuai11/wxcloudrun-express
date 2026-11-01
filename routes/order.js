const router = require('express').Router()
const pool = require('../db')
const {
  ok,
  fail,
  wrap,
  params,
  toInt,
  makeOrderNo,
  statusCondition,
  parseJson,
  SALES_STATUS,
  BusinessError
} = require('../utils/helpers')
const { mapOrder, mapOrderItem, attachItems } = require('../utils/mappers')
const { requireUser } = require('../middleware/auth')
const { withTransaction } = require('../utils/tx')

function parseSpecName(item) {
  if (!item) return ''
  if (typeof item === 'string') return item
  return item.name || ''
}

router.post(
  '/orders',
  requireUser,
  wrap(async (req, res) => {
    const body = req.body || {}
    const items = Array.isArray(body.items) ? body.items : []
    const address = body.address
    const remark = String(body.remark || '').slice(0, 200)

    if (!items.length) return fail(res, '没有可结算商品')
    if (!address || !address.name || !address.phone) return fail(res, '请填写收货信息')

    const ids = [...new Set(items.map((item) => String(item.productId || item.id)))]
    const [products] = await pool.query('SELECT * FROM products WHERE id IN (?)', [ids])
    const productMap = {}
    products.forEach((product) => {
      productMap[product.id] = product
    })

    const orderItems = []
    let goodsAmount = 0

    for (const item of items) {
      const productId = String(item.productId || item.id)
      const product = productMap[productId]
      if (!product || product.status === 'off') {
        return fail(res, `商品已下架：${item.title || productId}`)
      }
      const qty = Math.max(1, toInt(item.qty, 1))
      if (Number(product.stock) < qty) {
        return fail(res, `${product.title} 库存不足，仅剩 ${product.stock} 件`)
      }

      const specs = parseJson(product.specs, [])
      const specName = parseSpecName(item.spec)
      const matched = specs.find((spec) => spec.name === specName)
      const price = matched ? Number(matched.price) : Number(product.price)
      const amount = Number((price * qty).toFixed(2))

      orderItems.push({
        productId,
        title: product.title,
        cover: product.cover,
        spec: matched ? matched.name : specName || '默认规格',
        price,
        qty,
        amount
      })
      goodsAmount += amount
    }

    goodsAmount = Number(goodsAmount.toFixed(2))
    const freight = 0
    const payAmount = Number((goodsAmount + freight).toFixed(2))
    const orderNo = makeOrderNo()

    await withTransaction(async (connection) => {
      await connection.query(
        `INSERT INTO orders
          (order_no, openid, status, goods_amount, freight, pay_amount, address_snapshot, remark, channel)
         VALUES (?, ?, 'pending_pay', ?, ?, ?, ?, ?, 'miniprogram')`,
        [
          orderNo,
          req.openid,
          goodsAmount,
          freight,
          payAmount,
          JSON.stringify(address),
          remark
        ]
      )
      await connection.query(
        `INSERT INTO order_items (order_no, openid, product_id, title, cover, spec, price, qty, amount) VALUES ?`,
        [
          orderItems.map((item) => [
            orderNo,
            req.openid,
            item.productId,
            item.title,
            item.cover,
            item.spec,
            item.price,
            item.qty,
            item.amount
          ])
        ]
      )
    })

    const [rows] = await pool.query('SELECT * FROM orders WHERE order_no = ? LIMIT 1', [orderNo])
    return ok(
      res,
      mapOrder(
        rows[0],
        orderItems.map((item) => ({
          id: item.productId,
          productId: item.productId,
          title: item.title,
          cover: item.cover,
          spec: item.spec,
          price: item.price,
          qty: item.qty,
          amount: item.amount
        }))
      )
    )
  })
)

router.post(
  '/orders/:id/pay',
  requireUser,
  wrap(async (req, res) => {
    const channel = (req.body && req.body.channel) || 'mock'
    if (channel !== 'mock') return fail(res, '真实微信支付尚未配置')

    const order = await withTransaction(async (connection) => {
      const [rows] = await connection.query(
        'SELECT * FROM orders WHERE order_no = ? AND openid = ? FOR UPDATE',
        [req.params.id, req.openid]
      )
      if (!rows.length) throw new BusinessError('订单不存在', 404)

      const current = rows[0]
      if (SALES_STATUS.includes(current.status)) return current
      if (current.status !== 'pending_pay') throw new BusinessError('当前订单状态不可支付')

      const [items] = await connection.query('SELECT * FROM order_items WHERE order_no = ?', [
        current.order_no
      ])
      for (const item of items) {
        const [updated] = await connection.query(
          'UPDATE products SET stock = stock - ?, sales = sales + ? WHERE id = ? AND stock >= ?',
          [item.qty, item.qty, item.product_id, item.qty]
        )
        if (!updated.affectedRows) throw new BusinessError(`${item.title} 库存不足`)
      }

      await connection.query(
        "UPDATE orders SET status = 'paid', pay_time = NOW(), pay_channel = ?, updated_at = NOW() WHERE order_no = ?",
        [channel, current.order_no]
      )
      await connection.query(
        `INSERT INTO payments (order_no, openid, transaction_id, amount, channel, type, result_code)
         VALUES (?, ?, ?, ?, ?, 'pay', 'SUCCESS')`,
        [current.order_no, current.openid, `MOCK_${current.order_no}`, current.pay_amount, channel]
      )

      const [updatedRows] = await connection.query('SELECT * FROM orders WHERE order_no = ?', [
        current.order_no
      ])
      return updatedRows[0]
    })

    const [items] = await pool.query('SELECT * FROM order_items WHERE order_no = ?', [
      order.order_no
    ])
    return ok(res, mapOrder(order, items.map(mapOrderItem)))
  })
)

router.get(
  '/orders',
  requireUser,
  wrap(async (req, res) => {
    const query = params(req)
    const page = Math.max(1, toInt(query.page, 1))
    const pageSize = Math.min(50, Math.max(1, toInt(query.pageSize, 20)))
    const offset = (page - 1) * pageSize
    const condition = statusCondition(query.status)

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM orders WHERE openid = ?${condition.sql}`,
      [req.openid, ...condition.params]
    )
    const [rows] = await pool.query(
      `SELECT * FROM orders WHERE openid = ?${condition.sql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [req.openid, ...condition.params, pageSize, offset]
    )

    return ok(res, {
      list: await attachItems(rows),
      total: Number(countRow.total),
      page,
      pageSize
    })
  })
)

router.get(
  '/orders/:id',
  requireUser,
  wrap(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM orders WHERE order_no = ? AND openid = ? LIMIT 1', [
      req.params.id,
      req.openid
    ])
    if (!rows.length) return fail(res, '订单不存在', 404)
    const [items] = await pool.query('SELECT * FROM order_items WHERE order_no = ?', [
      rows[0].order_no
    ])
    return ok(res, mapOrder(rows[0], items.map(mapOrderItem)))
  })
)

router.post(
  '/orders/:id/cancel',
  requireUser,
  wrap(async (req, res) => {
    const [result] = await pool.query(
      "UPDATE orders SET status = 'cancelled', cancel_time = NOW(), updated_at = NOW() WHERE order_no = ? AND openid = ? AND status = 'pending_pay'",
      [req.params.id, req.openid]
    )
    if (!result.affectedRows) return fail(res, '订单不存在或当前状态不可取消')

    const [rows] = await pool.query('SELECT * FROM orders WHERE order_no = ? LIMIT 1', [
      req.params.id
    ])
    const [items] = await pool.query('SELECT * FROM order_items WHERE order_no = ?', [
      req.params.id
    ])
    return ok(res, mapOrder(rows[0], items.map(mapOrderItem)))
  })
)

module.exports = router
