"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"
import { UploadDropzone } from "@/components/course-builder/upload-dropzone"
import {
  createCourse, updateCourse,
  getAdminCategories, getSkills, getInstructors,
  type CategoryItem, type SkillItem, type InstructorItem, type CourseBuilderData,
} from "@/lib/api/admin-courses"

interface StepCourseInfoProps {
  courseId: number | null
  initialData?: CourseBuilderData | null
  onComplete: (courseId: number, slug: string) => void
}

export function StepCourseInfo({ courseId, initialData, onComplete }: StepCourseInfoProps) {
  const isEdit = !!courseId

  // Form state
  const [title, setTitle] = useState("")
  const [shortDescription, setShortDescription] = useState("")
  const [description, setDescription] = useState("")
  const [categoryId, setCategoryId] = useState<string>("")
  const [difficulty, setDifficulty] = useState("beginner")
  const [instructorId, setInstructorId] = useState<string>("")
  const [pricingModel, setPricingModel] = useState("free")
  const [price, setPrice] = useState("0")
  const [currency, setCurrency] = useState("INR")
  const [thumbnailUrl, setThumbnailUrl] = useState("")
  const [previewVideoUrl, setPreviewVideoUrl] = useState("")
  const [metaTitle, setMetaTitle] = useState("")
  const [metaDescription, setMetaDescription] = useState("")
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([])

  // Lookup data
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [skills, setSkills] = useState<SkillItem[]>([])
  const [instructors, setInstructors] = useState<InstructorItem[]>([])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load lookups
  useEffect(() => {
    getAdminCategories().then(setCategories).catch(console.error)
    getSkills().then(setSkills).catch(console.error)
    getInstructors().then(setInstructors).catch(console.error)
  }, [])

  // Populate from initialData (edit mode)
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "")
      setShortDescription(initialData.short_description || "")
      setDescription(initialData.description || "")
      setCategoryId(initialData.category_id ? String(initialData.category_id) : "")
      setDifficulty(initialData.difficulty_level || "beginner")
      setInstructorId(initialData.instructor_id ? String(initialData.instructor_id) : "")
      setPricingModel(initialData.pricing_model || "free")
      setPrice(String(initialData.price || 0))
      setCurrency(initialData.currency || "INR")
      setThumbnailUrl(initialData.thumbnail_url || "")
      setPreviewVideoUrl(initialData.preview_video_url || "")
      setMetaTitle(initialData.meta_title || "")
      setMetaDescription(initialData.meta_description || "")
      setSelectedSkillIds(initialData.skill_ids || [])
    }
  }, [initialData])

  function toggleSkill(skillId: number) {
    setSelectedSkillIds(prev =>
      prev.includes(skillId) ? prev.filter(id => id !== skillId) : [...prev, skillId]
    )
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("Title is required")
      return
    }
    setError(null)
    setSaving(true)

    const data = {
      title: title.trim(),
      description: description || null,
      short_description: shortDescription || null,
      category_id: categoryId ? Number(categoryId) : null,
      difficulty_level: difficulty,
      instructor_id: instructorId ? Number(instructorId) : null,
      pricing_model: pricingModel,
      price: parseFloat(price) || 0,
      currency,
      thumbnail_url: thumbnailUrl || null,
      preview_video_url: previewVideoUrl || null,
      meta_title: metaTitle || null,
      meta_description: metaDescription || null,
      skill_ids: selectedSkillIds,
    }

    try {
      if (isEdit && courseId) {
        await updateCourse(courseId, data)
        onComplete(courseId, initialData?.slug || "")
      } else {
        const result = await createCourse(data)
        onComplete(result.course_id, result.slug)
      }
    } catch (e: any) {
      setError(e.message || "Failed to save course")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Basic Info */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Basic Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Course Title *</Label>
            <Input id="title" placeholder="e.g. Advanced SQL Masterclass" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="short_desc">Short Description</Label>
            <Textarea id="short_desc" placeholder="Brief summary (max 500 chars)" maxLength={500} rows={2} value={shortDescription} onChange={e => setShortDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Full Description</Label>
            <Textarea id="desc" placeholder="Detailed course description (Markdown supported)" rows={5} value={description} onChange={e => setDescription(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Classification */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Classification</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.category_id} value={String(c.category_id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Difficulty Level</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Instructor</Label>
            <Select value={instructorId} onValueChange={setInstructorId}>
              <SelectTrigger><SelectValue placeholder="Select instructor" /></SelectTrigger>
              <SelectContent>
                {instructors.map(i => (
                  <SelectItem key={i.instructor_id} value={String(i.instructor_id)}>
                    {i.first_name} {i.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Skills */}
          <div className="space-y-2">
            <Label>Skills</Label>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto rounded-md border p-3">
              {skills.length === 0 && <p className="text-xs text-muted-foreground">No skills found. Create skills first.</p>}
              {skills.map(s => (
                <label key={s.skill_id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedSkillIds.includes(s.skill_id)}
                    onCheckedChange={() => toggleSkill(s.skill_id)}
                  />
                  {s.name}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Pricing</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Pricing Model</Label>
              <Select value={pricingModel} onValueChange={setPricingModel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="one_time">One-Time Payment</SelectItem>
                  <SelectItem value="subscription">Subscription</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {pricingModel !== "free" && (
              <>
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Input value={currency} onChange={e => setCurrency(e.target.value)} />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Media */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Media</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Thumbnail Image</Label>
            <UploadDropzone
              accept={{ "image/*": [".jpg", ".jpeg", ".png", ".webp"] }}
              maxSizeMB={10}
              onUploadComplete={setThumbnailUrl}
              courseSlug={initialData?.slug}
              label="Drop thumbnail image (JPG, PNG, WebP)"
              currentUrl={thumbnailUrl}
            />
          </div>
          <div className="space-y-2">
            <Label>Preview Video URL (optional)</Label>
            <Input placeholder="YouTube URL or upload URL" value={previewVideoUrl} onChange={e => setPreviewVideoUrl(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* SEO */}
      <Card>
        <CardHeader><CardTitle className="text-lg">SEO (Optional)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Meta Title</Label>
            <Input value={metaTitle} onChange={e => setMetaTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Meta Description</Label>
            <Textarea rows={2} value={metaDescription} onChange={e => setMetaDescription(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => handleSave()} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          Save as Draft
        </Button>
        <Button onClick={() => handleSave()} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          {isEdit ? "Save & Continue" : "Create & Continue"} →
        </Button>
      </div>
    </div>
  )
}
