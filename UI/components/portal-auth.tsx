"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowRight } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface PortalAuthProps {
  portalName: string
  portalDescription: string
  portalIcon: LucideIcon
  portalColor: string
  features: string[]
  loginRedirect: string
  nameLabel: string
  namePlaceholder: string
  emailLabel: string
  emailPlaceholder: string
}

export function PortalAuth({
  portalName,
  portalDescription,
  portalIcon: PortalIcon,
  portalColor,
  features,
  loginRedirect,
  nameLabel,
  namePlaceholder,
  emailLabel,
  emailPlaceholder,
}: PortalAuthProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-6 py-12 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", portalColor)}>
              <PortalIcon className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground">SkillBridge</p>
              <h1 className="text-2xl font-bold text-foreground">{portalName}</h1>
            </div>
          </div>
          <p className="text-pretty text-muted-foreground">{portalDescription}</p>
          <div className="grid gap-3 text-sm text-muted-foreground">
            {features.map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
          <Button variant="outline" asChild className="w-fit bg-transparent">
            <Link href="/">
              Back to Home <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <Card className="w-full max-w-md justify-self-center">
          <CardHeader>
            <CardTitle className="text-xl">Sign in to {portalName}</CardTitle>
            <CardDescription>Access your personalized experience and resume where you left off.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>{emailLabel}</Label>
                    <Input type="email" placeholder={emailPlaceholder} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Password</Label>
                    <Input type="password" placeholder="Enter your password" />
                  </div>
                  <div className="text-right text-xs text-muted-foreground">Forgot password?</div>
                  <Button asChild className="w-full">
                    <Link href={loginRedirect}>Continue to Dashboard</Link>
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>{nameLabel}</Label>
                    <Input placeholder={namePlaceholder} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>{emailLabel}</Label>
                    <Input type="email" placeholder={emailPlaceholder} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Password</Label>
                    <Input type="password" placeholder="Create a password" />
                  </div>
                  <Button asChild className="w-full">
                    <Link href={loginRedirect}>Create Account</Link>
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
