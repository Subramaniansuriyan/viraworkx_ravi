import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { jobApi } from '../../services/api'
import {
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  Search,
  Filter,
  Building2,
  Wifi,
  ChevronRight
} from 'lucide-react'

export default function JobList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    remotePolicy: '',
    employmentType: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', filters],
    queryFn: () => jobApi.getAll(filters as any),
  })

  const jobs = data?.data?.jobs || []

  const filteredJobs = jobs.filter((job: any) =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.client?.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatSalary = (min?: number, max?: number, currency = 'USD') => {
    if (!min && !max) return 'Competitive'
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    })
    if (min && max) return `${formatter.format(min)} - ${formatter.format(max)}`
    if (min) return `From ${formatter.format(min)}`
    return `Up to ${formatter.format(max!)}`
  }

  const getRemoteBadge = (policy?: string) => {
    switch (policy) {
      case 'remote':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><Wifi className="w-3 h-3 mr-1" />Remote</span>
      case 'hybrid':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Hybrid</span>
      case 'onsite':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">On-site</span>
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center">
            <Link to="/" className="flex items-center shrink-0" aria-label="ViraWorkX home">
              <img src="/logo-lockup.png" alt="ViraWorkX" className="h-9 w-auto" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">Find Your Next Opportunity</h1>
          <p className="text-xl text-primary-100 mb-8">
            Discover amazing tech jobs at innovative startups
          </p>

          {/* Search Bar */}
          <div className="bg-white rounded-xl p-2 flex items-center gap-2 max-w-3xl">
            <div className="flex-1 flex items-center px-4">
              <Search className="w-5 h-5 text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Search jobs, companies, or skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full py-2 outline-none text-gray-900"
              />
            </div>
            <button className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Filters & Results */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Filters</h3>
                <Filter className="w-4 h-4 text-gray-500" />
              </div>

              {/* Work Type Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Work Type</label>
                <select
                  value={filters.remotePolicy}
                  onChange={(e) => setFilters({ ...filters, remotePolicy: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">All</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">On-site</option>
                </select>
              </div>

              {/* Employment Type Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Employment Type</label>
                <select
                  value={filters.employmentType}
                  onChange={(e) => setFilters({ ...filters, employmentType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">All</option>
                  <option value="freelancer">Freelancer</option>
                  <option value="contractor">Contractor</option>
                </select>
              </div>

              <button
                onClick={() => setFilters({ remotePolicy: '', employmentType: '' })}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Clear all filters
              </button>
            </div>
          </div>

          {/* Job Listings */}
          <div className="flex-1">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-gray-600">
                {isLoading ? 'Loading...' : `${filteredJobs.length} jobs found`}
              </p>
              <select className="px-3 py-2 border rounded-lg text-sm">
                <option>Most Recent</option>
                <option>Most Relevant</option>
                <option>Highest Salary</option>
              </select>
            </div>

            <div className="space-y-4">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                ))
              ) : filteredJobs.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center">
                  <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No jobs found</h3>
                  <p className="text-gray-600">Try adjusting your search or filters</p>
                </div>
              ) : (
                filteredJobs.map((job: any) => (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.id}`}
                    className="block bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-transparent hover:border-primary-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-gray-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 hover:text-primary-600">
                              {job.title}
                            </h3>
                            <p className="text-gray-600">{job.client?.companyName}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-4">
                          {job.location && (
                            <span className="flex items-center">
                              <MapPin className="w-4 h-4 mr-1" />
                              {job.location}
                            </span>
                          )}
                          <span className="flex items-center">
                            <DollarSign className="w-4 h-4 mr-1" />
                            {formatSalary(job.salaryMin, job.salaryMax)}
                          </span>
                          {job.employmentType && (
                            <span className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {job.employmentType.replace('_', ' ')}
                            </span>
                          )}
                        </div>

                        {job.skillsRequired?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-4">
                            {job.skillsRequired.slice(0, 5).map((skill: string) => (
                              <span
                                key={skill}
                                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                              >
                                {skill}
                              </span>
                            ))}
                            {job.skillsRequired.length > 5 && (
                              <span className="px-3 py-1 text-gray-500 text-sm">
                                +{job.skillsRequired.length - 5} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {getRemoteBadge(job.remotePolicy)}
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
