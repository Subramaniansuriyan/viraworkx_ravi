import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jobApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import NotificationBell from '../../components/shared/NotificationBell'
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Users,
  Clock,
  MapPin,
  Edit,
  Trash2,
  Eye,
  Pause,
  Play,
  ChevronDown,
  LogOut,
  Copy,
  ArrowRight
} from 'lucide-react'

export default function ClientJobs() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, logout } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['client-jobs', statusFilter],
    queryFn: () => jobApi.getAll({ status: statusFilter || undefined }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => jobApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-jobs'] })
    },
  })

  const publishMutation = useMutation({
    mutationFn: (id: string) => jobApi.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-jobs'] })
    },
  })

  const closeMutation = useMutation({
    mutationFn: (id: string) => jobApi.close(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-jobs'] })
    },
  })

  const submitForReviewMutation = useMutation({
    mutationFn: (id: string) => jobApi.submitForReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-jobs'] })
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: (job: any) => jobApi.create({
      title: `${job.title} (Copy)`,
      description: job.description,
      requirements: job.requirements,
      responsibilities: job.responsibilities,
      employmentType: job.employmentType,
      location: job.location,
      remotePolicy: job.remotePolicy,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      skillsRequired: job.skillsRequired,
      department: job.department,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-jobs'] })
    },
  })

  const jobs = data?.data?.jobs || []

  const filteredJobs = jobs.filter((job: any) =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800'
      case 'paused':
        return 'bg-orange-100 text-orange-800'
      case 'closed':
        return 'bg-red-100 text-red-800'
      case 'filled':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getUserInitials = () => {
    if (user?.profile?.firstName && user?.profile?.lastName) {
      return `${user.profile.firstName[0]}${user.profile.lastName[0]}`
    }
    return user?.email?.substring(0, 2).toUpperCase() || 'U'
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this job?')) {
      deleteMutation.mutate(id)
    }
    setOpenMenu(null)
  }

  const handleToggleStatus = (job: any) => {
    if (job.status === 'active') {
      closeMutation.mutate(job.id)
    } else if (job.status === 'draft') {
      submitForReviewMutation.mutate(job.id)
    } else if (job.status === 'paused') {
      publishMutation.mutate(job.id)
    }
    setOpenMenu(null)
  }

  const handleDuplicate = (job: any) => {
    duplicateMutation.mutate(job)
    setOpenMenu(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200/40 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center">
                <img src="/logo-lockup.png" alt="ViraWorkX" className="h-9 w-auto" />
              </Link>

              <nav className="hidden md:flex items-center gap-6">
                <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
                <Link to="/client/jobs" className="text-primary-600 font-medium">Jobs</Link>
                <Link to="/client/contracts" className="text-gray-600 hover:text-gray-900">Contracts</Link>
                <Link to="/client/billing" className="text-gray-600 hover:text-gray-900">Billing</Link>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <NotificationBell />

              <div className="relative group">
                <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium">
                    {getUserInitials()}
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user?.profile?.companyName || user?.email}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Job Postings</h1>
            <p className="text-gray-600">Manage your job listings and track applications</p>
          </div>
          <Link
            to="/client/jobs/new"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Job
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Review</option>
              <option value="paused">Paused</option>
              <option value="closed">Closed</option>
              <option value="filled">Filled</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-600">Total Jobs</p>
            <p className="text-2xl font-bold text-gray-900">{jobs.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-600">Active</p>
            <p className="text-2xl font-bold text-green-600">
              {jobs.filter((j: any) => j.status === 'active').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-600">Draft</p>
            <p className="text-2xl font-bold text-gray-600">
              {jobs.filter((j: any) => j.status === 'draft').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-600">Total Applications</p>
            <p className="text-2xl font-bold text-primary-600">
              {jobs.reduce((acc: number, j: any) => acc + (j._count?.applications || 0), 0)}
            </p>
          </div>
        </div>

        {/* Jobs List */}
        <div className="bg-white rounded-xl shadow-sm">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-4">
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  </div>
                  <div className="h-8 bg-gray-200 rounded w-20"></div>
                </div>
              ))}
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="p-12 text-center">
              <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No jobs found</h3>
              <p className="text-gray-600 mb-6">Create your first job posting to start hiring</p>
              <Link
                to="/client/jobs/new"
                className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Job
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {filteredJobs.map((job: any) => (
                <div key={job.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Link
                          to={`/client/jobs/${job.id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-primary-600"
                        >
                          {job.title}
                        </Link>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(job.status)}`}>
                          {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {job.location && (
                          <span className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {job.location}
                          </span>
                        )}
                        {job.employmentType && (
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {job.employmentType.replace('_', ' ')}
                          </span>
                        )}
                        <span className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {job._count?.applications || 0} applicants
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/client/jobs/${job.id}/pipeline`}
                        className="px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg"
                      >
                        View Pipeline
                      </Link>
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === job.id ? null : job.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          <MoreVertical className="w-5 h-5 text-gray-400" />
                        </button>

                        {openMenu === job.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border py-1 z-10">
                            <Link
                              to={`/jobs/${job.id}`}
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Posting
                            </Link>
                            <Link
                              to={`/client/jobs/${job.id}/edit`}
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Job
                            </Link>
                            <button
                              onClick={() => handleToggleStatus(job)}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              {job.status === 'active' ? (
                                <>
                                  <Pause className="w-4 h-4 mr-2" />
                                  Close Job
                                </>
                              ) : job.status === 'draft' ? (
                                <>
                                  <ArrowRight className="w-4 h-4 mr-2" />
                                  Submit for Review
                                </>
                              ) : job.status === 'paused' ? (
                                <>
                                  <Play className="w-4 h-4 mr-2" />
                                  Publish Job
                                </>
                              ) : null}
                            </button>
                            <button
                              onClick={() => handleDuplicate(job)}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicate
                            </button>
                            <button
                              onClick={() => handleDelete(job.id)}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Job
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
