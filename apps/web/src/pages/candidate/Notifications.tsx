import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { Bell, Check, CheckCheck, Trash2, Info, Briefcase, Calendar, Award, FileText } from 'lucide-react'
import CandidateLayout from '../../components/candidate/CandidateLayout'

const TYPE_ICON: Record<string, typeof Bell> = {
  application: Briefcase,
  interview: Calendar,
  assessment: Award,
  contract: FileText,
  offer: CheckCheck,
  default: Info,
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function CandidateNotifications() {
  const { accessToken: token } = useAuthStore()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch(`/api/v1/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    enabled: !!token,
    refetchInterval: 30000,
  })

  const notifications: any[] = data?.notifications || []
  const unreadCount: number = data?.unreadCount || 0

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/v1/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await fetch(`/api/v1/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/v1/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  return (
    <CandidateLayout>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600 text-sm md:text-base">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm text-primary border border-primary/30 rounded-lg hover:bg-primary/5"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg shrink-0" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications yet</h3>
              <p className="text-gray-600">We'll notify you when something important happens with your applications.</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n: any) => {
                const Icon = TYPE_ICON[n.type] || TYPE_ICON.default
                return (
                  <div
                    key={n.id}
                    className={`p-4 md:p-5 flex items-start gap-4 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50/40' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${!n.read ? 'bg-primary/10' : 'bg-gray-100'}`}>
                      <Icon className={`w-5 h-5 ${!n.read ? 'text-primary' : 'text-gray-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium ${!n.read ? 'text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                        <span className="text-xs text-gray-400 shrink-0">{timeAgo(n.createdAt)}</span>
                      </div>
                      {n.message && <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!n.read && (
                        <button
                          onClick={() => markReadMutation.mutate(n.id)}
                          className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-600"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteMutation.mutate(n.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </CandidateLayout>
  )
}
