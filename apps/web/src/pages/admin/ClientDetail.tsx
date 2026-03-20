import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2, Globe, Users, Briefcase, ChevronLeft,
  CheckCircle, Shield, Layers, ArrowRight
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import AdminLayout from '../../components/admin/AdminLayout'

const API_URL = ''

export default function AdminClientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { accessToken: token } = useAuthStore()
  const queryClient = useQueryClient()
  const [verifyNotes, setVerifyNotes] = useState('')
  const [showVerifyForm, setShowVerifyForm] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['adminClientDetail', id],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/clients/${id}/detail`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch client detail')
      return res.json()
    },
    enabled: !!token && !!id,
  })

  const verifyMutation = useMutation({
    mutationFn: async ({ verified, notes }: { verified: boolean; notes?: string }) => {
      const res = await fetch(`${API_URL}/api/v1/clients/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ verified, notes }),
      })
      if (!res.ok) throw new Error('Failed to update verification')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminClientDetail', id] })
      queryClient.invalidateQueries({ queryKey: ['adminClients'] })
      setShowVerifyForm(false)
      setVerifyNotes('')
    },
  })

  const client = data?.client
  const totalApplications = data?.totalApplications || 0

  const getTierBadge = (tier: string) => {
    const styles: Record<string, string> = {
      startup: 'bg-blue-100 text-blue-700',
      growth: 'bg-purple-100 text-purple-700',
      enterprise: 'bg-amber-100 text-amber-700',
    }
    return styles[tier] || 'bg-gray-100 text-gray-700'
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <button
          onClick={() => navigate('/admin/clients')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Clients
        </button>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : isError || !client ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            Failed to load client. Check your connection or try refreshing.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  {client.companyLogoUrl ? (
                    <img src={client.companyLogoUrl} alt={client.companyName} className="w-16 h-16 rounded-xl object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h1 className="text-2xl font-bold text-gray-900">{client.companyName}</h1>
                      {client.verified ? (
                        <span className="flex items-center gap-1 bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" /> Verified
                        </span>
                      ) : (
                        <span className="bg-yellow-100 text-yellow-700 text-xs font-medium px-2 py-0.5 rounded-full">
                          Unverified
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm">{client.industry || 'Industry not set'}</p>
                    {client.headquartersLocation && (
                      <p className="text-gray-400 text-sm">{client.headquartersLocation}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  {!client.verified ? (
                    <button
                      onClick={() => setShowVerifyForm(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                    >
                      <Shield className="w-4 h-4" /> Verify Company
                    </button>
                  ) : (
                    <button
                      onClick={() => verifyMutation.mutate({ verified: false })}
                      disabled={verifyMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50"
                    >
                      Remove Verification
                    </button>
                  )}
                </div>
              </div>

              {showVerifyForm && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">Verification notes (optional)</p>
                  <textarea
                    value={verifyNotes}
                    onChange={(e) => setVerifyNotes(e.target.value)}
                    placeholder="e.g. Documents reviewed, company registration confirmed"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-200 focus:border-green-400 mb-3"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setShowVerifyForm(false)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-white">
                      Cancel
                    </button>
                    <button
                      onClick={() => verifyMutation.mutate({ verified: true, notes: verifyNotes })}
                      disabled={verifyMutation.isPending}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      {verifyMutation.isPending ? 'Verifying...' : 'Confirm Verification'}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{client.jobs?.length || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Jobs</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{client.jobs?.filter((j: any) => j.status === 'active').length || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Active Jobs</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{totalApplications}</p>
                  <p className="text-xs text-gray-500 mt-1">Applications</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{client.clientUsers?.length || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Team Members</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Company Info */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Info</h2>
                <div className="space-y-3 text-sm">
                  {client.companyWebsite && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <a href={client.companyWebsite} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                        {client.companyWebsite}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Plan</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getTierBadge(client.planTier)}`}>
                      {client.planTier}
                    </span>
                  </div>
                  {client.companySize && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Company size</span>
                      <span className="text-gray-700">{client.companySize}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Member since</span>
                    <span className="text-gray-700">{new Date(client.createdAt).toLocaleDateString()}</span>
                  </div>
                  {client.verifiedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Verified on</span>
                      <span className="text-gray-700">{new Date(client.verifiedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                  {client.description && (
                    <p className="text-gray-600 pt-2 border-t">{client.description}</p>
                  )}
                </div>
              </div>

              {/* Team Members */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-400" /> Team Members
                </h2>
                {client.clientUsers?.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">No team members</p>
                ) : (
                  <div className="space-y-3">
                    {client.clientUsers?.map((cu: any) => (
                      <div key={cu.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                            {cu.user?.email?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{cu.user?.email}</p>
                          </div>
                        </div>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                          {cu.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Jobs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-gray-400" /> Jobs
              </h2>
              {client.jobs?.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No jobs posted</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-gray-500">
                        <th className="text-left py-2 pr-4">Title</th>
                        <th className="text-left py-2 pr-4">Status</th>
                        <th className="text-left py-2 pr-4">Applications</th>
                        <th className="text-left py-2">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {client.jobs?.map((job: any) => (
                        <tr key={job.id} className="hover:bg-gray-50">
                          <td className="py-3 pr-4 font-medium text-gray-800">{job.title}</td>
                          <td className="py-3 pr-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                              job.status === 'active' ? 'bg-green-100 text-green-700' :
                              job.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                              job.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-600'
                            }`}>{job.status}</span>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-1 text-gray-600">
                              <Layers className="w-3.5 h-3.5" />
                              {job._count?.applications || 0}
                            </div>
                          </td>
                          <td className="py-3 text-gray-400">
                            {new Date(job.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
