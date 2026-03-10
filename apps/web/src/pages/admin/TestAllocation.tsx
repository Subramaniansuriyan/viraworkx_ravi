import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bot, Shield, AlertTriangle, CheckCircle, Target, MapPin, Briefcase,
  Award, X, Send, Star
} from 'lucide-react'
import api from '../../services/api'
import AdminLayout from '../../components/admin/AdminLayout'

interface PendingCandidate {
  applicationId: string
  candidateId: string
  jobId: string
  candidate: {
    id: string
    firstName: string
    lastName: string
    email: string
    headline: string
    location: string
    experienceYears: number
    skills: string[]
    profileScore: number
    badges: Array<{ skillName: string; level: string; percentile: number }>
    assessmentTier?: string
  }
  job: {
    id: string
    title: string
    company: string
    companyLogo: string
    skillsRequired: string[]
    recommendedTestId: string
  }
  matchScore: number
  aiSummary: string
  appliedAt: string
  stage: string
}

interface Test {
  id: string
  name: string
  category: string
  duration: number
  skills: string[]
  difficulty: string
}

export default function TestAllocation() {

  const queryClient = useQueryClient()
  const [selectedCandidate, setSelectedCandidate] = useState<PendingCandidate | null>(null)
  const [selectedTestId, setSelectedTestId] = useState('')
  const [allocationNotes, setAllocationNotes] = useState('')
  const [expiresInDays, setExpiresInDays] = useState(7)

  // Fetch pending candidates for allocation
  const { data: pendingData, isLoading: loadingPending } = useQuery({
    queryKey: ['pendingAllocation'],
    queryFn: async () => {
      const res = await api.get('/assessments/admin/pending-allocation')
      return res.data
    },
    refetchInterval: 30000
  })

  // Fetch available tests
  const { data: testsData } = useQuery({
    queryKey: ['availableTests'],
    queryFn: async () => {
      const res = await api.get('/assessments/tests')
      return res.data
    }
  })

  // Allocate test mutation
  const allocateMutation = useMutation({
    mutationFn: async (data: { applicationId: string; testId: string; expiresInDays: number; notes: string }) => {
      const res = await api.post('/assessments/admin/allocate', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingAllocation'] })
      setSelectedCandidate(null)
      setSelectedTestId('')
      setAllocationNotes('')
    }
  })

  const candidates: PendingCandidate[] = pendingData?.candidates || []
  const tests: Test[] = testsData?.tests || []

  const handleAllocate = () => {
    if (!selectedCandidate || !selectedTestId) return

    allocateMutation.mutate({
      applicationId: selectedCandidate.applicationId,
      testId: selectedTestId,
      expiresInDays,
      notes: allocationNotes
    })
  }

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Test Allocation</h1>
            <p className="text-gray-600">Assign assessments to matched candidates</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-orange-100 text-orange-700 px-4 py-2 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">{candidates.length} pending allocation</span>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Human-in-the-Loop Workflow</p>
              <p className="text-sm text-blue-700 mt-1">
                Review AI-screened candidates below and manually allocate assessments.
                Only candidates with established match scores appear here.
              </p>
            </div>
          </div>
        </div>

        {/* Candidates List */}
        {loadingPending ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading candidates...</p>
          </div>
        ) : candidates.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-500">No candidates pending test allocation</p>
          </div>
        ) : (
          <div className="space-y-4">
            {candidates.map((candidate) => (
              <div
                key={candidate.applicationId}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    {/* Candidate Info */}
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                        {candidate.candidate.firstName[0]}{candidate.candidate.lastName[0]}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {candidate.candidate.firstName} {candidate.candidate.lastName}
                        </h3>
                        <p className="text-gray-600">{candidate.candidate.headline || 'No headline'}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {candidate.candidate.location || 'Unknown'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            {candidate.candidate.experienceYears || 0} years
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4" />
                            Profile: {candidate.candidate.profileScore}%
                          </span>
                          {candidate.candidate.assessmentTier && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              candidate.candidate.assessmentTier === 'Tier 1' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                              candidate.candidate.assessmentTier === 'Tier 2' ? 'bg-gray-100 text-gray-700 border border-gray-300' :
                              'bg-orange-100 text-orange-700 border border-orange-300'
                            }`}>
                              {candidate.candidate.assessmentTier}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Match Score */}
                    <div className="text-right">
                      <div className={`inline-flex items-center px-4 py-2 rounded-xl ${getMatchScoreColor(candidate.matchScore)}`}>
                        <span className="text-2xl font-bold">{candidate.matchScore}%</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Match Score</p>
                    </div>
                  </div>

                  {/* Job Applied For */}
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase font-medium mb-2">Applied For</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{candidate.job.title}</p>
                        <p className="text-sm text-gray-600">{candidate.job.company}</p>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <p>Applied {new Date(candidate.appliedAt).toLocaleDateString()}</p>
                        {candidate.job.recommendedTestId && (
                          <p className="text-primary">Recommended: {candidate.job.recommendedTestId}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 uppercase font-medium mb-2">Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {candidate.candidate.skills.slice(0, 8).map((skill, i) => {
                        const isRequired = candidate.job.skillsRequired.some(
                          s => s.toLowerCase() === skill.toLowerCase()
                        )
                        return (
                          <span
                            key={i}
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              isRequired
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {skill}
                            {isRequired && ' ✓'}
                          </span>
                        )
                      })}
                    </div>
                  </div>

                  {/* Badges */}
                  {candidate.candidate.badges.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-gray-500 uppercase font-medium mb-2">Verified Badges</p>
                      <div className="flex gap-2">
                        {candidate.candidate.badges.map((badge, i) => (
                          <span
                            key={i}
                            className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium"
                          >
                            <Award className="w-3 h-3" />
                            {badge.skillName} ({badge.level})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Summary */}
                  {candidate.aiSummary && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-xs text-blue-600 font-medium mb-1 flex items-center gap-1">
                        <Bot className="w-3 h-3" /> AI Summary
                      </p>
                      <p className="text-sm text-blue-900">{candidate.aiSummary}</p>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => {
                        setSelectedCandidate(candidate)
                        setSelectedTestId(candidate.job.recommendedTestId || '')
                      }}
                      className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-700 flex items-center gap-2"
                    >
                      <Target className="w-5 h-5" />
                      Allocate Test
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Allocation Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedCandidate(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg m-4">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Allocate Assessment</h2>
                <p className="text-sm text-gray-500">
                  For {selectedCandidate.candidate.firstName} {selectedCandidate.candidate.lastName}
                </p>
              </div>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Candidate Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{selectedCandidate.job.title}</p>
                    <p className="text-sm text-gray-500">{selectedCandidate.job.company}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-lg ${getMatchScoreColor(selectedCandidate.matchScore)}`}>
                    <span className="font-bold">{selectedCandidate.matchScore}% Match</span>
                  </div>
                </div>
              </div>

              {/* Select Test */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Assessment Test
                </label>
                <select
                  value={selectedTestId}
                  onChange={(e) => setSelectedTestId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Choose a test...</option>
                  {tests.map((test) => (
                    <option key={test.id} value={test.id}>
                      {test.name} ({test.duration} min) - {test.difficulty}
                    </option>
                  ))}
                </select>
                {selectedCandidate.job.recommendedTestId && (
                  <p className="text-xs text-green-600 mt-1">
                    Recommended: {tests.find(t => t.id === selectedCandidate.job.recommendedTestId)?.name}
                  </p>
                )}
              </div>

              {/* Expiration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expires In (Days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 7)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={allocationNotes}
                  onChange={(e) => setAllocationNotes(e.target.value)}
                  placeholder="Add any notes about this allocation..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setSelectedCandidate(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAllocate}
                disabled={!selectedTestId || allocateMutation.isPending}
                className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
              >
                {allocateMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Allocating...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Allocate & Send Invite
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
