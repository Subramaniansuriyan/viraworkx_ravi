import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Edit, Save, X, Globe, MapPin, Users, Briefcase } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import ClientLayout from '../../components/client/ClientLayout'
import api from '../../services/api'

interface ClientProfile {
  id: string
  companyName: string
  companyWebsite: string | null
  companyLogoUrl: string | null
  industry: string | null
  companySize: string | null
  headquartersLocation: string | null
  description: string | null
  planTier: string
  _count?: { jobs: number; clientUsers: number }
}

export default function ClientProfile() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<ClientProfile>>({})
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['clientProfile'],
    queryFn: async () => {
      const res = await api.get('/clients/me')
      return res.data.client as ClientProfile
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<ClientProfile>) => {
      const res = await api.put(`/clients/${data!.id}`, updates)
      return res.data.client as ClientProfile
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['clientProfile'], updated)
      setEditing(false)
      setError('')
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error || 'Failed to update profile')
    },
  })

  const startEdit = () => {
    if (!data) return
    setForm({
      companyName: data.companyName,
      companyWebsite: data.companyWebsite || '',
      industry: data.industry || '',
      companySize: data.companySize || '',
      headquartersLocation: data.headquartersLocation || '',
      description: data.description || '',
    })
    setError('')
    setEditing(true)
  }

  const handleSave = () => {
    if (!form.companyName?.trim()) {
      setError('Company name is required')
      return
    }
    updateMutation.mutate({
      companyName: form.companyName,
      companyWebsite: form.companyWebsite || null,
      industry: form.industry || undefined,
      companySize: form.companySize || undefined,
      headquartersLocation: form.headquartersLocation || undefined,
      description: form.description || undefined,
    })
  }

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
        </div>
      </ClientLayout>
    )
  }

  if (!data) {
    return (
      <ClientLayout>
        <div className="p-8 text-center text-gray-500">Company profile not found.</div>
      </ClientLayout>
    )
  }

  return (
    <ClientLayout>
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Company Profile</h1>
          {!editing && (
            <button
              onClick={startEdit}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
            >
              <Edit className="w-4 h-4" />
              Edit Profile
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/10 to-blue-50 p-6 flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm overflow-hidden">
              {data.companyLogoUrl ? (
                <img src={data.companyLogoUrl} alt={data.companyName} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-8 h-8 text-primary-400" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{data.companyName}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 font-medium capitalize">
                {data.planTier} Plan
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 divide-x border-b">
            <div className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{data._count?.jobs ?? 0}</p>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1">
                <Briefcase className="w-3 h-3" /> Total Jobs
              </p>
            </div>
            <div className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{data._count?.clientUsers ?? 0}</p>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1">
                <Users className="w-3 h-3" /> Team Members
              </p>
            </div>
          </div>

          {/* Details */}
          {!editing ? (
            <div className="p-6 space-y-4">
              <DetailRow label="Industry" value={data.industry} />
              <DetailRow label="Company Size" value={data.companySize} />
              <DetailRow
                label="Headquarters"
                value={data.headquartersLocation}
                icon={<MapPin className="w-4 h-4 text-gray-400" />}
              />
              <DetailRow
                label="Website"
                value={
                  data.companyWebsite ? (
                    <a
                      href={data.companyWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline flex items-center gap-1"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      {data.companyWebsite.replace(/^https?:\/\//, '')}
                    </a>
                  ) : null
                }
              />
              {data.description && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">About</p>
                  <p className="text-gray-700 text-sm whitespace-pre-line">{data.description}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">
                  {error}
                </div>
              )}
              <FormField
                label="Company Name *"
                value={form.companyName || ''}
                onChange={(v) => setForm({ ...form, companyName: v })}
              />
              <FormField
                label="Industry"
                value={form.industry || ''}
                onChange={(v) => setForm({ ...form, industry: v })}
                placeholder="e.g. SaaS, Fintech, Healthcare"
              />
              <FormField
                label="Company Size"
                value={form.companySize || ''}
                onChange={(v) => setForm({ ...form, companySize: v })}
                placeholder="e.g. 1-10, 11-50, 51-200"
              />
              <FormField
                label="Headquarters Location"
                value={form.headquartersLocation || ''}
                onChange={(v) => setForm({ ...form, headquartersLocation: v })}
                placeholder="e.g. San Francisco, CA"
              />
              <FormField
                label="Website"
                value={form.companyWebsite || ''}
                onChange={(v) => setForm({ ...form, companyWebsite: v })}
                placeholder="https://example.com"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">About</label>
                <textarea
                  rows={4}
                  value={form.description || ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of your company..."
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => { setEditing(false); setError('') }}
                  className="flex items-center gap-2 px-5 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ClientLayout>
  )
}

function DetailRow({
  label,
  value,
  icon,
}: {
  label: string
  value: React.ReactNode | null | undefined
  icon?: React.ReactNode
}) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2">
      {icon}
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-gray-800">{value}</p>
      </div>
    </div>
  )
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
      />
    </div>
  )
}
