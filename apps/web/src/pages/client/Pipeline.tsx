import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jobApi, applicationApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import {
  ArrowLeft,
  Users,
  Search,
  Filter,
  MoreVertical,
  ChevronRight,
  Award,
  Mail,
  Calendar,
  Zap,
  Bell,
  ChevronDown,
  LogOut,
  Eye,
  MessageSquare,
  X,
  Check
} from 'lucide-react'

const stages = [
  { key: 'new', label: 'New', color: 'bg-gray-100 border-gray-300' },
  { key: 'screening', label: 'Screening', color: 'bg-blue-50 border-blue-300' },
  { key: 'assessment', label: 'Assessment', color: 'bg-purple-50 border-purple-300' },
  { key: 'shortlisted', label: 'Shortlisted', color: 'bg-yellow-50 border-yellow-300' },
  { key: 'interview', label: 'Interview', color: 'bg-orange-50 border-orange-300' },
  { key: 'offer', label: 'Offer', color: 'bg-green-50 border-green-300' },
]

export default function Pipeline() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { user, logout } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null)

  // Fetch job details
  const { data: jobData } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobApi.getById(id!),
    enabled: !!id,
  })

  // Fetch pipeline
  const { data: pipelineData, isLoading } = useQuery({
    queryKey: ['pipeline', id],
    queryFn: () => applicationApi.getPipeline(id!),
    enabled: !!id,
  })

  const job = jobData?.data?.job
  const pipeline = pipelineData?.data?.pipeline || {}

  // Advance mutation
  const advanceMutation = useMutation({
    mutationFn: ({ appId, stage }: { appId: string; stage?: string }) =>
      applicationApi.advance(appId, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline', id] })
    },
  })

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: (appId: string) => applicationApi.reject(appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline', id] })
      setSelectedCandidate(null)
    },
  })

  const getUserInitials = () => {
    if (user?.profile?.firstName && user?.profile?.lastName) {
      return `${user.profile.firstName[0]}${user.profile.lastName[0]}`
    }
    return user?.email?.substring(0, 2).toUpperCase() || 'U'
  }

  const getStageApplications = (stage: string) => {
    const apps = pipeline[stage] || []
    if (!searchTerm) return apps
    return apps.filter((app: any) =>
      `${app.candidate?.firstName} ${app.candidate?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const handleAdvance = (appId: string, nextStage?: string) => {
    advanceMutation.mutate({ appId, stage: nextStage })
  }

  const handleReject = (appId: string) => {
    if (confirm('Are you sure you want to reject this candidate?')) {
      rejectMutation.mutate(appId)
    }
  }

  const totalCandidates = stages.reduce((acc, stage) => acc + (pipeline[stage.key]?.length || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200/40 bg-white/80 backdrop-blur-md">
        <div className="max-w-full mx-auto px-6 py-3">
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
              {job && (
                <div className="ml-4 pl-4 border-l">
                  <h1 className="font-semibold text-gray-900">{job.title}</h1>
                  <p className="text-sm text-gray-500">{totalCandidates} candidates</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search candidates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <button className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 relative transition-colors">
                <Bell className="w-5 h-5 text-gray-500" />
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

      {/* Kanban Board */}
      <main className="p-6 overflow-x-auto">
        {isLoading ? (
          <div className="flex gap-4">
            {stages.map((stage) => (
              <div key={stage.key} className="w-80 flex-shrink-0">
                <div className="bg-gray-100 rounded-xl p-4 h-[600px] animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-24 mb-4"></div>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 min-w-max">
            {stages.map((stage) => {
              const applications = getStageApplications(stage.key)
              return (
                <div key={stage.key} className="w-80 flex-shrink-0">
                  <div className={`rounded-xl p-4 ${stage.color} border-2 h-full min-h-[600px]`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">{stage.label}</h3>
                      <span className="px-2 py-1 bg-white rounded-full text-sm font-medium text-gray-600">
                        {applications.length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {applications.map((app: any) => (
                        <div
                          key={app.id}
                          onClick={() => setSelectedCandidate(app)}
                          className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                                {app.candidate?.firstName?.[0]}{app.candidate?.lastName?.[0]}
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {app.candidate?.firstName} {app.candidate?.lastName}
                                </h4>
                                <p className="text-sm text-gray-500">
                                  {app.candidate?.currentTitle || app.candidate?.headline}
                                </p>
                              </div>
                            </div>
                          </div>

                          {app.matchScore && (
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-sm text-gray-500">Match:</span>
                              <span className={`text-sm font-semibold ${app.matchScore >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                                {app.matchScore}%
                              </span>
                            </div>
                          )}

                          {app.candidate?.skills?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {app.candidate.skills.slice(0, 3).map((skill: string, i: number) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                                >
                                  {skill}
                                </span>
                              ))}
                              {app.candidate.skills.length > 3 && (
                                <span className="text-xs text-gray-400">
                                  +{app.candidate.skills.length - 3}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-3 border-t">
                            <p className="text-xs text-gray-400">
                              {new Date(app.appliedAt).toLocaleDateString()}
                            </p>
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAdvance(app.id)
                                }}
                                className="p-1.5 hover:bg-green-50 rounded text-green-600"
                                title="Advance"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleReject(app.id)
                                }}
                                className="p-1.5 hover:bg-red-50 rounded text-red-600"
                                title="Reject"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {applications.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No candidates</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Rejected Column */}
            <div className="w-80 flex-shrink-0">
              <div className="rounded-xl p-4 bg-red-50 border-2 border-red-200 h-full min-h-[600px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Rejected</h3>
                  <span className="px-2 py-1 bg-white rounded-full text-sm font-medium text-gray-600">
                    {(pipeline['rejected'] || []).length}
                  </span>
                </div>

                <div className="space-y-3">
                  {(pipeline['rejected'] || []).map((app: any) => (
                    <div
                      key={app.id}
                      className="bg-white rounded-lg p-4 shadow-sm opacity-60"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-semibold">
                          {app.candidate?.firstName?.[0]}{app.candidate?.lastName?.[0]}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-700">
                            {app.candidate?.firstName} {app.candidate?.lastName}
                          </h4>
                          <p className="text-sm text-gray-400">
                            {app.candidate?.currentTitle}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Candidate Detail Sidebar */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-black/30 z-50 flex justify-end">
          <div className="w-[480px] bg-white h-full overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Candidate Details</h2>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              {/* Candidate Header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-semibold">
                  {selectedCandidate.candidate?.firstName?.[0]}{selectedCandidate.candidate?.lastName?.[0]}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedCandidate.candidate?.firstName} {selectedCandidate.candidate?.lastName}
                  </h3>
                  <p className="text-gray-600">{selectedCandidate.candidate?.headline}</p>
                  <p className="text-sm text-gray-500">
                    {selectedCandidate.candidate?.location}
                  </p>
                </div>
              </div>

              {/* Match Score */}
              {selectedCandidate.matchScore && (
                <div className="bg-green-50 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-green-700 font-medium">AI Match Score</span>
                    <span className="text-2xl font-bold text-green-600">{selectedCandidate.matchScore}%</span>
                  </div>
                  {selectedCandidate.aiSummary && (
                    <p className="text-sm text-green-700 mt-2">{selectedCandidate.aiSummary}</p>
                  )}
                </div>
              )}

              {/* Experience */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Experience</h4>
                <div className="space-y-2">
                  {selectedCandidate.candidate?.currentCompany && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="font-medium">{selectedCandidate.candidate.currentTitle}</span>
                      <span>at</span>
                      <span>{selectedCandidate.candidate.currentCompany}</span>
                    </div>
                  )}
                  {selectedCandidate.candidate?.experienceYears && (
                    <p className="text-gray-600">
                      {selectedCandidate.candidate.experienceYears} years of experience
                    </p>
                  )}
                </div>
              </div>

              {/* Skills */}
              {selectedCandidate.candidate?.skills?.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCandidate.candidate.skills.map((skill: string, i: number) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Skill Badges */}
              {selectedCandidate.candidate?.skillBadges?.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Verified Skills</h4>
                  <div className="space-y-2">
                    {selectedCandidate.candidate.skillBadges.map((badge: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 bg-purple-50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Award className="w-5 h-5 text-purple-600" />
                          <span className="font-medium text-purple-700">{badge.skillName}</span>
                        </div>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                          {badge.badgeLevel}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cover Letter */}
              {selectedCandidate.coverLetter && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Cover Letter</h4>
                  <p className="text-gray-600 whitespace-pre-wrap">{selectedCandidate.coverLetter}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => handleAdvance(selectedCandidate.id)}
                  disabled={advanceMutation.isPending}
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Advance
                </button>
                <button
                  onClick={() => handleReject(selectedCandidate.id)}
                  disabled={rejectMutation.isPending}
                  className="flex-1 px-4 py-3 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Reject
                </button>
              </div>

              <div className="flex gap-3 mt-3">
                <button className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 flex items-center justify-center gap-2">
                  <Mail className="w-5 h-5" />
                  Email
                </button>
                <button className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 flex items-center justify-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Schedule
                </button>
              </div>

              {selectedCandidate.candidate?.resumeUrl && (
                <a
                  href={selectedCandidate.candidate.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full mt-3 px-4 py-3 text-center border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                >
                  <Eye className="w-5 h-5 inline mr-2" />
                  View Resume
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
