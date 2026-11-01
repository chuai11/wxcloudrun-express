const router = require('express').Router()
const pool = require('../db')
const { ok, fail, wrap, params, toInt } = require('../utils/helpers')
const { mapProduct } = require('../utils/mappers')

router.get(
  '/products',
  wrap(async (req, res) => {
    const query = params(req)
    const page = Math.max(1, toInt(query.page, 1))
    const pageSize = Math.min(50, Math.max(1, toInt(query.pageSize, 20)))
    const offset = (page - 1) * pageSize

    const conditions = ["status = 'on'"]
    const values = []

    if (query.category && query.category !== 'all') {
      conditions.push('category = ?')
      values.push(query.category)
    }
    const keyword = String(query.keyword || '').trim()
    if (keyword) {
      conditions.push('(title LIKE ? OR subtitle LIKE ? OR category LIKE ? OR CAST(tags AS CHAR) LIKE ?)')
      const like = `%${keyword}%`
      values.push(like, like, like, like)
    }

    const where = `WHERE ${conditions.join(' AND ')}`
    const [[countRow]] = await pool.query(`SELECT COUNT(*) AS total FROM products ${where}`, values)
    const [rows] = await pool.query(
      `SELECT * FROM products ${where} ORDER BY sort ASC, created_at DESC LIMIT ? OFFSET ?`,
      values.concat([pageSize, offset])
    )

    return ok(res, { list: rows.map(mapProduct), total: Number(countRow.total), page, pageSize })
  })
)

router.get(
  '/products/:id',
  wrap(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ? LIMIT 1', [req.params.id])
    if (!rows.length) return fail(res, '商品不存在', 404)
    return ok(res, mapProduct(rows[0]))
  })
)

module.exports = router
