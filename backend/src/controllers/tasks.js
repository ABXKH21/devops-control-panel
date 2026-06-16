const { pool } = require('../db')

async function getAll(req, res) {
  try {
    const { role, id } = req.user
    let result

    if (role === 'engineer') {
      result = await pool.query(
        `SELECT t.*, u.name as assigned_to_name, tt.label as type_label
         FROM tasks t
         LEFT JOIN users u ON t.assigned_to = u.id
         LEFT JOIN task_types tt ON t.type_id = tt.id
         WHERE t.assigned_to = $1
         ORDER BY t.created_at DESC`,
        [id]
      )
    } else {
      result = await pool.query(
        `SELECT t.*, u.name as assigned_to_name, tt.label as type_label
         FROM tasks t
         LEFT JOIN users u ON t.assigned_to = u.id
         LEFT JOIN task_types tt ON t.type_id = tt.id
         ORDER BY t.created_at DESC`
      )
    }

    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}

async function getById(req, res) {
  try {
    const { role, id: userId } = req.user
    const { id } = req.params

    const result = await pool.query(
      `SELECT t.*, u.name as assigned_to_name, tt.label as type_label
       FROM tasks t
       LEFT JOIN users u ON t.assigned_to = u.id
       LEFT JOIN task_types tt ON t.type_id = tt.id
       WHERE t.id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' })
    }

    const task = result.rows[0]
    if (role === 'engineer' && task.assigned_to !== userId) {
      return res.status(403).json({ error: 'Access denied' })
    }

    res.json(task)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}

async function create(req, res) {
  const { type_id, requestor, priority, description, status = 'in_progress', assigned_to, start_time } = req.body

  if (!type_id || !requestor || !priority) {
    return res.status(400).json({ error: 'type_id, requestor and priority are required' })
  }

  try {
    const result = await pool.query(
      `INSERT INTO tasks (type_id, requestor, priority, description, status, assigned_to, start_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [type_id, requestor, priority, description, status, assigned_to || req.user.id, start_time || new Date()]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}

async function update(req, res) {
  const { id } = req.params
  const { type_id, requestor, priority, description, status, assigned_to, end_time } = req.body

  try {
    const existing = await pool.query('SELECT * FROM tasks WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' })
    }

    const task = existing.rows[0]
    if (req.user.role === 'engineer' && task.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' })
    }

    if (status === 'completed' && !end_time && !task.end_time) {
      return res.status(400).json({ error: 'end_time is required when completing a task' })
    }

    const result = await pool.query(
      `UPDATE tasks SET
        type_id = COALESCE($1, type_id),
        requestor = COALESCE($2, requestor),
        priority = COALESCE($3, priority),
        description = COALESCE($4, description),
        status = COALESCE($5, status),
        assigned_to = COALESCE($6, assigned_to),
        end_time = COALESCE($7, end_time)
       WHERE id = $8
       RETURNING *`,
      [type_id, requestor, priority, description, status, assigned_to, end_time, id]
    )

    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}

async function remove(req, res) {
  const { id } = req.params
  try {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' })
    }
    res.status(204).send()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}

async function getTypes(req, res) {
  try {
    const result = await pool.query('SELECT * FROM task_types WHERE active = true ORDER BY label')
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
}

module.exports = { getAll, getById, create, update, remove, getTypes }
