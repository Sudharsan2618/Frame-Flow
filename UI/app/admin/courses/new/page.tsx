"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StepCourseInfo } from "@/components/course-builder/step-course-info"
import { StepCurriculum } from "@/components/course-builder/step-curriculum"
import { StepPublish } from "@/components/course-builder/step-publish"
import { cn } from "@/lib/utils"
import type { CourseBuilderData } from "@/lib/api/admin-courses"

const STEPS = [
  { label: "Course Info", number: 1 },
  { label: "Curriculum", number: 2 },
  { label: "Review & Publish", number: 3 },
]

export default function NewCoursePage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [courseSlug, setCourseSlug] = useState<string | null>(null)
  const [courseData, setCourseData] = useState<CourseBuilderData | null>(null)

  const handleStep1Complete = useCallback((id: number, slug: string) => {
    setCourseId(id)
    setCourseSlug(slug)
    setCurrentStep(2)
  }, [])

  const handleCourseDataUpdate = useCallback((data: CourseBuilderData) => {
    setCourseData(data)
  }, [])

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/courses"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Create Course</h1>
          <p className="text-sm text-muted-foreground">Build your course step by step</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((step, i) => (
          <div key={step.number} className="flex items-center gap-2">
            <button
              onClick={() => {
                if (step.number === 1 || (step.number === 2 && courseId) || (step.number === 3 && courseId)) {
                  setCurrentStep(step.number)
                }
              }}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                currentStep === step.number
                  ? "bg-primary text-primary-foreground"
                  : currentStep > step.number
                    ? "bg-primary/10 text-primary cursor-pointer"
                    : "bg-muted text-muted-foreground",
                (step.number > 1 && !courseId) && "opacity-50 cursor-not-allowed",
              )}
            >
              {currentStep > step.number ? (
                <Check className="h-4 w-4" />
              ) : (
                <span className="flex h-5 w-5 items-center justify-center rounded-full border text-xs">
                  {step.number}
                </span>
              )}
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={cn("h-px w-8 sm:w-12", currentStep > step.number ? "bg-primary" : "bg-border")} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {currentStep === 1 && (
        <StepCourseInfo
          courseId={courseId}
          onComplete={handleStep1Complete}
        />
      )}
      {currentStep === 2 && courseId && (
        <StepCurriculum
          courseId={courseId}
          courseSlug={courseSlug || ""}
          onNext={() => setCurrentStep(3)}
          onBack={() => setCurrentStep(1)}
          onCourseDataUpdate={handleCourseDataUpdate}
        />
      )}
      {currentStep === 3 && courseId && (
        <StepPublish
          courseId={courseId}
          courseData={courseData}
          onBack={() => setCurrentStep(2)}
          onPublished={() => router.push("/admin/courses")}
        />
      )}
    </div>
  )
}
