const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'dcp_db',
  user: process.env.DB_USER || 'dcp_user',
  password: process.env.DB_PASSWORD || 'password',
})

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
  process.exit(-1)
})

module.exports = { pool }
