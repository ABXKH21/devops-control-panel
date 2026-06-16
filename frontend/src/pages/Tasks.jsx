import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import client from '../api/client'

const PRIORITIES = ['low', 'medium', 'high', 'critical']
const STATUSES = ['in_progress', 'completed', 'on_hold']

const priorityColor = {
  low: 'bg-gray-700 text-gray-300',
  medium: 'bg-blue-900 text-blue-300',
  high: 'bg-amber-900 text-amber-300',
  critical: 'bg-red-900 text-red-300',
}

const statusColor = {
  in_progress: 'bg-blue-900 text-blue-300',
  completed: 'bg-green-900 text-green-300',
  on_hold: 'bg-gray-700 text-gray-300',
}

function timeToClose(start, end) {
  if (!end) return '—'
  const diff = new Date(end) - new Date(start)
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return rem ? `${hrs}h ${rem}m` : `${hrs}h`
}

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [types, setTypes] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    type_id: '', requestor: '', priority: 'medium',
    description: '', status: 'in_progress', assigned_to: '', end_time: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      client.get('/tasks'),
      client.get('/tasks/types'),
    ]).then(([tasksRes, typesRes]) => {
      setTasks(tasksRes.data)
      setTypes(typesRes.data)
    }).finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const payload = { ...form }
      if (!payload.end_time) delete payload.end_time
      if (!payload.assigned_to) delete payload.assigned_to
      const res = await client.post('/tasks', payload)
      setTasks([res.data, ...tasks])
      setShowForm(false)
      setForm({ type_id: '', requestor: '', priority: 'medium', description: '', status: 'in_progress', assigned_to: '', end_time: '' })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create task')
    } finally {
      setSubmitting(false)
    }
  }

  async function markComplete(task) {
    const end_time = new Date().toISOString()
    try {
      const res = await client.put(`/tasks/${task.id}`, { status: 'completed', end_time })
      setTasks(tasks.map(t => t.id === task.id ? res.data : t))
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update task')
    }
  }

  return (
    <Layout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Task Log</h2>
            <p className="text-gray-400 text-sm mt-1">{tasks.length} tasks</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            + New Task
          </button>
        </div>

        {showForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
            <h3 className="text-white font-medium mb-4">Log a task</h3>
            {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Task type</label>
                <select value={form.type_id} onChange={e => setForm({...form, type_id: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" required>
                  <option value="">Select type</option>
                  {types.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Requestor</label>
                <input value={form.requestor} onChange={e => setForm({...form, requestor: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" required />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Priority</label>
                <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" rows={2} />
              </div>
              {form.status === 'completed' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">End time</label>
                  <input type="datetime-local" value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" required />
                </div>
              )}
              <div className="col-span-2 flex gap-3 justify-end">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                  {submitting ? 'Saving...' : 'Save task'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-gray-400 text-sm">Loading...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16 text-gray-500">No tasks yet — log your first task</div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Type', 'Requestor', 'Priority', 'Status', 'Time to close', 'Started', ''].map(h => (
                    <th key={h} className="text-left text-xs text-gray-400 font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-sm text-white">{task.type_label || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{task.requestor}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${priorityColor[task.priority]}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${statusColor[task.status]}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">{timeToClose(task.start_time, task.end_time)}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {new Date(task.start_time).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {task.status !== 'completed' && (
                        <button onClick={() => markComplete(task)}
                          className="text-xs text-green-400 hover:text-green-300 transition-colors">
                          Mark done
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
