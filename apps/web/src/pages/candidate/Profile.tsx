import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  User, Mail, MapPin, Briefcase, Clock, Award, FileText, Video,
  Upload, Edit2, Plus, X, Check, AlertCircle, ExternalLink,
  Linkedin, Github, Globe, Zap, ChevronRight, Star, Shield,
  Calendar, TrendingUp, Target, Bell, LogOut, ChevronDown
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { candidateApi, assessmentApi } from '../../services/api'
import type { CandidateProfile, Assessment, SkillBadge } from '../../types'

// Badge level colors
const badgeLevelColors: Record<string, { bg: string; text: string; border: string }> = {
  expert: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  advanced: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  intermediate: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  beginner: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
}

// Assessment status colors
const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-gray-100', text: 'text-gray-600' },
  invited: { bg: 'bg-blue-100', text: 'text-blue-700' },
  started: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  completed: { bg: 'bg-green-100', text: 'text-green-700' },
  expired: { bg: 'bg-red-100', text: 'text-red-700' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-500' },
}

export default function CandidateProfile() {
  const { user, logout } = useAuthStore()
  const [profile, setProfile] = useState<CandidateProfile | null>(null)
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [badges, setBadges] = useState<SkillBadge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'assessments' | 'applications'>('overview')
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [newSkill, setNewSkill] = useState('')
  const [saving, setSaving] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    headline: '',
    location: '',
    experienceYears: 0,
    currentCompany: '',
    currentTitle: '',
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: '',
    expectedSalaryMin: 0,
    expectedSalaryMax: 0,
    panNumber: '',
    aadhaarNumber: '',
  })
  const [panError, setPanError] = useState('')
  const [aadhaarError, setAadhaarError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const panCardInputRef = useRef<HTMLInputElement>(null)
  const aadhaarFrontInputRef = useRef<HTMLInputElement>(null)
  const aadhaarBackInputRef = useRef<HTMLInputElement>(null)

  // Fetch profile data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const [profileRes, assessmentsRes] = await Promise.all([
          candidateApi.getProfile(),
          assessmentApi.getAll(),
        ])

        const profileData = profileRes.data.profile
        setProfile(profileData)
        setAssessments(assessmentsRes.data.assessments || [])

        // Fetch badges if we have a candidate ID
        if (profileData?.id) {
          const badgesRes = await candidateApi.getSkillBadges(profileData.id)
          setBadges(badgesRes.data.badges || [])
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Calculate profile completion
  const calculateProfileCompletion = (): { percentage: number; items: { label: string; completed: boolean }[] } => {
    if (!profile) return { percentage: 0, items: [] }

    const items = [
      { label: 'Basic info', completed: !!(profile.firstName && profile.lastName) },
      { label: 'Headline', completed: !!profile.headline },
      { label: 'Location', completed: !!profile.location },
      { label: 'Skills', completed: profile.skills?.length > 0 },
      { label: 'Experience', completed: !!profile.experienceYears },
      { label: 'Resume', completed: !!profile.resumeUrl },
      { label: 'LinkedIn', completed: !!profile.linkedinUrl },
      { label: 'Assessment', completed: assessments.some(a => a.status === 'completed') },
    ]

    const completed = items.filter(i => i.completed).length
    const percentage = Math.round((completed / items.length) * 100)

    return { percentage, items }
  }

  const profileCompletion = calculateProfileCompletion()

  // Save profile to backend
  const saveProfile = async (data: Partial<CandidateProfile>) => {
    try {
      setSaving(true)
      const response = await candidateApi.updateProfile(data)
      setProfile(response.data.profile)
      return true
    } catch (err: any) {
      console.error('Failed to save profile:', err)
      setError(err.response?.data?.error || 'Failed to save changes')
      return false
    } finally {
      setSaving(false)
    }
  }

  // Handle skill add
  const handleAddSkill = async () => {
    if (newSkill.trim() && profile) {
      const updatedSkills = [...(profile.skills || []), newSkill.trim()]
      const success = await saveProfile({ skills: updatedSkills })
      if (success) {
        setNewSkill('')
      }
    }
  }

  // Handle skill remove
  const handleRemoveSkill = async (skillToRemove: string) => {
    if (profile) {
      const updatedSkills = profile.skills.filter(s => s !== skillToRemove)
      await saveProfile({ skills: updatedSkills })
    }
  }

  // Open edit modal with current profile data
  const openEditModal = () => {
    if (profile) {
      setEditForm({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        headline: profile.headline || '',
        location: profile.location || '',
        experienceYears: profile.experienceYears || 0,
        currentCompany: profile.currentCompany || '',
        currentTitle: profile.currentTitle || '',
        linkedinUrl: profile.linkedinUrl || '',
        githubUrl: profile.githubUrl || '',
        portfolioUrl: profile.portfolioUrl || '',
        expectedSalaryMin: profile.expectedSalaryMin || 0,
        expectedSalaryMax: profile.expectedSalaryMax || 0,
        panNumber: profile.panNumber || '',
        aadhaarNumber: profile.aadhaarNumber || '',
      })
      setPanError('')
      setAadhaarError('')
      setShowEditModal(true)
    }
  }

  // Save edit form
  const handleSaveEdit = async () => {
    // Validate PAN format
    if (editForm.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(editForm.panNumber)) {
      setPanError('Invalid PAN format (e.g., ABCDE1234F)')
      return
    }
    setPanError('')

    // Validate Aadhaar format
    if (editForm.aadhaarNumber && !/^\d{12}$/.test(editForm.aadhaarNumber)) {
      setAadhaarError('Aadhaar must be exactly 12 digits')
      return
    }
    setAadhaarError('')

    const dataToSave: any = { ...editForm }
    if (!dataToSave.panNumber) dataToSave.panNumber = null
    if (!dataToSave.aadhaarNumber) dataToSave.aadhaarNumber = null

    const success = await saveProfile(dataToSave)
    if (success) {
      setShowEditModal(false)
    }
  }

  // Handle document uploads
  const handleDocumentUpload = async (
    type: 'panCard' | 'aadhaarFront' | 'aadhaarBack',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    try {
      setSaving(true)
      if (type === 'panCard') {
        const response = await candidateApi.uploadPanCard(file)
        setProfile({ ...profile, panCardUrl: response.data.panCardUrl })
      } else if (type === 'aadhaarFront') {
        const response = await candidateApi.uploadAadhaarFront(file)
        setProfile({ ...profile, aadhaarFrontUrl: response.data.aadhaarFrontUrl })
      } else {
        const response = await candidateApi.uploadAadhaarBack(file)
        setProfile({ ...profile, aadhaarBackUrl: response.data.aadhaarBackUrl })
      }
    } catch (err: any) {
      console.error(`Failed to upload ${type}:`, err)
      setError(err.response?.data?.error || `Failed to upload document`)
    } finally {
      setSaving(false)
    }
  }

  // Handle resume upload
  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    try {
      setSaving(true)
      const response = await candidateApi.uploadResume(file)
      setProfile({ ...profile, resumeUrl: response.data.resumeUrl })
    } catch (err: any) {
      console.error('Failed to upload resume:', err)
      setError(err.response?.data?.error || 'Failed to upload resume')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500">Loading profile...</span>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load profile</h2>
          <p className="text-gray-500 mb-4">{error || 'Profile not found'}</p>
          <Link to="/dashboard" className="text-primary hover:text-primary-700">
            Return to dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200/40 bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold font-heading text-primary">ViraWorkX</span>
            </Link>

            <nav className="flex items-center gap-6">
              <Link to="/dashboard" className="text-sm font-medium text-gray-500 hover:text-primary transition-colors">
                Dashboard
              </Link>
              <Link to="/jobs" className="text-sm font-medium text-gray-500 hover:text-primary transition-colors">
                Jobs
              </Link>
            </nav>

            <div className="flex items-center gap-4">
              <button className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 relative transition-colors">
                <Bell className="w-5 h-5 text-gray-500" />
              </button>

              <div className="relative group">
                <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium">
                    {profile.firstName?.[0]}{profile.lastName?.[0]}
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{profile.firstName} {profile.lastName}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
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

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden mb-6">
          {/* Cover/Banner */}
          <div className="h-32 bg-gradient-to-r from-primary to-blue-400" />

          <div className="px-8 pb-6">
            {/* Avatar and basic info */}
            <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-12">
              <div className="w-24 h-24 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center text-3xl font-bold text-primary bg-gradient-to-br from-primary/10 to-blue-100">
                {profile.firstName?.[0]}{profile.lastName?.[0]}
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold font-heading text-gray-900">
                      {profile.firstName} {profile.lastName}
                    </h1>
                    <p className="text-gray-600 mt-1">
                      {profile.headline || 'Add a professional headline'}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      {profile.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" /> {profile.location}
                        </span>
                      )}
                      {profile.experienceYears && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4" /> {profile.experienceYears} years exp.
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={openEditModal}
                    className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" /> Edit Profile
                  </button>
                </div>
              </div>
            </div>

            {/* Social links */}
            <div className="flex items-center gap-3 mt-4">
              {profile.linkedinUrl && (
                <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer"
                   className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
              )}
              {profile.githubUrl && (
                <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer"
                   className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                  <Github className="w-5 h-5" />
                </a>
              )}
              {profile.portfolioUrl && (
                <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer"
                   className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                  <Globe className="w-5 h-5" />
                </a>
              )}
              {!profile.linkedinUrl && !profile.githubUrl && (
                <button
                  onClick={openEditModal}
                  className="px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-500 text-sm hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add links
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm">
              <div className="border-b border-gray-200">
                <div className="flex gap-6 px-6">
                  {(['overview', 'assessments', 'applications'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`py-4 text-sm font-medium border-b-2 transition-colors capitalize ${
                        activeTab === tab
                          ? 'border-primary text-primary'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Skills Section */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Skills</h3>
                        <button
                          onClick={() => setEditingSection(editingSection === 'skills' ? null : 'skills')}
                          className="text-primary text-sm font-medium hover:text-primary-700"
                        >
                          {editingSection === 'skills' ? 'Done' : 'Edit'}
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {profile.skills?.map((skill) => {
                          const badge = badges.find(b => b.skillName.toLowerCase() === skill.toLowerCase())
                          const colors = badge ? badgeLevelColors[badge.badgeLevel] : null

                          return (
                            <div
                              key={skill}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 ${
                                colors
                                  ? `${colors.bg} ${colors.text} border ${colors.border}`
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {badge && <Shield className="w-3.5 h-3.5" />}
                              {skill}
                              {badge && (
                                <span className="text-xs opacity-75 capitalize">({badge.badgeLevel})</span>
                              )}
                              {editingSection === 'skills' && (
                                <button
                                  onClick={() => handleRemoveSkill(skill)}
                                  className="ml-1 hover:text-red-500"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )
                        })}

                        {editingSection === 'skills' && (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={newSkill}
                              onChange={(e) => setNewSkill(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                              placeholder="Add skill..."
                              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary w-32"
                            />
                            <button
                              onClick={handleAddSkill}
                              className="p-1.5 rounded-lg bg-primary text-white hover:bg-primary-700"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {profile.skills?.length === 0 && editingSection !== 'skills' && (
                        <p className="text-gray-500 text-sm">No skills added yet. Click Edit to add your skills.</p>
                      )}
                    </div>

                    {/* Verified Badges */}
                    {badges.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Verified Skill Badges</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {badges.map((badge) => {
                            const colors = badgeLevelColors[badge.badgeLevel]
                            return (
                              <div
                                key={badge.id}
                                className={`p-4 rounded-xl border ${colors.border} ${colors.bg}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.text} bg-white`}>
                                      <Award className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <p className={`font-semibold ${colors.text}`}>{badge.skillName}</p>
                                      <p className="text-xs text-gray-500 capitalize">{badge.badgeLevel} Level</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className={`text-lg font-bold ${colors.text}`}>{badge.percentile}%</p>
                                    <p className="text-xs text-gray-500">Percentile</p>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Resume Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Resume</h3>
                      {profile.resumeUrl ? (
                        <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                              <FileText className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Resume.pdf</p>
                              <p className="text-xs text-gray-500">Uploaded recently</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={profile.resumeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1"
                            >
                              <ExternalLink className="w-4 h-4" /> View
                            </a>
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Replace
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                        >
                          <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-700 font-medium">Upload your resume</p>
                          <p className="text-gray-500 text-sm mt-1">PDF, DOC, or DOCX (max 5MB)</p>
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleResumeUpload}
                        className="hidden"
                      />
                    </div>

                    {/* Identity Documents Status */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Identity Documents</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              profile.panNumber ? 'bg-green-100' : 'bg-gray-200'
                            }`}>
                              <FileText className={`w-5 h-5 ${profile.panNumber ? 'text-green-600' : 'text-gray-400'}`} />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">PAN Card</p>
                              <p className="text-xs text-gray-500">
                                {profile.panNumber
                                  ? `${profile.panNumber.substring(0, 3)}****${profile.panNumber.substring(8)}`
                                  : 'Not provided'}
                                {profile.panCardUrl ? ' - Document uploaded' : ''}
                              </p>
                            </div>
                          </div>
                          {profile.panNumber ? (
                            <Check className="w-5 h-5 text-green-500" />
                          ) : (
                            <button
                              onClick={openEditModal}
                              className="text-sm text-primary font-medium hover:text-primary-700"
                            >
                              Add
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              profile.aadhaarNumber ? 'bg-green-100' : 'bg-gray-200'
                            }`}>
                              <Shield className={`w-5 h-5 ${profile.aadhaarNumber ? 'text-green-600' : 'text-gray-400'}`} />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Aadhaar Card</p>
                              <p className="text-xs text-gray-500">
                                {profile.aadhaarNumber
                                  ? `****${profile.aadhaarNumber.substring(8)}`
                                  : 'Not provided'}
                                {profile.aadhaarFrontUrl && profile.aadhaarBackUrl
                                  ? ' - Both sides uploaded'
                                  : profile.aadhaarFrontUrl
                                  ? ' - Front uploaded'
                                  : profile.aadhaarBackUrl
                                  ? ' - Back uploaded'
                                  : ''}
                              </p>
                            </div>
                          </div>
                          {profile.aadhaarNumber ? (
                            <Check className="w-5 h-5 text-green-500" />
                          ) : (
                            <button
                              onClick={openEditModal}
                              className="text-sm text-primary font-medium hover:text-primary-700"
                            >
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'assessments' && (
                  <div className="space-y-4">
                    {assessments.length > 0 ? (
                      assessments.map((assessment) => {
                        const statusColor = statusColors[assessment.status] || statusColors.pending
                        return (
                          <div
                            key={assessment.id}
                            className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                                  <Target className="w-6 h-6 text-orange-600" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900">{assessment.testName || 'Assessment'}</h4>
                                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text} capitalize`}>
                                      {assessment.status}
                                    </span>
                                    {assessment.completedAt && (
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {new Date(assessment.completedAt).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {assessment.status === 'completed' && assessment.score && (
                                <div className="text-right flex items-center gap-3">
                                  {assessment.tier && (
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                      assessment.tier === 'Tier 1' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                                      assessment.tier === 'Tier 2' ? 'bg-gray-100 text-gray-700 border border-gray-300' :
                                      'bg-orange-100 text-orange-700 border border-orange-300'
                                    }`}>
                                      {assessment.tier}
                                    </span>
                                  )}
                                  <div>
                                    <p className="text-2xl font-bold text-green-600">{assessment.score}%</p>
                                    <p className="text-xs text-gray-500">
                                      {assessment.percentile}th percentile
                                    </p>
                                  </div>
                                </div>
                              )}

                              {assessment.status === 'invited' && (
                                <a
                                  href={`https://assessment.imocha.io/test/${assessment.imochaInvitationId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-700 flex items-center gap-2"
                                >
                                  Take Test <ChevronRight className="w-4 h-4" />
                                </a>
                              )}
                            </div>

                            {assessment.status === 'completed' && assessment.skillScores && (
                              <div className="mt-4 pt-4 border-t border-gray-100">
                                <p className="text-sm font-medium text-gray-700 mb-2">Skill Breakdown</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {(assessment.skillScores as any[]).map((skill: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                                      <span className="text-sm text-gray-600">{skill.skillName}</span>
                                      <span className="text-sm font-semibold text-gray-900">{skill.score}%</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center py-12">
                        <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No assessments yet</h3>
                        <p className="text-gray-500 mb-4">Complete skill assessments to verify your expertise</p>
                        <Link
                          to="/assessments"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-700"
                        >
                          Browse Assessments <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'applications' && (
                  <div className="space-y-4">
                    {profile.applications && profile.applications.length > 0 ? (
                      profile.applications.map((app) => (
                        <div
                          key={app.id}
                          className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                                <Briefcase className="w-6 h-6 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">{app.job?.title}</h4>
                                <p className="text-sm text-gray-500">{app.job?.client?.companyName}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                                {app.stage.replace('_', ' ')}
                              </span>
                              <p className="text-xs text-gray-500 mt-1">
                                Applied {new Date(app.appliedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No applications yet</h3>
                        <p className="text-gray-500 mb-4">Start applying to jobs that match your skills</p>
                        <Link
                          to="/jobs"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-700"
                        >
                          Browse Jobs <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Profile Completion */}
            <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Profile Strength</h3>

              <div className="relative mb-4">
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      profileCompletion.percentage >= 80
                        ? 'bg-green-500'
                        : profileCompletion.percentage >= 50
                        ? 'bg-yellow-500'
                        : 'bg-orange-500'
                    }`}
                    style={{ width: `${profileCompletion.percentage}%` }}
                  />
                </div>
                <span className={`absolute right-0 -top-6 font-bold ${
                  profileCompletion.percentage >= 80
                    ? 'text-green-600'
                    : profileCompletion.percentage >= 50
                    ? 'text-yellow-600'
                    : 'text-orange-600'
                }`}>
                  {profileCompletion.percentage}%
                </span>
              </div>

              <div className="space-y-2">
                {profileCompletion.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{item.label}</span>
                    {item.completed ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-orange-400" />
                    )}
                  </div>
                ))}
              </div>

              {profileCompletion.percentage < 100 && (
                <button
                  onClick={openEditModal}
                  className="w-full mt-4 px-4 py-2.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                >
                  Complete Profile
                </button>
              )}
            </div>

            {/* Profile Score */}
            <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Profile Score</h3>

              <div className="flex items-center justify-center mb-4">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#e5e7eb"
                      strokeWidth="12"
                      fill="none"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#2563eb"
                      strokeWidth="12"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${(profile.profileScore / 100) * 352} 352`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-gray-900">{profile.profileScore}</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-500 text-center">
                Your profile score is based on completion, skills verification, and assessment performance.
              </p>

              <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Boost your score</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Complete a skill assessment to increase your visibility to employers.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Stats</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <Award className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-gray-600">Skill Badges</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">{badges.length}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-gray-600">Applications</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">
                    {profile.applications?.length || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                      <Target className="w-5 h-5 text-orange-600" />
                    </div>
                    <span className="text-gray-600">Assessments</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">
                    {assessments.filter(a => a.status === 'completed').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEditModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Edit Profile</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Professional Headline</label>
                <input
                  type="text"
                  value={editForm.headline}
                  onChange={(e) => setEditForm({ ...editForm, headline: e.target.value })}
                  placeholder="e.g., Senior Full Stack Developer | React | Node.js"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    placeholder="e.g., Bangalore, India"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
                  <input
                    type="number"
                    value={editForm.experienceYears}
                    onChange={(e) => setEditForm({ ...editForm, experienceYears: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Company</label>
                  <input
                    type="text"
                    value={editForm.currentCompany}
                    onChange={(e) => setEditForm({ ...editForm, currentCompany: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Title</label>
                  <input
                    type="text"
                    value={editForm.currentTitle}
                    onChange={(e) => setEditForm({ ...editForm, currentTitle: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* Salary Expectations */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Salary (USD/year)</label>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    value={editForm.expectedSalaryMin}
                    onChange={(e) => setEditForm({ ...editForm, expectedSalaryMin: parseInt(e.target.value) || 0 })}
                    placeholder="Min"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <input
                    type="number"
                    value={editForm.expectedSalaryMax}
                    onChange={(e) => setEditForm({ ...editForm, expectedSalaryMax: parseInt(e.target.value) || 0 })}
                    placeholder="Max"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* Social Links */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Social Links</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                  <input
                    type="url"
                    value={editForm.linkedinUrl}
                    onChange={(e) => setEditForm({ ...editForm, linkedinUrl: e.target.value })}
                    placeholder="https://linkedin.com/in/yourprofile"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GitHub URL</label>
                  <input
                    type="url"
                    value={editForm.githubUrl}
                    onChange={(e) => setEditForm({ ...editForm, githubUrl: e.target.value })}
                    placeholder="https://github.com/yourusername"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Portfolio URL</label>
                  <input
                    type="url"
                    value={editForm.portfolioUrl}
                    onChange={(e) => setEditForm({ ...editForm, portfolioUrl: e.target.value })}
                    placeholder="https://yourportfolio.com"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* Identity Documents */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Identity Documents</h3>

                {/* PAN Card Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PAN Card Number</label>
                  <input
                    type="text"
                    value={editForm.panNumber}
                    onChange={(e) => {
                      setEditForm({ ...editForm, panNumber: e.target.value.toUpperCase() })
                      setPanError('')
                    }}
                    placeholder="e.g., ABCDE1234F"
                    maxLength={10}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                      panError ? 'border-red-300' : 'border-gray-200'
                    }`}
                  />
                  {panError && <p className="text-red-500 text-xs mt-1">{panError}</p>}
                </div>

                {/* PAN Card Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PAN Card Document</label>
                  {profile?.panCardUrl ? (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-700">PAN card uploaded</span>
                      </div>
                      <button
                        onClick={() => panCardInputRef.current?.click()}
                        className="text-sm text-primary hover:text-primary-700 font-medium"
                      >
                        Replace
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => panCardInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                    >
                      <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                      <p className="text-sm text-gray-500">Upload PAN card (JPG, PNG, or PDF)</p>
                    </div>
                  )}
                  <input
                    ref={panCardInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => handleDocumentUpload('panCard', e)}
                    className="hidden"
                  />
                </div>

                {/* Aadhaar Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar Card Number</label>
                  <input
                    type="text"
                    value={editForm.aadhaarNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '')
                      setEditForm({ ...editForm, aadhaarNumber: val })
                      setAadhaarError('')
                    }}
                    placeholder="12-digit Aadhaar number"
                    maxLength={12}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                      aadhaarError ? 'border-red-300' : 'border-gray-200'
                    }`}
                  />
                  {aadhaarError && <p className="text-red-500 text-xs mt-1">{aadhaarError}</p>}
                </div>

                {/* Aadhaar Front Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar Card (Front)</label>
                  {profile?.aadhaarFrontUrl ? (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-700">Aadhaar front uploaded</span>
                      </div>
                      <button
                        onClick={() => aadhaarFrontInputRef.current?.click()}
                        className="text-sm text-primary hover:text-primary-700 font-medium"
                      >
                        Replace
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => aadhaarFrontInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                    >
                      <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                      <p className="text-sm text-gray-500">Upload Aadhaar front (JPG, PNG, or PDF)</p>
                    </div>
                  )}
                  <input
                    ref={aadhaarFrontInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => handleDocumentUpload('aadhaarFront', e)}
                    className="hidden"
                  />
                </div>

                {/* Aadhaar Back Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar Card (Back)</label>
                  {profile?.aadhaarBackUrl ? (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-700">Aadhaar back uploaded</span>
                      </div>
                      <button
                        onClick={() => aadhaarBackInputRef.current?.click()}
                        className="text-sm text-primary hover:text-primary-700 font-medium"
                      >
                        Replace
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => aadhaarBackInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                    >
                      <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                      <p className="text-sm text-gray-500">Upload Aadhaar back (JPG, PNG, or PDF)</p>
                    </div>
                  )}
                  <input
                    ref={aadhaarBackInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => handleDocumentUpload('aadhaarBack', e)}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saving indicator */}
      {saving && !showEditModal && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-3 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-600">Saving changes...</span>
        </div>
      )}
    </div>
  )
}
