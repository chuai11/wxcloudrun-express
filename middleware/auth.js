const config = require('../config')
const pool = require('../db')

function getOpenid(req) {
  const header = req.get('x-wx-openid') || req.get('X-WX-OPENID')
  if (header) return String(header)
  // 仅本地调试：云托管环境里保持 ALLOW_DEV_OPENID=false
  if (config.allowDevOpenid) {
    return String(req.get('x-openid') || req.query.openid || (req.body && req.body.openid) || '')
  }
  return ''
}

async function isAdmin(openid) {
  if (!openid) return false
  const [rows] = await pool.query('SELECT id FROM admins WHERE openid = ? LIMIT 1', [openid])
  return rows.length > 0
}

function requireUser(req, res, next) {
  const openid = getOpenid(req)
  if (!openid) {
    return res.status(401).json({
      code: 401,
      msg: '缺少微信身份，请通过小程序的 wx.cloud.callContainer 调用'
    })
  }
  req.openid = openid
  next()
}

async function requireAdmin(req, res, next) {
  try {
    if (!req.openid) return res.status(401).json({ code: 401, msg: '缺少微信身份' })
    if (!(await isAdmin(req.openid))) {
      return res.status(200).json({ code: 403, msg: '无管理员权限' })
    }
    next()
  } catch (err) {
    next(err)
  }
}

module.exports = { getOpenid, isAdmin, requireUser, requireAdmin }
