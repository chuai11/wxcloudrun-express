const pool = require('../db')

async function withTransaction(fn) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const result = await fn(connection)
    await connection.commit()
    return result
  } catch (err) {
    try {
      await connection.rollback()
    } catch (rollbackError) {
      console.error('[tx] 回滚失败：', rollbackError.message)
    }
    throw err
  } finally {
    connection.release()
  }
}

module.exports = { withTransaction }
