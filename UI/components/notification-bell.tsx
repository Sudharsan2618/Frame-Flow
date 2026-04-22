"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Bell, Check, CheckCheck, Trash2, ExternalLink, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Link from "next/link"
import {
  getNotifications, getUnreadCount, markNotificationRead,
  markAllNotificationsRead, deleteNotification,
  type Notification,
} from "@/lib/api"

const typeIcons: Record<string, string> = {
  application_update: "📋",
  job_match: "🎯",
  course_update: "📚",
  webinar_reminder: "📹",
  payment_confirmation: "💳",
  mentor_session: "👨‍🏫",
  referral_update: "🔗",
  system_announcement: "📢",
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchUnreadCount = useCallback(async () => {
    if (typeof window !== "undefined" && !localStorage.getItem("auth_token")) return
    try {
      const res = await getUnreadCount()
      setUnreadCount(res.unread_count)
    } catch {
      // silently fail — user may not be logged in
    }
  }, [])

  const fetchNotifications = useCallback(async () => {
    if (typeof window !== "undefined" && !localStorage.getItem("auth_token")) return
    setLoading(true)
    try {
      const res = await getNotifications({ limit: 10 })
      setNotifications(res.notifications)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  // Poll unread count every 30s
  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  // Load notifications when dropdown opens
  useEffect(() => {
    if (open) fetchNotifications()
  }, [open, fetchNotifications])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  async function handleMarkRead(id: number) {
    try {
      await markNotificationRead(id)
      setNotifications((prev) => prev.map((n) => n.notification_id === id ? { ...n, is_read: true } : n))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch { /* ignore */ }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch { /* ignore */ }
  }

  async function handleDelete(id: number) {
    try {
      const n = notifications.find((x) => x.notification_id === id)
      await deleteNotification(id)
      setNotifications((prev) => prev.filter((x) => x.notification_id !== id))
      if (n && !n.is_read) setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch { /* ignore */ }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[380px] max-h-[480px] overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleMarkAllRead}>
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                </Button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[380px]">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.notification_id}
                  className={cn(
                    "flex gap-3 px-4 py-3 border-b border-border/50 transition-colors hover:bg-muted/50",
                    !n.is_read && "bg-primary/5"
                  )}
                >
                  <div className="text-lg shrink-0 mt-0.5">
                    {typeIcons[n.type] || "🔔"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm leading-snug", !n.is_read ? "font-semibold text-foreground" : "text-foreground/80")}>
                        {n.title}
                      </p>
                      {!n.is_read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                      {n.action_url && (
                        <Link
                          href={n.action_url}
                          className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                          onClick={() => { if (!n.is_read) handleMarkRead(n.notification_id); setOpen(false) }}
                        >
                          {n.action_text || "View"} <ExternalLink className="h-2.5 w-2.5" />
                        </Link>
                      )}
                      {!n.is_read && (
                        <button
                          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                          onClick={() => handleMarkRead(n.notification_id)}
                        >
                          <Check className="h-2.5 w-2.5" /> Read
                        </button>
                      )}
                      <button
                        className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-0.5 ml-auto"
                        onClick={() => handleDelete(n.notification_id)}
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
