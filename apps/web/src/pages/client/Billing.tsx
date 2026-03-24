import { useState, useEffect } from 'react'
import { CreditCard, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { paymentApi } from '../../services/api'
import type { Subscription, PaymentInvoice } from '../../types'


export default function Billing() {
  const navigate = useNavigate()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [invoices, setInvoices] = useState<PaymentInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [subRes, invRes] = await Promise.all([
        paymentApi.getSubscription(),
        paymentApi.getInvoices(),
      ])
      setSubscription(subRes.data.subscription)
      setInvoices(invRes.data.invoices)
    } catch (err) {
      console.error('Failed to load billing data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleBillingPortal() {
    setActionLoading('portal')
    try {
      const { data } = await paymentApi.openBillingPortal(window.location.href)
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Failed to open billing portal:', err)
    } finally {
      setActionLoading('')
    }
  }

  async function handleCancel() {
    if (!confirm('Are you sure you want to cancel? Your subscription will remain active until the end of the current billing period.')) return
    setActionLoading('cancel')
    try {
      await paymentApi.cancelSubscription(true)
      loadData()
    } catch (err) {
      console.error('Failed to cancel:', err)
    } finally {
      setActionLoading('')
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading...</div>
  }

  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing'

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/client/dashboard')} className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Billing & Subscription</h1>
            <p className="text-slate-400 text-sm">Manage your plan and payment methods</p>
          </div>
        </div>

        {/* Current Subscription Status */}
        {subscription && (
          <div className={`mb-8 p-6 rounded-2xl border ${isActive ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {isActive ? <CheckCircle className="w-8 h-8 text-emerald-400" /> : <AlertCircle className="w-8 h-8 text-amber-400" />}
                <div>
                  <h2 className="text-lg font-semibold">
                    {subscription.planTier.charAt(0).toUpperCase() + subscription.planTier.slice(1)} Plan
                  </h2>
                  <p className="text-sm text-slate-400">
                    Status: <span className={isActive ? 'text-emerald-400' : 'text-amber-400'}>{subscription.status}</span>
                    {subscription.currentPeriodEnd && (
                      <> | Renews: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</>
                    )}
                    {subscription.cancelAtPeriodEnd && (
                      <span className="text-amber-400"> (cancels at period end)</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {isActive && (
                  <>
                    <button onClick={handleBillingPortal} disabled={actionLoading === 'portal'} className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm">
                      {actionLoading === 'portal' ? 'Opening...' : 'Manage Billing'}
                    </button>
                    {!subscription.cancelAtPeriodEnd && (
                      <button onClick={handleCancel} disabled={actionLoading === 'cancel'} className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm">
                        {actionLoading === 'cancel' ? 'Canceling...' : 'Cancel'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Payment Terms */}
        <div className="mb-8 bg-slate-900/80 rounded-2xl border border-slate-800/50 p-6">
          <h3 className="text-lg font-semibold mb-4">Payment Terms</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <p className="text-sm text-slate-400 mb-1">Billing Cycle</p>
              <p className="font-semibold text-white">Biweekly</p>
              <p className="text-xs text-slate-500 mt-1">Invoiced every two weeks based on active placements</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <p className="text-sm text-slate-400 mb-1">Payment Due</p>
              <p className="font-semibold text-white">Net 7</p>
              <p className="text-xs text-slate-500 mt-1">Payment due within 7 days of invoice date</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <p className="text-sm text-slate-400 mb-1">Timesheet Submission</p>
              <p className="font-semibold text-white">Every Friday by 6 PM IST</p>
              <p className="text-xs text-slate-500 mt-1">Contractors submit timesheets; client approval required</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <p className="text-sm text-slate-400 mb-1">Currency</p>
              <p className="font-semibold text-white">USD</p>
              <p className="text-xs text-slate-500 mt-1">All invoices billed in US dollars</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">
            Questions about billing? Contact{' '}
            <a href="mailto:billing@viraworkx.ai" className="text-blue-400 hover:underline">billing@viraworkx.ai</a>
          </p>
        </div>

        {/* Payment History */}
        <h3 className="text-lg font-semibold mb-4">Payment History</h3>
        {invoices.length === 0 ? (
          <div className="bg-slate-900/80 rounded-xl border border-slate-800/50 p-8 text-center">
            <CreditCard className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No payments yet</p>
          </div>
        ) : (
          <div className="bg-slate-900/80 rounded-xl border border-slate-800/50 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800/50 text-left">
                  <th className="px-4 py-3 text-sm text-slate-500 font-medium">Date</th>
                  <th className="px-4 py-3 text-sm text-slate-500 font-medium">Amount</th>
                  <th className="px-4 py-3 text-sm text-slate-500 font-medium">Status</th>
                  <th className="px-4 py-3 text-sm text-slate-500 font-medium">Period</th>
                  <th className="px-4 py-3 text-sm text-slate-500 font-medium">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-800/30">
                    <td className="px-4 py-3 text-sm">{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm font-medium">${(inv.amount / 100).toFixed(2)} {inv.currency.toUpperCase()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${inv.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : inv.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {inv.periodStart && inv.periodEnd ? `${new Date(inv.periodStart).toLocaleDateString()} - ${new Date(inv.periodEnd).toLocaleDateString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {inv.invoiceUrl ? <a href={inv.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">View</a> : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
