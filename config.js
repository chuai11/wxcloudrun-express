const address = process.env.MYSQL_ADDRESS || ''
const [host, port] = address.split(':')

module.exports = {
  port: Number(process.env.PORT || 80),
  mysql: {
    host: host || '127.0.0.1',
    port: Number(port || 3306),
    user: process.env.MYSQL_USERNAME || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    // 云托管 MySQL 默认库名 nodejs_demo，可在环境变量里改成自己的库
    database: process.env.MYSQL_DATABASE || 'nodejs_demo',
    charset: 'utf8mb4',
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    // 统一按北京时间读写 DATETIME，并以字符串返回，避免时区二次转换
    timezone: '+08:00',
    dateStrings: true
  },
  // 本地调试时可传 ?openid=xxx 伪造身份，线上必须保持 false
  allowDevOpenid: process.env.ALLOW_DEV_OPENID === 'true'
}
