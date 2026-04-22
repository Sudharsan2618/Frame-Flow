"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  GripVertical, Pencil, Trash2, Video, FileText, FileDown,
  Headphones, ImageIcon, HelpCircle, Layers, Package, ExternalLink,
} from "lucide-react"
import type { LessonBuilderData } from "@/lib/api/admin-courses"

const CONTENT_TYPE_META: Record<string, { icon: React.ComponentType<any>; label: string; color: string }> = {
  video: { icon: Video, label: "Video", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  text: { icon: FileText, label: "Text", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  pdf: { icon: FileDown, label: "PDF", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  audio: { icon: Headphones, label: "Audio", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  image: { icon: ImageIcon, label: "Image", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  quiz: { icon: HelpCircle, label: "Quiz", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  flashcard: { icon: Layers, label: "Flashcard", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400" },
  scorm_package: { icon: Package, label: "SCORM", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  external_link: { icon: ExternalLink, label: "Link", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
}

interface LessonItemProps {
  lesson: LessonBuilderData
  onEdit: () => void
  onDelete: () => void
}

export function LessonItem({ lesson, onEdit, onDelete }: LessonItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.lesson_id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const meta = CONTENT_TYPE_META[lesson.content_type] || CONTENT_TYPE_META.text
  const Icon = meta.icon

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 px-4 py-2.5 hover:bg-muted/20 transition-colors">
      <button {...attributes} {...listeners} className="cursor-grab touch-none text-muted-foreground hover:text-foreground">
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />

      <span className="text-sm flex-1 truncate">{lesson.title}</span>

      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${meta.color}`}>
        {meta.label}
      </Badge>

      {lesson.duration_minutes && (
        <span className="text-[10px] text-muted-foreground">{lesson.duration_minutes} min</span>
      )}

      {lesson.is_preview && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">Preview</Badge>
      )}

      <div className="flex items-center gap-0.5">
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onEdit}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
