"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Star, Loader2, MessageSquare, Pencil, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getCourseReviews, getMyReview, submitReview, updateReview, deleteReview,
  type CourseReview, type ReviewStats,
} from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

function StarRating({ rating, onRate, interactive = false, size = "md" }: {
  rating: number
  onRate?: (r: number) => void
  interactive?: boolean
  size?: "sm" | "md" | "lg"
}) {
  const [hover, setHover] = useState(0)
  const sizeClass = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-6 w-6" : "h-4.5 w-4.5"

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          className={cn("transition-colors", interactive && "cursor-pointer hover:scale-110")}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
        >
          <Star
            className={cn(
              sizeClass,
              (hover || rating) >= star
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-muted-foreground/30"
            )}
          />
        </button>
      ))}
    </div>
  )
}

function RatingBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-12 text-muted-foreground shrink-0">{label}</span>
      <Progress value={pct} className="h-2 flex-1" />
      <span className="w-8 text-right text-muted-foreground text-xs">{count}</span>
    </div>
  )
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const days = Math.floor((now.getTime() - date.getTime()) / 86400000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 30) return `${days} days ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return `${Math.floor(days / 365)} years ago`
}

interface CourseReviewsProps {
  courseId: number
  isEnrolled: boolean
}

export function CourseReviews({ courseId, isEnrolled }: CourseReviewsProps) {
  const { user } = useAuth()
  const [reviews, setReviews] = useState<CourseReview[]>([])
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState("newest")

  // My review state
  const [myReview, setMyReview] = useState<{ review_id: number; rating: number; review_text: string } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formRating, setFormRating] = useState(0)
  const [formText, setFormText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  const loadReviews = useCallback(async () => {
    try {
      const res = await getCourseReviews(courseId, { sort_by: sortBy, limit: 50 })
      setReviews(res.reviews)
      setStats(res.stats)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [courseId, sortBy])

  const loadMyReview = useCallback(async () => {
    if (!user) return
    try {
      const res = await getMyReview(courseId)
      setMyReview(res.review)
    } catch {
      // not logged in or error
    }
  }, [courseId, user])

  useEffect(() => { loadReviews() }, [loadReviews])
  useEffect(() => { loadMyReview() }, [loadMyReview])

  async function handleSubmit() {
    if (formRating === 0) { setFormError("Please select a rating"); return }
    setSubmitting(true)
    setFormError("")
    try {
      if (myReview) {
        await updateReview(courseId, formRating, formText)
      } else {
        await submitReview(courseId, formRating, formText)
      }
      setShowForm(false)
      setFormRating(0)
      setFormText("")
      await loadReviews()
      await loadMyReview()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to submit review")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!confirm("Delete your review?")) return
    try {
      await deleteReview(courseId)
      setMyReview(null)
      await loadReviews()
    } catch {
      // ignore
    }
  }

  function openEditForm() {
    if (myReview) {
      setFormRating(myReview.rating)
      setFormText(myReview.review_text || "")
    } else {
      setFormRating(0)
      setFormText("")
    }
    setFormError("")
    setShowForm(true)
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Student Reviews
          </CardTitle>
          {stats && stats.total_reviews > 0 && (
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="highest">Highest Rated</SelectItem>
                <SelectItem value="lowest">Lowest Rated</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Stats summary */}
            {stats && stats.total_reviews > 0 && (
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <span className="text-4xl font-bold text-foreground">{stats.average_rating}</span>
                  <StarRating rating={Math.round(stats.average_rating)} size="md" />
                  <span className="text-xs text-muted-foreground">{stats.total_reviews} review{stats.total_reviews !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex-1 flex flex-col gap-1.5 w-full">
                  <RatingBar label="5 star" count={stats.five_star} total={stats.total_reviews} />
                  <RatingBar label="4 star" count={stats.four_star} total={stats.total_reviews} />
                  <RatingBar label="3 star" count={stats.three_star} total={stats.total_reviews} />
                  <RatingBar label="2 star" count={stats.two_star} total={stats.total_reviews} />
                  <RatingBar label="1 star" count={stats.one_star} total={stats.total_reviews} />
                </div>
              </div>
            )}

            {/* Write / Edit review button */}
            {isEnrolled && user && !showForm && (
              <div className="flex items-center gap-2">
                {myReview ? (
                  <>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={openEditForm}>
                      <Pencil className="h-3.5 w-3.5" /> Edit Your Review
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1.5 text-destructive" onClick={handleDelete}>
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={openEditForm}>
                    <Star className="h-3.5 w-3.5" /> Write a Review
                  </Button>
                )}
              </div>
            )}

            {/* Review form */}
            {showForm && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">Your rating:</span>
                  <StarRating rating={formRating} onRate={setFormRating} interactive size="lg" />
                </div>
                <Textarea
                  placeholder="Share your experience with this course (optional)..."
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  rows={3}
                />
                {formError && <p className="text-xs text-destructive">{formError}</p>}
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                    {myReview ? "Update Review" : "Submit Review"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {/* Reviews list */}
            {reviews.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No reviews yet. {isEnrolled ? "Be the first to share your experience!" : ""}</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {reviews.map((review) => (
                  <div key={review.review_id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {review.student_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{review.student_name}</span>
                          <StarRating rating={review.rating} size="sm" />
                          <span className="text-xs text-muted-foreground">{timeAgo(review.created_at)}</span>
                          {review.is_featured && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">Featured</span>
                          )}
                        </div>
                        {review.student_headline && (
                          <p className="text-xs text-muted-foreground mt-0.5">{review.student_headline}</p>
                        )}
                        {review.review_text && (
                          <p className="text-sm text-foreground/80 mt-2 leading-relaxed">{review.review_text}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
