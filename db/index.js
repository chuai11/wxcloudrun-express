const mysql = require('mysql2/promise')
const config = require('../config')

const pool = mysql.createPool(config.mysql)

// 每条新连接都固定北京时间，保证 NOW() 与项目展示一致
pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+08:00'")
})

module.exports = pool
