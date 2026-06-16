import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'

const statusColor = {
  pending: 'bg-gray-700 text-gray-300',
  ready_to_deploy: 'bg-blue-900 text-blue-300',
  deployed: 'bg-green-900 text-green-300',
  overdue: 'bg-red-900 text-red-300',
  on_hold: 'bg-amber-900 text-amber-300',
  rolled_back: 'bg-purple-900 text-purple-300',
}

const CHANGEABLE_STATUSES = ['on_hold', 'deployed', 'rolled_back']

function slaBadge(dep) {
  if (dep.status !== 'deployed' || !dep.scheduled_date) return { text: '—', color: 'text-gray-500' }
  const met = new Date(dep.deployed_at) <= new Date(dep.scheduled_date)
  return { text: met ? '✓ Met' : '✗ Breached', color: met ? 'text-green-400' : 'text-red-400' }
}

export default function Deployments() {
  const { user } = useAuth()
  const [deployments, setDeployments] = useState([])
  const [systems, setSystems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    cr_number: '', requestor: '', system_id: '',
    scheduled_date: '', notes: ''
  })
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      client.get('/deployments'),
      client.get('/deployments/systems'),
    ]).then(([depRes, sysRes]) => {
      setDeployments(depRes.data)
      setSystems(sysRes.data)
    }).finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const data = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v) data.append(k, v) })
      if (file) data.append('release_note', file)
      const res = await client.post('/deployments', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setDeployments([res.data, ...deployments])
      setShowForm(false)
      setForm({ cr_number: '', requestor: '', system_id: '', scheduled_date: '', notes: '' })
      setFile(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create CR')
    } finally {
      setSubmitting(false)
    }
  }

  async function changeStatus(dep, status) {
    try {
      const res = await client.put(`/deployments/${dep.id}`, { status })
      setDeployments(deployments.map(d => d.id === dep.id ? res.data : d))
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status')
    }
  }

  const canChangeStatus = user?.role === 'admin' || user?.role === 'team_lead'

  return (
    <Layout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Deployment Manager</h2>
            <p className="text-gray-400 text-sm mt-1">{deployments.length} change requests</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
            + New CR
          </button>
        </div>

        {showForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
            <h3 className="text-white font-medium mb-4">New Change Request</h3>
            {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">CR Number</label>
                <input value={form.cr_number} onChange={e => setForm({...form, cr_number: e.target.value})}
                  placeholder="CR-00001"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" required />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Requestor</label>
                <input value={form.requestor} onChange={e => setForm({...form, requestor: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" required />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">System</label>
                <select value={form.system_id} onChange={e => setForm({...form, system_id: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                  <option value="">Select system</option>
                  {systems.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Scheduled date</label>
                <input type="datetime-local" value={form.scheduled_date}
                  onChange={e => setForm({...form, scheduled_date: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Release note (PDF or Word)</label>
                <input type="file" accept=".pdf,.doc,.docx"
                  onChange={e => setFile(e.target.files[0])}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" rows={2} />
              </div>
              <div className="col-span-2 flex gap-3 justify-end">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                  {submitting ? 'Saving...' : 'Save CR'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-gray-400 text-sm">Loading...</div>
        ) : deployments.length === 0 ? (
          <div className="text-center py-16 text-gray-500">No change requests yet</div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  {['CR Number', 'Requestor', 'System', 'Scheduled', 'Release Note', 'Status', 'SLA', ''].map(h => (
                    <th key={h} className="text-left text-xs text-gray-400 font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deployments.map(dep => {
                  const sla = slaBadge(dep)
                  return (
                    <tr key={dep.id} className={`border-b border-gray-800 last:border-0 hover:bg-gray-800/50 ${dep.status === 'overdue' ? 'bg-red-950/20' : ''}`}>
                      <td className="px-4 py-3 text-sm font-mono text-white">{dep.cr_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{dep.requestor}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{dep.system_label || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {dep.scheduled_date ? new Date(dep.scheduled_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {dep.release_note_path
                          ? <a href={`/uploads/${dep.release_note_path}`} target="_blank" rel="noreferrer"
                              className="text-blue-400 hover:text-blue-300">📎 View</a>
                          : <span className="text-gray-600">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        {canChangeStatus ? (
                          <select
                            value={dep.status}
                            onChange={e => changeStatus(dep, e.target.value)}
                            className={`text-xs px-2 py-1 rounded-full border-0 cursor-pointer ${statusColor[dep.status]} bg-transparent`}
                          >
                            <option value={dep.status}>{dep.status.replace(/_/g, ' ')}</option>
                            {CHANGEABLE_STATUSES.filter(s => s !== dep.status).map(s => (
                              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`text-xs px-2 py-1 rounded-full ${statusColor[dep.status]}`}>
                            {dep.status.replace(/_/g, ' ')}
                          </span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-sm font-medium ${sla.color}`}>{sla.text}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {dep.deployed_by_name && <span>by {dep.deployed_by_name}</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
