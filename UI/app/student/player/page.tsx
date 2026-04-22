"use client"

import dynamic from "next/dynamic"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
const CodePlayground = dynamic(() => import("@/components/code-editor/CodePlayground"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12 bg-slate-950 rounded-xl border border-slate-800/60">
      <div className="flex flex-col items-center gap-2">
        <div className="h-6 w-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-xs text-slate-500">Loading Code Editor...</p>
      </div>
    </div>
  ),
})

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  FileText,
  HelpCircle,
  Loader2,
  Menu,
  Play,
  Video,
  X,
  Brain,
  Download,
  AlertCircle,
  Trophy,
  RotateCcw,
  Clock,
  StickyNote,
  Terminal,
  Sparkles,
  Save,
  Award,
  Star,
} from "lucide-react"
import Link from "next/link"
import { 
  getCourseDetail, 
  getLesson, 
  getQuiz, 
  startTrackingSession,
  sendHeartbeat,
  endTrackingSession,
  trackActivity,
  getCourseProgress,
  updateLessonProgress,
  getStudentAnalytics,
  getEnrollments,
  enrollInCourse,
  submitQuiz,
  issueCertificate,
  getCertificateViewUrl,
  type CourseDetail, 
  type LessonFull, 
  type LessonBrief, 
  type QuizOut,
  type QuizResultOut,
  type LessonProgressOut,
  type StudentActivitySummary,
  type EnrollmentOut
} from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { PlayerSkeleton } from "@/components/skeletons"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`

const contentTypeIcons: Record<string, React.ElementType> = {
  video: Video,
  text: BookOpen,
  quiz: HelpCircle,
  pdf: FileText,
}

// ── Watched-range helpers (unique seconds tracking) ──
function mergeRanges(ranges: [number, number][]): [number, number][] {
  if (ranges.length === 0) return []
  const sorted = [...ranges].sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = [sorted[0]]
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1]
    if (sorted[i][0] <= last[1]) {
      last[1] = Math.max(last[1], sorted[i][1])
    } else {
      merged.push(sorted[i])
    }
  }
  return merged
}

function totalUniqueSeconds(ranges: [number, number][]): number {
  return mergeRanges(ranges).reduce((sum, [s, e]) => sum + (e - s), 0)
}

// ── Native PDF Viewer Component (with progress tracking + auto-scroll) ──
interface PdfViewerProps {
  url: string
  initialPage?: number          // 1-indexed page to auto-scroll to on load
  onProgressChange?: (info: { currentPage: number; totalPages: number; percentage: number; maxPageReached: number }) => void
}

function PdfViewer({ url, initialPage = 0, onProgressChange }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageWidth, setPageWidth] = useState<number>(600)
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [maxPage, setMaxPage] = useState<number>(initialPage || 1)
  const containerRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const maxPageReachedRef = useRef<number>(initialPage || 1)
  const hasScrolledToInitial = useRef(false)
  const progressCallbackRef = useRef(onProgressChange)
  progressCallbackRef.current = onProgressChange

  console.log("[PdfViewer] MOUNT/RENDER — initialPage:", initialPage, "maxPageReachedRef:", maxPageReachedRef.current, "numPages:", numPages)

  // Responsive width
  useEffect(() => {
    function updateWidth() {
      if (containerRef.current) {
        setPageWidth(containerRef.current.clientWidth - 16)
      }
    }
    updateWidth()
    window.addEventListener("resize", updateWidth)
    return () => window.removeEventListener("resize", updateWidth)
  }, [])

  // Determine current visible page using getBoundingClientRect() against the real browser viewport.
  // This avoids relying on container scroll position (which breaks when the container isn't height-constrained).
  const computeCurrentPage = useCallback(() => {
    if (numPages === 0 || pageRefs.current.size === 0) return

    const viewportMid = window.innerHeight / 2
    let bestPage = 1
    let bestDist = Infinity

    for (let p = 1; p <= numPages; p++) {
      const el = pageRefs.current.get(p)
      if (!el) continue
      const rect = el.getBoundingClientRect()
      // Skip pages that are completely off-screen (optimization for large PDFs)
      if (rect.bottom < -500 || rect.top > window.innerHeight + 500) continue
      const elMid = rect.top + rect.height / 2
      const dist = Math.abs(viewportMid - elMid)
      if (dist < bestDist) {
        bestDist = dist
        bestPage = p
      }
    }

    if (bestPage < 1 || bestPage > numPages) bestPage = 1

    console.log(`[PdfViewer] computeCurrentPage — viewportMid:${Math.round(viewportMid)} → bestPage:${bestPage} maxReached:${maxPageReachedRef.current}`)

    setCurrentPage(bestPage)

    // High-water mark — never goes down
    if (bestPage > maxPageReachedRef.current) {
      console.log(`[PdfViewer] NEW MAX PAGE: ${maxPageReachedRef.current} → ${bestPage}`)
      maxPageReachedRef.current = bestPage
      setMaxPage(bestPage)
    }

    // Report progress
    const pct = Math.min(100, Math.round((maxPageReachedRef.current / numPages) * 100))
    progressCallbackRef.current?.({
      currentPage: bestPage,
      totalPages: numPages,
      percentage: pct,
      maxPageReached: maxPageReachedRef.current,
    })
  }, [numPages])

  // Attach scroll listener to the actual scrolling ancestor (or window).
  // The PdfViewer container may not scroll itself — the parent layout handles scrolling.
  useEffect(() => {
    if (numPages === 0) return

    // Find the nearest scrollable ancestor of the container
    let scrollTarget: HTMLElement | Window = window
    let el = containerRef.current?.parentElement
    while (el) {
      const style = getComputedStyle(el)
      const overflowY = style.overflowY
      if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight) {
        scrollTarget = el
        break
      }
      el = el.parentElement
    }

    console.log(`[PdfViewer] scroll listener attached to: ${scrollTarget === window ? "window" : (scrollTarget as HTMLElement).className.slice(0, 60)}`)

    // Compute once the page divs are in the DOM
    const initTimer1 = setTimeout(computeCurrentPage, 500)
    const initTimer2 = setTimeout(computeCurrentPage, 1500)

    const handleScroll = () => { computeCurrentPage() }
    scrollTarget.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      clearTimeout(initTimer1)
      clearTimeout(initTimer2)
      scrollTarget.removeEventListener("scroll", handleScroll)
    }
  }, [numPages, computeCurrentPage])

  // Auto-scroll to the initial page after document loads
  useEffect(() => {
    if (numPages === 0 || hasScrolledToInitial.current) return
    const targetPage = initialPage && initialPage > 1 ? initialPage : 0
    if (targetPage < 2) { hasScrolledToInitial.current = true; return }

    // Delay to ensure react-pdf Page components have rendered at full height
    const timer = setTimeout(() => {
      const el = pageRefs.current.get(targetPage)
      if (el && containerRef.current) {
        el.scrollIntoView({ behavior: "smooth", block: "start" })
        maxPageReachedRef.current = Math.max(maxPageReachedRef.current, targetPage)
        setMaxPage(maxPageReachedRef.current)
      }
      hasScrolledToInitial.current = true
    }, 800)

    return () => clearTimeout(timer)
  }, [numPages, initialPage])

  function onDocumentLoadSuccess({ numPages: n }: { numPages: number }) {
    console.log(`[PdfViewer] onDocumentLoadSuccess — totalPages: ${n}, initialPage: ${initialPage}`)
    setNumPages(n)
    setIsLoading(false)
  }

  function setPageRef(pageNum: number, el: HTMLDivElement | null) {
    if (el) pageRefs.current.set(pageNum, el)
    else pageRefs.current.delete(pageNum)
  }

  const pct = numPages > 0 ? Math.min(100, Math.round((maxPage / numPages) * 100)) : 0

  return (
    <div 
      ref={containerRef} 
      className="flex-1 overflow-y-auto bg-muted/30 px-2 py-4 min-h-[500px] relative"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Full-screen loader overlay while document loads */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center animate-pulse">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-background border-2 border-primary flex items-center justify-center">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-foreground">Loading Document</p>
            <p className="text-xs text-muted-foreground">Please wait while the file is being prepared...</p>
          </div>
          <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary/60 rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]"
              style={{ width: '60%', animation: 'shimmer 1.5s ease-in-out infinite alternate' }}
            />
          </div>
          <style jsx>{`
            @keyframes shimmer {
              0% { width: 20%; opacity: 0.5; }
              100% { width: 80%; opacity: 1; }
            }
          `}</style>
        </div>
      )}

      <Document
        file={url}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={() => setIsLoading(false)}
        loading={null}
        error={
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="h-14 w-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Unable to Load Document</p>
              <p className="text-xs text-muted-foreground">The file may be unavailable or inaccessible.</p>
            </div>
          </div>
        }
      >
        {Array.from(new Array(numPages), (_, index) => (
          <div
            key={`page_${index + 1}`}
            ref={(el) => setPageRef(index + 1, el)}
            data-page={index + 1}
            className="mb-3 mx-auto shadow-md rounded-lg overflow-hidden bg-white"
            style={{ maxWidth: pageWidth }}
          >
            <Page
              pageNumber={index + 1}
              width={pageWidth}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              loading={
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              }
            />
          </div>
        ))}
      </Document>
      {numPages > 0 && (
        <div className="sticky bottom-2 flex items-center justify-center gap-3 mt-2 z-20">
          <div className="flex items-center gap-2 rounded-full bg-background/90 backdrop-blur border border-border px-3 py-1.5 shadow-sm">
            <span className="text-xs font-medium text-foreground">Page {currentPage} / {numPages}</span>
            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">{pct}%</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CoursePlayer() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const slug = searchParams.get("slug") || ""

  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [currentLesson, setCurrentLesson] = useState<LessonFull | null>(null)
  const [expandedModules, setExpandedModules] = useState<number[]>([])
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set())
  const [lessonProgressMap, setLessonProgressMap] = useState<Record<number, LessonProgressOut>>({})
  const [loading, setLoading] = useState(true)
  const [lessonLoading, setLessonLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Quiz State
  const [quizData, setQuizData] = useState<QuizOut | null>(null)
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizStarted, setQuizStarted] = useState(false)
  const [quizResult, setQuizResult] = useState<{ score: number; passed: boolean } | null>(null)
  
  // Tracking & Analytics State
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<StudentActivitySummary | null>(null)
  const videoTimeRef = useRef<number>(0)
  const maxWatchedTimeRef = useRef<number>(0)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const watchedRangesRef = useRef<[number, number][]>([])
  const lastReportedTimeRef = useRef<number>(0)

  // Tracks lesson IDs for which we've already fired the one-time "lesson_completed" event
  // Prevents duplicate MongoDB analytics when auto-complete triggers repeatedly (e.g. video 20s ticks)
  const completionTrackedRef = useRef<Set<number>>(new Set())

  // Code Playground State
  const [codePlaygroundOpen, setCodePlaygroundOpen] = useState(false)

  // Notes State
  const [noteText, setNoteText] = useState<string>("")
  const [notesOpen, setNotesOpen] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)

  // Certificate State
  const [enrollment, setEnrollment] = useState<EnrollmentOut | null>(null)
  const [certLoading, setCertLoading] = useState(false)
  const [showCertBanner, setShowCertBanner] = useState(false)

  useEffect(() => {
    if (!slug) {
      router.push("/student/courses")
      return
    }
    async function fetchCourse() {
      try {
        setLoading(true)
        setError(null)
        const data = await getCourseDetail(slug)
        setCourse(data)

        if (data.modules.length > 0) {
          setExpandedModules([data.modules[0].module_id])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load course")
      } finally {
        setLoading(false)
      }
    }
    fetchCourse()
  }, [slug, router])

  // Track if initial load is done to prevent reloading lesson unnecessarily
  const initialLessonLoadedRef = useRef(false)
  // Guard to prevent duplicate initTracking runs (React StrictMode fires effects twice)
  const initTrackingStartedRef = useRef(false)

  // Dual-Path Initialization: PostgreSQL (Progress) & MongoDB (Analytics)
  useEffect(() => {
    const activeUser = user;
    const activeCourse = course;
    if (!activeUser || !activeCourse) return;
    if (initTrackingStartedRef.current) return;
    initTrackingStartedRef.current = true;

    async function initTracking(u: NonNullable<typeof user>, c: NonNullable<typeof course>) {
      // 1. Initialize MongoDB Tracking Session
      try {
        const sessionRes = await startTrackingSession({
          user_id: u.user_id,
          device_info: {
            device_type: window.innerWidth < 768 ? "mobile" : "desktop",
            browser: navigator.userAgent.split(' ').pop(),
            os: navigator.platform
          }
        })
        setSessionId(sessionRes.session_id)
      } catch (trackingErr) {
        console.warn("Failed to start tracking session:", trackingErr)
      }

      // 2. Ensure enrollment exists (must happen BEFORE progress fetch)
      try {
        if (u.student_id) {
          const enrolls = await getEnrollments(u.student_id)
          let existing = enrolls.find((e) => e.course_id === c.course_id)
          if (!existing) {
            // Auto-enroll so progress tracking can work
            try {
              existing = await enrollInCourse(c.course_id, u.student_id)
            } catch {
              // 409 = already enrolled (race condition) — re-fetch to get the enrollment
              const retryEnrolls = await getEnrollments(u.student_id)
              existing = retryEnrolls.find((e) => e.course_id === c.course_id) || undefined
            }
          }
          if (existing) setEnrollment(existing)
        }
      } catch (eErr) {
        console.warn("Failed to fetch/create enrollment", eErr)
      }

      // 3. Fetch PostgreSQL lesson progress (requires enrollment to exist)
      let fetchedProgressMap: Record<number, LessonProgressOut> = {}
      try {
        if (u.student_id) {
          const progress = await getCourseProgress(u.student_id, c.course_id)
          const completedIds = new Set(progress.filter(p => p.is_completed).map(p => p.lesson_id))
          progress.forEach(p => { fetchedProgressMap[p.lesson_id] = p })
          
          // Seed completionTrackedRef so we don't re-fire lesson_completed events
          // for lessons that were already completed in previous sessions
          completedIds.forEach(id => completionTrackedRef.current.add(id))

          setCompletedLessons(completedIds)
          setLessonProgressMap(fetchedProgressMap)
        }
      } catch (pErr) {
        console.warn("Failed to fetch course progress", pErr)
      }

      // 4. Fetch MongoDB Analytics Summary (History/Aggregation)
      try {
        if (u.student_id) {
          const summary = await getStudentAnalytics(u.student_id, c.course_id)
          setAnalytics(summary)
        }
      } catch (aErr) {
        console.warn("Failed to fetch student analytics", aErr)
      }

      // 5. Autoload the first lesson now that progress map is available
      if (c.modules.length > 0 && c.modules[0].lessons.length > 0 && !initialLessonLoadedRef.current) {
        initialLessonLoadedRef.current = true
        // Important: we pass the newly fetched progressMap so loadLesson has the correct saved position
        let firstLessonId = c.modules[0].lessons[0].lesson_id
        
        // Find the first uncompleted lesson, or default to first lesson
        let found = false
        for (const mod of c.modules) {
          for (const les of mod.lessons) {
             const prog = fetchedProgressMap[les.lesson_id]
             if (!prog?.is_completed) {
                firstLessonId = les.lesson_id
                found = true
                break
             }
          }
          if (found) break
        }

        await loadLesson(firstLessonId, c, fetchedProgressMap)
      }
    }

    initTracking(activeUser, activeCourse)
  }, [user, course?.course_id])

  // Heartbeat Timer (60s)
  useEffect(() => {
    if (!sessionId) return
    const interval = setInterval(async () => {
      try {
        await sendHeartbeat({
          session_id: sessionId,
          current_page: window.location.pathname
        })
      } catch (err) {
        console.warn("Heartbeat failed", err)
      }
    }, 60000)
    return () => clearInterval(interval)
  }, [sessionId])

  // YouTube PostMessage listener — captures real currentTime from iframe
  useEffect(() => {
    function handleYTMessage(e: MessageEvent) {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data
        if (data?.event === "infoDelivery" && data?.info?.currentTime != null) {
          videoTimeRef.current = data.info.currentTime
        }
        // Also capture player state changes
        if (data?.event === "onStateChange" && data?.info != null) {
          // state 0 = ended, 1 = playing, 2 = paused
          if (data.info === 0 && currentLesson && user?.student_id && course) {
            // Video ended — fire final tracking segment
            const totalDuration = (currentLesson.duration_minutes || 0) * 60
            if (totalDuration > 0) {
              watchedRangesRef.current.push([lastReportedTimeRef.current, totalDuration])
            }
            // Auto-mark complete when video ends
            markLessonCompleted(currentLesson.lesson_id, {
              progress_percentage: 100,
              video_position_seconds: Math.floor(totalDuration),
            })
          }
        }
      } catch { /* ignore non-JSON messages */ }
    }
    window.addEventListener("message", handleYTMessage)
    return () => window.removeEventListener("message", handleYTMessage)
  }, [currentLesson, user, course])

  // Load saved notes when lesson changes
  useEffect(() => {
    if (!currentLesson) return
    const key = `note_lesson_${currentLesson.lesson_id}`
    const saved = localStorage.getItem(key)
    setNoteText(saved || "")
    setNoteSaved(false)
  }, [currentLesson?.lesson_id])

  // Periodic Granular Tracking for MongoDB (Video Progress) — with unique watched-seconds
  useEffect(() => {
    if (!currentLesson || currentLesson.content_type !== "video" || !course) return
    
    // Timer to sync video position every 20 seconds
    const interval = setInterval(() => {
      const currentTime = videoTimeRef.current
      if (currentTime > maxWatchedTimeRef.current) {
         maxWatchedTimeRef.current = currentTime
      }
      
      if (currentTime > 0 && user?.student_id) {
        // Record watched range segment
        const lastTime = lastReportedTimeRef.current
        if (currentTime > lastTime) {
          watchedRangesRef.current.push([Math.floor(lastTime), Math.floor(currentTime)])
        }
        
        let deltaSeconds = 0
        if (currentTime > lastTime) {
          deltaSeconds = currentTime - lastTime
        }
        
        lastReportedTimeRef.current = currentTime

        // Compute unique seconds from merged ranges for total percentage
        const uniqueSeconds = totalUniqueSeconds(watchedRangesRef.current)
        const totalDuration = (currentLesson.duration_minutes || 0) * 60
        const currentPercentage = totalDuration > 0 ? Math.min(100, Math.round((uniqueSeconds / totalDuration) * 100)) : 0
        const isAutoCompleted = currentPercentage >= 95

        if (deltaSeconds > 0) {
          // Path A: PostgreSQL (State update for Resume function)
          // time_spent_seconds is a DELTA, the backend upsert `+=` this value
          updateLessonProgress(user.student_id, course.course_id, {
            lesson_id: currentLesson.lesson_id,
            video_position_seconds: Math.floor(currentTime),
            time_spent_seconds: Math.floor(deltaSeconds),
            progress_percentage: currentPercentage,
            is_completed: isAutoCompleted
          }).catch(() => {})

          // Dynamically update UI state to reflect progress immediately
          setLessonProgressMap(prev => {
            const existing = prev[currentLesson.lesson_id] || {} as any
            return {
              ...prev,
              [currentLesson.lesson_id]: { 
                ...existing, 
                progress_percentage: String(currentPercentage),
                video_position_seconds: Math.floor(currentTime),
                is_completed: existing.is_completed || isAutoCompleted
              }
            }
          })

          if (isAutoCompleted) {
            setCompletedLessons(prev => {
              if (!prev.has(currentLesson.lesson_id)) {
                const next = new Set(prev)
                next.add(currentLesson.lesson_id)
                return next
              }
              return prev
            })

            // Fire one-time lesson_completed + course_completed tracking
            if (!completionTrackedRef.current.has(currentLesson.lesson_id)) {
              completionTrackedRef.current.add(currentLesson.lesson_id)
              trackActivity({
                student_id: user.student_id,
                course_id: course.course_id,
                lesson_id: currentLesson.lesson_id,
                activity_type: "lesson_completed",
                session_id: sessionId || undefined,
              }).catch(console.warn)
              getStudentAnalytics(user.student_id, course.course_id).then(setAnalytics).catch(() => {})
              const allLessons = course.modules.flatMap(m => m.lessons)
              if (completedLessons.size + 1 >= allLessons.length) {
                trackActivity({
                  student_id: user.student_id,
                  course_id: course.course_id,
                  activity_type: "course_completed",
                  session_id: sessionId || undefined,
                }).catch(console.warn)
              }
            }
          }

          setAnalytics(prev => {
            if (!prev) return prev
            return { ...prev, total_time_spent_seconds: prev.total_time_spent_seconds + deltaSeconds }
          })

          // Path B: MongoDB (Granular xAPI log)
          trackActivity({
            student_id: user.student_id,
            course_id: course.course_id,
            lesson_id: currentLesson.lesson_id,
            activity_type: "video_watched",
            session_id: sessionId || undefined,
            details: {
              time_spent_seconds: Math.floor(deltaSeconds),
              video_progress: {
                current_time_seconds: Math.floor(currentTime),
                total_duration_seconds: totalDuration,
                percentage_watched: currentPercentage
              }
            }
          }).catch(() => {})
        }
      }
    }, 20000)

    return () => clearInterval(interval)
  }, [currentLesson, sessionId, user, course])


  // Cleanup session on unmount
  useEffect(() => {
    return () => {
      if (sessionId) {
        endTrackingSession(sessionId).catch(console.error)
      }
    }
  }, [sessionId])

  // ── Flush unsaved video progress immediately ──
  // Called on: beforeunload, lesson switch, and component unmount
  // Uses refs (not state) so it works reliably in event handlers and cleanup
  const flushVideoProgress = useCallback(() => {
    const currentTime = videoTimeRef.current
    const lastTime = lastReportedTimeRef.current
    if (
      currentTime <= 0 ||
      currentTime <= lastTime ||
      !user?.student_id ||
      !course ||
      !currentLesson ||
      currentLesson.content_type !== "video"
    ) return

    const deltaSeconds = currentTime - lastTime
    if (deltaSeconds <= 0) return

    // Record final watched segment
    watchedRangesRef.current.push([Math.floor(lastTime), Math.floor(currentTime)])
    lastReportedTimeRef.current = currentTime

    const uniqueSeconds = totalUniqueSeconds(watchedRangesRef.current)
    const totalDuration = (currentLesson.duration_minutes || 0) * 60
    const currentPercentage = totalDuration > 0 ? Math.min(100, Math.round((uniqueSeconds / totalDuration) * 100)) : 0
    const isAutoCompleted = currentPercentage >= 95

    // Use navigator.sendBeacon for reliability on page unload
    // Fall back to fetch for normal lesson switches
    const payload = {
      lesson_id: currentLesson.lesson_id,
      video_position_seconds: Math.floor(currentTime),
      time_spent_seconds: Math.floor(deltaSeconds),
      progress_percentage: currentPercentage,
      is_completed: isAutoCompleted,
    }

    // Try sendBeacon first (works during unload), fall back to fetch
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'
    const url = `${apiBase}/students/enrollments/${course.course_id}/progress?student_id=${user.student_id}`
    const beaconData = JSON.stringify(payload)
    const sent = typeof navigator.sendBeacon === 'function' &&
      navigator.sendBeacon(url, new Blob([beaconData], { type: 'application/json' }))
    if (!sent) {
      updateLessonProgress(user.student_id, course.course_id, payload).catch(() => {})
    }

    // Update local state
    setLessonProgressMap(prev => {
      const existing = prev[currentLesson.lesson_id] || {} as any
      return {
        ...prev,
        [currentLesson.lesson_id]: {
          ...existing,
          progress_percentage: String(currentPercentage),
          video_position_seconds: Math.floor(currentTime),
          is_completed: existing.is_completed || isAutoCompleted,
        }
      }
    })
  }, [user, course, currentLesson])

  // ── Auto-mark lesson as completed (one-way, idempotent) ──
  // Used by: video auto-complete, PDF/PPT timer, quiz pass, coding practice
  const markLessonCompleted = useCallback(async (lessonId: number, extraProgress?: { progress_percentage?: number; video_position_seconds?: number; time_spent_seconds?: number }) => {
    if (completedLessons.has(lessonId)) return
    if (!course || !user?.student_id) return

    // 1. Persist to PostgreSQL
    try {
      const existing = lessonProgressMap[lessonId]
      await updateLessonProgress(user.student_id, course.course_id, {
        lesson_id: lessonId,
        is_completed: true,
        progress_percentage: extraProgress?.progress_percentage ?? 100,
        video_position_seconds: extraProgress?.video_position_seconds ?? existing?.video_position_seconds ?? 0,
        time_spent_seconds: extraProgress?.time_spent_seconds ?? 0,
      })
    } catch (err) {
      console.error("Failed to mark lesson complete:", err)
      return
    }

    // 2. Update local state
    setCompletedLessons(prev => {
      const next = new Set(prev)
      next.add(lessonId)
      return next
    })
    setLessonProgressMap(prev => ({
      ...prev,
      [lessonId]: { ...prev[lessonId], is_completed: true, progress_percentage: extraProgress?.progress_percentage ?? 100 } as any
    }))

    // 3. Track lesson_completed activity (MongoDB) — once per lesson
    if (!completionTrackedRef.current.has(lessonId)) {
      completionTrackedRef.current.add(lessonId)
      trackActivity({
        student_id: user.student_id,
        course_id: course.course_id,
        lesson_id: lessonId,
        activity_type: "lesson_completed",
        session_id: sessionId || undefined,
      }).catch(console.warn)

      // Refresh analytics
      getStudentAnalytics(user.student_id, course.course_id).then(setAnalytics).catch(() => {})

      // 4. Check for course completion
      const allLessons = course.modules.flatMap(m => m.lessons)
      if (completedLessons.size + 1 >= allLessons.length) {
        trackActivity({
          student_id: user.student_id,
          course_id: course.course_id,
          activity_type: "course_completed",
          session_id: sessionId || undefined,
        }).catch(console.warn)
      }
    }
  }, [completedLessons, course, user, sessionId, lessonProgressMap])

  // ── PDF progress tracking (scroll-based) ──
  const pdfProgressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pdfProgressRef = useRef<{ currentPage: number; totalPages: number; percentage: number; maxPageReached: number } | null>(null)
  const pdfStartTimeRef = useRef<number>(0)

  // Reset PDF timer when lesson changes
  useEffect(() => {
    if (currentLesson?.content_type === "pdf") {
      pdfStartTimeRef.current = Date.now()
      pdfProgressRef.current = null
    }
    return () => {
      if (pdfProgressTimerRef.current) clearTimeout(pdfProgressTimerRef.current)
    }
  }, [currentLesson?.lesson_id])

  const pdfLastSavedRef = useRef<number>(0) // timestamp of last save

  const savePdfProgressNow = useCallback((info: { currentPage: number; totalPages: number; percentage: number; maxPageReached: number }) => {
    if (!currentLesson || !user?.student_id || !course) return
    const elapsed = Math.max(1, Math.round((Date.now() - pdfStartTimeRef.current) / 1000))
    const lessonId = currentLesson.lesson_id

    console.log(`[PDF SAVE] lesson:${lessonId} page:${info.currentPage}/${info.totalPages} max:${info.maxPageReached} pct:${info.percentage}% elapsed:${elapsed}s`)

    // Save to PostgreSQL (progress_percentage + video_position_seconds as page bookmark)
    updateLessonProgress(user.student_id!, course.course_id, {
      lesson_id: lessonId,
      progress_percentage: info.percentage,
      video_position_seconds: info.maxPageReached,
      time_spent_seconds: elapsed,
      is_completed: false,
    }).then(() => {
      setLessonProgressMap(prev => ({
        ...prev,
        [lessonId]: {
          ...prev[lessonId],
          progress_percentage: String(info.percentage),
          video_position_seconds: info.maxPageReached,
          time_spent_seconds: (prev[lessonId]?.time_spent_seconds || 0) + elapsed,
        } as any
      }))
      pdfStartTimeRef.current = Date.now()
      pdfLastSavedRef.current = Date.now()
    }).catch(console.warn)

    // Track to MongoDB for analytics
    trackActivity({
      student_id: user.student_id!,
      course_id: course.course_id,
      lesson_id: lessonId,
      activity_type: "document_viewed",
      session_id: sessionId || undefined,
      details: {
        document: { url: currentLesson.content_url || "", type: "pdf" },
        scroll_depth_percentage: info.percentage,
        time_spent_seconds: elapsed,
      },
    }).catch(console.warn)

    // Auto-complete at >=90% read
    if (info.percentage >= 90 && !completedLessons.has(lessonId)) {
      markLessonCompleted(lessonId, {
        progress_percentage: info.percentage,
        time_spent_seconds: elapsed,
      })
    }
  }, [currentLesson, user?.student_id, course, sessionId, completedLessons, markLessonCompleted])

  const handlePdfProgress = useCallback((info: { currentPage: number; totalPages: number; percentage: number; maxPageReached: number }) => {
    if (!currentLesson || !user?.student_id || !course) return
    if (currentLesson.content_type !== "pdf") return

    const prev = pdfProgressRef.current
    pdfProgressRef.current = info

    const isNewMax = info.maxPageReached > (prev?.maxPageReached || 0)
    const isFirstCall = !prev
    const timeSinceLastSave = Date.now() - pdfLastSavedRef.current

    console.log(`[PDF PROGRESS] page:${info.currentPage}/${info.totalPages} max:${info.maxPageReached} pct:${info.percentage}% first:${isFirstCall} newMax:${isNewMax} sinceSave:${Math.round(timeSinceLastSave/1000)}s`)

    // Save if: first call, new max page reached, or periodic fallback (every 15s)
    if (!isFirstCall && !isNewMax && timeSinceLastSave < 15000) return

    console.log(`[PDF PROGRESS] → WILL SAVE (first:${isFirstCall} newMax:${isNewMax} periodic:${timeSinceLastSave >= 15000})`)

    // Debounce: wait 2s after scrolling stops before saving
    if (pdfProgressTimerRef.current) clearTimeout(pdfProgressTimerRef.current)
    pdfProgressTimerRef.current = setTimeout(() => {
      savePdfProgressNow(info)
    }, isFirstCall ? 1000 : 2000)
  }, [currentLesson, user?.student_id, course, savePdfProgressNow])

  // ── Save progress on tab close / refresh / navigate away ──
  const flushPdfProgress = useCallback(() => {
    const info = pdfProgressRef.current
    if (!info || !currentLesson || currentLesson.content_type !== "pdf" || !user?.student_id || !course) return
    const elapsed = Math.round((Date.now() - pdfStartTimeRef.current) / 1000)
    // Use sendBeacon for reliable fire-and-forget on unload
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"
    const body = JSON.stringify({
      lesson_id: currentLesson.lesson_id,
      progress_percentage: info.percentage,
      video_position_seconds: info.maxPageReached,
      time_spent_seconds: elapsed,
      is_completed: info.percentage >= 90,
    })
    const url = `${apiBase}/students/enrollments/${course.course_id}/progress?student_id=${user.student_id}`
    try {
      const blob = new Blob([body], { type: "application/json" })
      // sendBeacon doesn't support auth headers, fall back to sync fetch
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body, keepalive: true }).catch(() => {})
    } catch {}
  }, [currentLesson, user?.student_id, course])

  useEffect(() => {
    function handleBeforeUnload() {
      flushVideoProgress()
      flushPdfProgress()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handleBeforeUnload)
    }
  }, [flushVideoProgress, flushPdfProgress])

  // Save note handler
  function handleSaveNote() {
    if (!currentLesson) return
    const key = `note_lesson_${currentLesson.lesson_id}`
    localStorage.setItem(key, noteText)
    setNoteSaved(true)
    setTimeout(() => setNoteSaved(false), 2000)

    // Track note_taken activity
    if (user?.student_id && course) {
      trackActivity({
        student_id: user.student_id,
        course_id: course.course_id,
        lesson_id: currentLesson.lesson_id,
        activity_type: "note_taken",
        session_id: sessionId || undefined,
        details: {
          note: { content_length: noteText.length }
        }
      }).catch(console.warn)
    }
  }

  async function loadLesson(lessonId: number, courseData?: CourseDetail, progressMapInitial?: Record<number, LessonProgressOut>) {
    // Flush any unsaved progress from the PREVIOUS video before switching
    flushVideoProgress()

    try {
      setLessonLoading(true)
      setQuizStarted(false)
      setQuizSubmitted(false)
      setQuizAnswers({})
      setQuizResult(null)
      
      const lesson = await getLesson(lessonId)
      setCurrentLesson(lesson)

      // Get saved position for smart seeking initialization
      const mapToUse = progressMapInitial || lessonProgressMap
      const progressMap = mapToUse[lessonId]
      const savedPos = progressMap?.video_position_seconds || 0
      maxWatchedTimeRef.current = savedPos

      // Initialize tracking refs to saved position so the first 20s tick
      // computes deltaSeconds correctly (new watch time only, not replay of saved portion)
      videoTimeRef.current = savedPos
      lastReportedTimeRef.current = savedPos
      watchedRangesRef.current = savedPos > 0 ? [[0, savedPos]] : []

      // Track Activity: Lesson Started (MongoDB)
      const activeCourse = courseData || course;
      if (user?.student_id && activeCourse) {
        trackActivity({
          student_id: user.student_id,
          course_id: activeCourse.course_id,
          lesson_id: lesson.lesson_id,
          activity_type: "lesson_started",
          session_id: sessionId || undefined
        }).catch(console.warn)

      }
      
      if (lesson.content_type === "quiz" && lesson.quiz_id) {
        fetchQuiz(lesson.quiz_id)
      }
    } catch (err) {
      console.error("Failed to load lesson:", err)
    } finally {
      setLessonLoading(false)
    }
  }

  async function fetchQuiz(quizId: number) {
    try {
      setQuizLoading(true)
      const data = await getQuiz(quizId)
      setQuizData(data)
    } catch (err) {
      console.error("Failed to fetch quiz:", err)
    } finally {
      setQuizLoading(false)
    }
  }

  function toggleModule(id: number) {
    setExpandedModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )
  }

  function handleLessonClick(lesson: LessonBrief) {
    loadLesson(lesson.lesson_id)
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }

  async function handleMarkComplete() {
    if (!currentLesson || !course || !user?.student_id) return
    const alreadyCompleted = completedLessons.has(currentLesson.lesson_id)

    if (!alreadyCompleted) {
      // Mark as complete using the shared helper (handles backend, UI, tracking)
      await markLessonCompleted(currentLesson.lesson_id, {
        video_position_seconds: lessonProgressMap[currentLesson.lesson_id]?.video_position_seconds || Math.floor(videoTimeRef.current) || 0,
        progress_percentage: lessonProgressMap[currentLesson.lesson_id] ? parseFloat(String(lessonProgressMap[currentLesson.lesson_id].progress_percentage)) : 100,
      })
    }
    // Note: manual un-complete is removed — lessons complete one-way via auto-mechanisms
  }

  function handleNextLesson() {
    if (!course || !currentLesson) return
    const allLessons = course.modules.flatMap((m) => m.lessons)
    const currentIndex = allLessons.findIndex((l) => l.lesson_id === currentLesson.lesson_id)
    if (currentIndex >= 0 && currentIndex < allLessons.length - 1) {
      const next = allLessons[currentIndex + 1]
      loadLesson(next.lesson_id)
      const nextMod = course.modules.find((m) =>
        m.lessons.some((l) => l.lesson_id === next.lesson_id)
      )
      if (nextMod && !expandedModules.includes(nextMod.module_id)) {
        setExpandedModules((prev) => [...prev, nextMod.module_id])
      }
    }
  }

  function handlePrevLesson() {
    if (!course || !currentLesson) return
    const allLessons = course.modules.flatMap((m) => m.lessons)
    const currentIndex = allLessons.findIndex((l) => l.lesson_id === currentLesson.lesson_id)
    if (currentIndex > 0) {
      loadLesson(allLessons[currentIndex - 1].lesson_id)
    }
  }

  async function handleQuizSubmit() {
    if (!quizData || !course || !currentLesson || !user?.student_id || !enrollment) return

    // Build answers map: { "question_id": selected_option_index }
    const answersMap: Record<string, number | string> = {}
    Object.entries(quizAnswers).forEach(([qId, optIdx]) => {
      answersMap[qId] = optIdx
    })

    // Submit to backend for proper server-side grading
    try {
      const result = await submitQuiz(quizData.quiz_id, enrollment.enrollment_id, answersMap)
      const percentage = parseFloat(result.percentage)
      const passed = result.passed

      setQuizResult({ score: percentage, passed })
      setQuizSubmitted(true)

      // Track Activity: Quiz Submitted (MongoDB Analytics/xAPI Path)
      trackActivity({
        student_id: user.student_id,
        course_id: course.course_id,
        lesson_id: currentLesson.lesson_id,
        activity_type: "quiz_submitted",
        session_id: sessionId || undefined,
        details: {
          quiz_result: {
            quiz_id: quizData.quiz_id,
            score: percentage,
            percentage: percentage,
            passed: passed,
            time_taken_seconds: 60
          }
        }
      }).catch(console.warn)

      // Mark lesson complete only if passed (backend uses quiz.pass_percentage, typically 60%)
      if (passed) {
        await markLessonCompleted(currentLesson.lesson_id)
      }
    } catch (err) {
      console.error("Quiz submission failed:", err)
      // Fallback: show error to user
      setQuizResult({ score: 0, passed: false })
      setQuizSubmitted(true)
    }
  }

  if (loading) {
    return <PlayerSkeleton />
  }

  if (error || !course) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background text-center">
        <p className="text-lg font-medium text-destructive">Failed to load course</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/student/courses")}>
          Back to Catalog
        </Button>
      </div>
    )
  }

  const totalLessons = course.modules.flatMap((m) => m.lessons).length
  // Overall progress: sum each lesson's individual progress (completed = 100%, partial = its %)
  const progressPercent = totalLessons > 0 ? Math.round(
    course.modules.flatMap((m) => m.lessons).reduce((sum, lesson) => {
      if (completedLessons.has(lesson.lesson_id)) return sum + 100
      const lp = lessonProgressMap[lesson.lesson_id]
      if (lp) return sum + Math.min(100, Number(lp.progress_percentage) || 0)
      return sum
    }, 0) / totalLessons
  ) : 0
  const allLessons = course.modules.flatMap((m) => m.lessons)
  const currentIndex = currentLesson ? allLessons.findIndex((l) => l.lesson_id === currentLesson.lesson_id) : -1
  const isFirst = currentIndex <= 0
  const isLast = currentIndex >= allLessons.length - 1

  // Resume logic hint
  const savedPosition = currentLesson ? lessonProgressMap[currentLesson.lesson_id]?.video_position_seconds : 0

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar - Professional Header */}
      <header className="flex h-[56px] items-center gap-3 border-b border-border/60 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl px-4 shrink-0 z-20 sm:h-[60px] sm:gap-4 sm:px-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.push("/student/courses")}
          className="hover:bg-muted rounded-lg h-9 w-9"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="hidden sm:flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <Badge variant="secondary" className="bg-primary/8 text-primary hover:bg-primary/12 transition-colors py-0.5 px-2.5 text-[10px] uppercase tracking-[0.08em] font-semibold rounded-md">
              {course.category?.name || "Course"}
            </Badge>
            <p className="text-[13px] font-semibold text-foreground truncate tracking-tight">{course.title}</p>
          </div>
          <div className="flex items-center gap-2.5 mt-1">
            <div className="w-32 bg-muted/60 rounded-full h-[5px] overflow-hidden">
              <div 
                className="bg-gradient-to-r from-primary to-emerald-500 h-full transition-all duration-700 ease-out rounded-full" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground tracking-wide">
              {progressPercent}% Complete
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          {analytics && (
             <div className="hidden lg:flex items-center gap-3 px-3 border-l border-border/50 h-8">
               <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {Math.round(analytics.total_time_spent_seconds / 60)}m spent
                  </span>
               </div>
               <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-500/5 text-emerald-600 border-emerald-500/15 py-0 px-2 rounded-md">
                    {analytics.lessons_completed} completed
                  </Badge>
               </div>
             </div>
          )}
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Progress</span>
            <span className="text-xs font-semibold text-foreground tracking-tight">{completedLessons.size} of {totalLessons} Lessons</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(
              "rounded-lg h-9 w-9 transition-all duration-200",
              sidebarOpen ? "bg-muted text-foreground" : "hover:bg-muted"
            )}
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* Certificate Banner — shown when course is 100% complete */}
      {progressPercent >= 100 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-amber-200 bg-gradient-to-r from-amber-50 via-amber-50/80 to-yellow-50 dark:from-amber-950/30 dark:via-amber-900/20 dark:to-yellow-950/20 px-3 py-2 shrink-0 z-10 sm:flex-nowrap sm:gap-3 sm:px-6 sm:py-3">
          <Award className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Congratulations! You completed this course!</p>
            <p className="text-xs text-muted-foreground">Claim your certificate of completion.</p>
          </div>
          {enrollment?.certificate_issued ? (
            <Button size="sm" variant="outline" className="shrink-0 gap-1.5 border-amber-300 hover:bg-amber-100" onClick={() => window.open(getCertificateViewUrl(enrollment.enrollment_id), '_blank')}>
              <Award className="h-3.5 w-3.5 text-amber-600" />
              View Certificate
            </Button>
          ) : enrollment ? (
            <Button size="sm" className="shrink-0 gap-1.5 bg-amber-600 hover:bg-amber-700" disabled={certLoading} onClick={async () => {
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
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-amber-600 shrink-0" />
          )}
        </div>
      )}

      {/* Main content - Immersive Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Content area */}
        <div className="flex flex-1 flex-col overflow-y-auto bg-background">
          {/* Video / Content Wrapper */}
          <div className={cn("w-full relative flex flex-col group", currentLesson?.content_type === "video" ? "bg-black" : "bg-background")}>
            <div className="w-full relative flex-1 flex flex-col">
              
              {lessonLoading ? (
                <div className="flex-1 min-h-[400px] flex items-center justify-center bg-black/40">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading lesson...</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  {/* Video Player */}
                  {/* YouTube Video Player */}
                  {currentLesson?.content_type === "video" && currentLesson?.video_external_id && (
                    <div className="aspect-video relative bg-black">
                      <iframe
                        key={`${currentLesson.lesson_id}-${savedPosition}`}
                        src={`https://www.youtube.com/embed/${currentLesson.video_external_id}?rel=0&modestbranding=1&showinfo=0&autoplay=1&start=${savedPosition || 0}&enablejsapi=1&controls=0&disablekb=1&fs=0&playsinline=1&origin=${typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : ''}`}
                        className="absolute inset-0 h-full w-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                        allowFullScreen
                        title={currentLesson.title}
                      />
                      {/* Invisible overlay for YouTube to prevent clicking timeline but keep play/pause if needed 
                          Note: With controls=0 this is largely handled, but provides extra safety */}
                      <div className="absolute inset-0 z-10 pointer-events-none" />
                    </div>
                  )}

                  {/* Self-hosted MP4/Video Player (GCS bucket) */}
                  {currentLesson?.content_type === "video" && !currentLesson?.video_external_id && currentLesson?.content_url && (
                    <div className="aspect-video relative bg-black">
                      <video
                        ref={videoRef}
                        key={`mp4-${currentLesson.lesson_id}`}
                        src={currentLesson.content_url}
                        controls
                        controlsList="nodownload noplaybackrate"
                        disablePictureInPicture
                        onContextMenu={(e) => e.preventDefault()}
                        autoPlay
                        className="absolute inset-0 h-full w-full"
                        onTimeUpdate={(e) => {
                          if (!e.currentTarget.seeking) {
                            videoTimeRef.current = e.currentTarget.currentTime
                            if (e.currentTarget.currentTime > maxWatchedTimeRef.current) {
                              maxWatchedTimeRef.current = e.currentTarget.currentTime
                            }
                          }
                        }}
                        onSeeking={(e) => {
                          // Allow seeking backward freely, or forward up to max watched time
                          const targetTime = e.currentTarget.currentTime
                          if (targetTime > maxWatchedTimeRef.current + 2) {
                            // Snap back to max watched time if trying to skip ahead
                            e.currentTarget.currentTime = maxWatchedTimeRef.current
                          }
                        }}
                        onLoadedMetadata={(e) => {
                          // Resume from saved position
                          if (savedPosition && savedPosition > 0) {
                            e.currentTarget.currentTime = savedPosition
                          }
                        }}
                        onEnded={() => {
                          // Record final watched segment
                          const ct = videoTimeRef.current
                          if (ct > lastReportedTimeRef.current) {
                            watchedRangesRef.current.push([
                              Math.floor(lastReportedTimeRef.current),
                              Math.floor(ct)
                            ])
                          }
                          // Auto-mark complete when self-hosted video ends
                          if (currentLesson) {
                            markLessonCompleted(currentLesson.lesson_id, {
                              progress_percentage: 100,
                              video_position_seconds: Math.floor(ct),
                            })
                          }
                        }}
                      />
                    </div>
                  )}

                  {/* Quiz Content */}
                  {currentLesson?.content_type === "quiz" && (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-900 to-slate-950 min-h-[500px]">
                      {quizLoading ? (
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      ) : quizSubmitted ? (
                        <div className="max-w-lg w-full bg-white/5 backdrop-blur border border-white/10 p-10 rounded-2xl text-center animate-in zoom-in-95 duration-500">
                          <div className={cn(
                            "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6",
                            quizResult?.passed ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                          )}>
                            {quizResult?.passed ? <Trophy className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
                          </div>
                          <h2 className="text-2xl font-bold text-white mb-2">
                             {quizResult?.passed ? "Excellent Work!" : "Keep Practicing"}
                          </h2>
                          <div className="flex items-center justify-center gap-3 mb-6">
                            <div className="text-4xl font-bold text-white">{quizResult?.score}%</div>
                            <div className="text-slate-500 text-xs font-medium uppercase tracking-wider text-left">
                              Final<br/>Score
                            </div>
                          </div>
                          <p className="text-sm text-slate-400 mb-8 leading-relaxed max-w-sm mx-auto">
                            {quizResult?.passed 
                              ? "You've mastered the concepts in this module. Proceed to the next section."
                              : "Review the material and try again to unlock the next module."
                            }
                          </p>
                          <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button 
                              onClick={() => { setQuizSubmitted(false); setQuizStarted(true); }}
                              variant="outline"
                              className="h-11 border-white/20 text-white hover:bg-white/10"
                            >
                              <RotateCcw className="w-4 h-4 mr-2" /> Retake Quiz
                            </Button>
                            {quizResult?.passed && (
                              <Button 
                                onClick={handleNextLesson}
                                className="h-11"
                              >
                                Continue Learning <ChevronRight className="w-4 h-4 ml-2" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : quizStarted && quizData ? (
                        <div className="max-w-2xl w-full space-y-6 animate-in fade-in duration-500">
                          <div className="flex items-center justify-between mb-6">
                            <div>
                              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Knowledge Check</p>
                              <h3 className="text-lg font-bold text-white">{quizData.title}</h3>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-slate-500">Pass: {quizData.pass_percentage}%</p>
                            </div>
                          </div>
                          
                          <div className="space-y-5">
                            {quizData.questions.map((q, idx) => (
                              <div key={q.question_id} className="bg-white/5 border border-white/10 p-6 rounded-xl">
                                <p className="text-sm font-medium text-slate-300 mb-4 flex items-start gap-3">
                                  <span className="text-primary font-bold text-xs mt-0.5">{idx + 1}.</span>
                                  {q.question_text}
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {q.options?.map((opt, optIdx) => (
                                    <button
                                      key={optIdx}
                                      onClick={() => setQuizAnswers(prev => ({ ...prev, [q.question_id]: optIdx }))}
                                      className={cn(
                                        "px-4 py-3 rounded-lg text-left text-sm transition-all duration-200 border",
                                        quizAnswers[q.question_id] === optIdx
                                          ? "bg-primary border-primary text-white font-medium"
                                          : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:bg-white/10"
                                      )}
                                    >
                                      <span className="mr-2 opacity-50 text-xs">
                                        {String.fromCharCode(65 + optIdx)}.
                                      </span>
                                      {opt.text}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                            <p className="text-xs text-slate-500">Answer all questions before submitting.</p>
                            <Button 
                              onClick={handleQuizSubmit}
                              disabled={Object.keys(quizAnswers).length < quizData.questions.length}
                              className="h-11"
                            >
                              Submit Answers
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="max-w-md w-full text-center space-y-6 animate-in fade-in duration-500">
                          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                            <Brain className="w-8 h-8 text-primary" />
                          </div>
                          <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-white">Quiz Time</h2>
                            <p className="text-sm text-slate-400 leading-relaxed">
                              Test your knowledge. You need at least 
                              <span className="text-white font-semibold ml-1">{quizData?.pass_percentage}%</span> to pass.
                            </p>
                          </div>
                          <div className="flex items-center justify-center gap-6 py-2">
                            <div className="text-center">
                              <p className="text-xl font-bold text-white">{quizData?.total_questions || 0}</p>
                              <p className="text-xs text-slate-500">Questions</p>
                            </div>
                            <div className="w-px h-6 bg-white/10" />
                            <div className="text-center">
                              <p className="text-xl font-bold text-white">{quizData?.time_limit_minutes || 15}</p>
                              <p className="text-xs text-slate-500">Minutes</p>
                            </div>
                          </div>
                          <Button 
                            size="lg"
                            className="w-full h-12"
                            onClick={() => setQuizStarted(true)}
                          >
                            Start Quiz
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Document Viewer — PDF / PPTX / DOCX */}
                  {currentLesson?.content_type === "pdf" && (() => {
                    const url = currentLesson.content_url || ""
                    const ext = url.split(".").pop()?.toLowerCase() || ""
                    const isPdf = ext === "pdf" || (!ext && !url.match(/\.(pptx?|docx?|xlsx?)$/i))
                    const isOfficeDoc = ["pptx", "ppt", "docx", "doc", "xlsx", "xls"].includes(ext)
                    const fileTypeLabel = ext === "pptx" || ext === "ppt" ? "Presentation"
                      : ext === "docx" || ext === "doc" ? "Document"
                      : ext === "xlsx" || ext === "xls" ? "Spreadsheet"
                      : "PDF"
                    // Use Microsoft Office viewer for Office docs (more reliable on mobile)
                    const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`

                    return (
                      <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="h-12 bg-muted flex items-center justify-between px-3 sm:px-6 shrink-0 border-b border-border">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-primary shrink-0" />
                            <span className="text-sm font-medium text-foreground truncate">{currentLesson.title}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">{fileTypeLabel}</Badge>
                          </div>
                        </div>

                        {isPdf ? (
                          <PdfViewer
                            key={`pdf-${currentLesson.lesson_id}`}
                            url={url}
                            initialPage={currentLesson ? (lessonProgressMap[currentLesson.lesson_id]?.video_position_seconds || 0) : 0}
                            onProgressChange={handlePdfProgress}
                          />
                        ) : isOfficeDoc ? (
                          <div className="flex-1 flex flex-col relative min-h-[500px]">
                            <iframe
                              src={officeViewerUrl}
                              className="flex-1 w-full border-none"
                              title={currentLesson.title}
                              style={{ minHeight: '500px' }}
                            />
                            {/* Security overlay to block Office Viewer bottom-right menu (Download/Print) */}
                            <div className="absolute bottom-0 right-0 w-[240px] h-[45px] z-10 cursor-not-allowed bg-transparent" title="Menu disabled for security" />
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col relative min-h-[600px]">
                            <iframe
                              src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`}
                              className="flex-1 w-full border-none min-h-[600px]"
                              title={currentLesson.title}
                            />
                            {/* Security overlay to block Google Docs top-right popout */}
                            <div className="absolute top-0 right-0 w-[60px] h-[60px] z-10 cursor-not-allowed bg-transparent" title="Popout disabled for security" />
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Text/Practice content — Playground-first layout */}
                  {currentLesson?.content_type === "text" && currentLesson?.text_content && (
                    <div className="flex-1 flex flex-col min-h-[400px]">
                      {/* Code Playground — Primary Feature */}
                      <div className="px-4 pt-4 sm:px-6 lg:px-8">
                        <CodePlayground
                          lessonContent={currentLesson?.text_content ?? undefined}
                          onAllExercisesComplete={() => {
                            if (currentLesson && !completedLessons.has(currentLesson.lesson_id)) {
                              markLessonCompleted(currentLesson.lesson_id)
                            }
                          }}
                        />
                      </div>

                      {/* Exercise Instructions — Collapsible reference below */}
                      <div className="px-4 py-5 sm:px-6 lg:px-8">
                        <button
                          onClick={() => setCodePlaygroundOpen(!codePlaygroundOpen)}
                          className="flex items-center gap-3 w-full px-5 py-3.5 rounded-xl bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-amber-500/5 hover:from-amber-500/10 hover:via-orange-500/10 hover:to-amber-500/10 border border-amber-500/15 hover:border-amber-500/25 transition-all duration-300 group"
                        >
                          <div className="p-1.5 rounded-lg bg-amber-500/10">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                          </div>
                          <span className="text-sm font-semibold text-foreground tracking-tight">Exercise Instructions</span>
                          <Badge variant="outline" className="text-[9px] px-2 py-0 ml-1 border-amber-500/20 text-amber-600 bg-amber-500/5 font-bold">
                            {currentLesson.text_content.match(/```sql/g)?.length || 0} exercises
                          </Badge>
                          <ChevronDown className={cn("w-4 h-4 ml-auto transition-transform duration-300 text-muted-foreground group-hover:text-foreground", codePlaygroundOpen && "rotate-180")} />
                        </button>
                        {codePlaygroundOpen && (
                          <div className="mt-4 px-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="prose prose-sm dark:prose-invert prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-foreground prose-h2:text-xl prose-h3:text-base prose-p:text-foreground/75 prose-p:leading-relaxed prose-strong:text-foreground prose-code:text-emerald-500 prose-code:bg-emerald-500/5 prose-code:border prose-code:border-emerald-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs prose-code:font-semibold prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800/60 prose-pre:text-slate-200 prose-pre:rounded-xl prose-li:text-foreground/75 prose-li:leading-relaxed prose-a:text-primary prose-a:font-medium max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {currentLesson.text_content}
                              </ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Fallback / No content placeholder */}
                  {(!currentLesson || (currentLesson.content_type !== "video" && currentLesson.content_type !== "quiz" && currentLesson.content_type !== "pdf" && currentLesson.content_type !== "text")) && (
                    <div className="flex-1 flex flex-col items-center justify-center bg-muted/30 p-12 text-center min-h-[400px]">
                      <div className="mb-6">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mx-auto">
                          {currentLesson ? React.createElement(contentTypeIcons[currentLesson.content_type] || BookOpen, { className: "h-7 w-7 text-primary" }) : <Play className="h-7 w-7 text-primary" />}
                        </div>
                      </div>
                      <div className="max-w-md space-y-3">
                        <Badge variant="outline" className="text-xs">
                          {currentLesson?.content_type || "Reading Material"}
                        </Badge>
                        <h2 className="text-2xl font-bold text-foreground">
                          {currentLesson?.title || "Select a lesson to begin"}
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Review the material below to master these concepts.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Player Quick Controls (Overlay on hover) - only for videos */}
              {currentLesson?.content_type === "video" && (
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none p-4 flex items-end justify-between z-10">
                  <div className="flex items-center gap-3 pointer-events-auto">
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 text-xs font-medium" onClick={handlePrevLesson} disabled={isFirst}>
                      <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                    </Button>
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 text-xs font-medium" onClick={handleNextLesson} disabled={isLast}>
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Lesson Info Area - Consistent with app design system */}
          {currentLesson?.content_type !== "quiz" && (
            <div className="bg-background border-t border-border">
              <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Left: Lesson Details */}
                  <div className="flex-1 space-y-6">
                    {/* Lesson Title & Type */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {currentLesson && contentTypeIcons[currentLesson.content_type] && (
                          <div className="p-1.5 bg-primary/10 rounded-lg">
                            {React.createElement(contentTypeIcons[currentLesson.content_type], { className: "h-4 w-4 text-primary" })}
                          </div>
                        )}
                        <Badge variant="outline" className="text-xs">{
                          currentLesson?.content_type === "pdf" && currentLesson?.content_url
                            ? (() => {
                                const e = currentLesson.content_url.split(".").pop()?.toLowerCase() || ""
                                return e === "pptx" || e === "ppt" ? "Slides" : e === "docx" || e === "doc" ? "Document" : "PDF"
                              })()
                            : currentLesson?.content_type || "Lesson"
                        }</Badge>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-tight">
                        {currentLesson?.title || "Select a lesson"}
                      </h2>
                    </div>

                    {/* Text Content */}
                    {/* Text Content (for non-text-type lessons only, since text lessons show content in main area) */}
                    {currentLesson?.content_type !== "text" && currentLesson?.text_content ? (
                      <Card className="border-border/60 shadow-sm">
                        <CardContent className="p-5 sm:p-6">
                          <div className="prose prose-sm dark:prose-invert prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-foreground prose-p:text-foreground/75 prose-p:leading-relaxed prose-strong:text-foreground prose-code:text-emerald-500 prose-code:bg-emerald-500/5 prose-code:border prose-code:border-emerald-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800/60 prose-pre:text-slate-200 prose-pre:rounded-xl prose-li:text-foreground/75 max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {currentLesson.text_content}
                            </ReactMarkdown>
                          </div>
                        </CardContent>
                      </Card>
                    ) : currentLesson?.description ? (
                      <Card className="border-border">
                        <CardContent className="p-6">
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {currentLesson.description}
                          </p>
                        </CardContent>
                      </Card>
                    ) : null}

                    {/* Code Playground Panel — only for non-text lessons */}
                    {currentLesson?.content_type !== "text" && (
                    <div className="border-t border-border pt-4">
                      <button
                        onClick={() => setCodePlaygroundOpen(!codePlaygroundOpen)}
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
                      >
                        <Terminal className="w-4 h-4" />
                        <span>Code Playground</span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 ml-1 border-emerald-500/30 text-emerald-500 bg-emerald-500/5">SQL / Python</Badge>
                        <ChevronDown className={cn("w-4 h-4 ml-auto transition-transform", codePlaygroundOpen && "rotate-180")} />
                      </button>
                      {codePlaygroundOpen && (
                        <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                          <CodePlayground lessonContent={currentLesson?.text_content ?? undefined} />
                        </div>
                      )}
                    </div>
                    )}

                    {/* Notes Panel */}
                    <div className="border-t border-border pt-4">
                      <button
                        onClick={() => setNotesOpen(!notesOpen)}
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
                      >
                        <StickyNote className="w-4 h-4" />
                        <span>My Notes</span>
                        <ChevronDown className={cn("w-4 h-4 ml-auto transition-transform", notesOpen && "rotate-180")} />
                      </button>
                      {notesOpen && (
                        <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                          <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Write your notes here..."
                            className="w-full min-h-[120px] p-3 rounded-lg border border-border bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                          />
                          <div className="flex items-center justify-between">
                            <span className={cn("text-xs transition-opacity", noteSaved ? "text-emerald-500 opacity-100" : "opacity-0")}>
                              ✓ Saved
                            </span>
                            <Button size="sm" variant="outline" className="h-8" onClick={handleSaveNote}>
                              <Save className="w-3.5 h-3.5 mr-1.5" /> Save Note
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Instructor */}
                    <div className="flex items-center gap-3 pt-5 border-t border-border/60">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-bold text-primary ring-1 ring-primary/10">
                        {course?.instructor?.first_name?.[0]}{course?.instructor?.last_name?.[0]}
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Instructor</p>
                        <p className="text-sm font-semibold text-foreground tracking-tight">
                          {course?.instructor?.first_name} {course?.instructor?.last_name}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-col gap-4 w-full lg:w-64 shrink-0">
                    <Card className="border-border">
                      <CardContent className="p-5 space-y-4">
                        <Button
                          size="lg"
                          variant={currentLesson && completedLessons.has(currentLesson.lesson_id) ? "outline" : "default"}
                          onClick={handleMarkComplete}
                          disabled={!currentLesson || (currentLesson && completedLessons.has(currentLesson.lesson_id))}
                          className={cn(
                            "w-full h-11 font-semibold transition-all",
                            currentLesson && completedLessons.has(currentLesson.lesson_id) 
                              ? "border-emerald-500/50 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 cursor-default opacity-100" 
                              : ""
                          )}
                        >
                          {currentLesson && completedLessons.has(currentLesson.lesson_id) ? (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Completed
                            </>
                          ) : (
                            <>
                              <Circle className="mr-2 h-4 w-4 opacity-40" />
                              Mark Complete
                            </>
                          )}
                        </Button>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handlePrevLesson} 
                            disabled={isFirst} 
                            className="h-10 font-medium"
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleNextLesson} 
                            disabled={isLast} 
                            className="h-10 font-medium"
                          >
                            Next <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs text-muted-foreground mb-2">
                            <span>Overall Progress</span>
                            <span className="font-medium">{Math.round(progressPercent)}%</span>
                          </div>
                          <Progress value={progressPercent} className="h-1.5" />
                        </div>

                        {/* Review & Course Detail links for completed courses */}
                        {progressPercent >= 100 && (
                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                            <Button variant="outline" size="sm" asChild className="h-10 font-medium">
                              <Link href={`/student/courses/${course.slug}#reviews`}>
                                <Star className="h-3.5 w-3.5 mr-1.5" /> Review
                              </Link>
                            </Button>
                            <Button variant="outline" size="sm" asChild className="h-10 font-medium">
                              <Link href={`/student/courses/${course.slug}`}>
                                <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Details
                              </Link>
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    {analytics && (
                       <Card className="border-slate-100 bg-slate-50/30">
                         <CardContent className="p-4 space-y-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Learning Stats (MongoDB)</p>
                            <div className="grid grid-cols-2 gap-2">
                               <div className="bg-white rounded-lg p-2 border border-slate-100">
                                  <p className="text-[10px] text-slate-400">Time Spent</p>
                                  <p className="text-xs font-bold text-slate-700">{Math.round(analytics.total_time_spent_seconds / 60)}m</p>
                               </div>
                               <div className="bg-white rounded-lg p-2 border border-slate-100">
                                  <p className="text-[10px] text-slate-400">Started</p>
                                  <p className="text-xs font-bold text-slate-700">{analytics.lessons_started} lessons</p>
                               </div>
                            </div>
                         </CardContent>
                       </Card>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Professional Sidebar - Curriculum Panel */}
        {sidebarOpen && (
          <aside className="absolute inset-0 sm:relative sm:inset-auto w-full sm:w-[300px] flex flex-col border-l border-border/30 bg-white dark:bg-slate-950 overflow-hidden shrink-0 z-30 sm:z-10 animate-in slide-in-from-right duration-300">
            {/* Sidebar Header */}
            <div className="px-5 pt-5 pb-4 border-b border-border/30">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] font-semibold text-primary uppercase tracking-[0.15em] mb-0.5">Course Content</p>
                  <h4 className="text-base font-bold text-foreground tracking-tight">Curriculum</h4>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-semibold border-border/50 text-muted-foreground bg-muted/30 py-1 px-2.5 rounded-md">
                    {totalLessons} Lessons
                  </Badge>
                  <Button variant="ghost" size="icon" className="sm:hidden h-8 w-8 rounded-lg" onClick={() => setSidebarOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {/* Mini progress bar */}
              <div className="flex items-center gap-2.5">
                <div className="flex-1 h-1 bg-muted/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {progressPercent}%
                </span>
              </div>
            </div>
            
            {/* Module List */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5" style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent' }}>
              {course.modules.map((mod, modIdx) => {
                const moduleLessons = mod.lessons
                const moduleCompletedCount = moduleLessons.filter(l => completedLessons.has(l.lesson_id)).length
                const isModuleExpanded = expandedModules.includes(mod.module_id)
                const hasActiveLesson = moduleLessons.some(l => currentLesson?.lesson_id === l.lesson_id)
                
                return (
                  <div 
                    key={mod.module_id} 
                    className={cn(
                      "rounded-xl overflow-hidden transition-all duration-200",
                      isModuleExpanded 
                        ? "bg-muted/30 dark:bg-slate-900/40" 
                        : "hover:bg-muted/20"
                    )}
                  >
                    {/* Module Header */}
                    <button
                      onClick={() => toggleModule(mod.module_id)}
                      className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-all duration-200 group/module"
                    >
                      {/* Module Number Badge */}
                      <div className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-200",
                        hasActiveLesson || isModuleExpanded
                          ? "bg-primary text-white"
                          : "bg-muted/60 dark:bg-slate-800 text-muted-foreground group-hover/module:bg-primary/10 group-hover/module:text-primary"
                      )}>
                        {modIdx + 1}
                      </div>

                      {/* Module Info */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-foreground leading-tight tracking-tight">{mod.title}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {mod.lessons.length} Stages
                          </span>
                          <span className="text-muted-foreground/30">•</span>
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {mod.duration_minutes || 0} Min
                          </span>
                          {moduleLessons.length > 0 && moduleCompletedCount > 0 && (
                            <>
                              <span className="text-muted-foreground/30">•</span>
                              <span className="text-[10px] font-semibold text-emerald-600">
                                {Math.round((moduleCompletedCount / moduleLessons.length) * 100)}%
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Progress fraction + Expand toggle */}
                      <div className="flex items-center gap-2 shrink-0">
                        {moduleCompletedCount > 0 && (
                          <span className="text-[10px] font-semibold text-emerald-600 tabular-nums">
                            {moduleCompletedCount}/{moduleLessons.length}
                          </span>
                        )}
                        <ChevronDown className={cn(
                          "h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200",
                          isModuleExpanded && "rotate-180 text-primary"
                        )} />
                      </div>
                    </button>
                    
                    {/* Expanded Lesson List */}
                    {isModuleExpanded && (
                      <div className="pb-2 px-2 animate-in fade-in duration-200">
                        <div className="space-y-0.5">
                          {mod.lessons.map((lesson) => {
                            const Icon = contentTypeIcons[lesson.content_type] || FileText
                            const isActive = currentLesson?.lesson_id === lesson.lesson_id
                            const isCompleted = completedLessons.has(lesson.lesson_id)
                            return (
                              <button
                                key={lesson.lesson_id}
                                onClick={() => handleLessonClick(lesson)}
                                className={cn(
                                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[12.5px] transition-all duration-150 group/lesson",
                                  isActive
                                    ? "bg-primary text-white"
                                    : "text-foreground/70 hover:bg-muted/50 hover:text-foreground"
                                )}
                              >
                                {/* Lesson Icon */}
                                <div className={cn(
                                  "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-150",
                                  isActive 
                                    ? "bg-white/20" 
                                    : isCompleted 
                                      ? "bg-emerald-50 dark:bg-emerald-500/10" 
                                      : "bg-muted/50 dark:bg-slate-800 group-hover/lesson:bg-primary/5"
                                )}>
                                  {isCompleted && !isActive ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                  ) : (
                                    <Icon className={cn(
                                      "h-3.5 w-3.5 transition-colors",
                                      isActive 
                                        ? "text-white" 
                                        : "text-muted-foreground/60 group-hover/lesson:text-primary"
                                    )} />
                                  )}
                                </div>
                                
                                {/* Lesson Title */}
                                <span className={cn(
                                  "truncate text-left flex-1 leading-tight",
                                  isActive ? "font-semibold" : "font-medium"
                                )}>
                                  {lesson.title}
                                </span>

                                {/* Completed Check for Active */}
                                {isCompleted && isActive && (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-white/70 shrink-0" />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
