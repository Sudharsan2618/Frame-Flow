"use client"

import React from "react"
import { usePathname, useRouter } from "next/navigation"

import { AuthProvider, useAuth } from "@/lib/auth-context"
import { PortalShell } from "@/components/portal-shell"
import { DashboardSkeleton } from "@/components/skeletons"
import {
  LayoutDashboard,
  BookOpen,
  Video,
  FolderOpen,
  Briefcase,
  User,
  UserCheck,
  Share2,
  Award,
  GraduationCap,
} from "lucide-react"

const studentNav = [
  { label: "Dashboard", href: "/student", icon: LayoutDashboard },
  { label: "Course Catalog", href: "/student/courses", icon: BookOpen },
  { label: "Live Webinars", href: "/student/webinars", icon: Video },
  { label: "Materials Library", href: "/student/materials", icon: FolderOpen },
  { label: "Job Board", href: "/student/jobs", icon: Briefcase },
  { label: "Mentors", href: "/student/mentors", icon: UserCheck },
  { label: "Referrals", href: "/student/referrals", icon: Share2 },
  { label: "Certificates", href: "/student/certificates", icon: Award },
  { label: "Placement Support", href: "/student/placements", icon: GraduationCap },
  { label: "My Profile", href: "/student/profile", icon: User },
]

const UNGUARDED_PATHS = ["/student/login", "/student/register", "/student/onboarding"]

function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, loading, user } = useAuth()

  // Redirect to login if not authenticated (after loading finishes)
  React.useEffect(() => {
    if (loading || UNGUARDED_PATHS.includes(pathname)) return
    if (!isAuthenticated) {
      router.push("/student/login")
    } else if (user && !user.onboarding_completed) {
      router.push("/student/onboarding")
    }
  }, [loading, isAuthenticated, user, pathname, router])

  // Don't guard login, register, or onboarding pages
  if (UNGUARDED_PATHS.includes(pathname)) return <>{children}</>

  // Show loading while restoring session, or while redirecting
  if (loading || !isAuthenticated || (user && !user.onboarding_completed)) {
    return (
      <PortalShell portalName="Student Portal" navItems={studentNav} portalColor="bg-primary">
        <DashboardSkeleton />
      </PortalShell>
    )
  }

  return <>{children}</>
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Full-screen pages — no shell
  if (UNGUARDED_PATHS.includes(pathname) || pathname === "/student/player") {
    return <>{children}</>
  }

  // All other pages — standard sidebar layout
  return (
    <PortalShell portalName="Student Portal" navItems={studentNav} portalColor="bg-primary">
      {children}
    </PortalShell>
  )
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>
        <LayoutContent>{children}</LayoutContent>
      </AuthGuard>
    </AuthProvider>
  )
}
