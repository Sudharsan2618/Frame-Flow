"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  Loader2,
  Play,
  Star,
  Users,
  Video,
  HelpCircle,
  Shield,
  Award,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import {
  getCourseDetail,
  getEnrollments,
  enrollInCourse,
  trackActivity,
  issueCertificate,
  getCertificateViewUrl,
  createPaymentOrder,
  verifyPayment,
  loadRazorpayScript,
  type CourseDetail,
  type EnrollmentOut,
} from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { CourseDetailSkeleton } from "@/components/skeletons"
import { CourseReviews } from "@/components/course-reviews"

const contentTypeIcons: Record<string, React.ElementType> = {
  video: Video,
  text: BookOpen,
  quiz: HelpCircle,
}

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const slug = params.slug as string

  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [enrollment, setEnrollment] = useState<EnrollmentOut | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedModules, setExpandedModules] = useState<number[]>([])
  const [paymentProcessing, setPaymentProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [certLoading, setCertLoading] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)
        const courseData = await getCourseDetail(slug)
        setCourse(courseData)

        // Expand first module by default
        if (courseData.modules.length > 0) {
          setExpandedModules([courseData.modules[0].module_id])
        }

        // Check if already enrolled
        if (user?.student_id) {
          try {
            const enrolls = await getEnrollments(user.student_id)
            const existing = enrolls.find((e) => e.course_id === courseData.course_id)
            if (existing) setEnrollment(existing)
          } catch {}
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load course")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [slug, user?.student_id])

  // Scroll to #reviews anchor if present in URL
  useEffect(() => {
    if (!loading && course && window.location.hash === "#reviews") {
      setTimeout(() => {
        document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth" })
      }, 300)
    }
  }, [loading, course])

  function toggleModule(id: number) {
    setExpandedModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )
  }

  async function handleEnroll() {
    if (!user?.student_id || !course) return

    const price = parseFloat(course.price)
    const isFree = course.pricing_model === "free" || price === 0

    if (!isFree) {
      // Start Razorpay payment flow
      await handleRazorpayPayment()
      return
    }

    // Free course — enroll directly
    try {
      setEnrolling(true)
      const result = await enrollInCourse(course.course_id, user.student_id)
      setEnrollment(result)

      // Track Activity: Course Enrolled
      trackActivity({
        student_id: user.student_id,
        course_id: course.course_id,
        activity_type: "course_enrolled"
      }).catch(console.warn)

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enroll")
    } finally {
      setEnrolling(false)
    }
  }

  async function handleRazorpayPayment() {
    if (!user?.student_id || !course) return

    setPaymentProcessing(true)
    setPaymentError(null)

    try {
      // 1. Load Razorpay Checkout JS SDK
      const loaded = await loadRazorpayScript()
      if (!loaded) {
        setPaymentError("Failed to load payment gateway. Please refresh and try again.")
        setPaymentProcessing(false)
        return
      }

      // 2. Create order on our backend
      const orderData = await createPaymentOrder(course.course_id)

      // 3. Open Razorpay Checkout popup
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "RecruitLMS",
        description: orderData.course_title,
        order_id: orderData.order_id,
        prefill: {
          name: user.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "",
          email: user.email || "",
        },
        theme: {
          color: "#6366f1",    // Indigo to match app theme
        },
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          // 4. Verify payment on our backend
          try {
            const result = await verifyPayment(
              response.razorpay_payment_id,
              response.razorpay_order_id,
              response.razorpay_signature,
            )

            if (result.success) {
              // Refresh enrollment data
              const enrolls = await getEnrollments(user.student_id!)
              const newEnrollment = enrolls.find((e) => e.course_id === course.course_id)
              if (newEnrollment) setEnrollment(newEnrollment)

              // Track Activity
              trackActivity({
                student_id: user.student_id!,
                course_id: course.course_id,
                activity_type: "course_enrolled"
              }).catch(console.warn)
            }
          } catch (err) {
            setPaymentError(err instanceof Error ? err.message : "Payment verification failed")
          }
          setPaymentProcessing(false)
        },
        modal: {
          ondismiss: () => {
            setPaymentProcessing(false)
          },
        },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.on("payment.failed", (response: any) => {
        setPaymentError(
          response.error?.description || "Payment failed. Please try again."
        )
        setPaymentProcessing(false)
      })
      rzp.open()

    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Failed to initiate payment")
      setPaymentProcessing(false)
    }
  }

  if (loading) {
    return <CourseDetailSkeleton />
  }

  if (error || !course) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium text-destructive">Failed to load course</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  const price = parseFloat(course.price)
  const isFree = course.pricing_model === "free" || price === 0
  const instructorName = course.instructor
    ? `${course.instructor.first_name} ${course.instructor.last_name}`
    : "Instructor"
  const totalLessons = course.modules.reduce((s, m) => s + m.lessons.length, 0)
  const progress = enrollment ? parseFloat(enrollment.progress_percentage) : 0

  return (
    <div className="flex flex-col gap-6">
      {/* Back navigation */}
      <Button variant="ghost" size="sm" className="w-fit" onClick={() => router.push("/student/courses")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Catalog
      </Button>

      {/* Hero Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Course header */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{course.difficulty_level}</Badge>
              <Badge variant="outline">{course.category?.name || "General"}</Badge>
              {enrollment && (
                <Badge className="bg-emerald-600 text-white border-0">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Enrolled
                </Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold text-foreground">{course.title}</h1>
            <p className="text-muted-foreground leading-relaxed">{course.description || course.short_description}</p>

            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-accent text-accent" />
                {parseFloat(course.average_rating) > 0 ? parseFloat(course.average_rating).toFixed(1) : "New"} ({course.total_reviews} reviews)
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {course.total_enrollments} students
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {course.duration_hours} hours
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" />
                {course.total_modules} modules · {totalLessons} lessons
              </span>
            </div>

            <p className="text-sm text-muted-foreground">
              Instructor: <span className="font-medium text-foreground">{instructorName}</span>
            </p>
          </div>

          {/* Enrolled progress */}
          {enrollment && (
            <Card className="border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/10">
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Your Progress</p>
                    <div className="flex items-center gap-3 mt-1">
                      <Progress value={progress} className="h-2 flex-1" />
                      <span className="text-sm font-bold text-foreground">{progress}%</span>
                    </div>
                  </div>
                  <Button asChild>
                    <Link href={`/student/player?slug=${course.slug}`}>
                      <Play className="mr-2 h-4 w-4" />
                      {progress > 0 ? "Continue Learning" : "Start Learning"}
                    </Link>
                  </Button>
                </div>
                {/* Certificate section */}
                {(progress >= 100 || enrollment.status === "completed") && (
                  <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 px-4 py-3">
                    <Award className="h-5 w-5 text-amber-600 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Course Completed!</p>
                      <p className="text-xs text-muted-foreground">You can now claim your certificate of completion.</p>
                    </div>
                    {enrollment.certificate_issued ? (
                      <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={() => window.open(getCertificateViewUrl(enrollment.enrollment_id), '_blank')}>
                        <Award className="h-3.5 w-3.5" />
                        View Certificate
                      </Button>
                    ) : (
                      <Button size="sm" className="shrink-0 gap-1.5" disabled={certLoading} onClick={async () => {
                        setCertLoading(true)
                        try {
                          const res = await issueCertificate(enrollment.enrollment_id)
                          setEnrollment({ ...enrollment, certificate_issued: true, certificate_url: res.certificate_url })
                          window.open(getCertificateViewUrl(enrollment.enrollment_id), '_blank')
                        } catch (err) { console.error('Certificate issue failed:', err) }
                        finally { setCertLoading(false) }
                      }}>
                        {certLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Award className="h-3.5 w-3.5" />}
                        {certLoading ? "Issuing..." : "Get Certificate"}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Skills */}
          {course.skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Skills You Will Learn</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {course.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="px-3 py-1">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Course Curriculum */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Course Curriculum</CardTitle>
              <p className="text-xs text-muted-foreground">
                {course.modules.length} modules · {totalLessons} lessons
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 p-4">
              {course.modules.map((mod) => (
                <div key={mod.module_id} className="overflow-hidden rounded-lg border border-border">
                  <button
                    onClick={() => toggleModule(mod.module_id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted"
                  >
                    {expandedModules.includes(mod.module_id)
                      ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    }
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{mod.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {mod.lessons.length} lessons
                        {mod.duration_minutes ? ` · ${Math.round(mod.duration_minutes / 60)}h ${mod.duration_minutes % 60}m` : ""}
                      </p>
                    </div>
                  </button>
                  {expandedModules.includes(mod.module_id) && (
                    <div className="border-t border-border bg-muted/30 px-4 py-2">
                      {mod.lessons.map((lesson) => {
                        const Icon = contentTypeIcons[lesson.content_type] || FileText
                        return (
                          <div
                            key={lesson.lesson_id}
                            className="flex items-center gap-3 rounded px-2 py-2 text-sm text-muted-foreground"
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="flex-1">{lesson.title}</span>
                            {lesson.duration_minutes && (
                              <span className="text-xs">{lesson.duration_minutes}m</span>
                            )}
                            {lesson.is_preview && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">Preview</Badge>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Reviews Section */}
          <div id="reviews">
            <CourseReviews courseId={course.course_id} isEnrolled={!!enrollment} />
          </div>
        </div>

        {/* Sidebar — Enrollment Card */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6 overflow-hidden">
            {/* Thumbnail */}
            {course.thumbnail_url ? (
              <div className="relative w-full bg-muted">
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null}
            <CardContent className="flex flex-col gap-4 p-6">
              {/* Price */}
              <div className="text-center">
                {isFree ? (
                  <p className="text-3xl font-bold text-emerald-600">Free</p>
                ) : (
                  <div>
                    <p className="text-3xl font-bold text-foreground">₹{price.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">One-time payment</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Enrollment actions */}
              {enrollment ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium">You are enrolled</span>
                  </div>
                  <Button size="lg" className="w-full" asChild>
                    <Link href={`/student/player?slug=${course.slug}`}>
                      <Play className="mr-2 h-4 w-4" />
                      {progress > 0 ? "Continue Learning" : "Start Learning"}
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={handleEnroll}
                    disabled={enrolling || paymentProcessing}
                  >
                    {enrolling || paymentProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {paymentProcessing ? "Processing Payment..." : "Enrolling..."}
                      </>
                    ) : isFree ? (
                      "Enroll for Free"
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Enroll Now — ₹{price.toLocaleString()}
                      </>
                    )}
                  </Button>
                  {!isFree && (
                    <p className="text-[10px] text-center text-muted-foreground">
                      🧪 Test Mode — Use card <code className="bg-muted px-1 py-0.5 rounded text-[10px]">4111 1111 1111 1111</code>
                    </p>
                  )}
                  {paymentError && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50/50 dark:bg-red-950/10 px-3 py-2">
                      <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-600">{paymentError}</p>
                    </div>
                  )}
                </div>
              )}

              <Separator />

              {/* Course includes */}
              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium text-foreground">This course includes:</p>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 shrink-0" />
                    <span>{course.duration_hours} hours of video content</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 shrink-0" />
                    <span>{totalLessons} lessons across {course.total_modules} modules</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span>Downloadable resources</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 shrink-0" />
                    <span>Certificate of completion</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 shrink-0" />
                    <span>Lifetime access</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

