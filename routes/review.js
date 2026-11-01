const router = require('express').Router()
const pool = require('../db')
const { ok, fail, wrap, params, parseJson } = require('../utils/helpers')
const { requireUser } = require('../middleware/auth')

function mapReview(row) {
  return {
    id: String(row.id),
    user: row.user_name || '益农会员',
    avatar: row.avatar || '会',
    star: row.star,
    time: String(row.created_at || '').slice(0, 10),
    spec: row.spec || '',
    text: row.content || '',
    images: parseJson(row.images, [])
  }
}

router.post(
  '/reviews',
  requireUser,
  wrap(async (req, res) => {
    const body = req.body || {}
    if (!body.productId) return fail(res, '缺少商品 id')

    const [userRows] = await pool.query('SELECT nick_name FROM users WHERE openid = ? LIMIT 1', [
      req.openid
    ])
    const user = body.user || (userRows[0] && userRows[0].nick_name) || '益农会员'
    const star = Math.min(5, Math.max(1, Number(body.star) || 5))
    const text = String(body.text || '').trim()

    const [result] = await pool.query(
      `INSERT INTO reviews (openid, product_id, order_no, user_name, avatar, star, spec, content, images)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.openid,
        String(body.productId),
        body.orderNo || '',
        user,
        body.avatar || '会',
        star,
        body.spec || '',
        text,
        JSON.stringify(body.images || [])
      ]
    )

    return ok(res, {
      id: String(result.insertId),
      user,
      avatar: body.avatar || '会',
      star,
      spec: body.spec || '',
      text,
      images: body.images || []
    })
  })
)

router.get(
  '/reviews',
  wrap(async (req, res) => {
    const query = params(req)
    if (!query.productId) return fail(res, '缺少商品 id')
    const [rows] = await pool.query(
      'SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC LIMIT 50',
      [String(query.productId)]
    )
    return ok(res, rows.map(mapReview))
  })
)

module.exports = router
