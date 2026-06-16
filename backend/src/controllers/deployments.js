const { pool } = require('../db')

function calcStatus(scheduled_date, release_note_path, current_status) {
  if (current_status === 'deployed') return 'deployed'
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
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deployment not found' })
    }
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
    const status = calcStatus(scheduled_date, null, null)
    const result = await pool.query(
      `INSERT INTO deployments (cr_number, requestor, system_id, scheduled_date, notes, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [cr_number, requestor, system_id, scheduled_date, notes, status, req.user.id]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'CR number already exists' })
    }
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}

async function update(req, res) {
  const { id } = req.params
  const { cr_number, requestor, system_id, scheduled_date, notes } = req.body

  try {
    const existing = await pool.query('SELECT * FROM deployments WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Deployment not found' })
    }

    const current = existing.rows[0]
    const new_scheduled = scheduled_date ?? current.scheduled_date
    const new_note = req.file ? req.file.path : current.release_note_path
    const status = calcStatus(new_scheduled, new_note, current.status)

    const result = await pool.query(
      `UPDATE deployments SET
        cr_number = COALESCE($1, cr_number),
        requestor = COALESCE($2, requestor),
        system_id = COALESCE($3, system_id),
        scheduled_date = COALESCE($4, scheduled_date),
        notes = COALESCE($5, notes),
        status = $6
       WHERE id = $7
       RETURNING *`,
      [cr_number, requestor, system_id, scheduled_date, notes, status, id]
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
      `UPDATE deployments SET
        status = 'deployed',
        deployed_by = $1,
        deployed_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [req.user.id, id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deployment not found' })
    }
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

module.exports = { getAll, getById, create, update, markDeployed, getSystems }
