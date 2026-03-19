import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import {
  Award,
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import CandidateLayout from '../../components/candidate/CandidateLayout'

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
  'Tier 3': 'bg-gray-100 text-gray-700',
}

function getTier(score: number | null, maxScore: number | null): string | null {
  if (score == null || !maxScore) return null
  const pct = (score / maxScore) * 100
  if (pct > 80) return 'Tier 1'
  if (pct > 70) return 'Tier 2'
  if (pct > 60) return 'Tier 3'
  return null
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Assessments() {
  const { accessToken: token } = useAuthStore()

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

  const assessments: any[] = assessmentsData?.assessments || []
  const completed = assessments.filter(a => a.status === 'completed')
  const pending = assessments.filter(a => ['pending', 'invited', 'started'].includes(a.status))

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

                        {assessment.status === 'completed' && (
                          <div className="mt-3 flex flex-wrap items-center gap-2 md:gap-3">
                            {getTier(assessment.score, assessment.maxScore) && (
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${TIER_COLOR[getTier(assessment.score, assessment.maxScore)!]}`}>
                                {getTier(assessment.score, assessment.maxScore)}
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
                        <a
                          href={assessment.invitationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-xs md:text-sm font-medium bg-primary text-white hover:bg-primary/90"
                        >
                          <ExternalLink className="w-3 h-3 md:w-4 md:h-4" />
                          <span>{assessment.status === 'started' ? 'Continue Test' : 'Start Assessment'}</span>
                        </a>
                      )}
                      {assessment.status === 'completed' && assessment.reportUrl && (
                        <a
                          href={assessment.reportUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-xs md:text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50"
                        >
                          <ExternalLink className="w-3 h-3 md:w-4 md:h-4" />
                          <span className="hidden sm:inline">View Report</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </CandidateLayout>
  )
}
