import { useState, useEffect } from 'react'
import { CreditCard, ArrowLeft, CheckCircle, AlertCircle, Zap, Building2, Rocket } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { paymentApi } from '../../services/api'
import type { Subscription, PaymentInvoice } from '../../types'

const PLAN_FEATURES: Record<string, string[]> = {
  startup: ['Up to 5 active jobs', 'Basic AI screening', 'Email support', 'Skill assessments'],
  growth: ['Up to 25 active jobs', 'Advanced AI screening', 'Priority support', 'Custom assessments', 'Analytics dashboard'],
  enterprise: ['Unlimited jobs', 'Full AI suite', 'Dedicated support', 'Custom integrations', 'Advanced analytics', 'SLA guarantee'],
}

const PLAN_ICONS: Record<string, typeof Rocket> = {
  startup: Rocket,
  growth: Zap,
  enterprise: Building2,
}

export default function Billing() {
  const navigate = useNavigate()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [planPricing, setPlanPricing] = useState<Record<string, { amount: number; label: string }>>({})
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
      setPlanPricing(subRes.data.planPricing || {})
      setInvoices(invRes.data.invoices)
    } catch (err) {
      console.error('Failed to load billing data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCheckout(planTier: string) {
    setActionLoading(planTier)
    try {
      const { data } = await paymentApi.createCheckout(planTier, window.location.href)
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Failed to create checkout:', err)
    } finally {
      setActionLoading('')
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

  async function handleChangePlan(newTier: string) {
    setActionLoading(newTier)
    try {
      await paymentApi.changePlan(newTier)
      loadData()
    } catch (err) {
      console.error('Failed to change plan:', err)
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

        {/* Plan Cards */}
        <h3 className="text-lg font-semibold mb-4">{isActive ? 'Change Plan' : 'Choose a Plan'}</h3>
        <div className="grid grid-cols-3 gap-4 mb-8">
          {(['startup', 'growth', 'enterprise'] as const).map((tier) => {
            const Icon = PLAN_ICONS[tier]
            const pricing = planPricing[tier]
            const isCurrentPlan = subscription?.planTier === tier && isActive

            return (
              <div key={tier} className={`relative bg-slate-900/80 rounded-2xl border p-6 ${isCurrentPlan ? 'border-blue-500/50' : 'border-slate-800/50'}`}>
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-blue-500 text-white text-xs font-medium">
                    Current Plan
                  </div>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tier === 'enterprise' ? 'bg-violet-500/20' : tier === 'growth' ? 'bg-blue-500/20' : 'bg-emerald-500/20'}`}>
                    <Icon className={`w-5 h-5 ${tier === 'enterprise' ? 'text-violet-400' : tier === 'growth' ? 'text-blue-400' : 'text-emerald-400'}`} />
                  </div>
                  <div>
                    <h4 className="font-semibold capitalize">{tier}</h4>
                    <p className="text-2xl font-bold">{pricing?.label || `$${(pricing?.amount || 0) / 100}/mo`}</p>
                  </div>
                </div>
                <ul className="space-y-2 mb-6">
                  {(PLAN_FEATURES[tier] || []).map((f) => (
                    <li key={f} className="text-sm text-slate-400 flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                {isCurrentPlan ? (
                  <button disabled className="w-full px-4 py-2 rounded-lg bg-slate-700 text-slate-400 text-sm cursor-not-allowed">
                    Current Plan
                  </button>
                ) : isActive ? (
                  <button
                    onClick={() => handleChangePlan(tier)}
                    disabled={!!actionLoading}
                    className="w-full px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {actionLoading === tier ? 'Switching...' : 'Switch Plan'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleCheckout(tier)}
                    disabled={!!actionLoading}
                    className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {actionLoading === tier ? 'Processing...' : 'Subscribe'}
                  </button>
                )}
              </div>
            )
          })}
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
