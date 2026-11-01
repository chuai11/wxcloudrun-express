const mysql = require('mysql2/promise')
const config = require('../config')
const pool = require('./index')
const SCHEMA = require('./schema')
const PRODUCTS = require('./seed-products')

async function ensureDatabase() {
  const { host, port, user, password, database } = config.mysql
  const connection = await mysql.createConnection({ host, port, user, password })
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${String(database).replace(/`/g, '')}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`
    )
  } finally {
    await connection.end()
  }
}

async function seedProducts(connection) {
  const [rows] = await connection.query('SELECT COUNT(*) AS total FROM products')
  if (Number(rows[0].total) > 0) return 0

  for (let i = 0; i < PRODUCTS.length; i += 1) {
    const product = PRODUCTS[i]
    await connection.query(
      `INSERT INTO products
        (id, title, subtitle, category, price, origin_price, stock, sales, cover, images, tags, specs, params, detail, status, sort)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'on', ?)
       ON DUPLICATE KEY UPDATE title = VALUES(title)`,
      [
        product.id,
        product.title,
        product.subtitle || '',
        product.category || '',
        product.price,
        product.originPrice || 0,
        product.stock || 0,
        product.sales || 0,
        product.cover || '',
        JSON.stringify(product.images || []),
        JSON.stringify(product.tags || []),
        JSON.stringify(product.specs || []),
        JSON.stringify(product.params || []),
        JSON.stringify(product.detailHtml || []),
        i * 10
      ]
    )
  }
  console.log(`[init] 已导入 ${PRODUCTS.length} 个商品`)
  return PRODUCTS.length
}

async function initDb() {
  try {
    await ensureDatabase()
  } catch (err) {
    console.warn('[init] 创建数据库失败（可能已存在或无权限）：', err.message)
  }

  for (let attempt = 1; attempt <= 10; attempt += 1) {
    let connection
    try {
      connection = await pool.getConnection()
      for (const sql of SCHEMA) {
        await connection.query(sql)
      }
      await seedProducts(connection)
      console.log('[init] 数据表初始化完成')
      return
    } catch (err) {
      if (attempt === 10) throw err
      console.error(`[init] 第 ${attempt} 次初始化失败，3 秒后重试：`, err.message)
      await new Promise((resolve) => setTimeout(resolve, 3000))
    } finally {
      if (connection) connection.release()
    }
  }
}

module.exports = { initDb }
