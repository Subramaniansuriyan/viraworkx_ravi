import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2, Users, Zap, LogOut, Bot, Activity, Shield, Eye,
  ClipboardCheck, Save, Bell, Mail, Globe, Lock, Database,
  Cpu, ToggleLeft, ToggleRight
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

export default function AdminSettings() {
  const { user, logout } = useAuthStore()

  // Settings state
  const [settings, setSettings] = useState({
    aiAutoApprove: false,
    aiAutoApproveThreshold: 85,
    emailNotifications: true,
    slackNotifications: false,
    webhookUrl: '',
    matchScoreThreshold: 60,
    requireHumanApproval: true,
    maxAssessmentRetries: 2,
    assessmentExpirationDays: 7,
  })

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const getUserInitials = () => {
    if (user?.profile?.firstName && user?.profile?.lastName) {
      return `${user.profile.firstName[0]}${user.profile.lastName[0]}`
    }
    return user?.email?.substring(0, 2).toUpperCase() || 'A'
  }

  const handleSave = async () => {
    setSaving(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
    <button onClick={onChange} className="focus:outline-none">
      {enabled ? (
        <ToggleRight className="w-10 h-6 text-primary" />
      ) : (
        <ToggleLeft className="w-10 h-6 text-gray-300" />
      )}
    </button>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 text-white z-10">
        <div className="p-6 border-b border-slate-700">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold">ViraWorkX</span>
              <p className="text-xs text-slate-400">Admin Console</p>
            </div>
          </Link>
        </div>

        <nav className="p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Human-in-the-Loop
          </p>
          <ul className="space-y-1">
            <li>
              <Link to="/admin/dashboard" className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg">
                <Activity className="w-5 h-5 mr-3" />
                Overview
              </Link>
            </li>
            <li>
              <Link to="/admin/ai-monitor" className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg">
                <Bot className="w-5 h-5 mr-3" />
                AI Monitor
              </Link>
            </li>
            <li>
              <Link to="/admin/test-allocation" className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg">
                <ClipboardCheck className="w-5 h-5 mr-3" />
                Test Allocation
              </Link>
            </li>
            <li>
              <Link to="/admin/clients" className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg">
                <Building2 className="w-5 h-5 mr-3" />
                Clients
              </Link>
            </li>
            <li>
              <Link to="/admin/candidates" className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg">
                <Users className="w-5 h-5 mr-3" />
                Candidates
              </Link>
            </li>
          </ul>

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 mt-8">
            System
          </p>
          <ul className="space-y-1">
            <li>
              <Link to="/admin/audit-log" className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg">
                <Eye className="w-5 h-5 mr-3" />
                Audit Log
              </Link>
            </li>
            <li>
              <Link to="/admin/settings" className="flex items-center px-4 py-3 text-white bg-slate-800 rounded-lg font-medium">
                <Shield className="w-5 h-5 mr-3" />
                Settings
              </Link>
            </li>
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-medium">
              {getUserInitials()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.profile?.firstName || 'Admin'}
              </p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center w-full px-4 py-3 text-red-400 hover:bg-slate-800 rounded-lg"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">Configure platform behavior and AI settings</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>

        <div className="space-y-6">
          {/* AI Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">AI Configuration</h2>
                <p className="text-sm text-gray-500">Control AI agent behavior and automation</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between py-4 border-b">
                <div>
                  <p className="font-medium text-gray-900">Require Human Approval</p>
                  <p className="text-sm text-gray-500">AI decisions require admin approval before execution</p>
                </div>
                <Toggle
                  enabled={settings.requireHumanApproval}
                  onChange={() => setSettings(s => ({ ...s, requireHumanApproval: !s.requireHumanApproval }))}
                />
              </div>

              <div className="flex items-center justify-between py-4 border-b">
                <div>
                  <p className="font-medium text-gray-900">Auto-Approve High Confidence</p>
                  <p className="text-sm text-gray-500">Automatically approve AI decisions above threshold</p>
                </div>
                <Toggle
                  enabled={settings.aiAutoApprove}
                  onChange={() => setSettings(s => ({ ...s, aiAutoApprove: !s.aiAutoApprove }))}
                />
              </div>

              {settings.aiAutoApprove && (
                <div className="py-4 border-b">
                  <label className="block font-medium text-gray-900 mb-2">
                    Auto-Approve Threshold
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="70"
                      max="100"
                      value={settings.aiAutoApproveThreshold}
                      onChange={(e) => setSettings(s => ({ ...s, aiAutoApproveThreshold: parseInt(e.target.value) }))}
                      className="flex-1"
                    />
                    <span className="text-lg font-semibold text-primary w-16 text-right">
                      {settings.aiAutoApproveThreshold}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    AI decisions with confidence above this threshold will be auto-approved
                  </p>
                </div>
              )}

              <div className="py-4">
                <label className="block font-medium text-gray-900 mb-2">
                  Minimum Match Score Threshold
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="40"
                    max="90"
                    value={settings.matchScoreThreshold}
                    onChange={(e) => setSettings(s => ({ ...s, matchScoreThreshold: parseInt(e.target.value) }))}
                    className="flex-1"
                  />
                  <span className="text-lg font-semibold text-primary w-16 text-right">
                    {settings.matchScoreThreshold}%
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Candidates below this match score will be automatically filtered out
                </p>
              </div>
            </div>
          </div>

          {/* Assessment Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Assessment Settings</h2>
                <p className="text-sm text-gray-500">Configure iMocha assessment behavior</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block font-medium text-gray-900 mb-2">
                  Assessment Expiration (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={settings.assessmentExpirationDays}
                  onChange={(e) => setSettings(s => ({ ...s, assessmentExpirationDays: parseInt(e.target.value) }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <p className="text-sm text-gray-500 mt-1">Days until assessment invitation expires</p>
              </div>

              <div>
                <label className="block font-medium text-gray-900 mb-2">
                  Maximum Retries
                </label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={settings.maxAssessmentRetries}
                  onChange={(e) => setSettings(s => ({ ...s, maxAssessmentRetries: parseInt(e.target.value) }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <p className="text-sm text-gray-500 mt-1">Number of times a candidate can retry</p>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                <p className="text-sm text-gray-500">Configure how you receive alerts</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-4 border-b">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Email Notifications</p>
                    <p className="text-sm text-gray-500">Receive alerts via email</p>
                  </div>
                </div>
                <Toggle
                  enabled={settings.emailNotifications}
                  onChange={() => setSettings(s => ({ ...s, emailNotifications: !s.emailNotifications }))}
                />
              </div>

              <div className="flex items-center justify-between py-4 border-b">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Slack Notifications</p>
                    <p className="text-sm text-gray-500">Send alerts to Slack channel</p>
                  </div>
                </div>
                <Toggle
                  enabled={settings.slackNotifications}
                  onChange={() => setSettings(s => ({ ...s, slackNotifications: !s.slackNotifications }))}
                />
              </div>

              <div className="py-4">
                <label className="block font-medium text-gray-900 mb-2">
                  Webhook URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://your-webhook-endpoint.com/notify"
                  value={settings.webhookUrl}
                  onChange={(e) => setSettings(s => ({ ...s, webhookUrl: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <p className="text-sm text-gray-500 mt-1">Custom webhook for event notifications</p>
              </div>
            </div>
          </div>

          {/* System Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Database className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">System Information</h2>
                <p className="text-sm text-gray-500">Platform version and status</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Platform Version</p>
                <p className="text-lg font-semibold text-gray-900">1.0.0</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">API Status</p>
                <p className="text-lg font-semibold text-green-600">Online</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">AI Engine</p>
                <p className="text-lg font-semibold text-green-600">Connected</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
