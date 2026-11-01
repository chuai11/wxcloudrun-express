const router = require('express').Router()
const pool = require('../db')
const {
  ok,
  fail,
  wrap,
  params,
  toInt,
  periodStart,
  statusCondition,
  SALES_STATUS,
  BusinessError
} = require('../utils/helpers')
const { mapOrder, mapOrderItem, attachItems } = require('../utils/mappers')
const { requireUser, requireAdmin, isAdmin } = require('../middleware/auth')
const { withTransaction } = require('../utils/tx')

// ---------- 管理员身份 ----------

router.get(
  '/whoami',
  requireUser,
  wrap(async (req, res) => {
    const [[countRow]] = await pool.query('SELECT COUNT(*) AS total FROM admins')
    return ok(res, {
      openid: req.openid,
      isAdmin: await isAdmin(req.openid),
      adminCount: Number(countRow.total)
    })
  })
)

// 仅当还没有任何管理员时可用，用于第一次把当前微信号设成管理员
router.post(
  '/bootstrap',
  requireUser,
  wrap(async (req, res) => {
    const [[countRow]] = await pool.query('SELECT COUNT(*) AS total FROM admins')
    if (Number(countRow.total) > 0) {
      return fail(res, '管理员已存在，请联系现有管理员添加', 403)
    }
    await pool.query('INSERT INTO admins (openid, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE openid = openid', [
      req.openid,
      '超级管理员'
    ])
    return ok(res, { added: true, isAdmin: true })
  })
)

// ---------- 订单 ----------

function buildOrderWhere(query) {
  const conditions = ['1 = 1']
  const values = []

  const condition = statusCondition(query.status)
  if (condition.sql) {
    conditions.push(condition.sql.replace(/^ AND /, ''))
    values.push(...condition.params)
  }

  const keyword = String(query.keyword || '').trim()
  if (keyword) {
    const like = `%${keyword}%`
    conditions.push(
      `(order_no LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(address_snapshot, '$.name')) LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(address_snapshot, '$.phone')) LIKE ? OR EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_no = orders.order_no AND oi.title LIKE ?))`
    )
    values.push(like, like, like, like)
  }

  if (query.startDate) {
    conditions.push('created_at >= ?')
    values.push(`${query.startDate} 00:00:00`)
  }
  if (query.endDate) {
    conditions.push('created_at <= ?')
    values.push(`${query.endDate} 23:59:59`)
  }

  return { where: `WHERE ${conditions.join(' AND ')}`, values }
}

async function queryOrders(query, pageSizeLimit = 100) {
  const page = Math.max(1, toInt(query.page, 1))
  const pageSize = Math.min(pageSizeLimit, Math.max(1, toInt(query.pageSize, 20)))
  const offset = (page - 1) * pageSize
  const { where, values } = buildOrderWhere(query)

  const [[countRow]] = await pool.query(`SELECT COUNT(*) AS total FROM orders ${where}`, values)
  const [rows] = await pool.query(
    `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    values.concat([pageSize, offset])
  )

  return {
    list: await attachItems(rows),
    total: Number(countRow.total),
    page,
    pageSize
  }
}

router.get(
  '/orders',
  requireAdmin,
  wrap(async (req, res) => {
    return ok(res, await queryOrders(params(req), 100))
  })
)

router.get(
  '/orders/export',
  requireAdmin,
  wrap(async (req, res) => {
    const query = params(req)
    const result = await queryOrders({ ...query, page: 1, pageSize: 1000 }, 1000)
    return ok(
      res,
      result.list.map((order) => ({
        orderNo: order.orderNo,
        status: order.statusText,
        createdAt: order.createdAt,
        payTime: order.payTime || '',
        buyer: (order.address && order.address.name) || '',
        phone: (order.address && order.address.phone) || '',
        items: (order.items || []).map((item) => `${item.title}×${item.qty}`).join('；'),
        payAmount: order.payAmount,
        refundAmount: order.refundAmount || 0
      }))
    )
  })
)

router.get(
  '/orders/:id',
  requireAdmin,
  wrap(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM orders WHERE order_no = ? LIMIT 1', [
      req.params.id
    ])
    if (!rows.length) return fail(res, '订单不存在', 404)
    const [items] = await pool.query('SELECT * FROM order_items WHERE order_no = ?', [
      rows[0].order_no
    ])
    return ok(res, mapOrder(rows[0], items.map(mapOrderItem)))
  })
)

router.post(
  '/orders/ship',
  requireAdmin,
  wrap(async (req, res) => {
    const body = req.body || {}
    const id = body.id || body.orderNo
    if (!id) return fail(res, '缺少订单号')

    await withTransaction(async (connection) => {
      const [rows] = await connection.query('SELECT * FROM orders WHERE order_no = ? FOR UPDATE', [
        id
      ])
      if (!rows.length) throw new BusinessError('订单不存在', 404)
      if (rows[0].status !== 'paid') throw new BusinessError('只有已付款订单可以发货')

      await connection.query(
        "UPDATE orders SET status = 'shipped', ship_time = NOW(), shipping_company = ?, shipping_no = ?, updated_at = NOW() WHERE order_no = ?",
        [body.company || '', body.trackingNo || '', id]
      )
    })

    const [rows] = await pool.query('SELECT * FROM orders WHERE order_no = ? LIMIT 1', [id])
    const [items] = await pool.query('SELECT * FROM order_items WHERE order_no = ?', [id])
    return ok(res, mapOrder(rows[0], items.map(mapOrderItem)))
  })
)

router.post(
  '/orders/refund',
  requireAdmin,
  wrap(async (req, res) => {
    const body = req.body || {}
    const id = body.id || body.orderNo
    if (!id) return fail(res, '缺少订单号')

    const order = await withTransaction(async (connection) => {
      const [rows] = await connection.query('SELECT * FROM orders WHERE order_no = ? FOR UPDATE', [
        id
      ])
      if (!rows.length) throw new BusinessError('订单不存在', 404)

      const current = rows[0]
      if (!SALES_STATUS.includes(current.status)) {
        throw new BusinessError('当前订单状态不可退款')
      }
      const amount = Number(body.amount || current.pay_amount || 0)
      if (amount <= 0 || amount > Number(current.pay_amount)) {
        throw new BusinessError('退款金额不合法')
      }

      await connection.query(
        "UPDATE orders SET status = 'refunded', refund_amount = ?, refund_reason = ?, refund_time = NOW(), updated_at = NOW() WHERE order_no = ?",
        [amount, body.reason || '', id]
      )
      await connection.query(
        `INSERT INTO payments (order_no, openid, transaction_id, amount, channel, type, result_code)
         VALUES (?, ?, ?, ?, ?, 'refund', 'SUCCESS')`,
        [
          current.order_no,
          current.openid,
          `REFUND_${current.order_no}_${Date.now()}`,
          -amount,
          current.pay_channel || 'mock'
        ]
      )

      const [items] = await connection.query('SELECT * FROM order_items WHERE order_no = ?', [id])
      for (const item of items) {
        await connection.query(
          'UPDATE products SET stock = stock + ?, sales = GREATEST(sales - ?, 0) WHERE id = ?',
          [item.qty, item.qty, item.product_id]
        )
      }
      return { ...current, status: 'refunded', refund_amount: amount }
    })

    const [items] = await pool.query('SELECT * FROM order_items WHERE order_no = ?', [id])
    return ok(res, mapOrder(order, items.map(mapOrderItem)))
  })
)

// ---------- 销售看板 ----------

router.get(
  '/dashboard',
  requireAdmin,
  wrap(async (req, res) => {
    const query = params(req)
    const period = query.period || 'today'
    const start = periodStart(period)

    let condition = "status IN ('paid', 'shipped', 'finished')"
    const values = []
    if (start) {
      condition += ' AND pay_time >= ?'
      values.push(start)
    }

    const [[summary]] = await pool.query(
      `SELECT COALESCE(SUM(pay_amount), 0) AS salesAmount,
              COALESCE(SUM(refund_amount), 0) AS refundAmount,
              COUNT(*) AS orderCount
       FROM orders WHERE ${condition}`,
      values
    )

    const [trend] = await pool.query(
      `SELECT DATE_FORMAT(pay_time, '%Y-%m-%d') AS d,
              SUM(pay_amount) AS amount,
              COUNT(*) AS cnt
       FROM orders WHERE ${condition}
       GROUP BY d ORDER BY d ASC`,
      values
    )

    const [ranking] = await pool.query(
      `SELECT oi.product_id AS productId, MAX(oi.title) AS title,
              SUM(oi.qty) AS qty, SUM(oi.amount) AS amount
       FROM order_items oi
       JOIN orders o ON o.order_no = oi.order_no
       WHERE o.status IN ('paid', 'shipped', 'finished')${start ? ' AND o.pay_time >= ?' : ''}
       GROUP BY oi.product_id
       ORDER BY amount DESC
       LIMIT 10`,
      start ? [start] : []
    )

    const salesAmount = Number(summary.salesAmount || 0)
    const orderCount = Number(summary.orderCount || 0)

    return ok(res, {
      period,
      salesAmount,
      refundAmount: Number(summary.refundAmount || 0),
      orderCount,
      avgPrice: orderCount ? Number((salesAmount / orderCount).toFixed(2)) : 0,
      trend: trend.map((item) => ({
        date: item.d,
        amount: Number(item.amount),
        count: Number(item.cnt)
      })),
      ranking: ranking.map((item) => ({
        productId: item.productId,
        title: item.title,
        qty: Number(item.qty),
        amount: Number(item.amount)
      }))
    })
  })
)

module.exports = router
