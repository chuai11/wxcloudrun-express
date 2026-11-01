const express = require('express')
const config = require('./config')
const { initDb } = require('./db/init')
const routes = require('./routes')

const app = express()

app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-WX-SERVICE, X-WX-OPENID')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

app.get('/health', (req, res) => res.json({ code: 0, data: 'ok' }))

// 打开公网域名根路径即可确认新代码是否生效
app.get('/', (req, res) =>
  res.json({ code: 0, data: { service: 'qzyn-server', status: 'ok' } })
)

app.use(routes)

app.use((req, res) => res.status(404).json({ code: 404, msg: '接口不存在' }))

app.use((err, req, res, next) => {
  console.error('[error]', req.method, req.originalUrl, err)
  const code = err.code || 500
  res.status(code === 401 ? 401 : 200).json({ code, msg: err.message || '服务异常' })
})

async function start() {
  console.log(
    `[env] MYSQL_ADDRESS=${process.env.MYSQL_ADDRESS ? '已注入' : '缺失'}，数据库=${config.mysql.database}`
  )
  try {
    await initDb()
  } catch (err) {
    console.error('[start] 数据库初始化失败，请检查 MySQL 环境变量：', err)
    process.exit(1)
  }
  app.listen(config.port, () => {
    console.log(`[start] 秦珍益农服务已启动，端口 ${config.port}`)
  })
}

start()
