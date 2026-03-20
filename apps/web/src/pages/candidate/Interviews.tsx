import { useQuery } from '@tanstack/react-query'
import { candidateApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import {
  Calendar,
  Clock,
  Building2,
  Video,
  MapPin,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Phone,
  Monitor,
  Users,
} from 'lucide-react'
import CandidateLayout from '../../components/candidate/CandidateLayout'

const INTERVIEW_TYPE_ICON: Record<string, typeof Video> = {
  video: Video,
  phone: Phone,
  onsite: MapPin,
  technical: Monitor,
  panel: Users,
  ai_screening: Monitor,
  final: CheckCircle,
}

function formatDateTime(dateString: string, timezone?: string) {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function isUpcoming(dateString: string) {
  return new Date(dateString) > new Date()
}

export default function CandidateInterviews() {
  const { accessToken: token } = useAuthStore()

  const { data: interviewsData, isLoading: interviewsLoading } = useQuery({
    queryKey: ['candidateInterviews'],
    queryFn: async () => {
      const res = await fetch(`/api/v1/interviews`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    enabled: !!token,
  })

  const { data: applicationsData, isLoading: appsLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: candidateApi.getApplications,
  })

  const interviews: any[] = interviewsData?.interviews || []
  const applications = applicationsData?.data?.applications || []

  const upcoming = interviews.filter(i => i.scheduledAt && isUpcoming(i.scheduledAt) && i.status !== 'cancelled')
  const past = interviews.filter(i => i.scheduledAt && !isUpcoming(i.scheduledAt))

  const shortlisted = applications.filter((a: any) => a.stage === 'shortlisted')
  const offers = applications.filter((a: any) => a.stage === 'offer')
  const hired = applications.filter((a: any) => a.stage === 'hired')

  const isLoading = interviewsLoading || appsLoading

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'shortlisted': return 'bg-yellow-100 text-yellow-800'
      case 'interview': return 'bg-blue-100 text-blue-800'
      case 'offer': return 'bg-green-100 text-green-800'
      case 'hired': return 'bg-green-500 text-white'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <CandidateLayout>
      <div className="p-4 md:p-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Interviews</h1>
          <p className="text-gray-600 text-sm md:text-base">Your scheduled interviews and active processes</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-gray-600 text-sm mb-1">Upcoming</p>
            <p className="text-2xl font-bold text-blue-600">{upcoming.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-gray-600 text-sm mb-1">Shortlisted</p>
            <p className="text-2xl font-bold text-yellow-600">{shortlisted.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-gray-600 text-sm mb-1">Offers</p>
            <p className="text-2xl font-bold text-green-600">{offers.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-gray-600 text-sm mb-1">Hired</p>
            <p className="text-2xl font-bold text-gray-900">{hired.length}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl shadow-sm p-8 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg shrink-0" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Upcoming Interviews */}
            <div className="bg-white rounded-xl shadow-sm mb-6">
              <div className="p-4 md:p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Upcoming Interviews</h2>
              </div>
              {upcoming.length === 0 ? (
                <div className="p-8 text-center">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No upcoming interviews scheduled</p>
                  <p className="text-xs text-gray-400 mt-1">Interview invitations will also be sent to your email</p>
                </div>
              ) : (
                <div className="divide-y">
                  {upcoming.map((interview: any) => {
                    const TypeIcon = INTERVIEW_TYPE_ICON[interview.interviewType || 'video'] || Video
                    return (
                      <div key={interview.id} className="p-4 md:p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                              <TypeIcon className="w-5 h-5 text-blue-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate">
                                {interview.title || interview.application?.job?.title || 'Interview'}
                              </p>
                              <p className="text-sm text-gray-500 truncate">
                                {interview.application?.job?.client?.companyName}
                              </p>
                              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4 shrink-0" />
                                  {formatDateTime(interview.scheduledAt)}
                                </span>
                                {interview.durationMinutes && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4 shrink-0" />
                                    {interview.durationMinutes} min
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full shrink-0 capitalize">
                            {(interview.interviewType || 'video').replace('_', ' ')}
                          </span>
                        </div>

                        {interview.meetingUrl && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <Video className="w-4 h-4 text-blue-600 shrink-0" />
                              <span className="text-sm text-blue-700 truncate">Meeting link ready</span>
                            </div>
                            <a
                              href={interview.meetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 shrink-0"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Join
                            </a>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Shortlisted (awaiting schedule) */}
            {shortlisted.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm mb-6">
                <div className="p-4 md:p-6 border-b">
                  <h2 className="text-lg font-semibold text-gray-900">Shortlisted — Awaiting Schedule</h2>
                </div>
                <div className="divide-y">
                  {shortlisted.map((app: any) => (
                    <div key={app.id} className="p-4 md:p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5 text-yellow-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 truncate">{app.job?.title}</p>
                          <p className="text-sm text-gray-500 truncate">{app.job?.client?.companyName}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 ${getStageColor('shortlisted')}`}>
                          Shortlisted
                        </span>
                      </div>
                      <div className="mt-3 p-3 bg-yellow-50 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-700">
                          The ViraWorkX team will reach out to schedule your interview soon.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Offers */}
            {offers.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm mb-6">
                <div className="p-4 md:p-6 border-b">
                  <h2 className="text-lg font-semibold text-gray-900">Offers Extended</h2>
                </div>
                <div className="divide-y">
                  {offers.map((app: any) => (
                    <div key={app.id} className="p-4 md:p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 truncate">{app.job?.title}</p>
                          <p className="text-sm text-gray-500 truncate">{app.job?.client?.companyName}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 ${getStageColor('offer')}`}>
                          Offer Extended
                        </span>
                      </div>
                      <div className="mt-3 p-3 bg-green-50 rounded-lg flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-green-700">
                          Congratulations! You have an offer. Check your email for the offer letter details and next steps.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past Interviews */}
            {past.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm">
                <div className="p-4 md:p-6 border-b">
                  <h2 className="text-lg font-semibold text-gray-900">Past Interviews</h2>
                </div>
                <div className="divide-y">
                  {past.map((interview: any) => (
                    <div key={interview.id} className="p-4 md:p-6 opacity-75">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                          <Calendar className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-700 truncate">
                            {interview.title || interview.application?.job?.title || 'Interview'}
                          </p>
                          <p className="text-sm text-gray-400">
                            {formatDate(interview.scheduledAt)} · {interview.application?.job?.client?.companyName}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full shrink-0 ${
                          interview.status === 'completed' ? 'bg-green-100 text-green-700' :
                          interview.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {interview.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {upcoming.length === 0 && shortlisted.length === 0 && offers.length === 0 && past.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No interviews yet</h3>
                <p className="text-gray-600">You'll see interviews here once you're shortlisted by a company.</p>
              </div>
            )}
          </>
        )}
      </div>
    </CandidateLayout>
  )
}
