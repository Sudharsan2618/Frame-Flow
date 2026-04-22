"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Search, Star, Users, Clock, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { getCourses, getCategories, getEnrollments, mapCourseToUI, logSearch, type Category, type EnrollmentOut } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { CourseCatalogSkeleton } from "@/components/skeletons"


export default function CourseCatalog() {
  const { user } = useAuth()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("All")
  const [level, setLevel] = useState("All")
  const [priceFilter, setPriceFilter] = useState("All")
  const [courses, setCourses] = useState<ReturnType<typeof mapCourseToUI>[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [enrollments, setEnrollments] = useState<EnrollmentOut[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const levels = ["All", "Beginner", "Intermediate", "Advanced"]

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        const [courseRes, catRes] = await Promise.all([
          getCourses({ page_size: 50 }),
          getCategories(),
        ])

        setCourses(courseRes.courses.map(mapCourseToUI))
        setCategories(catRes)

        // Fetch enrollments if student is logged in
        if (user?.student_id) {
          try {
            const enrollRes = await getEnrollments(user.student_id)
            setEnrollments(enrollRes)
          } catch {
            // Enrollments may fail — continue without
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load courses")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user?.student_id])

  // Create a map of course_id -> enrollment
  const enrollmentMap = new Map(enrollments.map((e) => [e.course_id, e]))

  // Debounced search logging (500ms)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!search.trim() || !user?.student_id) return
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      logSearch(user.student_id!, search.trim(), "course", filtered.length).catch(() => {})
    }, 500)
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, user?.student_id])

  const filtered = courses.filter((c) => {
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false
    if (category !== "All" && c.category !== category) return false
    if (level !== "All" && c.level !== level) return false
    if (priceFilter === "Free" && !c.isFree) return false
    if (priceFilter === "Paid" && c.isFree) return false
    return true
  })

  const categoryOptions = ["All", ...categories.map((c) => c.name)]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Course Catalog</h1>
        <p className="text-muted-foreground">Discover courses to build your skills and advance your career.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            {categoryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-[calc(50%-4px)] sm:w-[160px]"><SelectValue placeholder="Level" /></SelectTrigger>
          <SelectContent>
            {levels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priceFilter} onValueChange={setPriceFilter}>
          <SelectTrigger className="w-[calc(50%-4px)] sm:w-[120px]"><SelectValue placeholder="Price" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All</SelectItem>
            <SelectItem value="Free">Free</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {loading && <CourseCatalogSkeleton />}

      {/* Error */}
      {error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-lg font-medium text-destructive">Failed to load courses</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      )}

      {/* Course Grid */}
      {!loading && !error && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => {
            const enrollment = enrollmentMap.get(course.id)
            const isEnrolled = !!enrollment
            const progress = enrollment ? parseFloat(enrollment.progress_percentage) : 0

            return (
              <Card key={course.id} className="group overflow-hidden transition-shadow hover:shadow-md">
                <div className="relative h-80 bg-muted">
                  {course.image ? (
                    <img src={course.image} alt={course.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span className="text-3xl font-bold text-muted-foreground/30">{course.category}</span>
                    </div>
                  )}
                  <div className="absolute right-3 top-3 flex gap-2">
                    {isEnrolled && (
                      <Badge className="bg-emerald-600 text-white border-0">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Enrolled
                      </Badge>
                    )}
                    <Badge variant={course.isFree ? "default" : "secondary"} className={course.isFree ? "bg-success text-success-foreground" : ""}>
                      {course.isFree ? "Free" : `₹${course.price.toLocaleString()}`}
                    </Badge>
                  </div>
                </div>
                <CardContent className="flex flex-col gap-3 p-5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{course.level}</Badge>
                    <Badge variant="outline" className="text-xs">{course.category}</Badge>
                  </div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{course.title}</h3>
                  <p className="text-sm text-muted-foreground">by {course.instructor}</p>
                  {course.shortDescription && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{course.shortDescription}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-accent text-accent" />{course.rating > 0 ? course.rating.toFixed(1) : "New"}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{course.students.toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{course.duration}</span>
                  </div>

                  {/* Progress bar for enrolled courses */}
                  {isEnrolled && progress > 0 && (
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium text-foreground">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>
                  )}

                  {/* Skills */}
                  {course.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {course.skills.slice(0, 3).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-[10px] px-1.5 py-0">{skill}</Badge>
                      ))}
                      {course.skills.length > 3 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">+{course.skills.length - 3}</Badge>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  {isEnrolled ? (
                    progress >= 100 ? (
                      <div className="flex gap-2 mt-1">
                        <Button size="sm" variant="outline" asChild className="flex-1">
                          <Link href={`/student/courses/${course.slug}#reviews`}>
                            Write Review
                          </Link>
                        </Button>
                        <Button size="sm" asChild className="flex-1">
                          <Link href={`/student/courses/${course.slug}`}>
                            View Course
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" asChild className="mt-1">
                        <Link href={`/student/player?slug=${course.slug}`}>
                          Continue Learning
                        </Link>
                      </Button>
                    )
                  ) : (
                    <Button variant="outline" size="sm" asChild className="mt-1">
                      <Link href={`/student/courses/${course.slug}`}>
                        View Course
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-lg font-medium text-foreground">No courses found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your filters.</p>
        </div>
      )}
    </div>
  )
}
