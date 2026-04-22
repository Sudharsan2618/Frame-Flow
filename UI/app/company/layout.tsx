"use client"

import React from "react"
import { usePathname, useRouter } from "next/navigation"

import { AuthProvider, useAuth } from "@/lib/auth-context"
import { PortalShell } from "@/components/portal-shell"
import { DashboardSkeleton } from "@/components/skeletons"
import {
  LayoutDashboard,
  BarChart3,
  Briefcase,
  Users,
  Building2,
} from "lucide-react"

const companyNav = [
  { label: "Dashboard", href: "/company", icon: LayoutDashboard },
  { label: "Talent Analytics", href: "/company/talent", icon: BarChart3 },
  { label: "Job Management", href: "/company/jobs", icon: Briefcase },
  { label: "Candidate Pipeline", href: "/company/candidates", icon: Users },
  { label: "Company Profile", href: "/company/profile", icon: Building2 },
]

const UNGUARDED_PATHS = ["/company/login", "/company/register", "/company/onboarding"]

function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, loading, user } = useAuth()

  if (UNGUARDED_PATHS.includes(pathname)) return <>{children}</>

  if (loading) {
    return (
      <PortalShell portalName="Company Portal" navItems={companyNav} portalColor="bg-accent">
        <DashboardSkeleton />
      </PortalShell>
    )
  }

  if (!isAuthenticated) {
    router.push("/company/login")
    return null
  }

  if (user && !user.onboarding_completed) {
    router.push("/company/onboarding")
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
    <PortalShell portalName="Company Portal" navItems={companyNav} portalColor="bg-accent">
      {children}
    </PortalShell>
  )
}

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>
        <LayoutContent>{children}</LayoutContent>
      </AuthGuard>
    </AuthProvider>
  )
}
