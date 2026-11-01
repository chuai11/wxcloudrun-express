const pool = require('../db')
const { parseJson, STATUS_TEXT } = require('./helpers')

function mapUser(row, isAdmin) {
  return {
    _id: String(row.id),
    openid: row.openid,
    nickName: row.nick_name,
    avatarUrl: row.avatar_url,
    phone: row.phone,
    gender: row.gender,
    birthday: row.birthday,
    signature: row.signature,
    role: isAdmin ? 'admin' : row.role,
    loggedIn: true,
    isAdmin: !!isAdmin
  }
}

function mapProduct(row) {
  return {
    _id: row.id,
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    category: row.category,
    price: Number(row.price),
    originPrice: Number(row.origin_price),
    sales: row.sales,
    stock: row.stock,
    cover: row.cover,
    images: parseJson(row.images, []),
    tags: parseJson(row.tags, []),
    specs: parseJson(row.specs, []),
    params: parseJson(row.params, []),
    detailHtml: parseJson(row.detail, []),
    status: row.status
  }
}

function mapAddress(row) {
  return {
    id: String(row.id),
    name: row.name,
    phone: row.phone,
    region: row.region,
    detail: row.detail,
    isDefault: !!row.is_default
  }
}

function mapOrderItem(row) {
  return {
    id: row.product_id,
    productId: row.product_id,
    title: row.title,
    cover: row.cover,
    spec: row.spec,
    price: Number(row.price),
    qty: row.qty,
    amount: Number(row.amount)
  }
}

function mapOrder(row, items = []) {
  return {
    _id: String(row.id),
    id: row.order_no,
    orderNo: row.order_no,
    status: row.status,
    statusCode: row.status,
    statusText: STATUS_TEXT[row.status] || row.status,
    items,
    address: parseJson(row.address_snapshot, null),
    remark: row.remark || '',
    goodsAmount: Number(row.goods_amount),
    freight: Number(row.freight),
    payAmount: Number(row.pay_amount),
    refundAmount: Number(row.refund_amount),
    channel: row.channel,
    payChannel: row.pay_channel,
    payTime: row.pay_time,
    shipTime: row.ship_time,
    finishTime: row.finish_time,
    refundTime: row.refund_time,
    refundReason: row.refund_reason,
    createdAt: row.created_at,
    shipping:
      row.shipping_company || row.shipping_no
        ? { company: row.shipping_company || '', trackingNo: row.shipping_no || '' }
        : null
  }
}

async function attachItems(rows) {
  if (!rows || !rows.length) return []
  const numbers = rows.map((row) => row.order_no)
  const [items] = await pool.query(
    'SELECT * FROM order_items WHERE order_no IN (?) ORDER BY id ASC',
    [numbers]
  )
  const grouped = {}
  items.forEach((row) => {
    if (!grouped[row.order_no]) grouped[row.order_no] = []
    grouped[row.order_no].push(mapOrderItem(row))
  })
  return rows.map((row) => mapOrder(row, grouped[row.order_no] || []))
}

module.exports = { mapUser, mapProduct, mapAddress, mapOrderItem, mapOrder, attachItems }
