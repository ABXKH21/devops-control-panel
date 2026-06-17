import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import client from '../api/client'

const statusColor = {
  pending: 'bg-gray-700 text-gray-300',
  ready_to_deploy: 'bg-blue-900 text-blue-300',
  deployed: 'bg-green-900 text-green-300',
  overdue: 'bg-red-900 text-red-300',
  on_hold: 'bg-amber-900 text-amber-300',
  rolled_back: 'bg-purple-900 text-purple-300',
}

function slaBadge(dep) {
  if (dep.status !== 'deployed' || !dep.scheduled_date || !dep.deployed_at) {
    return { text: '—', color: 'text-gray-500' }
  }
  const met = new Date(dep.deployed_at) <= new Date(dep.scheduled_date)
  return { text: met ? '✓ Met' : '✗ Breached', color: met ? 'text-green-400' : 'text-red-400' }
}

function isCurrentMonth(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
}

function groupByMonth(deployments) {
  const groups = {}
  deployments.forEach(dep => {
    const date = new Date(dep.created_at)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = date.toLocaleString('default', { month: 'long', year: 'numeric' })
    if (!groups[key]) groups[key] = { label, items: [] }
    groups[key].items.push(dep)
  })
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
}

export default function CRHistory() {
  const [deployments, setDeployments] = useState([])
  const [systems, setSystems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSystem, setFilterSystem] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [viewModal, setViewModal] = useState(null)

  useEffect(() => {
    Promise.all([
      client.get('/deployments'),
      client.get('/deployments/systems'),
    ]).then(([depRes, sysRes]) => {
      setDeployments(depRes.data)
      setSystems(sysRes.data)
    }).finally(() => setLoading(false))
  }, [])

  const history = deployments.filter(d => !isCurrentMonth(d.created_at))

  const filtered = history.filter(dep => {
    const matchSearch = !search ||
      dep.cr_number.toLowerCase().includes(search.toLowerCase()) ||
      dep.requestor.toLowerCase().includes(search.toLowerCase()) ||
      (dep.system_label || '').toLowerCase().includes(search.toLowerCase()) ||
      (dep.notes || '').toLowerCase().includes(search.toLowerCase())
    const matchSystem = !filterSystem || dep.system_id === parseInt(filterSystem)
    const matchStatus = !filterStatus || dep.status === filterStatus
    const matchFrom = !filterDateFrom || new Date(dep.created_at) >= new Date(filterDateFrom)
    const matchTo = !filterDateTo || new Date(dep.created_at) <= new Date(filterDateTo + 'T23:59:59')
    return matchSearch && matchSystem && matchStatus && matchFrom && matchTo
  })

  const grouped = groupByMonth(filtered)

  const stats = {
    total: filtered.length,
    deployed: filtered.filter(d => d.status === 'deployed').length,
    rolled_back: filtered.filter(d => d.status === 'rolled_back').length,
    sla_met: filtered.filter(d => d.status === 'deployed' && d.scheduled_date && d.deployed_at && new Date(d.deployed_at) <= new Date(d.scheduled_date)).length,
    sla_breached: filtered.filter(d => d.status === 'deployed' && d.scheduled_date && d.deployed_at && new Date(d.deployed_at) > new Date(d.scheduled_date)).length,
  }

  function clearFilters() {
    setSearch('')
    setFilterSystem('')
    setFilterStatus('')
    setFilterDateFrom('')
    setFilterDateTo('')
  }

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white">CR History</h2>
          <p className="text-gray-400 text-sm mt-1">All change requests from previous months</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Total CRs', value: stats.total, color: 'text-white' },
            { label: 'Deployed', value: stats.deployed, color: 'text-green-400' },
            { label: 'Rolled Back', value: stats.rolled_back, color: 'text-purple-400' },
            { label: 'SLA Met', value: stats.sla_met, color: 'text-green-400' },
            { label: 'SLA Breached', value: stats.sla_breached, color: 'text-red-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
              <p className={`text-2xl font-semibold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <input
              placeholder="Search CR, requestor, system..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="col-span-2 md:col-span-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500"
            />
            <select value={filterSystem} onChange={e => setFilterSystem(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
              <option value="">All systems</option>
              {systems.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
              <option value="">All statuses</option>
              {Object.keys(statusColor).map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              placeholder="From date" />
            <div className="flex gap-2">
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
              {(search || filterSystem || filterStatus || filterDateFrom || filterDateTo) && (
                <button onClick={clearFilters}
                  className="px-3 py-2 text-xs text-gray-400 hover:text-white bg-gray-800 border border-gray-700 rounded-lg transition-colors">
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-gray-400 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            {history.length === 0 ? 'No historical CRs yet — history builds up after the first month' : 'No results match your filters'}
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([key, group]) => (
              <div key={key}>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-white font-medium">{group.label}</h3>
                  <span className="text-xs text-gray-500">{group.items.length} CRs</span>
                  <div className="flex-1 h-px bg-gray-800" />
                  <span className="text-xs text-green-400">
                    {group.items.filter(d => d.status === 'deployed').length} deployed
                  </span>
                  {group.items.some(d => d.status === 'rolled_back') && (
                    <span className="text-xs text-purple-400">
                      {group.items.filter(d => d.status === 'rolled_back').length} rolled back
                    </span>
                  )}
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        {['CR Number', 'Requestor', 'System', 'Scheduled', 'Status', 'Deployed At', 'SLA'].map(h => (
                          <th key={h} className="text-left text-xs text-gray-400 font-medium px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map(dep => {
                        const sla = slaBadge(dep)
                        return (
                          <tr key={dep.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50">
                            <td className="px-4 py-3">
                              <button onClick={() => setViewModal(dep)}
                                className="text-sm font-mono text-blue-400 hover:text-blue-300 hover:underline">
                                {dep.cr_number}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-300">{dep.requestor}</td>
                            <td className="px-4 py-3 text-sm text-gray-300">{dep.system_label || '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-400">
                              {dep.scheduled_date ? new Date(dep.scheduled_date).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-1 rounded-full ${statusColor[dep.status]}`}>
                                {dep.status.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-400">
                              {dep.deployed_at ? new Date(dep.deployed_at).toLocaleString() : '—'}
                            </td>
                            <td className={`px-4 py-3 text-sm font-medium ${sla.color}`}>{sla.text}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View modal */}
      {viewModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-medium">CR Details</h3>
              <button onClick={() => setViewModal(null)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">CR Number</p>
                  <p className="text-white font-mono">{viewModal.cr_number}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${statusColor[viewModal.status]}`}>
                    {viewModal.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Requestor</p>
                  <p className="text-white">{viewModal.requestor}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">System</p>
                  <p className="text-white">{viewModal.system_label || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Scheduled date</p>
                  <p className="text-white">{viewModal.scheduled_date ? new Date(viewModal.scheduled_date).toLocaleString() : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Deployed at</p>
                  <p className="text-white">{viewModal.deployed_at ? new Date(viewModal.deployed_at).toLocaleString() : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">SLA</p>
                  <p className={`font-medium ${slaBadge(viewModal).color}`}>{slaBadge(viewModal).text}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Deployed by</p>
                  <p className="text-white">{viewModal.deployed_by_name || '—'}</p>
                </div>
              </div>
              {viewModal.notes && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Notes</p>
                  <p className="text-gray-300 text-sm">{viewModal.notes}</p>
                </div>
              )}
              {viewModal.release_note_path && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Release Note</p>
                  <a href={`/uploads/${viewModal.release_note_path}`} target="_blank" rel="noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm">📎 Download release note</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
