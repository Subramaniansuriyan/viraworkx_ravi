import { useQuery } from '@tanstack/react-query'
import { candidateApi } from '../../services/api'
import {
  Calendar,
  Clock,
  Building2,
  Video,
  MapPin,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import CandidateLayout from '../../components/candidate/CandidateLayout'

export default function CandidateInterviews() {
  const { data: applicationsData, isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: candidateApi.getApplications,
  })

  const applications = applicationsData?.data?.applications || []
  const interviewApps = applications.filter((a: any) =>
    ['interview', 'shortlisted', 'offer', 'hired'].includes(a.stage)
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'shortlisted': return 'Shortlisted'
      case 'interview': return 'Interview Scheduled'
      case 'offer': return 'Offer Extended'
      case 'hired': return 'Hired'
      default: return stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }

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
          <p className="text-gray-600 text-sm md:text-base">
            Your active interviews and shortlisted positions
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-gray-600 text-sm mb-1">Shortlisted</p>
            <p className="text-2xl font-bold text-yellow-600">
              {applications.filter((a: any) => a.stage === 'shortlisted').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-gray-600 text-sm mb-1">Interviews</p>
            <p className="text-2xl font-bold text-blue-600">
              {applications.filter((a: any) => a.stage === 'interview').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-gray-600 text-sm mb-1">Offers</p>
            <p className="text-2xl font-bold text-green-600">
              {applications.filter((a: any) => a.stage === 'offer').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-gray-600 text-sm mb-1">Hired</p>
            <p className="text-2xl font-bold text-gray-900">
              {applications.filter((a: any) => a.stage === 'hired').length}
            </p>
          </div>
        </div>

        {/* Interviews List */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 md:p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Active Processes</h2>
          </div>

          {isLoading ? (
            <div className="p-8 space-y-4">
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
          ) : interviewApps.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No active interviews</h3>
              <p className="text-gray-600 mb-2">
                You'll see interviews here once you're shortlisted by a company.
              </p>
              <p className="text-sm text-gray-500">
                Interview invitations and meeting links are sent to your registered email.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {interviewApps.map((application: any) => (
                <div key={application.id} className="p-4 md:p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3 md:gap-4 min-w-0">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{application.job?.title}</p>
                        <p className="text-sm text-gray-500 truncate">{application.job?.client?.companyName}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                          {application.job?.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 shrink-0" />
                              {application.job.location}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 shrink-0" />
                            Applied {formatDate(application.appliedAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStageColor(application.stage)}`}>
                        {getStageLabel(application.stage)}
                      </span>
                    </div>
                  </div>

                  {/* Interview notice */}
                  {application.stage === 'interview' && (
                    <div className="mt-3 ml-13 md:ml-16 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
                      <Video className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-blue-700">
                        Interview details including meeting link and schedule have been sent to your email.
                        Please check your inbox.
                      </p>
                    </div>
                  )}

                  {application.stage === 'offer' && (
                    <div className="mt-3 ml-13 md:ml-16 p-3 bg-green-50 rounded-lg flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-green-700">
                        Congratulations! You have an offer. Check your email for the offer letter details.
                      </p>
                    </div>
                  )}

                  {application.stage === 'shortlisted' && (
                    <div className="mt-3 ml-13 md:ml-16 p-3 bg-yellow-50 rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-yellow-700">
                        You've been shortlisted. The ViraWorkX team will reach out to schedule your interview.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </CandidateLayout>
  )
}
