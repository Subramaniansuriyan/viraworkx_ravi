import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Eye, Bot, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Clock, AlertTriangle, Filter
} from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { useAuthStore } from '../../stores/authStore'

const API_URL = ''

export default function AuditLog() {
  const { accessToken: token } = useAuthStore()
  const [selectedAgent, setSelectedAgent] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isLoading, error } = useQuery({
    queryKey: ['auditLog', page, selectedAgent, selectedStatus],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() })
      if (selectedAgent) params.append('agentType', selectedAgent)
      if (selectedStatus) params.append('status', selectedStatus)
      const res = await fetch(`${API_URL}/api/v1/ai/actions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch audit log')
      return res.json()
    },
  })

  const actions = data?.actions || []
  const totalPages = Math.ceil((data?.total || 0) / limit)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />
      case 'pending_approval': return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'processing': return <Clock className="w-4 h-4 text-blue-500" />
      default: return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      pending_approval: 'bg-yellow-100 text-yellow-700',
      processing: 'bg-blue-100 text-blue-700',
      pending: 'bg-gray-100 text-gray-700',
    }
    return styles[status] || 'bg-gray-100 text-gray-700'
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
            <p className="text-gray-600">Track all AI agent actions and decisions</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-500">Filter by:</span>
            </div>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">All Agents</option>
              <option value="screening">Screening</option>
              <option value="sourcing">Sourcing</option>
              <option value="scheduling">Scheduling</option>
              <option value="communication">Communication</option>
              <option value="analytics">Analytics</option>
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="processing">Processing</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading audit log...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">
              Failed to load audit log. Make sure the AI Engine is running.
            </div>
          ) : actions.length === 0 ? (
            <div className="p-8 text-center">
              <Eye className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No AI actions recorded yet</p>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Timestamp</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Agent</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Action</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Subject</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {actions.map((action: any) => (
                    <tr key={action.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(action.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4 text-purple-500" />
                          <span className="capitalize text-gray-700">
                            {action.agentType?.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {action.actionType?.replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-gray-900 font-medium">
                            {action.inputPayload?.candidate?.name || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {action.inputPayload?.job?.title || ''}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(action.status)}
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(action.status)}`}
                          >
                            {action.status?.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {action.matchScore && (
                          <span className="text-sm text-gray-600">
                            Match: <span className="font-medium">{action.matchScore}%</span>
                          </span>
                        )}
                        {action.approvedBy && (
                          <span className="text-sm text-green-600">Approved by admin</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-gray-500">
                    Showing {(page - 1) * limit + 1} to{' '}
                    {Math.min(page * limit, data?.total || 0)} of {data?.total || 0} actions
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
