class BusinessError extends Error {
  constructor(message, code = 400) {
    super(message)
    this.code = code
  }
}

const ok = (res, data = null) => res.json({ code: 0, data })
const fail = (res, message, code = 400) => res.json({ code, msg: message })

// 统一兜住 async 路由异常，交给全局错误处理
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

// GET 参数在 query，POST 参数在 body，这里统一合并
const params = (req) => ({ ...(req.query || {}), ...(req.body || {}) })

function toInt(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? Math.trunc(num) : fallback
}

function parseJson(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch (err) {
    return fallback
  }
}

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`
}

// 返回北京时间字符串 YYYY-MM-DD HH:mm:ss
function beijingNow(date = new Date()) {
  const bj = new Date(date.getTime() + 8 * 3600 * 1000)
  return `${bj.getUTCFullYear()}-${pad(bj.getUTCMonth() + 1)}-${pad(bj.getUTCDate())} ${pad(
    bj.getUTCHours()
  )}:${pad(bj.getUTCMinutes())}:${pad(bj.getUTCSeconds())}`
}

function makeOrderNo() {
  const bj = new Date(Date.now() + 8 * 3600 * 1000)
  const stamp = `${bj.getUTCFullYear()}${pad(bj.getUTCMonth() + 1)}${pad(bj.getUTCDate())}${pad(
    bj.getUTCHours()
  )}${pad(bj.getUTCMinutes())}${pad(bj.getUTCSeconds())}`
  return `O${stamp}${Math.floor(100 + Math.random() * 900)}`
}

// 统计周期起点（北京时间 00:00:00），返回字符串直接和 DATETIME 比较
function periodStart(period) {
  if (!period || period === 'all') return null
  const bj = new Date(Date.now() + 8 * 3600 * 1000)
  const year = bj.getUTCFullYear()
  const month = bj.getUTCMonth()
  const day = bj.getUTCDate()

  let utcMidnight = Date.UTC(year, month, day)
  if (period === 'week') utcMidnight -= 6 * 24 * 3600 * 1000
  else if (period === 'month') utcMidnight = Date.UTC(year, month, 1)
  else if (period === 'year') utcMidnight = Date.UTC(year, 0, 1)

  const start = new Date(utcMidnight)
  return `${start.getUTCFullYear()}-${pad(start.getUTCMonth() + 1)}-${pad(start.getUTCDate())} 00:00:00`
}

const STATUS_TEXT = {
  pending_pay: '待付款',
  paid: '已付款',
  shipped: '已发货',
  finished: '已完成',
  cancelled: '已取消',
  refunding: '退款中',
  refunded: '已退款'
}

const LEGACY_STATUS_MAP = {
  unpaid: 'pending_pay',
  unreceived: 'paid',
  unreviewed: 'finished',
  aftersale: 'refunding'
}

const SALES_STATUS = ['paid', 'shipped', 'finished']

// 待收货要同时包含已付款和已发货
function statusCondition(status) {
  if (!status || status === 'all') return { sql: '', params: [] }
  if (status === 'unreceived') return { sql: ' AND status IN (?, ?)', params: ['paid', 'shipped'] }
  const normalized = LEGACY_STATUS_MAP[status] || status
  return { sql: ' AND status = ?', params: [normalized] }
}

module.exports = {
  BusinessError,
  ok,
  fail,
  wrap,
  params,
  toInt,
  parseJson,
  beijingNow,
  makeOrderNo,
  periodStart,
  STATUS_TEXT,
  LEGACY_STATUS_MAP,
  SALES_STATUS,
  statusCondition
}
