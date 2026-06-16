import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'

const statusColor = {
  pending: 'bg-gray-700 text-gray-300',
  ready_to_deploy: 'bg-blue-900 text-blue-300',
  deployed: 'bg-green-900 text-green-300',
  overdue: 'bg-red-900 text-red-300',
}

const slaColor = (deployment) => {
  if (deployment.status !== 'deployed') return ''
  const scheduled = new Date(deployment.scheduled_date)
  const deployed = new Date(deployment.deployed_at)
  return deployed <= scheduled
    ? 'text-green-400'
    : 'text-red-400'
}

const slaBadge = (deployment) => {
  if (deployment.status !== 'deployed' || !deployment.scheduled_date) return '—'
  const scheduled = new Date(deployment.scheduled_date)
  const deployed = new Date(deployment.deployed_at)
  return deployed <= scheduled ? '✓ Met' : '✗ Breached'
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
      const payload = { ...form }
      if (!payload.system_id) delete payload.system_id
      if (!payload.scheduled_date) delete payload.scheduled_date
      const res = await client.post('/deployments', payload)
      setDeployments([res.data, ...deployments])
      setShowForm(false)
      setForm({ cr_number: '', requestor: '', system_id: '', scheduled_date: '', notes: '' })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create CR')
    } finally {
      setSubmitting(false)
    }
  }

  async function markDeployed(id) {
    try {
      const res = await client.patch(`/deployments/${id}/deploy`)
      setDeployments(deployments.map(d => d.id === id ? res.data : d))
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to mark as deployed')
    }
  }

  const canDeploy = user?.role === 'admin' || user?.role === 'team_lead'

  return (
    <Layout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Deployment Manager</h2>
            <p className="text-gray-400 text-sm mt-1">{deployments.length} change requests</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
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
                  {['CR Number', 'Requestor', 'System', 'Scheduled', 'Status', 'SLA', ''].map(h => (
                    <th key={h} className="text-left text-xs text-gray-400 font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deployments.map(dep => (
                  <tr key={dep.id} className={`border-b border-gray-800 last:border-0 hover:bg-gray-800/50 ${dep.status === 'overdue' ? 'bg-red-950/20' : ''}`}>
                    <td className="px-4 py-3 text-sm font-mono text-white">{dep.cr_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{dep.requestor}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{dep.system_label || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {dep.scheduled_date ? new Date(dep.scheduled_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${statusColor[dep.status]}`}>
                        {dep.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm font-medium ${slaColor(dep)}`}>
                      {slaBadge(dep)}
                    </td>
                    <td className="px-4 py-3">
                      {canDeploy && dep.status === 'ready_to_deploy' && (
                        <button onClick={() => markDeployed(dep.id)}
                          className="text-xs text-green-400 hover:text-green-300 transition-colors">
                          Mark deployed
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
