import { useQuery } from '@tanstack/react-query'
import {
  BarChart3, Users, Building2, Briefcase, Layers, TrendingUp,
  CheckCircle, Clock, UserCheck
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { useAuthStore } from '../../stores/authStore'
import AdminLayout from '../../components/admin/AdminLayout'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const PIPELINE_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#f0abfc', '#e879f9', '#10b981', '#ef4444']

export default function AdminAnalytics() {
  const { accessToken: token } = useAuthStore()

  const { data: overviewData, isLoading: loadingOverview } = useQuery({
    queryKey: ['analyticsOverview'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/analytics/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const { data: pipelineData } = useQuery({
    queryKey: ['analyticsPipeline'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/analytics/pipeline`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const { data: conversionData } = useQuery({
    queryKey: ['analyticsConversions'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/analytics/conversion-rates`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
  })

  const overview = overviewData?.overview || {}
  const pipeline = pipelineData?.pipeline || []
  const conversions = conversionData?.conversions || []

  const summaryStats = [
    {
      label: 'Total Candidates',
      value: overview.totalCandidates ?? '-',
      icon: Users,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      change: overview.candidatesThisMonth,
      changeLabel: 'this month',
    },
    {
      label: 'Active Clients',
      value: overview.totalClients ?? '-',
      icon: Building2,
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
      change: overview.clientsThisMonth,
      changeLabel: 'this month',
    },
    {
      label: 'Open Jobs',
      value: overview.activeJobs ?? '-',
      icon: Briefcase,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600',
      change: overview.jobsPostedThisMonth,
      changeLabel: 'posted this month',
    },
    {
      label: 'Total Applications',
      value: overview.totalApplications ?? '-',
      icon: Layers,
      bgColor: 'bg-amber-100',
      iconColor: 'text-amber-600',
      change: overview.applicationsThisMonth,
      changeLabel: 'this month',
    },
    {
      label: 'Hired This Month',
      value: overview.hiredThisMonth ?? '-',
      icon: UserCheck,
      bgColor: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Avg Time-to-Hire',
      value: overview.avgTimeToHire ? `${overview.avgTimeToHire}d` : '-',
      icon: Clock,
      bgColor: 'bg-rose-100',
      iconColor: 'text-rose-600',
    },
    {
      label: 'Offer Accept Rate',
      value: overview.offerAcceptRate ? `${overview.offerAcceptRate}%` : '-',
      icon: CheckCircle,
      bgColor: 'bg-teal-100',
      iconColor: 'text-teal-600',
    },
    {
      label: 'AI Match Accuracy',
      value: overview.aiMatchAccuracy ? `${overview.aiMatchAccuracy}%` : '-',
      icon: TrendingUp,
      bgColor: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
    },
  ]

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Platform-wide performance and hiring metrics</p>
        </div>

        {loadingOverview ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {summaryStats.map((stat, i) => (
                <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center mb-3`}>
                    <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
                  {stat.change !== undefined && (
                    <p className="text-xs text-green-600 mt-1">+{stat.change} {stat.changeLabel}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Pipeline Funnel */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Hiring Pipeline</h2>
                <p className="text-sm text-gray-500 mb-6">Candidates at each stage</p>
                {pipeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={pipeline} layout="vertical" margin={{ left: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis
                        type="category"
                        dataKey="stage"
                        tick={{ fontSize: 12 }}
                        width={110}
                        tickFormatter={(v) => v.replace(/_/g, ' ')}
                      />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-40 text-gray-400">
                    <BarChart3 className="w-8 h-8 mr-2" /> No pipeline data yet
                  </div>
                )}
              </div>

              {/* Conversion Rates */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Stage Conversions</h2>
                <p className="text-sm text-gray-500 mb-6">Conversion rate between stages</p>
                {conversions.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={conversions}
                        dataKey="rate"
                        nameKey="stage"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={(props: any) => `${props.stage?.replace(/_/g, ' ')}: ${props.rate}%`}
                        labelLine={false}
                      >
                        {conversions.map((_: any, index: number) => (
                          <Cell key={index} fill={PIPELINE_COLORS[index % PIPELINE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-40 text-gray-400">
                    <BarChart3 className="w-8 h-8 mr-2" /> No conversion data yet
                  </div>
                )}
              </div>
            </div>

            {/* Top Skills in Demand */}
            {overview.topSkills && overview.topSkills.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Skills in Demand</h2>
                <div className="flex flex-wrap gap-3">
                  {overview.topSkills.map((skill: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-lg border border-indigo-100"
                    >
                      <span className="font-medium text-indigo-700">{skill.name}</span>
                      <span className="text-xs text-indigo-500 bg-indigo-100 px-1.5 py-0.5 rounded">
                        {skill.count} jobs
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  )
}
