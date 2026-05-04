import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import {
  Bot,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Filter,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Zap,
  ChevronDown,
  LogOut,
  Activity,
  Users,
  Briefcase,
  TrendingUp,
  X
} from 'lucide-react'
import NotificationBell from '../../components/shared/NotificationBell'

const API_URL = ''

function makeAiApi(token: string) {
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  return {
    getActions: async (params: any) => {
      const queryParams = new URLSearchParams()
      if (params.status) queryParams.append('status', params.status)
      if (params.agent_type) queryParams.append('agentType', params.agent_type)
      if (params.requires_approval !== undefined) queryParams.append('requiresApproval', params.requires_approval)
      const response = await fetch(`${API_URL}/api/v1/ai/actions?${queryParams}`, { headers })
      return response.json()
    },

    getPendingApprovals: async () => {
      const response = await fetch(`${API_URL}/api/v1/ai/actions/pending-approval`, { headers })
      return response.json()
    },

    getStats: async () => {
      const response = await fetch(`${API_URL}/api/v1/ai/actions/stats`, { headers })
      return response.json()
    },

    getActionDetail: async (id: string) => {
      const response = await fetch(`${API_URL}/api/v1/ai/actions/${id}`, { headers })
      return response.json()
    },

    approveAction: async (id: string, data: { approved: boolean; reviewer_id: string; reviewer_notes?: string }) => {
      const response = await fetch(`${API_URL}/api/v1/ai/actions/${id}/approve`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      })
      return response.json()
    }
  }
}

export default function AIMonitor() {
  const { user, logout, accessToken: token } = useAuthStore()
  const queryClient = useQueryClient()
  const aiApi = makeAiApi(token || '')
  const [selectedAction, setSelectedAction] = useState<any>(null)
  const [filter, setFilter] = useState({
    status: '',
    agent_type: ''
  })
  const [reviewNotes, setReviewNotes] = useState('')

  // Fetch stats
  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['ai-stats'],
    queryFn: aiApi.getStats,
    refetchInterval: 30000
  })

  // Fetch pending approvals
  const { data: pendingData, refetch: refetchPending } = useQuery({
    queryKey: ['ai-pending'],
    queryFn: aiApi.getPendingApprovals,
    refetchInterval: 10000
  })

  // Fetch all actions with filters
  const { data: actionsData, isLoading, refetch: refetchActions } = useQuery({
    queryKey: ['ai-actions', filter],
    queryFn: () => aiApi.getActions(filter)
  })

  // Approval mutation
  const approvalMutation = useMutation({
    mutationFn: ({ actionId, approved, notes }: { actionId: string; approved: boolean; notes?: string }) =>
      aiApi.approveAction(actionId, {
        approved,
        reviewer_id: user?.id || 'unknown',
        reviewer_notes: notes
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-actions'] })
      queryClient.invalidateQueries({ queryKey: ['ai-pending'] })
      queryClient.invalidateQueries({ queryKey: ['ai-stats'] })
      setSelectedAction(null)
      setReviewNotes('')
    }
  })

  const stats = statsData?.stats || {}
  const pendingActions = pendingData?.actions || []
  const actions = actionsData?.actions || []

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'awaiting_approval':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case 'processing':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-400" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'completed': 'bg-green-100 text-green-800',
      'awaiting_approval': 'bg-yellow-100 text-yellow-800',
      'processing': 'bg-blue-100 text-blue-800',
      'failed': 'bg-red-100 text-red-800',
      'rejected': 'bg-red-50 text-red-600',
      'pending': 'bg-gray-100 text-gray-800',
      'approved': 'bg-green-100 text-green-800'
    }
    return styles[status] || 'bg-gray-100 text-gray-800'
  }

  const getAgentIcon = (agentType: string) => {
    switch (agentType) {
      case 'screening':
        return <Users className="w-4 h-4" />
      case 'scheduling':
        return <Clock className="w-4 h-4" />
      case 'resume_parser':
        return <Briefcase className="w-4 h-4" />
      default:
        return <Bot className="w-4 h-4" />
    }
  }

  const getUserInitials = () => {
    if (user?.profile?.firstName && user?.profile?.lastName) {
      return `${user.profile.firstName[0]}${user.profile.lastName[0]}`
    }
    return user?.email?.substring(0, 2).toUpperCase() || 'U'
  }

  const handleApprove = (actionId: string) => {
    approvalMutation.mutate({ actionId, approved: true, notes: reviewNotes })
  }

  const handleReject = (actionId: string) => {
    approvalMutation.mutate({ actionId, approved: false, notes: reviewNotes })
  }

  const refreshAll = () => {
    refetchStats()
    refetchPending()
    refetchActions()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200/40 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold font-heading text-primary">ViraWorkX</span>
              </Link>

              <nav className="hidden md:flex items-center gap-6">
                <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
                <Link to="/client/jobs" className="text-gray-600 hover:text-gray-900">Jobs</Link>
                <Link to="/client/ai-monitor" className="text-primary-600 font-medium flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  AI Monitor
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={refreshAll}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5 text-gray-500" />
              </button>

              <NotificationBell />

              <div className="relative group">
                <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium">
                    {getUserInitials()}
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <button
                    onClick={logout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Bot className="w-8 h-8 text-primary-600" />
            AI Pipeline Monitor
          </h1>
          <p className="text-gray-600 mt-1">Human-in-the-Loop oversight for AI recruiting actions</p>
          <p className="text-gray-400 text-sm mt-0.5">Review and approve AI-generated candidate screenings, job matches, and outreach before they are sent. Actions requiring approval are flagged in yellow.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.total_actions || 0}</span>
            </div>
            <p className="text-gray-600 text-sm">Total AI Actions</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-yellow-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <span className="text-2xl font-bold text-yellow-600">{stats.pending_approvals || 0}</span>
            </div>
            <p className="text-gray-600 text-sm">Pending Approvals</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.average_match_score || 0}%</span>
            </div>
            <p className="text-gray-600 text-sm">Avg Match Score</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {stats.by_status?.completed || 0}
              </span>
            </div>
            <p className="text-gray-600 text-sm">Completed Actions</p>
          </div>
        </div>

        {/* Pending Approvals Section */}
        {pendingActions.length > 0 && (
          <div className="bg-yellow-50 rounded-xl p-6 mb-8 border border-yellow-200">
            <h2 className="text-lg font-semibold text-yellow-800 flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5" />
              Actions Requiring Your Review ({pendingActions.length})
            </h2>
            <div className="space-y-3">
              {pendingActions.slice(0, 5).map((action: any) => (
                <div
                  key={action.id}
                  onClick={() => setSelectedAction(action)}
                  className="bg-white rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow border border-yellow-100"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                        {getAgentIcon(action.agentType)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{action.actionType}</p>
                        <p className="text-sm text-gray-500">{action.approvalReason}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {action.matchScore && (
                        <span className={`text-lg font-semibold ${action.matchScore >= 70 ? 'text-green-600' : 'text-yellow-600'}`}>
                          {action.matchScore}%
                        </span>
                      )}
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="awaiting_approval">Awaiting Approval</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={filter.agent_type}
              onChange={(e) => setFilter({ ...filter, agent_type: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Agents</option>
              <option value="screening">Screening</option>
              <option value="scheduling">Scheduling</option>
              <option value="resume_parser">Resume Parser</option>
              <option value="job_matcher">Job Matcher</option>
            </select>
            {(filter.status || filter.agent_type) && (
              <button
                onClick={() => setFilter({ status: '', agent_type: '' })}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Actions Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">AI Actions Log</h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
              <p className="text-gray-500">Loading actions...</p>
            </div>
          ) : actions.length === 0 ? (
            <div className="p-12 text-center">
              <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No AI actions logged yet</p>
              <p className="text-gray-400 text-sm mt-2 max-w-md mx-auto">This monitor shows all AI-driven actions on the platform (screenings, matches, outreach). Actions will appear here once candidates apply and the AI pipeline processes them.</p>
            </div>
          ) : (
            <div className="divide-y">
              {actions.map((action: any) => (
                <div
                  key={action.id}
                  onClick={() => setSelectedAction(action)}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {getStatusIcon(action.status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{action.actionType}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(action.status)}`}>
                            {action.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            {getAgentIcon(action.agentType)}
                            {action.agentType}
                          </span>
                          {action.entityType && (
                            <span>
                              {action.entityType}: {action.entityId?.slice(0, 8)}...
                            </span>
                          )}
                          <span>{new Date(action.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {action.matchScore !== null && (
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Match</p>
                          <p className={`text-lg font-semibold ${action.matchScore >= 70 ? 'text-green-600' : action.matchScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {action.matchScore}%
                          </p>
                        </div>
                      )}
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Action Detail Sidebar */}
      {selectedAction && (
        <div className="fixed inset-0 bg-black/30 z-50 flex justify-end">
          <div className="w-[500px] bg-white h-full overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Action Details</h2>
              <button
                onClick={() => setSelectedAction(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              {/* Status Badge */}
              <div className="flex items-center gap-3 mb-6">
                {getStatusIcon(selectedAction.status)}
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(selectedAction.status)}`}>
                  {selectedAction.status.replace('_', ' ')}
                </span>
              </div>

              {/* Action Info */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm text-gray-500">Action Type</label>
                  <p className="font-medium text-gray-900">{selectedAction.actionType}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Agent</label>
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    {getAgentIcon(selectedAction.agentType)}
                    {selectedAction.agentType}
                  </p>
                </div>
                {selectedAction.entityType && (
                  <div>
                    <label className="text-sm text-gray-500">Entity</label>
                    <p className="font-medium text-gray-900">
                      {selectedAction.entityType}: {selectedAction.entityId}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm text-gray-500">Created</label>
                  <p className="font-medium text-gray-900">
                    {new Date(selectedAction.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Match Score */}
              {selectedAction.matchScore !== null && (
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">Match Score</span>
                    <span className={`text-2xl font-bold ${selectedAction.matchScore >= 70 ? 'text-green-600' : selectedAction.matchScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {selectedAction.matchScore}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${selectedAction.matchScore >= 70 ? 'bg-green-500' : selectedAction.matchScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${selectedAction.matchScore}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Approval Reason */}
              {selectedAction.approvalReason && (
                <div className="bg-yellow-50 rounded-xl p-4 mb-6 border border-yellow-200">
                  <h3 className="font-medium text-yellow-800 mb-2">Requires Approval</h3>
                  <p className="text-yellow-700 text-sm">{selectedAction.approvalReason}</p>
                </div>
              )}

              {/* Output Payload */}
              {selectedAction.outputPayload && (
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-3">AI Analysis</h3>

                  {selectedAction.outputPayload.summary && (
                    <p className="text-gray-700 mb-4">{selectedAction.outputPayload.summary}</p>
                  )}

                  {selectedAction.outputPayload.strengths?.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-green-700 mb-2">Strengths</h4>
                      <ul className="space-y-1">
                        {selectedAction.outputPayload.strengths.map((s: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedAction.outputPayload.concerns?.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-red-700 mb-2">Concerns</h4>
                      <ul className="space-y-1">
                        {selectedAction.outputPayload.concerns.map((c: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedAction.outputPayload.recommendation && (
                    <div className="mt-4 pt-4 border-t">
                      <span className="text-sm text-gray-500">AI Recommendation: </span>
                      <span className={`font-medium ${
                        selectedAction.outputPayload.recommendation === 'proceed' ? 'text-green-600' :
                        selectedAction.outputPayload.recommendation === 'reject' ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {selectedAction.outputPayload.recommendation.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Approval Actions */}
              {selectedAction.status === 'awaiting_approval' && (
                <div className="border-t pt-6">
                  <h3 className="font-medium text-gray-900 mb-3">Your Decision</h3>

                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add notes (optional)..."
                    rows={3}
                    className="w-full px-4 py-3 border rounded-lg mb-4 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(selectedAction.id)}
                      disabled={approvalMutation.isPending}
                      className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <ThumbsUp className="w-5 h-5" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(selectedAction.id)}
                      disabled={approvalMutation.isPending}
                      className="flex-1 px-4 py-3 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <ThumbsDown className="w-5 h-5" />
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {/* Approved/Rejected Info */}
              {selectedAction.approvedBy && (
                <div className="border-t pt-4 mt-4">
                  <p className="text-sm text-gray-500">
                    {selectedAction.status === 'rejected' ? 'Rejected' : 'Approved'} by {selectedAction.approvedBy}
                    {selectedAction.approvedAt && ` on ${new Date(selectedAction.approvedAt).toLocaleString()}`}
                  </p>
                  {selectedAction.rejectionReason && (
                    <p className="text-sm text-gray-600 mt-1">Reason: {selectedAction.rejectionReason}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
