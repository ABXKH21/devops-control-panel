const { pool } = require('../db')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${file.originalname}`
    cb(null, unique)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error('Only PDF and Word documents allowed'))
  }
})

const VALID_STATUSES = ['pending', 'ready_to_deploy', 'deployed', 'overdue', 'on_hold', 'rolled_back']

function calcStatus(scheduled_date, release_note_path, current_status) {
  if (['deployed', 'rolled_back', 'on_hold'].includes(current_status)) return current_status
  if (scheduled_date && release_note_path) return 'ready_to_deploy'
  if (scheduled_date && new Date(scheduled_date) < new Date()) return 'overdue'
  return 'pending'
}

async function getAll(req, res) {
  try {
    const result = await pool.query(
      `SELECT d.*, s.label as system_label, u.name as created_by_name, db.name as deployed_by_name
       FROM deployments d
       LEFT JOIN systems s ON d.system_id = s.id
       LEFT JOIN users u ON d.created_by = u.id
       LEFT JOIN users db ON d.deployed_by = db.id
       ORDER BY d.created_at DESC`
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}

async function getById(req, res) {
  try {
    const result = await pool.query(
      `SELECT d.*, s.label as system_label, u.name as created_by_name, db.name as deployed_by_name
       FROM deployments d
       LEFT JOIN systems s ON d.system_id = s.id
       LEFT JOIN users u ON d.created_by = u.id
       LEFT JOIN users db ON d.deployed_by = db.id
       WHERE d.id = $1`,
      [req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Deployment not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}

async function create(req, res) {
  const { cr_number, requestor, system_id, scheduled_date, notes } = req.body
  if (!cr_number || !requestor) {
    return res.status(400).json({ error: 'cr_number and requestor are required' })
  }
  try {
    const release_note_path = req.file ? req.file.filename : null
    const status = calcStatus(scheduled_date, release_note_path, null)
    const result = await pool.query(
      `INSERT INTO deployments (cr_number, requestor, system_id, scheduled_date, release_note_path, notes, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [cr_number, requestor, system_id || null, scheduled_date || null, release_note_path, notes, status, req.user.id]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'CR number already exists' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}

async function update(req, res) {
  const { id } = req.params
  const { cr_number, requestor, system_id, scheduled_date, notes, status } = req.body

  try {
    const existing = await pool.query('SELECT * FROM deployments WHERE id = $1', [id])
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Deployment not found' })

    const current = existing.rows[0]
    const new_note = req.file ? req.file.filename : current.release_note_path
    const new_scheduled = scheduled_date ?? current.scheduled_date

    let new_status = status
    if (!status || !VALID_STATUSES.includes(status)) {
      new_status = calcStatus(new_scheduled, new_note, current.status)
    }

    const deployed_by = ['deployed', 'rolled_back'].includes(new_status) ? req.user.id : current.deployed_by
    const deployed_at = ['deployed', 'rolled_back'].includes(new_status) && !current.deployed_at ? new Date() : current.deployed_at

    const result = await pool.query(
      `UPDATE deployments SET
        cr_number = COALESCE($1, cr_number),
        requestor = COALESCE($2, requestor),
        system_id = COALESCE($3, system_id),
        scheduled_date = COALESCE($4, scheduled_date),
        release_note_path = $5,
        notes = COALESCE($6, notes),
        status = $7,
        deployed_by = $8,
        deployed_at = $9
       WHERE id = $10
       RETURNING *`,
      [cr_number, requestor, system_id, scheduled_date, new_note, notes, new_status, deployed_by, deployed_at, id]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}

async function markDeployed(req, res) {
  const { id } = req.params
  try {
    const result = await pool.query(
      `UPDATE deployments SET status = 'deployed', deployed_by = $1, deployed_at = NOW()
       WHERE id = $2 RETURNING *`,
      [req.user.id, id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Deployment not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}

async function getSystems(req, res) {
  try {
    const result = await pool.query('SELECT * FROM systems WHERE active = true ORDER BY label')
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
}

module.exports = { getAll, getById, create, update, markDeployed, getSystems, upload }
