import { useState, useEffect } from 'react'
import { FileText, Plus, Edit3, Eye, ToggleLeft, ToggleRight } from 'lucide-react'
import { contractApi } from '../../services/api'
import type { ContractTemplate } from '../../types'
import AdminLayout from '../../components/admin/AdminLayout'

const PLACEHOLDER_HELP = [
  '{{candidateName}}', '{{companyName}}', '{{jobTitle}}',
  '{{salary}}', '{{startDate}}', '{{duration}}', '{{location}}', '{{date}}',
]

export default function ContractTemplates() {
  const [templates, setTemplates] = useState<ContractTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [editing, setEditing] = useState<ContractTemplate | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    description: '',
    content: '',
    templateType: 'contractor',
    planTier: '',
  })

  useEffect(() => { loadTemplates() }, [])

  async function loadTemplates() {
    try {
      const { data } = await contractApi.getTemplates()
      setTemplates(data.templates)
    } catch (err) {
      console.error('Failed to load templates:', err)
    } finally {
      setLoading(false)
    }
  }

  function openEditor(template?: ContractTemplate) {
    if (template) {
      setEditing(template)
      setForm({
        name: template.name,
        description: template.description || '',
        content: template.content,
        templateType: template.templateType,
        planTier: template.planTier || '',
      })
    } else {
      setEditing(null)
      setForm({ name: '', description: '', content: '', templateType: 'contractor', planTier: '' })
    }
    setShowEditor(true)
    setPreview(null)
  }

  async function handleSave() {
    try {
      if (editing) {
        await contractApi.updateTemplate(editing.id, form)
      } else {
        await contractApi.createTemplate(form)
      }
      setShowEditor(false)
      loadTemplates()
    } catch (err) {
      console.error('Failed to save template:', err)
    }
  }

  async function toggleActive(template: ContractTemplate) {
    try {
      await contractApi.updateTemplate(template.id, { isActive: !template.isActive })
      loadTemplates()
    } catch (err) {
      console.error('Failed to toggle template:', err)
    }
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contract Templates</h1>
            <p className="text-gray-600 text-sm">Manage contract templates for hiring workflows</p>
          </div>
          <div className="ml-auto">
            <button onClick={() => openEditor()} className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 text-white flex items-center gap-2 text-sm font-medium">
              <Plus className="w-4 h-4" /> New Template
            </button>
          </div>
        </div>

        {showEditor ? (
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800/50 p-6">
            <h2 className="text-lg font-semibold mb-4">{editing ? 'Edit Template' : 'New Template'}</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
                  placeholder="e.g., Standard Contractor Agreement"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm text-slate-400 mb-1">Type</label>
                  <select
                    value={form.templateType}
                    onChange={(e) => setForm({ ...form, templateType: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
                  >
                    <option value="freelancer">Freelancer</option>
                    <option value="contractor">Contractor</option>
                    <option value="nda">NDA</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-slate-400 mb-1">Plan Tier (optional)</label>
                  <select
                    value={form.planTier}
                    onChange={(e) => setForm({ ...form, planTier: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
                  >
                    <option value="">All tiers</option>
                    <option value="startup">Startup</option>
                    <option value="growth">Growth</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-1">Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
                placeholder="Brief description of this template"
              />
            </div>

            <div className="mb-2">
              <label className="block text-sm text-slate-400 mb-1">Available Placeholders</label>
              <div className="flex gap-2 flex-wrap">
                {PLACEHOLDER_HELP.map((p) => (
                  <button
                    key={p}
                    onClick={() => setForm({ ...form, content: form.content + p })}
                    className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-1">Content (Markdown/HTML)</label>
              {preview !== null ? (
                <div className="w-full min-h-[300px] p-4 rounded-lg bg-white text-slate-900 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: preview }} />
              ) : (
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full h-[300px] px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono text-sm"
                  placeholder="Enter contract template content with {{placeholder}} variables..."
                />
              )}
            </div>

            <div className="flex items-center gap-3">
              <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium">Save Template</button>
              <button onClick={() => setPreview(preview !== null ? null : form.content)} className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm flex items-center gap-2">
                <Eye className="w-4 h-4" /> {preview !== null ? 'Edit' : 'Preview'}
              </button>
              <button onClick={() => setShowEditor(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-400 text-sm">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12 text-slate-500">Loading templates...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No templates yet. Create your first contract template.</p>
              </div>
            ) : (
              templates.map((t) => (
                <div key={t.id} className="bg-slate-900/80 rounded-xl border border-slate-800/50 p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{t.name}</h3>
                      <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 text-xs">{t.templateType}</span>
                      {t.planTier && <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 text-xs">{t.planTier}</span>}
                    </div>
                    <p className="text-sm text-slate-500">{t.description || 'No description'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleActive(t)} className="p-2 rounded-lg hover:bg-slate-800" title={t.isActive ? 'Active' : 'Inactive'}>
                      {t.isActive ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-slate-500" />}
                    </button>
                    <button onClick={() => openEditor(t)} className="p-2 rounded-lg hover:bg-slate-800">
                      <Edit3 className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
