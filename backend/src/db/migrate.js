const fs = require('fs')
const path = require('path')
const { pool } = require('./index')

async function migrate() {
  let retries = 5
  while (retries > 0) {
    try {
      const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
      await pool.query(sql)
      console.log('Database schema applied')
      return
    } catch (err) {
      retries--
      if (retries === 0) throw err
      console.log(`DB not ready, retrying in 3s... (${retries} attempts left)`)
      await new Promise(r => setTimeout(r, 3000))
    }
  }
}

module.exports = { migrate }
