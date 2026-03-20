import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { candidateApi } from '../../services/api'
import {
  FileText,
  Briefcase,
  Building2,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
} from 'lucide-react'
import CandidateLayout from '../../components/candidate/CandidateLayout'

export default function Applications() {
  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: candidateApi.getProfile,
  })

  const { data: applicationsData, isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: candidateApi.getApplications,
  })

  const profile = profileData?.data?.profile
  const applications = applicationsData?.data?.applications || []

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'new':
      case 'screening':
        return 'bg-blue-100 text-blue-800'
      case 'assessment':
      case 'assessment_complete':
        return 'bg-purple-100 text-purple-800'
      case 'shortlisted':
      case 'interview':
        return 'bg-yellow-100 text-yellow-800'
      case 'offer':
        return 'bg-green-100 text-green-800'
      case 'hired':
        return 'bg-green-500 text-white'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'withdrawn':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'offer':
      case 'hired':
        return <CheckCircle className="w-4 h-4" />
      case 'rejected':
        return <XCircle className="w-4 h-4" />
      case 'assessment':
      case 'interview':
        return <Clock className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  const formatStage = (stage: string) => {
    return stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <CandidateLayout>
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">My Applications</h1>
          <p className="text-gray-600 text-sm md:text-base">Track the status of your job applications</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm">
            <p className="text-gray-600 text-xs md:text-sm mb-1">Total</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-900">{applications.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm">
            <p className="text-gray-600 text-xs md:text-sm mb-1">In Progress</p>
            <p className="text-2xl md:text-3xl font-bold text-yellow-600">
              {applications.filter((a: any) => ['screening', 'assessment', 'interview', 'shortlisted'].includes(a.stage)).length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm">
            <p className="text-gray-600 text-xs md:text-sm mb-1">Offers</p>
            <p className="text-2xl md:text-3xl font-bold text-green-600">
              {applications.filter((a: any) => a.stage === 'offer').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm">
            <p className="text-gray-600 text-xs md:text-sm mb-1">Response Rate</p>
            <p className="text-2xl md:text-3xl font-bold text-primary-600">
              {applications.length > 0
                ? Math.round((applications.filter((a: any) => a.stage !== 'new').length / applications.length) * 100)
                : 0}%
            </p>
          </div>
        </div>

        {/* Applications List */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 md:p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">All Applications</h2>
          </div>

          {isLoading ? (
            <div className="p-8 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg shrink-0"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-24"></div>
                </div>
              ))}
            </div>
          ) : applications.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No applications yet</h3>
              <p className="text-gray-600 mb-6">Start applying to jobs to track your progress here</p>
              <Link
                to="/jobs"
                className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
              >
                <Briefcase className="w-5 h-5 mr-2" />
                Browse Jobs
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {applications.map((application: any) => (
                <div key={application.id} className="p-4 md:p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start md:items-center justify-between gap-4">
                    <div className="flex items-start md:items-center gap-3 md:gap-4 min-w-0">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <Link
                          to={`/jobs/${application.job?.id}`}
                          className="font-semibold text-gray-900 hover:text-primary-600 block truncate"
                        >
                          {application.job?.title}
                        </Link>
                        <p className="text-sm text-gray-500 truncate">{application.job?.client?.companyName}</p>
                        <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-1 text-xs md:text-sm text-gray-500">
                          {application.job?.location && (
                            <span className="flex items-center">
                              <MapPin className="w-3 h-3 mr-1 shrink-0" />
                              {application.job.location}
                            </span>
                          )}
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1 shrink-0" />
                            {formatDate(application.appliedAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4 shrink-0">
                      <span className={`px-2 md:px-4 py-1 md:py-2 rounded-lg text-xs md:text-sm font-medium flex items-center gap-1 md:gap-2 ${getStageColor(application.stage)}`}>
                        {getStageIcon(application.stage)}
                        <span className="hidden sm:inline">{formatStage(application.stage)}</span>
                      </span>
                      <Link to={`/jobs/${application.job?.id}`}>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </CandidateLayout>
  )
}
