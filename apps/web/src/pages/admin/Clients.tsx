import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Building2, Users, Briefcase, Search, Filter, MoreVertical,
  Zap, LogOut, Bot, Activity, Shield, Eye, ClipboardCheck,
  ExternalLink, Mail, Globe, ChevronLeft, ChevronRight
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function AdminClients() {
  const { user, logout, accessToken: token } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTier, setSelectedTier] = useState<string>('')
  const [page, setPage] = useState(1)
  const limit = 10

  const { data, isLoading, error } = useQuery({
    queryKey: ['adminClients', page, searchQuery, selectedTier],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (searchQuery) params.append('search', searchQuery)
      if (selectedTier) params.append('tier', selectedTier)

      const res = await fetch(`${API_URL}/api/v1/clients?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch clients')
      return res.json()
    }
  })

  const clients = data?.clients || []
  const totalPages = Math.ceil((data?.total || 0) / limit)

  const getUserInitials = () => {
    if (user?.profile?.firstName && user?.profile?.lastName) {
      return `${user.profile.firstName[0]}${user.profile.lastName[0]}`
    }
    return user?.email?.substring(0, 2).toUpperCase() || 'A'
  }

  const getTierBadge = (tier: string) => {
    const styles: Record<string, string> = {
      startup: 'bg-blue-100 text-blue-700',
      growth: 'bg-purple-100 text-purple-700',
      enterprise: 'bg-amber-100 text-amber-700'
    }
    return styles[tier] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 text-white z-10">
        <div className="p-6 border-b border-slate-700">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold">ViraWorkX</span>
              <p className="text-xs text-slate-400">Admin Console</p>
            </div>
          </Link>
        </div>

        <nav className="p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Human-in-the-Loop
          </p>
          <ul className="space-y-1">
            <li>
              <Link to="/admin/dashboard" className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg">
                <Activity className="w-5 h-5 mr-3" />
                Overview
              </Link>
            </li>
            <li>
              <Link to="/admin/ai-monitor" className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg">
                <Bot className="w-5 h-5 mr-3" />
                AI Monitor
              </Link>
            </li>
            <li>
              <Link to="/admin/test-allocation" className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg">
                <ClipboardCheck className="w-5 h-5 mr-3" />
                Test Allocation
              </Link>
            </li>
            <li>
              <Link to="/admin/clients" className="flex items-center px-4 py-3 text-white bg-slate-800 rounded-lg font-medium">
                <Building2 className="w-5 h-5 mr-3" />
                Clients
              </Link>
            </li>
            <li>
              <Link to="/admin/candidates" className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg">
                <Users className="w-5 h-5 mr-3" />
                Candidates
              </Link>
            </li>
          </ul>

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 mt-8">
            System
          </p>
          <ul className="space-y-1">
            <li>
              <Link to="/admin/audit-log" className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg">
                <Eye className="w-5 h-5 mr-3" />
                Audit Log
              </Link>
            </li>
            <li>
              <Link to="/admin/settings" className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg">
                <Shield className="w-5 h-5 mr-3" />
                Settings
              </Link>
            </li>
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-medium">
              {getUserInitials()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.profile?.firstName || 'Admin'}
              </p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center w-full px-4 py-3 text-red-400 hover:bg-slate-800 rounded-lg"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-600">Manage client companies and their hiring accounts</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">All Tiers</option>
              <option value="startup">Startup</option>
              <option value="growth">Growth</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>

        {/* Clients Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading clients...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">
              Failed to load clients. Please try again.
            </div>
          ) : clients.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No clients found</p>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Company</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Industry</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Tier</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Active Jobs</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Team</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {clients.map((client: any) => (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {client.companyLogoUrl ? (
                            <img
                              src={client.companyLogoUrl}
                              alt={client.companyName}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{client.companyName}</p>
                            <p className="text-sm text-gray-500">{client.headquartersLocation || 'Location not set'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{client.industry || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getTierBadge(client.planTier)}`}>
                          {client.planTier || 'startup'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{client._count?.jobs || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{client._count?.clientUsers || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {client.companyWebsite && (
                            <a
                              href={client.companyWebsite}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                              <Globe className="w-4 h-4" />
                            </a>
                          )}
                          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-gray-500">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, data?.total || 0)} of {data?.total || 0} clients
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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
      </main>
    </div>
  )
}
