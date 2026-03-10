import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, ChevronRight, MapPin, Briefcase, Star, Award,
  CheckCircle, AlertTriangle, Bot, ArrowRight
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import AdminLayout from '../../components/admin/AdminLayout'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

// Phase 1 pipeline: Applied → Vetted → Tiered → Deployed
const PIPELINE_STAGES = [
  {
    key: 'applied',
    label: 'Applied',
    description: 'New applications awaiting review',
    stages: ['new', 'screening'],
    color: 'border-blue-300 bg-blue-50',
    headerColor: 'bg-blue-600',
    badgeColor: 'bg-blue-100 text-blue-700',
    nextLabel: 'Mark Vetted',
    nextStage: 'assessment',
  },
  {
    key: 'vetted',
    label: 'Vetted',
    description: 'Reviewed and qualified candidates',
    stages: ['assessment', 'assessment_complete'],
    color: 'border-purple-300 bg-purple-50',
    headerColor: 'bg-purple-600',
    badgeColor: 'bg-purple-100 text-purple-700',
    nextLabel: 'Assign Tier',
    nextStage: 'shortlisted',
  },
  {
    key: 'tiered',
    label: 'Tiered',
    description: 'Tiered and shortlisted for clients',
    stages: ['shortlisted'],
    color: 'border-amber-300 bg-amber-50',
    headerColor: 'bg-amber-600',
    badgeColor: 'bg-amber-100 text-amber-700',
    nextLabel: 'Deploy to Client',
    nextStage: 'interview',
  },
  {
    key: 'deployed',
    label: 'Deployed',
    description: 'Active with client in interview process',
    stages: ['interview', 'offer', 'hired'],
    color: 'border-green-300 bg-green-50',
    headerColor: 'bg-green-600',
    badgeColor: 'bg-green-100 text-green-700',
    nextLabel: null,
    nextStage: null,
  },
]

const TIER_OPTIONS = ['Tier 1', 'Tier 2', 'Tier 3']

export default function AdminVetting() {
  const { accessToken: token } = useAuthStore()
  const queryClient = useQueryClient()
  const [tierModal, setTierModal] = useState<{ appId: string; candidateName: string } | null>(null)
  const [selectedTier, setSelectedTier] = useState('Tier 1')

  const { data, isLoading } = useQuery({
    queryKey: ['vettingPipeline'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/applications?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    refetchInterval: 30000,
  })

  const advanceMutation = useMutation({
    mutationFn: async ({ appId, stage, tier }: { appId: string; stage: string; tier?: string }) => {
      const res = await fetch(`${API_URL}/api/v1/applications/${appId}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ stage, assessmentTier: tier }),
      })
      if (!res.ok) throw new Error('Failed to advance')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vettingPipeline'] })
      setTierModal(null)
    },
  })

  const applications: any[] = data?.applications || []

  const getColumn = (stageKeys: string[]) =>
    applications.filter((a) => stageKeys.includes(a.stage))

  const getMatchColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-500'
  }

  const handleAdvance = (app: any, col: (typeof PIPELINE_STAGES)[0]) => {
    if (col.key === 'vetted') {
      // Moving to tiered — need to pick a tier
      setTierModal({
        appId: app.id,
        candidateName: `${app.candidate?.firstName} ${app.candidate?.lastName}`,
      })
    } else {
      advanceMutation.mutate({ appId: app.id, stage: col.nextStage! })
    }
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Vetting Pipeline</h1>
          <p className="text-gray-600">
            Track candidates through the Phase 1 workflow: Applied → Vetted → Tiered → Deployed
          </p>
        </div>

        {/* Pipeline summary */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {PIPELINE_STAGES.map((col) => {
            const count = getColumn(col.stages).length
            return (
              <div key={col.key} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">{col.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${col.badgeColor}`}>
                    {count}
                  </span>
                </div>
                <p className="text-3xl font-bold text-gray-900 mt-2">{count}</p>
                <p className="text-xs text-gray-400 mt-1">{col.description}</p>
              </div>
            )
          })}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {PIPELINE_STAGES.map((col) => {
              const cards = getColumn(col.stages)
              return (
                <div key={col.key} className={`rounded-xl border-2 ${col.color} flex flex-col min-h-96`}>
                  <div className={`${col.headerColor} text-white px-4 py-3 rounded-t-lg flex items-center justify-between`}>
                    <span className="font-semibold">{col.label}</span>
                    <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {cards.length}
                    </span>
                  </div>

                  <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[60vh]">
                    {cards.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        No candidates here
                      </div>
                    ) : (
                      cards.map((app) => (
                        <div
                          key={app.id}
                          className="bg-white rounded-lg p-3 shadow-sm border border-gray-100"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {app.candidate?.firstName?.[0]}{app.candidate?.lastName?.[0]}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900 leading-tight">
                                  {app.candidate?.firstName} {app.candidate?.lastName}
                                </p>
                                <p className="text-xs text-gray-500 truncate max-w-[120px]">
                                  {app.job?.title}
                                </p>
                              </div>
                            </div>
                            {app.matchScore != null && (
                              <span className={`text-sm font-bold ${getMatchColor(app.matchScore)}`}>
                                {app.matchScore}%
                              </span>
                            )}
                          </div>

                          <div className="space-y-1 mb-3">
                            {app.candidate?.location && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <MapPin className="w-3 h-3" />
                                {app.candidate.location}
                              </div>
                            )}
                            {app.candidate?.experienceYears && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Briefcase className="w-3 h-3" />
                                {app.candidate.experienceYears} yrs exp
                              </div>
                            )}
                            {app.candidate?.assessmentTier && (
                              <div className="flex items-center gap-1 text-xs font-bold text-amber-700">
                                <Award className="w-3 h-3" />
                                {app.candidate.assessmentTier}
                              </div>
                            )}
                          </div>

                          {app.aiSummary && (
                            <div className="bg-blue-50 rounded p-2 mb-3">
                              <p className="text-xs text-blue-700 flex items-start gap-1">
                                <Bot className="w-3 h-3 mt-0.5 shrink-0" />
                                <span className="line-clamp-2">{app.aiSummary}</span>
                              </p>
                            </div>
                          )}

                          {col.nextLabel && (
                            <button
                              onClick={() => handleAdvance(app, col)}
                              disabled={advanceMutation.isPending}
                              className="w-full flex items-center justify-center gap-1 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                            >
                              {col.nextLabel}
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                          {col.key === 'deployed' && (
                            <div className="flex items-center gap-1 text-xs text-green-600 font-medium justify-center py-1">
                              <CheckCircle className="w-3 h-3" /> Active with client
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Tier Assignment Modal */}
      {tierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setTierModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm m-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Assign Tier</h2>
            <p className="text-sm text-gray-500 mb-6">
              Assign assessment tier for{' '}
              <span className="font-medium text-gray-900">{tierModal.candidateName}</span>
            </p>

            <div className="space-y-3 mb-6">
              {TIER_OPTIONS.map((tier) => (
                <label
                  key={tier}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedTier === tier
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="tier"
                    value={tier}
                    checked={selectedTier === tier}
                    onChange={() => setSelectedTier(tier)}
                    className="text-primary"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{tier}</p>
                    <p className="text-xs text-gray-500">
                      {tier === 'Tier 1'
                        ? 'Top performer — highest priority placement'
                        : tier === 'Tier 2'
                        ? 'Strong candidate — standard placement'
                        : 'Good candidate — suitable for select roles'}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setTierModal(null)}
                className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  advanceMutation.mutate({
                    appId: tierModal.appId,
                    stage: 'shortlisted',
                    tier: selectedTier,
                  })
                }
                disabled={advanceMutation.isPending}
                className="flex-1 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {advanceMutation.isPending ? 'Saving...' : 'Confirm Tier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
