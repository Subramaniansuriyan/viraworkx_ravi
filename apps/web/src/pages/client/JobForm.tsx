import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jobApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import {
  ArrowLeft,
  Save,
  Eye,
  Zap,
  X,
  Plus,
  Bell,
  ChevronDown,
  LogOut
} from 'lucide-react'

type EmploymentType = 'freelancer' | 'contractor'
type RemotePolicy = 'remote' | 'hybrid' | 'onsite'

interface JobFormData {
  title: string
  description: string
  requirements: string
  responsibilities: string
  department: string
  employmentType: EmploymentType
  experienceMin: number | ''
  experienceMax: number | ''
  salaryMin: number | ''
  salaryMax: number | ''
  salaryCurrency: string
  location: string
  remotePolicy: RemotePolicy
  skillsRequired: string[]
  skillsPreferred: string[]
}

const initialFormData: JobFormData = {
  title: '',
  description: '',
  requirements: '',
  responsibilities: '',
  department: '',
  employmentType: 'freelancer',
  experienceMin: '',
  experienceMax: '',
  salaryMin: '',
  salaryMax: '',
  salaryCurrency: 'USD',
  location: '',
  remotePolicy: 'remote',
  skillsRequired: [],
  skillsPreferred: [],
}

export default function JobForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, logout } = useAuthStore()
  const isEditing = !!id && id !== 'new'

  const [formData, setFormData] = useState<JobFormData>(initialFormData)
  const [newSkill, setNewSkill] = useState('')
  const [newPreferredSkill, setNewPreferredSkill] = useState('')

  // Fetch existing job data if editing
  const { data: jobData, isLoading: jobLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobApi.getById(id!),
    enabled: isEditing,
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => jobApi.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['client-jobs'] })
      navigate(`/client/jobs/${response.data.job.id}`)
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => jobApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-jobs'] })
      queryClient.invalidateQueries({ queryKey: ['job', id] })
      navigate(`/client/jobs/${id}`)
    },
  })

  // Populate form when editing
  useEffect(() => {
    if (jobData?.data?.job) {
      const job = jobData.data.job
      setFormData({
        title: job.title || '',
        description: job.description || '',
        requirements: job.requirements || '',
        responsibilities: job.responsibilities || '',
        department: job.department || '',
        employmentType: (job.employmentType || 'freelancer') as EmploymentType,
        experienceMin: job.experienceMin || '',
        experienceMax: job.experienceMax || '',
        salaryMin: job.salaryMin || '',
        salaryMax: job.salaryMax || '',
        salaryCurrency: job.salaryCurrency || 'USD',
        location: job.location || '',
        remotePolicy: (job.remotePolicy || 'remote') as RemotePolicy,
        skillsRequired: job.skillsRequired || [],
        skillsPreferred: job.skillsPreferred || [],
      })
    }
  }, [jobData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const submitData: any = {
      title: formData.title,
      description: formData.description,
      requirements: formData.requirements,
      responsibilities: formData.responsibilities,
      department: formData.department,
      employmentType: formData.employmentType,
      salaryCurrency: formData.salaryCurrency,
      location: formData.location,
      remotePolicy: formData.remotePolicy,
      skillsRequired: formData.skillsRequired,
      skillsPreferred: formData.skillsPreferred,
      experienceMin: formData.experienceMin === '' ? undefined : Number(formData.experienceMin),
      experienceMax: formData.experienceMax === '' ? undefined : Number(formData.experienceMax),
      salaryMin: formData.salaryMin === '' ? undefined : Number(formData.salaryMin),
      salaryMax: formData.salaryMax === '' ? undefined : Number(formData.salaryMax),
    }

    if (isEditing) {
      updateMutation.mutate(submitData)
    } else {
      createMutation.mutate(submitData)
    }
  }

  const addSkill = (type: 'required' | 'preferred') => {
    const skill = type === 'required' ? newSkill : newPreferredSkill
    if (!skill.trim()) return

    if (type === 'required') {
      setFormData({ ...formData, skillsRequired: [...formData.skillsRequired, skill.trim()] })
      setNewSkill('')
    } else {
      setFormData({ ...formData, skillsPreferred: [...formData.skillsPreferred, skill.trim()] })
      setNewPreferredSkill('')
    }
  }

  const removeSkill = (type: 'required' | 'preferred', index: number) => {
    if (type === 'required') {
      setFormData({
        ...formData,
        skillsRequired: formData.skillsRequired.filter((_, i) => i !== index)
      })
    } else {
      setFormData({
        ...formData,
        skillsPreferred: formData.skillsPreferred.filter((_, i) => i !== index)
      })
    }
  }

  const getUserInitials = () => {
    if (user?.profile?.firstName && user?.profile?.lastName) {
      return `${user.profile.firstName[0]}${user.profile.lastName[0]}`
    }
    return user?.email?.substring(0, 2).toUpperCase() || 'U'
  }

  if (jobLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200/40 bg-white/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/client/jobs"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold font-heading text-primary">ViraWorkX</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Job'}
              </button>

              <div className="relative group">
                <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium">
                    {getUserInitials()}
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
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
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Job' : 'Create New Job'}
          </h1>
          <p className="text-gray-600">Fill in the details to post a new job listing</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Basic Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Senior React Developer"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Engineering"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employment Type *
                  </label>
                  <select
                    required
                    value={formData.employmentType}
                    onChange={(e) => setFormData({ ...formData, employmentType: e.target.value as EmploymentType })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="freelancer">Freelancer</option>
                    <option value="contractor">Contractor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Description *
                </label>
                <textarea
                  required
                  rows={5}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the role, team, and what the candidate will be working on..."
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requirements
                </label>
                <textarea
                  rows={4}
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  placeholder="List the qualifications and requirements for this role..."
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Responsibilities
                </label>
                <textarea
                  rows={4}
                  value={formData.responsibilities}
                  onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                  placeholder="List the key responsibilities of this role..."
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Location & Remote */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Location</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. San Francisco, CA"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remote Policy *
                </label>
                <select
                  required
                  value={formData.remotePolicy}
                  onChange={(e) => setFormData({ ...formData, remotePolicy: e.target.value as RemotePolicy })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="remote">Fully Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">On-site</option>
                </select>
              </div>
            </div>
          </div>

          {/* Experience & Compensation */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Experience & Compensation</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Experience (Min years)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.experienceMin}
                  onChange={(e) => setFormData({ ...formData, experienceMin: e.target.value === '' ? '' : Number(e.target.value) })}
                  placeholder="e.g. 3"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Experience (Max years)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.experienceMax}
                  onChange={(e) => setFormData({ ...formData, experienceMax: e.target.value === '' ? '' : Number(e.target.value) })}
                  placeholder="e.g. 7"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salary Min
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.salaryMin}
                  onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value === '' ? '' : Number(e.target.value) })}
                  placeholder="e.g. 100000"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salary Max
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.salaryMax}
                  onChange={(e) => setFormData({ ...formData, salaryMax: e.target.value === '' ? '' : Number(e.target.value) })}
                  placeholder="e.g. 150000"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <select
                  value={formData.salaryCurrency}
                  onChange={(e) => setFormData({ ...formData, salaryCurrency: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="INR">INR</option>
                </select>
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Skills</h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required Skills
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill('required'))}
                  placeholder="Add a skill..."
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <button
                  type="button"
                  onClick={() => addSkill('required')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.skillsRequired.map((skill, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm flex items-center gap-1"
                  >
                    {skill}
                    <button type="button" onClick={() => removeSkill('required', i)}>
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Skills (Nice to have)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newPreferredSkill}
                  onChange={(e) => setNewPreferredSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill('preferred'))}
                  placeholder="Add a skill..."
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <button
                  type="button"
                  onClick={() => addSkill('preferred')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.skillsPreferred.map((skill, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm flex items-center gap-1"
                  >
                    {skill}
                    <button type="button" onClick={() => removeSkill('preferred', i)}>
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Link
              to="/client/jobs"
              className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : isEditing ? 'Update Job' : 'Create Job'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
