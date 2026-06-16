require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const { migrate } = require('./db/migrate')

const app = express()
const PORT = process.env.PORT || 3000

app.use(helmet())
app.use(cors())
app.use(morgan('dev'))
app.use(express.json())
app.use('/uploads', express.static(require('path').join(__dirname, '../uploads')))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/auth', require('./routes/auth'))
app.use('/api/tasks', require('./routes/tasks'))
app.use('/api/deployments', require('./routes/deployments'))

async function start() {
  await migrate()
  app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`)
  })
}

start().catch(console.error)
