import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import {
  Award,
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  PenLine,
  X,
} from 'lucide-react'
import CandidateLayout from '../../components/candidate/CandidateLayout'
import { contractApi } from '../../services/api'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending:   { label: 'Pending',      color: 'bg-gray-100 text-gray-700',   icon: Clock },
  invited:   { label: 'Invited',      color: 'bg-blue-100 text-blue-700',   icon: AlertCircle },
  started:   { label: 'In Progress',  color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  completed: { label: 'Completed',    color: 'bg-green-100 text-green-700', icon: CheckCircle },
  expired:   { label: 'Expired',      color: 'bg-red-100 text-red-700',     icon: AlertCircle },
  cancelled: { label: 'Cancelled',    color: 'bg-gray-100 text-gray-500',   icon: AlertCircle },
}

const BADGE_LEVEL_COLOR: Record<string, string> = {
  beginner:     'bg-gray-100 text-gray-700',
  intermediate: 'bg-blue-100 text-blue-700',
  advanced:     'bg-purple-100 text-purple-700',
  expert:       'bg-amber-100 text-amber-700',
}

const TIER_COLOR: Record<string, string> = {
  'Tier 1': 'bg-amber-100 text-amber-800',
  'Tier 2': 'bg-blue-100 text-blue-800',
  'Tier 3': 'bg-green-100 text-green-700',
}


function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Assessments() {
  const { accessToken: token } = useAuthStore()
  const navigate = useNavigate()

  // Pending contract that needs signing — blocks starting a new test
  const [blockedTestUrl, setBlockedTestUrl] = useState<string | null>(null)
  const [pendingContract, setPendingContract] = useState<any | null>(null)

  const { data: assessmentsData, isLoading } = useQuery({
    queryKey: ['candidateAssessments'],
    queryFn: async () => {
      const res = await fetch(`/api/v1/assessments`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch assessments')
      return res.json()
    },
    enabled: !!token,
  })

  const { data: contractsData } = useQuery({
    queryKey: ['candidateContracts'],
    queryFn: async () => {
      const { data } = await contractApi.getAll()
      return data
    },
    enabled: !!token,
  })

  const assessments: any[] = assessmentsData?.assessments || []
  const completed = assessments.filter(a => a.status === 'completed')
  const pending = assessments.filter(a => ['pending', 'invited', 'started'].includes(a.status))

  // Find first contract awaiting candidate signature
  const unsignedContract = (contractsData?.contracts || []).find((c: any) => {
    const candidateSig = c.signatures?.find((s: any) => s.signerRole === 'candidate')
    return c.status === 'pending_signatures' && !candidateSig?.signedAt
  }) ?? null

  const handleStartTest = (testUrl: string) => {
    if (unsignedContract) {
      // Block — candidate must sign first
      setBlockedTestUrl(testUrl)
      setPendingContract(unsignedContract)
      return
    }
    window.open(testUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <CandidateLayout>
      <div className="p-4 md:p-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Assessments</h1>
          <p className="text-gray-600 text-sm md:text-base">Your skill tests and earned badges</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm">
            <p className="text-gray-500 text-xs md:text-sm mb-1">Total</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-900">{assessments.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm">
            <p className="text-gray-500 text-xs md:text-sm mb-1">Completed</p>
            <p className="text-2xl md:text-3xl font-bold text-green-600">{completed.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm">
            <p className="text-gray-500 text-xs md:text-sm mb-1">Pending</p>
            <p className="text-2xl md:text-3xl font-bold text-yellow-600">{pending.length}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl shadow-sm p-8 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg shrink-0" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
                <div className="h-6 bg-gray-200 rounded w-24" />
              </div>
            ))}
          </div>
        ) : assessments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No assessments yet</h3>
            <p className="text-gray-600">
              Skill assessments will appear here once a recruiter sends you an invitation.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {assessments.map((assessment: any) => {
              const cfg = STATUS_CONFIG[assessment.status] || STATUS_CONFIG.pending
              const Icon = cfg.icon
              return (
                <div key={assessment.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
                  <div className="flex items-start justify-between gap-3 md:gap-4">
                    <div className="flex items-start gap-3 md:gap-4 min-w-0">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                        <Award className="w-5 h-5 md:w-6 md:h-6 text-indigo-500" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm md:text-base">
                          {assessment.application?.job?.title
                            ? `${assessment.application.job.title} — Skill Assessment`
                            : 'Skill Assessment'}
                        </h3>
                        {assessment.application?.job?.client?.companyName && (
                          <p className="text-sm text-gray-500 mt-0.5">{assessment.application.job.client.companyName}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2 text-xs md:text-sm text-gray-500">
                          {assessment.invitedAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 shrink-0" />
                              Invited {formatDate(assessment.invitedAt)}
                            </span>
                          )}
                          {assessment.completedAt && (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                              Completed {formatDate(assessment.completedAt)}
                            </span>
                          )}
                          {assessment.expiresAt && assessment.status !== 'completed' && (
                            <span className="flex items-center gap-1 text-amber-600">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              Expires {formatDate(assessment.expiresAt)}
                            </span>
                          )}
                        </div>

                        {assessment.status === 'completed' && assessment.completedAt && (() => {
                          const retakeDate = new Date(assessment.completedAt)
                          retakeDate.setDate(retakeDate.getDate() + 90)
                          const eligible = retakeDate <= new Date()
                          return (
                            <p className="text-xs text-gray-400 mt-1">
                              {eligible
                                ? 'Eligible to retake — contact ViraWorkx to request'
                                : `Retake eligible after ${retakeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                            </p>
                          )
                        })()}

                        {assessment.status === 'completed' && (
                          <div className="mt-3 flex flex-wrap items-center gap-2 md:gap-3">
                            {assessment.tier && (
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${TIER_COLOR[assessment.tier] || 'bg-gray-100 text-gray-700'}`}>
                                {assessment.tier}
                              </span>
                            )}
                            {assessment.skillBadges?.map((badge: any) => (
                              <span
                                key={badge.id}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium ${BADGE_LEVEL_COLOR[badge.badgeLevel] || 'bg-gray-100 text-gray-700'}`}
                              >
                                {badge.skillName} · {badge.badgeLevel}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                      <span className={`flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-xs md:text-sm font-medium ${cfg.color}`}>
                        <Icon className="w-3 h-3 md:w-4 md:h-4" />
                        <span className="hidden sm:inline">{cfg.label}</span>
                      </span>
                      {['invited', 'started'].includes(assessment.status) && assessment.invitationUrl && (
                        <button
                          onClick={() => handleStartTest(assessment.invitationUrl)}
                          className="flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-xs md:text-sm font-medium bg-primary text-white hover:bg-primary/90"
                        >
                          <ExternalLink className="w-3 h-3 md:w-4 md:h-4" />
                          <span>{assessment.status === 'started' ? 'Continue Test' : 'Start Assessment'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Contract sign-first blocking modal */}
      {blockedTestUrl && pendingContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setBlockedTestUrl(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                  <PenLine className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Sign Your Contract First</h2>
                  <p className="text-sm text-gray-500">Action required before proceeding</p>
                </div>
              </div>
              <button
                onClick={() => setBlockedTestUrl(null)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-gray-700 text-sm leading-relaxed">
                You have a <span className="font-semibold text-amber-700">ViraWorkx Talent Agreement</span> waiting
                for your signature. You must sign this contract before you can start or continue any assessments.
              </p>
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <p className="font-medium mb-1">Why do I need to sign first?</p>
                <p className="text-amber-700">
                  The agreement covers your placement terms, IP rights, and compensation. It must be signed
                  before you can be formally placed with a client.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-6 border-t">
              <button
                onClick={() => setBlockedTestUrl(null)}
                className="flex-1 px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => navigate(`/candidate/contracts/${pendingContract.id}`)}
                className="flex-1 px-4 py-2.5 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <PenLine className="w-4 h-4" />
                Review & Sign Contract
              </button>
            </div>
          </div>
        </div>
      )}
    </CandidateLayout>
  )
}
