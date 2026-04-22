"use client"

import React, { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

import { AuthProvider, useAuth } from "@/lib/auth-context"
import { PortalShell } from "@/components/portal-shell"
import { DashboardSkeleton } from "@/components/skeletons"
import {
  LayoutDashboard,
  Users,
  BookOpen,
  GitMerge,
  BarChart3,
  Settings,
  UserCheck,
  Share2,
  Layers,
  Tag,
  GraduationCap,
} from "lucide-react"

const adminNav = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "User Management", href: "/admin/users", icon: Users },
  { label: "Course Management", href: "/admin/courses", icon: BookOpen },
  { label: "Categories", href: "/admin/categories", icon: Layers },
  { label: "Skills", href: "/admin/skills", icon: Tag },
  { label: "Instructors", href: "/admin/instructors", icon: GraduationCap },
  { label: "Job Matching Hub", href: "/admin/matching", icon: GitMerge },
  { label: "Mentor Management", href: "/admin/mentors", icon: UserCheck },
  { label: "Referrals & Placements", href: "/admin/referrals", icon: Share2 },
  { label: "Analytics Center", href: "/admin/analytics", icon: BarChart3 },
  { label: "System Controls", href: "/admin/settings", icon: Settings },
]

const UNGUARDED_PATHS = ["/admin/login"]

function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, loading, user } = useAuth()

  useEffect(() => {
    if (UNGUARDED_PATHS.includes(pathname)) return
    if (!loading && (!isAuthenticated || user?.user_type !== "admin")) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, loading, user, pathname, router])

  if (UNGUARDED_PATHS.includes(pathname)) return <>{children}</>

  if (loading) {
    return (
      <PortalShell portalName="Admin Portal" navItems={adminNav} portalColor="bg-foreground">
        <DashboardSkeleton />
      </PortalShell>
    )
  }

  if (!isAuthenticated || user?.user_type !== "admin") {
    return null
  }

  return <>{children}</>
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (UNGUARDED_PATHS.includes(pathname)) {
    return <>{children}</>
  }

  return (
    <PortalShell portalName="Admin Portal" navItems={adminNav} portalColor="bg-foreground">
      {children}
    </PortalShell>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>
        <LayoutContent>{children}</LayoutContent>
      </AuthGuard>
    </AuthProvider>
  )
}

