import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, ChevronRight, MapPin, Briefcase, Star, Award,
  CheckCircle, AlertTriangle, Bot, ArrowRight, Plus, X, Search,
  FileText, Send
} from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import api from '../../services/api'

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
  const queryClient = useQueryClient()
  const [tierModal, setTierModal] = useState<{ appId: string; candidateName: string } | null>(null)
  const [selectedTier, setSelectedTier] = useState('Tier 1')
  const [rejectModal, setRejectModal] = useState<{ appId: string; candidateName: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [enrollCandidateId, setEnrollCandidateId] = useState('')
  const [enrollJobId, setEnrollJobId] = useState('')
  const [enrollNotes, setEnrollNotes] = useState('')
  const [candidateSearch, setCandidateSearch] = useState('')
  const [contractModal, setContractModal] = useState<{ appId: string; candidateName: string } | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [contractSent, setContractSent] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['vettingPipeline'],
    queryFn: async () => {
      const res = await api.get('/applications', { params: { limit: 200 } })
      return res.data
    },
    refetchInterval: 30000,
  })

  const { data: candidatesData } = useQuery({
    queryKey: ['allCandidates'],
    queryFn: async () => {
      const res = await api.get('/candidates?limit=200')
      return res.data
    },
    enabled: enrollOpen,
  })

  const { data: jobsData } = useQuery({
    queryKey: ['activeJobs'],
    queryFn: async () => {
      const res = await api.get('/jobs?status=active&limit=50')
      return res.data
    },
    enabled: enrollOpen,
  })

  const { data: templatesData } = useQuery({
    queryKey: ['contractTemplates'],
    queryFn: async () => {
      const res = await api.get('/contracts/templates')
      return res.data
    },
    enabled: !!contractModal,
  })

  const sendContractMutation = useMutation({
    mutationFn: async ({ appId, templateId }: { appId: string; templateId: string }) => {
      // Step 1: generate contract
      const { data: { contract } } = await api.post('/contracts/generate', { applicationId: appId, templateId })

      // Step 2: send for signatures
      const sendRes = await api.post(`/contracts/${contract.id}/send-for-signatures`)
      return sendRes.data
    },
    onSuccess: () => {
      setContractSent(true)
      setTimeout(() => {
        setContractModal(null)
        setSelectedTemplateId('')
        setContractSent(false)
        sendContractMutation.reset()
      }, 2000)
    },
  })

  const enrollMutation = useMutation({
    mutationFn: async (data: { candidateId: string; jobId: string; notes: string }) => {
      const res = await api.post('/applications/admin/enroll', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vettingPipeline'] })
      setEnrollOpen(false)
      setEnrollCandidateId('')
      setEnrollJobId('')
      setEnrollNotes('')
      setCandidateSearch('')
    },
  })

  const advanceMutation = useMutation({
    mutationFn: async ({ appId, stage, tier }: { appId: string; stage: string; tier?: string }) => {
      const res = await api.post(`/applications/${appId}/advance`, { stage, assessmentTier: tier })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vettingPipeline'] })
      setTierModal(null)
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ appId, reason }: { appId: string; reason: string }) => {
      const res = await api.post(`/applications/${appId}/reject`, { reason })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vettingPipeline'] })
      setRejectModal(null)
      setRejectReason('')
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vetting Pipeline</h1>
            <p className="text-gray-600">
              Track candidates through the Phase 1 workflow: Applied → Vetted → Tiered → Deployed
            </p>
          </div>
          <button
            onClick={() => setEnrollOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            Enroll Candidate
          </button>
        </div>

        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700 text-sm">
            Failed to load pipeline. Check your connection or try refreshing.
          </div>
        )}

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
                            {app.assessmentTier && (
                              <div className="flex items-center gap-1 text-xs font-bold text-amber-700">
                                <Award className="w-3 h-3" />
                                {app.assessmentTier}
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

                          {advanceMutation.isError && (
                            <p className="text-xs text-red-500 mt-1">{(advanceMutation.error as Error)?.message}</p>
                          )}
                          {col.key === 'tiered' && (() => {
                            const existingContract = app.contracts?.[0]
                            return existingContract ? (
                              <div className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-lg mb-2 cursor-default">
                                <FileText className="w-3 h-3" />
                                Contract {existingContract.status === 'active' ? 'Active' : existingContract.status === 'pending_signatures' ? 'Sent' : existingContract.status}
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setContractModal({ appId: app.id, candidateName: `${app.candidate?.firstName} ${app.candidate?.lastName}` })
                                  setSelectedTemplateId('')
                                  setContractSent(false)
                                }}
                                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 mb-2"
                              >
                                <FileText className="w-3 h-3" />
                                Send Contract
                              </button>
                            )
                          })()}
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setRejectModal({ appId: app.id, candidateName: `${app.candidate?.firstName} ${app.candidate?.lastName}` }) }}
                              className="flex-1 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                            >
                              Reject
                            </button>
                            {col.nextLabel && (
                              <button
                                onClick={() => handleAdvance(app, col)}
                                disabled={advanceMutation.isPending}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                              >
                                {advanceMutation.isPending ? '...' : col.nextLabel}
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
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
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRejectModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm m-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Reject Candidate</h2>
            <p className="text-sm text-gray-500 mb-4">
              Rejecting <span className="font-medium text-gray-900">{rejectModal.candidateName}</span>
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)} className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={() => rejectMutation.mutate({ appId: rejectModal.appId, reason: rejectReason })}
                disabled={rejectMutation.isPending}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Send Contract Modal */}
      {contractModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !sendContractMutation.isPending && setContractModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md m-4">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Send Contract</h2>
                <p className="text-sm text-gray-500">
                  To <span className="font-medium text-gray-900">{contractModal.candidateName}</span>
                </p>
              </div>
              <button
                onClick={() => setContractModal(null)}
                disabled={sendContractMutation.isPending}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              {contractSent ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                  <p className="font-semibold text-gray-900">Contract sent!</p>
                  <p className="text-sm text-gray-500">
                    {contractModal.candidateName} will receive a notification to review and sign.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">Select a contract template to send:</p>
                  {!templatesData ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (templatesData.templates || []).length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm">
                      No templates found. Create one in Contract Templates first.
                    </div>
                  ) : (
                    <div className="space-y-2 mb-6">
                      {(templatesData.templates || []).map((t: any) => (
                        <label
                          key={t.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                            selectedTemplateId === t.id
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="template"
                            value={t.id}
                            checked={selectedTemplateId === t.id}
                            onChange={() => setSelectedTemplateId(t.id)}
                            className="mt-0.5 text-primary"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{t.name}</p>
                            {t.description && (
                              <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                            )}
                            <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                              {t.templateType}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {sendContractMutation.isError && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                      {(sendContractMutation.error as Error)?.message || 'Failed to send contract'}
                    </p>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setContractModal(null)}
                      disabled={sendContractMutation.isPending}
                      className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => sendContractMutation.mutate({ appId: contractModal.appId, templateId: selectedTemplateId })}
                      disabled={!selectedTemplateId || sendContractMutation.isPending}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50"
                    >
                      {sendContractMutation.isPending ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Sending...</>
                      ) : (
                        <><Send className="w-4 h-4" />Send Contract</>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enroll Candidate Modal */}
      {enrollOpen && (() => {
        const allCandidates: any[] = candidatesData?.candidates || []
        const filteredCandidates = allCandidates.filter(c =>
          !candidateSearch.trim() ||
          `${c.firstName} ${c.lastName} ${c.email}`.toLowerCase().includes(candidateSearch.toLowerCase())
        )
        const selectedCandidate = allCandidates.find(c => c.id === enrollCandidateId)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setEnrollOpen(false)} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg m-4 flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-6 border-b shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Enroll Candidate</h2>
                  <p className="text-sm text-gray-500">Manually add a candidate to the pipeline</p>
                </div>
                <button onClick={() => setEnrollOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto">
                {/* Candidate picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Candidate</label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search candidates..."
                      value={candidateSearch}
                      onChange={e => setCandidateSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                    {filteredCandidates.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No candidates found</p>
                    ) : filteredCandidates.map((c: any) => (
                      <div
                        key={c.id}
                        onClick={() => setEnrollCandidateId(c.id)}
                        className={`px-4 py-2.5 cursor-pointer hover:bg-gray-50 border-b last:border-0 ${enrollCandidateId === c.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                      >
                        <p className="text-sm font-medium text-gray-900">{c.firstName} {c.lastName}</p>
                        <p className="text-xs text-gray-400">{c.email}</p>
                      </div>
                    ))}
                  </div>
                  {selectedCandidate && (
                    <p className="text-xs text-primary font-medium mt-1">
                      Selected: {selectedCandidate.firstName} {selectedCandidate.lastName}
                    </p>
                  )}
                </div>

                {/* Job / Role selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role / Job *</label>
                  {!jobsData ? (
                    <div className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-400 text-sm">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
                      Loading jobs...
                    </div>
                  ) : (jobsData?.jobs || []).length === 0 ? (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      No active jobs found. Create an active job first before enrolling candidates.
                    </p>
                  ) : (
                    <select
                      value={enrollJobId}
                      onChange={e => setEnrollJobId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                    >
                      <option value="">-- Select a role --</option>
                      {(jobsData?.jobs || []).map((job: any) => (
                        <option key={job.id} value={job.id}>{job.title}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                  <textarea
                    value={enrollNotes}
                    onChange={e => setEnrollNotes(e.target.value)}
                    placeholder="e.g. Referred by client, strong match for backend role..."
                    rows={2}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  />
                </div>

                {enrollMutation.isError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {(enrollMutation.error as any)?.response?.data?.error || 'Failed to enroll candidate'}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 shrink-0">
                <button onClick={() => setEnrollOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">
                  Cancel
                </button>
                <button
                  onClick={() => enrollMutation.mutate({ candidateId: enrollCandidateId, jobId: enrollJobId, notes: enrollNotes })}
                  disabled={!enrollCandidateId || !enrollJobId || enrollMutation.isPending}
                  className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {enrollMutation.isPending ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Enrolling...</>
                  ) : (
                    <><Plus className="w-4 h-4" />Add to Pipeline</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </AdminLayout>
  )
}
