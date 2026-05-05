import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Check, CheckCheck, X } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

export default function NotificationBell() {
  const { accessToken: token } = useAuthStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch(`/api/v1/notifications?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return { notifications: [], unreadCount: 0 }
      return res.json()
    },
    refetchInterval: 30000,
    enabled: !!token,
  })

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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const notifications = data?.notifications || []
  const unreadCount = data?.unreadCount || 0

  const formatTime = (date: string) => {
    const diffMs = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-ink-mute hover:text-ink"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed right-4 z-[100] mt-2 w-80 rounded-xl border border-paper-line bg-paper shadow-xl sm:w-96" style={{ top: ref.current ? ref.current.getBoundingClientRect().bottom + 8 : 'auto' }}>
          <div className="flex items-center justify-between border-b border-paper-line p-4">
            <div>
              <h3 className="font-semibold text-ink">Notifications</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-ink-mute">{unreadCount} unread</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllReadMutation.mutate()}
                  className="flex items-center gap-1 text-xs text-brand hover:underline"
                >
                  <CheckCheck className="w-3 h-3" /> Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1 hover:bg-soft-gray"
              >
                <X className="h-4 w-4 text-ink-mute" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n: any) => (
                <div
                  key={n.id}
                  className={`p-4 hover:bg-gray-50 flex items-start gap-3 ${
                    !n.read ? 'bg-blue-50/50' : ''
                  }`}
                >
                  {!n.read && (
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                  )}
                  {n.read && <span className="w-2 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{n.title}</p>
                    {n.message && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{formatTime(n.createdAt)}</p>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => markReadMutation.mutate(n.id)}
                      className="p-1 hover:bg-gray-100 rounded shrink-0"
                      title="Mark as read"
                    >
                      <Check className="w-3 h-3 text-gray-400" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
