"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, BookOpen, Users, Layers, Eye, EyeOff, Trash2, Loader2, Plus, Pencil } from "lucide-react"
import { getAdminCourses, toggleCoursePublish, deleteAdminCourse, type AdminCourse } from "@/lib/api"
import { DashboardSkeleton } from "@/components/skeletons"
import { TablePagination } from "@/components/table-pagination"

const levelColors: Record<string, string> = {
  beginner: "bg-success/10 text-success",
  intermediate: "bg-primary/10 text-primary",
  advanced: "bg-destructive/10 text-destructive",
}

export default function CourseManagement() {
  const [courses, setCourses] = useState<AdminCourse[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const [searchDebounced, setSearchDebounced] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [summary, setSummary] = useState({ published_count: 0, draft_count: 0, total_enrollments: 0 })

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(1) }, [searchDebounced, statusFilter])

  const loadCourses = useCallback(() => {
    setLoading(true)
    getAdminCourses({
      search: searchDebounced,
      status: statusFilter,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    })
      .then((res) => { setCourses(res.courses); setTotal(res.total); setSummary(res.summary) })
      .catch((err) => console.error("Failed to load courses:", err))
      .finally(() => setLoading(false))
  }, [searchDebounced, statusFilter, page, pageSize])

  useEffect(() => { loadCourses() }, [loadCourses])

  const { published_count: publishedCount, draft_count: draftCount, total_enrollments: totalEnrollments } = summary

  async function handleTogglePublish(courseId: number, publish: boolean) {
    setActionLoading(courseId)
    try {
      await toggleCoursePublish(courseId, publish)
      loadCourses()
    } catch (err) {
      console.error("Toggle publish failed:", err)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete(courseId: number, title: string) {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) return
    setActionLoading(courseId)
    try {
      await deleteAdminCourse(courseId)
      loadCourses()
    } catch (err) {
      console.error("Delete failed:", err)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading && courses.length === 0) return <DashboardSkeleton />

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Course Management</h1>
          <p className="text-muted-foreground">Manage courses, publish/unpublish, and track enrollments.</p>
        </div>
        <Button asChild>
          <Link href="/admin/courses/new"><Plus className="h-4 w-4 mr-1" /> Create Course</Link>
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <BookOpen className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{publishedCount}</p>
              <p className="text-xs text-muted-foreground">Published</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Layers className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{draftCount}</p>
              <p className="text-xs text-muted-foreground">Drafts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalEnrollments}</p>
              <p className="text-xs text-muted-foreground">Total Enrollments</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search courses..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Drafts</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="text-xs text-muted-foreground">{total} courses found</div>

      {/* Courses table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : (
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Enrollments</TableHead>
                  <TableHead className="hidden md:table-cell">Modules</TableHead>
                  <TableHead className="hidden lg:table-cell">Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.course_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{course.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {course.instructor_name || "No instructor"} · {course.lesson_count} lessons
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{course.category_name || "—"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={levelColors[course.difficulty_level] || "bg-secondary text-secondary-foreground"}>
                        {course.difficulty_level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {course.is_published ? (
                        <Badge className="bg-success/10 text-success">Published</Badge>
                      ) : (
                        <Badge className="bg-muted text-muted-foreground">Draft</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {course.enrollment_count}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {course.module_count}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                      {course.price === 0 ? (
                        <Badge className="bg-success/10 text-success">Free</Badge>
                      ) : (
                        `₹${course.price.toLocaleString()}`
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {actionLoading === course.course_id ? (
                        <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={`/admin/courses/${course.course_id}/edit`}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 text-xs"
                            onClick={() => handleTogglePublish(course.course_id, !course.is_published)}
                          >
                            {course.is_published ? (
                              <><EyeOff className="h-3.5 w-3.5" /> Unpublish</>
                            ) : (
                              <><Eye className="h-3.5 w-3.5" /> Publish</>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(course.course_id, course.title)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {courses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No courses found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          {!loading && total > 0 && (
            <TablePagination
              total={total}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
