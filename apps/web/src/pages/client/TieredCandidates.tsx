import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import ClientLayout from '../../components/client/ClientLayout'
import {
  Users, Award, MapPin, Briefcase, Search, ChevronRight, Building2
} from 'lucide-react'

const TIER_COLORS: Record<string, string> = {
  'Tier 1': 'bg-amber-100 text-amber-700 border-amber-200',
  'Tier 2': 'bg-blue-100 text-blue-700 border-blue-200',
  'Tier 3': 'bg-gray-100 text-gray-700 border-gray-200',
}

export default function TieredCandidates() {
  const { accessToken: token } = useAuthStore()
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState<string>('all')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tieredCandidates'],
    queryFn: async () => {
      const res = await fetch(`/api/v1/applications?stage=shortlisted&limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load')
      return res.json()
    },
    enabled: !!token,
  })

  const applications: any[] = data?.applications || []

  const filtered = applications.filter((app) => {
    const name = `${app.candidate?.firstName} ${app.candidate?.lastName}`.toLowerCase()
    const matchesSearch = !search || name.includes(search.toLowerCase())
    const matchesTier = tierFilter === 'all' || app.assessmentTier === tierFilter
    return matchesSearch && matchesTier
  })

  const tierCounts = ['Tier 1', 'Tier 2', 'Tier 3'].reduce<Record<string, number>>((acc, t) => {
    acc[t] = applications.filter((a) => a.assessmentTier === t).length
    return acc
  }, {})

  return (
    <ClientLayout>
      <div className="p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Tiered Candidates</h1>
          <p className="text-gray-600">Shortlisted candidates ready for your review</p>
        </div>

        {/* Tier summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {['Tier 1', 'Tier 2', 'Tier 3'].map((tier) => (
            <button
              key={tier}
              onClick={() => setTierFilter(tierFilter === tier ? 'all' : tier)}
              className={`p-4 rounded-xl border-2 text-left transition-colors ${
                tierFilter === tier
                  ? TIER_COLORS[tier]
                  : 'bg-white border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-4 h-4" />
                <span className="font-semibold">{tier}</span>
              </div>
              <p className="text-2xl font-bold">{tierCounts[tier] || 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {tier === 'Tier 1' ? 'Top performers' : tier === 'Tier 2' ? 'Strong candidates' : 'Good candidates'}
              </p>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search candidates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700 text-sm">
            Failed to load tiered candidates. Please refresh.
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-2">
              {applications.length === 0 ? 'No tiered candidates yet' : 'No candidates match your filters'}
            </p>
            <p className="text-sm text-gray-400">
              {applications.length === 0
                ? 'Candidates will appear here once the ViraWorkx team tiers them'
                : 'Try adjusting your search or tier filter'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y">
            {filtered.map((app) => (
              <Link
                key={app.id}
                to={`/client/jobs/${app.jobId}/pipeline`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-white font-semibold shrink-0">
                  {app.candidate?.firstName?.[0]}{app.candidate?.lastName?.[0]}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-gray-900">
                      {app.candidate?.firstName} {app.candidate?.lastName}
                    </p>
                    {app.assessmentTier && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${TIER_COLORS[app.assessmentTier] || 'bg-gray-100 text-gray-700'}`}>
                        {app.assessmentTier}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {app.candidate?.headline || app.candidate?.currentTitle}
                  </p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                    {app.candidate?.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {app.candidate.location}
                      </span>
                    )}
                    {app.candidate?.experienceYears && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        {app.candidate.experienceYears} yrs
                      </span>
                    )}
                    {app.job?.title && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {app.job.title}
                      </span>
                    )}
                  </div>
                </div>

                {app.matchScore && (
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold ${app.matchScore >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                      {app.matchScore}%
                    </p>
                    <p className="text-xs text-gray-400">match</p>
                  </div>
                )}

                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  )
}
