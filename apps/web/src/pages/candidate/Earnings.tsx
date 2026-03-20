import { useQuery } from '@tanstack/react-query'
import { candidateApi, contractApi } from '../../services/api'
import { DollarSign, Briefcase, FileText, Clock, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import CandidateLayout from '../../components/candidate/CandidateLayout'

export default function CandidateEarnings() {
  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: candidateApi.getProfile,
  })

  const { data: contractsData, isLoading } = useQuery({
    queryKey: ['candidateContracts'],
    queryFn: async () => {
      const { data } = await contractApi.getAll()
      return data
    },
  })

  const { data: applicationsData } = useQuery({
    queryKey: ['applications'],
    queryFn: candidateApi.getApplications,
  })

  const profile = profileData?.data?.profile
  const contracts: any[] = contractsData?.contracts || []
  const applications = applicationsData?.data?.applications || []

  const activeContracts = contracts.filter(c => c.status === 'active')
  const hired = applications.filter((a: any) => a.stage === 'hired').length

  const expectedMin = profile?.expectedSalaryMin
  const expectedMax = profile?.expectedSalaryMax
  const currency = profile?.salaryCurrency || 'USD'

  const formatRate = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)

  return (
    <CandidateLayout>
      <div className="p-4 md:p-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Earnings & Payments</h1>
          <p className="text-gray-600 text-sm md:text-base">Your contracts, rates, and payment history</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{activeContracts.length}</p>
            <p className="text-gray-600 text-sm">Active Placements</p>
          </div>
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{contracts.length}</p>
            <p className="text-gray-600 text-sm">Total Contracts</p>
          </div>
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{hired}</p>
            <p className="text-gray-600 text-sm">Total Hires</p>
          </div>
        </div>

        {/* Expected Rate */}
        {(expectedMin || expectedMax) && (
          <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Expected Rate</h2>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {expectedMin && expectedMax
                    ? `${formatRate(expectedMin)} – ${formatRate(expectedMax)}`
                    : expectedMin
                    ? `${formatRate(expectedMin)}+`
                    : formatRate(expectedMax!)}
                </p>
                <p className="text-sm text-gray-500">per year · {currency}</p>
              </div>
              <Link to="/profile" className="ml-auto text-sm text-primary hover:underline">
                Update
              </Link>
            </div>
          </div>
        )}

        {/* Active Contracts */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="p-4 md:p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Active Contracts</h2>
          </div>
          {isLoading ? (
            <div className="p-8 space-y-3">
              {[1, 2].map(i => <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-lg" />)}
            </div>
          ) : activeContracts.length === 0 ? (
            <div className="p-8 text-center">
              <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No active contracts yet</p>
              <p className="text-xs text-gray-400 mt-1">Contracts appear here after you are hired for a position</p>
            </div>
          ) : (
            <div className="divide-y">
              {activeContracts.map((contract: any) => (
                <Link
                  key={contract.id}
                  to={`/candidate/contracts/${contract.id}`}
                  className="flex items-center gap-4 p-4 md:p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{contract.title}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {contract.application?.job?.client?.companyName}
                      {contract.application?.job?.title && ` · ${contract.application.job.title}`}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full shrink-0">
                    Active
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Timesheet CTA */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 md:p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Submit Your Timesheet</h3>
              <p className="text-sm text-gray-600 mt-1">
                Log your weekly hours by Friday 6 PM IST. Timesheets are used for biweekly billing on Net 7 terms.
              </p>
              <Link
                to="/timesheet"
                className="inline-block mt-3 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90"
              >
                Go to Timesheet
              </Link>
            </div>
          </div>
        </div>

        {/* Payment History Note */}
        <div className="mt-6 bg-white rounded-xl shadow-sm p-4 md:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Payment History</h2>
          <div className="text-center py-6">
            <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Payment history will appear here</p>
            <p className="text-xs text-gray-400 mt-1">
              Questions? Contact{' '}
              <a href="mailto:payments@viraworkx.ai" className="text-primary hover:underline">
                payments@viraworkx.ai
              </a>
            </p>
          </div>
        </div>
      </div>
    </CandidateLayout>
  )
}
