"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

import { VideoEditor } from "@/components/course-builder/content-editors/video-editor"
import { TextEditor } from "@/components/course-builder/content-editors/text-editor"
import { PdfEditor } from "@/components/course-builder/content-editors/pdf-editor"
import { AudioEditor } from "@/components/course-builder/content-editors/audio-editor"
import { ImageEditor } from "@/components/course-builder/content-editors/image-editor"
import { QuizBuilder } from "@/components/course-builder/content-editors/quiz-builder"
import { FlashcardBuilder } from "@/components/course-builder/content-editors/flashcard-builder"
import { ScormEditor } from "@/components/course-builder/content-editors/scorm-editor"
import { ExternalLinkEditor } from "@/components/course-builder/content-editors/external-link-editor"

import {
  addLesson, updateLesson, saveQuiz, saveFlashcards,
  type LessonBuilderData, type QuizBuilderData, type FlashcardDeckData,
} from "@/lib/api/admin-courses"

const CONTENT_TYPES = [
  { value: "video", label: "Video" },
  { value: "text", label: "Text / Markdown" },
  { value: "pdf", label: "PDF Document" },
  { value: "audio", label: "Audio" },
  { value: "image", label: "Image" },
  { value: "quiz", label: "Quiz" },
  { value: "flashcard", label: "Flashcard Deck" },
  { value: "scorm_package", label: "SCORM Package" },
  { value: "external_link", label: "External Link" },
]

interface LessonEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: number
  courseSlug: string
  moduleId: number
  lesson: LessonBuilderData | null
  onSaved: () => void
}

export function LessonEditorDialog({
  open, onOpenChange, courseId, courseSlug, moduleId, lesson, onSaved,
}: LessonEditorDialogProps) {
  const isEdit = !!lesson

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [contentType, setContentType] = useState("video")
  const [duration, setDuration] = useState("")
  const [isPreview, setIsPreview] = useState(false)
  const [isMandatory, setIsMandatory] = useState(true)

  // Content fields
  const [contentUrl, setContentUrl] = useState("")
  const [videoExternalId, setVideoExternalId] = useState("")
  const [videoExternalPlatform, setVideoExternalPlatform] = useState("")
  const [textContent, setTextContent] = useState("")

  // Quiz / Flashcard data (saved separately)
  const [quizData, setQuizData] = useState<Partial<QuizBuilderData>>({})
  const [flashcardData, setFlashcardData] = useState<Partial<FlashcardDeckData>>({})

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (lesson) {
        setTitle(lesson.title)
        setDescription(lesson.description || "")
        setContentType(lesson.content_type)
        setDuration(lesson.duration_minutes ? String(lesson.duration_minutes) : "")
        setIsPreview(lesson.is_preview)
        setIsMandatory(lesson.is_mandatory)
        setContentUrl(lesson.content_url || "")
        setVideoExternalId(lesson.video_external_id || "")
        setVideoExternalPlatform(lesson.video_external_platform || "")
        setTextContent(lesson.text_content || "")
      } else {
        setTitle("")
        setDescription("")
        setContentType("video")
        setDuration("")
        setIsPreview(false)
        setIsMandatory(true)
        setContentUrl("")
        setVideoExternalId("")
        setVideoExternalPlatform("")
        setTextContent("")
      }
      setQuizData({})
      setFlashcardData({})
      setError(null)
    }
  }, [open, lesson])

  async function handleSave() {
    if (!title.trim()) {
      setError("Title is required")
      return
    }
    setError(null)
    setSaving(true)

    try {
      const data: Record<string, any> = {
        title: title.trim(),
        description: description || null,
        content_type: contentType,
        duration_minutes: duration ? Number(duration) : null,
        is_preview: isPreview,
        is_mandatory: isMandatory,
        content_url: contentUrl || null,
        video_external_id: videoExternalId || null,
        video_external_platform: videoExternalPlatform || null,
        text_content: textContent || null,
      }

      let lessonId: number

      if (isEdit && lesson) {
        await updateLesson(courseId, moduleId, lesson.lesson_id, data)
        lessonId = lesson.lesson_id
      } else {
        const result = await addLesson(courseId, moduleId, data)
        lessonId = result.lesson_id
      }

      // Save quiz if content type is quiz
      if (contentType === "quiz" && quizData.title) {
        await saveQuiz(lessonId, quizData)
      }

      // Save flashcards if content type is flashcard
      if (contentType === "flashcard" && flashcardData.title) {
        await saveFlashcards(lessonId, flashcardData)
      }

      onSaved()
    } catch (e: any) {
      setError(e.message || "Failed to save lesson")
    } finally {
      setSaving(false)
    }
  }

  function renderContentEditor() {
    switch (contentType) {
      case "video":
        return (
          <VideoEditor
            contentUrl={contentUrl}
            videoExternalId={videoExternalId}
            videoExternalPlatform={videoExternalPlatform}
            courseSlug={courseSlug}
            onChange={(d) => {
              if (d.content_url !== undefined) setContentUrl(d.content_url || "")
              if (d.video_external_id !== undefined) setVideoExternalId(d.video_external_id || "")
              if (d.video_external_platform !== undefined) setVideoExternalPlatform(d.video_external_platform || "")
            }}
          />
        )
      case "text":
        return <TextEditor textContent={textContent} onChange={setTextContent} />
      case "pdf":
        return <PdfEditor contentUrl={contentUrl} courseSlug={courseSlug} onChange={setContentUrl} />
      case "audio":
        return <AudioEditor contentUrl={contentUrl} courseSlug={courseSlug} onChange={setContentUrl} />
      case "image":
        return <ImageEditor contentUrl={contentUrl} courseSlug={courseSlug} onChange={setContentUrl} />
      case "quiz":
        return <QuizBuilder lessonId={lesson?.lesson_id ?? null} onChange={setQuizData} quizData={quizData} />
      case "flashcard":
        return <FlashcardBuilder lessonId={lesson?.lesson_id ?? null} onChange={setFlashcardData} deckData={flashcardData} />
      case "scorm_package":
        return <ScormEditor contentUrl={contentUrl} courseSlug={courseSlug} onChange={setContentUrl} />
      case "external_link":
        return <ExternalLinkEditor contentUrl={contentUrl} onChange={setContentUrl} />
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{isEdit ? "Edit Lesson" : "Add Lesson"}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 pb-4">
            {/* Common fields */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Lesson Title *</Label>
                <Input placeholder="e.g. Introduction to SQL" value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Description</Label>
                <Textarea rows={2} placeholder="Optional description" value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Content Type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map(ct => (
                      <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Duration (minutes)</Label>
                <Input type="number" min={0} placeholder="e.g. 15" value={duration} onChange={e => setDuration(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={isPreview} onCheckedChange={setIsPreview} />
                <Label className="text-sm">Free Preview</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isMandatory} onCheckedChange={setIsMandatory} />
                <Label className="text-sm">Mandatory</Label>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Content</h4>
              {renderContentEditor()}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t">
          {error && <p className="text-xs text-destructive mr-auto">{error}</p>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {isEdit ? "Update Lesson" : "Add Lesson"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
