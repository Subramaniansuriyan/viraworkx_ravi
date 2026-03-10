import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, Search, ChevronLeft, ChevronRight, MoreVertical,
  UserCheck, UserX, Shield, User, Building2
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import AdminLayout from '../../components/admin/AdminLayout'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const USER_TYPE_STYLES: Record<string, { badge: string; icon: React.ElementType }> = {
  candidate: { badge: 'bg-blue-100 text-blue-700', icon: User },
  client: { badge: 'bg-purple-100 text-purple-700', icon: Building2 },
  admin: { badge: 'bg-red-100 text-red-700', icon: Shield },
}

export default function AdminUsers() {
  const { accessToken: token } = useAuthStore()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const limit = 20

  const { data, isLoading, error } = useQuery({
    queryKey: ['adminUsers', page, searchQuery, typeFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() })
      if (searchQuery) params.append('search', searchQuery)
      if (typeFilter) params.append('userType', typeFilter)
      if (statusFilter) params.append('status', statusFilter)
      const res = await fetch(`${API_URL}/api/v1/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch users')
      return res.json()
    },
  })

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const res = await fetch(`${API_URL}/api/v1/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
      setOpenMenuId(null)
    },
  })

  const users = data?.users || []
  const totalPages = Math.ceil((data?.total || 0) / limit)

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">Manage all platform users — candidates, clients, and admins</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-48 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">All Types</option>
              <option value="candidate">Candidate</option>
              <option value="client">Client</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="mt-4 text-gray-500">Loading users...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">Failed to load users. Please try again.</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No users found</p>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">User</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Type</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Email Verified</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Joined</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user: any) => {
                    const typeConfig = USER_TYPE_STYLES[user.userType] || USER_TYPE_STYLES.candidate
                    const TypeIcon = typeConfig.icon
                    const displayName =
                      user.profile?.firstName
                        ? `${user.profile.firstName} ${user.profile.lastName || ''}`
                        : user.profile?.companyName || user.email

                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-sm font-medium">
                              {displayName[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{displayName}</p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium capitalize ${typeConfig.badge}`}
                          >
                            <TypeIcon className="w-3 h-3" />
                            {user.userType}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                              user.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : user.status === 'suspended'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {user.status || 'active'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {user.emailVerified ? (
                            <span className="flex items-center gap-1 text-green-600 text-sm">
                              <UserCheck className="w-4 h-4" /> Verified
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-gray-400 text-sm">
                              <UserX className="w-4 h-4" /> Unverified
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {user.createdAt ? formatDate(user.createdAt) : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="relative inline-block">
                            <button
                              onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {openMenuId === user.id && (
                              <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-100 rounded-lg shadow-lg z-10">
                                {user.status !== 'active' && (
                                  <button
                                    onClick={() => toggleStatusMutation.mutate({ userId: user.id, status: 'active' })}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50"
                                  >
                                    <UserCheck className="w-4 h-4" /> Activate
                                  </button>
                                )}
                                {user.status !== 'suspended' && (
                                  <button
                                    onClick={() => toggleStatusMutation.mutate({ userId: user.id, status: 'suspended' })}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                  >
                                    <UserX className="w-4 h-4" /> Suspend
                                  </button>
                                )}
                                {user.status !== 'inactive' && (
                                  <button
                                    onClick={() => toggleStatusMutation.mutate({ userId: user.id, status: 'inactive' })}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                                  >
                                    <UserX className="w-4 h-4" /> Deactivate
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-gray-500">
                    Showing {(page - 1) * limit + 1} to{' '}
                    {Math.min(page * limit, data?.total || 0)} of {data?.total || 0} users
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
