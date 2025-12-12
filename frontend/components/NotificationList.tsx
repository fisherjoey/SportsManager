'use client'

import React, { useState, useEffect } from 'react'
import { Bell, Trash2, CheckCheck, Filter } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { notificationsApi, Notification } from '@/lib/notifications-api'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/use-toast'

/**
 * Get icon for notification type
 */
function getNotificationIcon(type: Notification['type']): string {
  switch (type) {
  case 'assignment':
    return '📋'
  case 'status_change':
    return '🔄'
  case 'reminder':
    return '⏰'
  case 'system':
    return '⚙️'
  default:
    return '📢'
  }
}

/**
 * Get color class for notification type
 */
function getNotificationColor(type: Notification['type']): string {
  switch (type) {
  case 'assignment':
    return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
  case 'status_change':
    return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-green-300'
  case 'reminder':
    return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
  case 'system':
    return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300'
  default:
    return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300'
  }
}

/**
 * NotificationList Component
 *
 * Full notifications page with:
 * - Pagination (20 per page)
 * - Filter toggle for unread/all
 * - Mark all as read button
 * - Delete individual notifications
 * - Click to navigate to linked pages
 */
export function NotificationList() {
  const router = useRouter()
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const itemsPerPage = 20

  /**
   * Fetch notifications
   */
  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      const offset = (currentPage - 1) * itemsPerPage

      const data = await notificationsApi.getNotifications({
        unread_only: showUnreadOnly,
        limit: itemsPerPage,
        offset
      })

      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
      setTotal(data.total)
    } catch (error) {
      console.error('Error fetching notifications:', error)
      toast({
        title: 'Error',
        description: 'Failed to load notifications. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle notification click
   */
  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark as read
      if (!notification.is_read) {
        await notificationsApi.markAsRead(notification.id)

        // Update local state
        setNotifications(prev =>
          prev.map(n =>
            n.id === notification.id ? { ...n, is_read: true } : n
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }

      // Navigate to link if available
      if (notification.link) {
        router.push(notification.link)
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read.',
        variant: 'destructive'
      })
    }
  }

  /**
   * Handle mark all as read
   */
  const handleMarkAllAsRead = async () => {
    try {
      const count = await notificationsApi.markAllAsRead()

      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      )
      setUnreadCount(0)

      toast({
        title: 'Success',
        description: `Marked ${count} notification${count !== 1 ? 's' : ''} as read.`
      })
    } catch (error) {
      console.error('Error marking all as read:', error)
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read.',
        variant: 'destructive'
      })
    }
  }

  /**
   * Handle delete notification
   */
  const handleDeleteNotification = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation()

    try {
      setDeletingId(notificationId)
      await notificationsApi.deleteNotification(notificationId)

      // Update local state
      const deletedNotification = notifications.find(n => n.id === notificationId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      setTotal(prev => prev - 1)

      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }

      toast({
        title: 'Success',
        description: 'Notification deleted.'
      })
    } catch (error) {
      console.error('Error deleting notification:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete notification.',
        variant: 'destructive'
      })
    } finally {
      setDeletingId(null)
    }
  }

  /**
   * Fetch on mount and when filters change
   */
  useEffect(() => {
    fetchNotifications()
  }, [currentPage, showUnreadOnly])

  /**
   * Reset to page 1 when filter changes
   */
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }, [showUnreadOnly])

  const totalPages = Math.ceil(total / itemsPerPage)

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6" />
              <div>
                <CardTitle>Notifications</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={showUnreadOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                {showUnreadOnly ? 'Show All' : 'Unread Only'}
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="gap-2"
                >
                  <CheckCheck className="h-4 w-4" />
                  Mark All Read
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 bg-muted animate-pulse rounded-lg"
                />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title={showUnreadOnly ? 'No unread notifications' : 'No notifications'}
              description={showUnreadOnly ? 'You have read all your notifications.' : 'You will see notifications here when they arrive.'}
              action={showUnreadOnly ? {
                label: 'Show All Notifications',
                onClick: () => setShowUnreadOnly(false),
                variant: 'outline'
              } : undefined}
            />
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`
                    group relative flex items-start gap-3 p-4 rounded-lg border cursor-pointer
                    transition-colors hover:bg-accent/50
                    ${!notification.is_read ? 'bg-accent/30 border-accent' : 'border-border'}
                  `}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <div className={`
                      h-10 w-10 rounded-full flex items-center justify-center text-xl
                      ${getNotificationColor(notification.type)}
                    `}>
                      {getNotificationIcon(notification.type)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {notification.type.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true
                            })}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleDeleteNotification(notification.id, e)}
                        disabled={deletingId === notification.id}
                        aria-label="Delete notification"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && notifications.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} ({total} total)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
