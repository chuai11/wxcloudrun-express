const router = require('express').Router()
const pool = require('../db')
const { ok, fail, wrap } = require('../utils/helpers')
const { mapUser, mapAddress } = require('../utils/mappers')
const { requireUser, isAdmin } = require('../middleware/auth')

const PROFILE_FIELDS = {
  nickName: 'nick_name',
  avatarUrl: 'avatar_url',
  phone: 'phone',
  gender: 'gender',
  birthday: 'birthday',
  signature: 'signature'
}

async function listAddresses(openid) {
  const [rows] = await pool.query(
    'SELECT * FROM addresses WHERE openid = ? ORDER BY is_default DESC, updated_at DESC',
    [openid]
  )
  return rows.map(mapAddress)
}

router.post(
  '/auth/login',
  requireUser,
  wrap(async (req, res) => {
    const profile = (req.body && req.body.profile) || {}
    const [rows] = await pool.query('SELECT * FROM users WHERE openid = ? LIMIT 1', [req.openid])
    let user = rows[0]

    if (!user) {
      const nickName = profile.nickName || `益农${req.openid.slice(-4)}`
      await pool.query('INSERT INTO users (openid, nick_name, avatar_url) VALUES (?, ?, ?)', [
        req.openid,
        nickName,
        profile.avatarUrl || ''
      ])
      const [created] = await pool.query('SELECT * FROM users WHERE openid = ? LIMIT 1', [req.openid])
      user = created[0]
    }

    const admin = await isAdmin(req.openid)
    return ok(res, mapUser(user, admin))
  })
)

router.get(
  '/user/profile',
  requireUser,
  wrap(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM users WHERE openid = ? LIMIT 1', [req.openid])
    if (!rows.length) return fail(res, '用户不存在，请先调用 /auth/login', 404)
    return ok(res, mapUser(rows[0], await isAdmin(req.openid)))
  })
)

router.put(
  '/user/profile',
  requireUser,
  wrap(async (req, res) => {
    const patch = req.body || {}
    const sets = []
    const values = []
    Object.keys(PROFILE_FIELDS).forEach((key) => {
      if (patch[key] !== undefined) {
        sets.push(`${PROFILE_FIELDS[key]} = ?`)
        values.push(patch[key])
      }
    })
    if (!sets.length) return fail(res, '没有可更新的字段')

    values.push(req.openid)
    await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE openid = ?`, values)
    const [rows] = await pool.query('SELECT * FROM users WHERE openid = ? LIMIT 1', [req.openid])
    if (!rows.length) return fail(res, '用户不存在', 404)
    return ok(res, mapUser(rows[0], await isAdmin(req.openid)))
  })
)

router.get(
  '/addresses',
  requireUser,
  wrap(async (req, res) => {
    return ok(res, await listAddresses(req.openid))
  })
)

router.post(
  '/addresses',
  requireUser,
  wrap(async (req, res) => {
    const body = req.body || {}
    if (!body.name || !body.phone) return fail(res, '收货人和手机号必填')

    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      const [countRows] = await connection.query(
        'SELECT COUNT(*) AS total FROM addresses WHERE openid = ?',
        [req.openid]
      )
      const isDefault = body.isDefault || Number(countRows[0].total) === 0 ? 1 : 0
      if (isDefault) {
        await connection.query('UPDATE addresses SET is_default = 0 WHERE openid = ?', [req.openid])
      }
      await connection.query(
        'INSERT INTO addresses (openid, name, phone, region, detail, is_default) VALUES (?, ?, ?, ?, ?, ?)',
        [req.openid, body.name, body.phone, body.region || '', body.detail || '', isDefault]
      )
      await connection.commit()
    } catch (err) {
      await connection.rollback()
      throw err
    } finally {
      connection.release()
    }

    return ok(res, await listAddresses(req.openid))
  })
)

router.put(
  '/addresses/:id',
  requireUser,
  wrap(async (req, res) => {
    const body = req.body || {}
    if (!body.name || !body.phone) return fail(res, '收货人和手机号必填')

    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      if (body.isDefault) {
        await connection.query('UPDATE addresses SET is_default = 0 WHERE openid = ?', [req.openid])
      }
      const [result] = await connection.query(
        'UPDATE addresses SET name = ?, phone = ?, region = ?, detail = ?, is_default = ? WHERE id = ? AND openid = ?',
        [
          body.name,
          body.phone,
          body.region || '',
          body.detail || '',
          body.isDefault ? 1 : 0,
          req.params.id,
          req.openid
        ]
      )
      if (!result.affectedRows) {
        await connection.rollback()
        return fail(res, '地址不存在', 404)
      }
      await connection.commit()
    } catch (err) {
      await connection.rollback()
      throw err
    } finally {
      connection.release()
    }

    return ok(res, await listAddresses(req.openid))
  })
)

router.delete(
  '/addresses/:id',
  requireUser,
  wrap(async (req, res) => {
    await pool.query('DELETE FROM addresses WHERE id = ? AND openid = ?', [
      req.params.id,
      req.openid
    ])
    const [rows] = await pool.query(
      'SELECT * FROM addresses WHERE openid = ? ORDER BY updated_at DESC',
      [req.openid]
    )
    if (rows.length && !rows.some((row) => row.is_default)) {
      await pool.query('UPDATE addresses SET is_default = 1 WHERE id = ?', [rows[0].id])
    }
    return ok(res, await listAddresses(req.openid))
  })
)

module.exports = router
