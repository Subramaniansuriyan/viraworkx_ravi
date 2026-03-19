import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jobApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import {
  ArrowLeft,
  MapPin,
  DollarSign,
  Clock,
  Building2,
  Wifi,
  Calendar,
  Users,
  CheckCircle,
  AlertCircle,
  Briefcase,
  Globe,
  Share2,
  Bookmark
} from 'lucide-react'

export default function JobDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isAuthenticated, user } = useAuthStore()
  const [coverLetter, setCoverLetter] = useState('')
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobApi.getById(id!),
    enabled: !!id,
  })

  const applyMutation = useMutation({
    mutationFn: (data: { coverLetter?: string }) => jobApi.apply(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', id] })
      setShowApplyModal(false)
      alert('Application submitted successfully!')
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Failed to apply')
    },
  })

  const job = data?.data?.job

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Job Not Found</h2>
          <p className="text-gray-600 mb-4">This job may have been removed or is no longer available.</p>
          <Link to="/jobs" className="text-primary-600 hover:text-primary-700">
            Browse all jobs
          </Link>
        </div>
      </div>
    )
  }

  const formatSalary = (min?: number, max?: number, currency = 'USD') => {
    if (!min && !max) return 'Competitive salary'
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    })
    if (min && max) return `${formatter.format(min)} - ${formatter.format(max)} / year`
    if (min) return `From ${formatter.format(min)} / year`
    return `Up to ${formatter.format(max!)} / year`
  }

  const handleApply = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/jobs/${id}` } })
      return
    }
    if (user?.userType !== 'candidate') {
      alert('Only candidates can apply for jobs')
      return
    }
    setShowApplyModal(true)
  }

  const submitApplication = () => {
    applyMutation.mutate({ coverLetter: coverLetter || undefined })
  }

  const handleSave = async () => {
    if (!isAuthenticated || user?.userType !== 'candidate') return
    setSaving(true)
    try {
      const res = await jobApi.saveJob(id!)
      setSaved(res.data.saved)
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/jobs" className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to jobs
            </Link>
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <Share2 className="w-5 h-5" />
              </button>
              {isAuthenticated && user?.userType === 'candidate' && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${saved ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                  title={saved ? 'Remove from saved' : 'Save job'}
                >
                  <Bookmark className={`w-5 h-5 ${saved ? 'fill-current' : ''}`} />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Header */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  {job.client?.companyLogoUrl ? (
                    <img src={job.client.companyLogoUrl} alt="" className="w-12 h-12 rounded" />
                  ) : (
                    <Building2 className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">{job.title}</h1>
                  <p className="text-lg text-gray-600">{job.client?.companyName}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                {job.location && (
                  <span className="flex items-center text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                    {job.location}
                  </span>
                )}
                {job.remotePolicy && (
                  <span className="flex items-center text-gray-600">
                    <Wifi className="w-4 h-4 mr-2 text-gray-400" />
                    {job.remotePolicy === 'remote' ? 'Fully Remote' : job.remotePolicy === 'hybrid' ? 'Hybrid' : 'On-site'}
                  </span>
                )}
                {job.employmentType && (
                  <span className="flex items-center text-gray-600">
                    <Clock className="w-4 h-4 mr-2 text-gray-400" />
                    {job.employmentType.replace('_', ' ')}
                  </span>
                )}
                {(job.experienceMin || job.experienceMax) && (
                  <span className="flex items-center text-gray-600">
                    <Briefcase className="w-4 h-4 mr-2 text-gray-400" />
                    {job.experienceMin && job.experienceMax
                      ? `${job.experienceMin}-${job.experienceMax} years`
                      : job.experienceMin
                      ? `${job.experienceMin}+ years`
                      : `Up to ${job.experienceMax} years`}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {job.description && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">About this role</h2>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-600 whitespace-pre-wrap">{job.description}</p>
                </div>
              </div>
            )}

            {/* Requirements */}
            {job.requirements && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Requirements</h2>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-600 whitespace-pre-wrap">{job.requirements}</p>
                </div>
              </div>
            )}

            {/* Responsibilities */}
            {job.responsibilities && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Responsibilities</h2>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-600 whitespace-pre-wrap">{job.responsibilities}</p>
                </div>
              </div>
            )}

            {/* Skills */}
            {job.skillsRequired?.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Required Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {job.skillsRequired.map((skill: string) => (
                    <span
                      key={skill}
                      className="px-3 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
                {job.skillsPreferred && job.skillsPreferred.length > 0 && (
                  <>
                    <h3 className="text-md font-medium text-gray-900 mt-6 mb-3">Nice to have</h3>
                    <div className="flex flex-wrap gap-2">
                      {job.skillsPreferred.map((skill: string) => (
                        <span
                          key={skill}
                          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Benefits */}
            {job.benefits && job.benefits.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Benefits</h2>
                <ul className="space-y-2">
                  {job.benefits.map((benefit: string, i: number) => (
                    <li key={i} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Apply Card */}
            <div className="bg-white rounded-xl p-6 shadow-sm sticky top-24">
              <div className="mb-6">
                <p className="text-2xl font-bold text-gray-900">
                  {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}
                </p>
              </div>

              <button
                onClick={handleApply}
                className="w-full py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors mb-4"
              >
                Apply Now
              </button>

              <p className="text-sm text-gray-500 text-center">
                {job._count?.applications || 0} applicants
              </p>
            </div>

            {/* Company Card */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">About the company</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{job.client?.companyName}</p>
                  {job.client?.industry && (
                    <p className="text-sm text-gray-500">{job.client.industry}</p>
                  )}
                </div>
              </div>
              {job.client?.description && (
                <p className="text-sm text-gray-600">{job.client.description}</p>
              )}
            </div>

            {/* Posted Date */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="w-4 h-4 mr-2" />
                Posted {job.postedAt ? new Date(job.postedAt).toLocaleDateString() : new Date(job.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Apply for {job.title}
            </h2>
            <p className="text-gray-600 mb-6">
              Your profile information will be shared with {job.client?.companyName}.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cover Letter (optional)
              </label>
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={6}
                placeholder="Tell the hiring team why you're interested in this role..."
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowApplyModal(false)}
                className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitApplication}
                disabled={applyMutation.isPending}
                className="flex-1 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50"
              >
                {applyMutation.isPending ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
