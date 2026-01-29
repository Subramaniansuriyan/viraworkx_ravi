import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { candidateApi, jobApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import {
  Briefcase,
  FileText,
  Award,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  MapPin,
  Building2,
  User,
  Bell,
  Settings,
  LogOut
} from 'lucide-react'

export default function CandidateDashboard() {
  const { user, logout } = useAuthStore()

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: candidateApi.getProfile,
  })

  const { data: applicationsData } = useQuery({
    queryKey: ['applications'],
    queryFn: candidateApi.getApplications,
  })

  const { data: jobMatchesData } = useQuery({
    queryKey: ['jobMatches'],
    queryFn: candidateApi.getJobMatches,
  })

  const profile = profileData?.data?.profile
  const applications = applicationsData?.data?.applications || []
  const jobMatches = jobMatchesData?.data?.jobs || []
  const matchScores = jobMatchesData?.data?.matchScores || {}

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
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatStage = (stage: string) => {
    return stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r z-10">
        <div className="p-6 border-b">
          <Link to="/" className="text-2xl font-bold text-primary-600">ViraWorkx</Link>
        </div>

        <nav className="p-4">
          <ul className="space-y-1">
            <li>
              <Link
                to="/dashboard"
                className="flex items-center px-4 py-3 text-primary-600 bg-primary-50 rounded-lg font-medium"
              >
                <TrendingUp className="w-5 h-5 mr-3" />
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                to="/profile"
                className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <User className="w-5 h-5 mr-3" />
                My Profile
              </Link>
            </li>
            <li>
              <Link
                to="/jobs"
                className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <Briefcase className="w-5 h-5 mr-3" />
                Find Jobs
              </Link>
            </li>
            <li>
              <Link
                to="/applications"
                className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <FileText className="w-5 h-5 mr-3" />
                My Applications
              </Link>
            </li>
            <li>
              <Link
                to="/assessments"
                className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <Award className="w-5 h-5 mr-3" />
                Assessments
              </Link>
            </li>
            <li>
              <Link
                to="/candidate/contracts"
                className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <FileText className="w-5 h-5 mr-3" />
                Contracts
              </Link>
            </li>
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <button
            onClick={() => logout()}
            className="flex items-center w-full px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {profile?.firstName || 'there'}!
            </h1>
            <p className="text-gray-600">Here's what's happening with your job search</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-400 hover:text-gray-600 relative">
              <Bell className="w-6 h-6" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <Link to="/profile" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-600 font-semibold">
                  {profile?.firstName?.[0]}{profile?.lastName?.[0]}
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{applications.length}</span>
            </div>
            <p className="text-gray-600">Total Applications</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {applications.filter(a => ['screening', 'assessment', 'interview'].includes(a.stage)).length}
              </span>
            </div>
            <p className="text-gray-600">In Progress</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {applications.filter(a => a.stage === 'offer').length}
              </span>
            </div>
            <p className="text-gray-600">Offers</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {profile?.skillBadges?.length || 0}
              </span>
            </div>
            <p className="text-gray-600">Skill Badges</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Applications */}
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Applications</h2>
              <Link to="/applications" className="text-primary-600 text-sm hover:underline">
                View all
              </Link>
            </div>
            <div className="divide-y">
              {applications.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No applications yet</p>
                  <Link
                    to="/jobs"
                    className="text-primary-600 hover:underline"
                  >
                    Browse jobs
                  </Link>
                </div>
              ) : (
                applications.slice(0, 5).map((app: any) => (
                  <div key={app.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{app.job?.title}</p>
                        <p className="text-sm text-gray-500">{app.job?.client?.companyName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStageColor(app.stage)}`}>
                        {formatStage(app.stage)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Job Matches */}
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recommended Jobs</h2>
              <Link to="/jobs" className="text-primary-600 text-sm hover:underline">
                View all
              </Link>
            </div>
            <div className="divide-y">
              {jobMatches.length === 0 ? (
                <div className="p-8 text-center">
                  <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Complete your profile to get job matches</p>
                  <Link
                    to="/profile"
                    className="text-primary-600 hover:underline"
                  >
                    Update profile
                  </Link>
                </div>
              ) : (
                jobMatches.slice(0, 5).map((job: any) => (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.id}`}
                    className="block p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{job.title}</p>
                          <p className="text-sm text-gray-500">{job.client?.companyName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-green-600">
                          {matchScores[job.id] || 0}% match
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                    {job.location && (
                      <p className="text-sm text-gray-500 mt-2 ml-14 flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {job.location}
                      </p>
                    )}
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Profile Completion */}
        {profile && (
          <div className="mt-8 bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Profile Strength</h2>
              <span className="text-2xl font-bold text-primary-600">{profile.profileScore}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div
                className="bg-primary-600 rounded-full h-3 transition-all duration-500"
                style={{ width: `${profile.profileScore}%` }}
              ></div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              {!profile.headline && (
                <span className="flex items-center text-yellow-600">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Add a headline
                </span>
              )}
              {!profile.resumeUrl && (
                <span className="flex items-center text-yellow-600">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Upload your resume
                </span>
              )}
              {(!profile.skills || profile.skills.length === 0) && (
                <span className="flex items-center text-yellow-600">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Add your skills
                </span>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
