"use client"

import { useState } from "react"
import Link from "next/link"
import { BookOpen, Briefcase, Users, ArrowRight, BarChart3, GraduationCap, Building2, CheckCircle, ShieldCheck, Menu, X } from "lucide-react"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo size={36} />
          <span className="text-lg font-bold text-foreground sm:text-xl">SkillBridge</span>
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <Link href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Features</Link>
          <Link href="#portals" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Portals</Link>
          <Link href="#stats" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Impact</Link>
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" size="sm" asChild><Link href="/student/login">Student Login</Link></Button>
          <Button size="sm" asChild><Link href="/company/login">Company Portal</Link></Button>
        </div>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-card px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-1 py-3">
            <Link href="#features" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">Features</Link>
            <Link href="#portals" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">Portals</Link>
            <Link href="#stats" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">Impact</Link>
          </div>
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <Button variant="outline" asChild className="w-full justify-center"><Link href="/student/login">Student Login</Link></Button>
            <Button asChild className="w-full justify-center"><Link href="/company/login">Company Portal</Link></Button>
          </div>
        </div>
      )}
    </header>
  )
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-card px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-sm text-muted-foreground">
            <span className="flex h-2 w-2 rounded-full bg-primary" />
            Trusted by 15,000+ learners worldwide
          </div>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-6xl lg:text-7xl">
            Learn Skills.<br />Land Careers.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg">
            SkillBridge combines world-class courses with direct access to top employers. Master in-demand skills through SCORM-compliant content and get matched with opportunities that fit your profile.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4">
            <Button size="lg" asChild className="gap-2">
              <Link href="/student/login">
                Start Learning <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/company/login">Hire Talent</Link>
            </Button>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(172_66%_30%/0.06),transparent_70%)]" />
    </section>
  )
}

function StatsSection() {
  const stats = [
    { value: "15,420+", label: "Active Students" },
    { value: "48", label: "Expert-Led Courses" },
    { value: "342", label: "Partner Companies" },
    { value: "89%", label: "Job Placement Rate" },
  ]
  return (
    <section id="stats" className="border-y border-border bg-secondary/50 px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="text-2xl font-bold text-primary sm:text-3xl md:text-4xl">{stat.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function FeaturesSection() {
  const features = [
    { icon: BookOpen, title: "SCORM-Compliant Courses", description: "Industry-standard course content with automated tracking of completion, scores, and time spent across all learning modules." },
    { icon: BarChart3, title: "xAPI Learning Analytics", description: "Rich learning data capture beyond course boundaries. Track real-world skills application and learning activities." },
    { icon: Briefcase, title: "Smart Job Matching", description: "Our admin team reviews your profile and matches you with relevant opportunities from our network of partner companies." },
    { icon: Users, title: "Talent Pool Insights", description: "Companies get aggregated analytics on student skills, completion rates, and emerging competencies to guide hiring." },
  ]
  return (
    <section id="features" className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">Built on Global Learning Standards</h2>
          <p className="mt-4 text-pretty text-muted-foreground">Our platform integrates SCORM, xAPI, and LTI to deliver a reliable, interoperable learning experience.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:mt-16 sm:gap-6 md:grid-cols-2">
          {features.map((feature) => (
            <Card key={feature.title} className="border-border bg-card transition-shadow hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorksSection() {
  const steps = [
    { step: "01", title: "Create Your Profile", description: "Sign up, complete your profile with skills and experience, and set your career preferences." },
    { step: "02", title: "Learn & Build Skills", description: "Enroll in expert-led courses, complete quizzes, and earn verifiable skill badges as you progress." },
    { step: "03", title: "Get Matched & Hired", description: "Our team reviews your profile and matches you with relevant openings from partner companies." },
  ]
  return (
    <section className="px-4 py-16 bg-secondary/30 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">How It Works</h2>
          <p className="mt-4 text-pretty text-muted-foreground">From sign-up to job offer in three simple steps.</p>
        </div>
        <div className="mt-10 grid gap-8 sm:mt-16 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.step} className="relative flex flex-col items-center text-center">
              {i < steps.length - 1 && (
                <div className="absolute left-[calc(50%+40px)] top-8 hidden h-px w-[calc(100%-80px)] bg-border md:block" />
              )}
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground sm:h-16 sm:w-16 sm:text-xl">
                {s.step}
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PortalsSection() {
  const portals = [
    {
      icon: GraduationCap,
      title: "Student Portal",
      description: "Access courses, track your learning progress, earn skill badges, and apply for jobs matched to your growing expertise.",
      features: ["Personalized learning dashboard", "SCORM-compliant video courses", "AI-powered job recommendations"],
      href: "/student/login",
      cta: "Start Learning",
      accent: "bg-primary/10 text-primary",
    },
    {
      icon: Building2,
      title: "Company Portal",
      description: "Post job openings, explore talent pool analytics, and manage your candidate pipeline with a Kanban-style board.",
      features: ["Post and manage job listings", "Talent pool skill insights", "Application tracking pipeline"],
      href: "/company/login",
      cta: "Hire Talent",
      accent: "bg-chart-2/10 text-chart-2",
    },
  ]
  return (
    <section id="portals" className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">Choose Your Portal</h2>
          <p className="mt-4 text-pretty text-muted-foreground">Purpose-built experiences for learners and employers alike.</p>
        </div>
        <div className="mt-10 grid gap-6 sm:mt-16 sm:gap-8 lg:grid-cols-2">
          {portals.map((portal) => (
            <Card key={portal.title} className="group relative overflow-hidden border-border bg-card transition-all hover:shadow-lg">
              <CardContent className="flex flex-col p-5 sm:p-8 lg:p-10">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${portal.accent} transition-colors`}>
                  <portal.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-foreground sm:mt-6 sm:text-2xl">{portal.title}</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">{portal.description}</p>
                <ul className="mt-5 grid gap-2.5">
                  {portal.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-8 gap-2 w-fit">
                  <Link href={portal.href}>
                    {portal.cta} <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border bg-card px-4 pt-10 pb-6 sm:px-6 sm:pt-16 sm:pb-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-8 sm:gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <Logo size={32} />
              <span className="font-bold text-foreground">SkillBridge</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Bridging the gap between learning and employment with industry-standard course delivery.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">Platform</h4>
            <ul className="mt-4 grid gap-2.5 text-sm text-muted-foreground">
              <li><Link href="#features" className="transition-colors hover:text-foreground">Features</Link></li>
              <li><Link href="#portals" className="transition-colors hover:text-foreground">Portals</Link></li>
              <li><Link href="#stats" className="transition-colors hover:text-foreground">Impact</Link></li>
            </ul>
          </div>

          {/* Get Started */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">Get Started</h4>
            <ul className="mt-4 grid gap-2.5 text-sm text-muted-foreground">
              <li><Link href="/student/login" className="transition-colors hover:text-foreground">Student Login</Link></li>
              <li><Link href="/student/register" className="transition-colors hover:text-foreground">Student Registration</Link></li>
              <li><Link href="/company/login" className="transition-colors hover:text-foreground">Company Portal</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">Legal</h4>
            <ul className="mt-4 grid gap-2.5 text-sm text-muted-foreground">
              <li><span className="cursor-default">Privacy Policy</span></li>
              <li><span className="cursor-default">Terms of Service</span></li>
              <li><span className="cursor-default">Cookie Policy</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 md:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} SkillBridge. Built with SCORM, xAPI &amp; LTI standards.
          </p>
          <Link
            href="/admin/login"
            className="flex items-center gap-1.5 text-xs text-muted-foreground/50 transition-colors hover:text-muted-foreground"
          >
            <ShieldCheck className="h-3 w-3" />
            Administration
          </Link>
        </div>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PortalsSection />
      <Footer />
    </main>
  )
}
