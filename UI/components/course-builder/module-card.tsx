"use client"

import { useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { GripVertical, ChevronDown, ChevronRight, Pencil, Trash2, Plus, Check, X } from "lucide-react"
import { LessonItem } from "@/components/course-builder/lesson-item"
import type { ModuleBuilderData, LessonBuilderData } from "@/lib/api/admin-courses"

interface ModuleCardProps {
  module: ModuleBuilderData
  index: number
  onDelete: () => void
  onUpdateTitle: (title: string) => void
  onAddLesson: () => void
  onEditLesson: (lesson: LessonBuilderData) => void
  onDeleteLesson: (lessonId: number) => void
  onLessonDragEnd: (event: DragEndEvent) => void
}

export function ModuleCard({
  module, index, onDelete, onUpdateTitle,
  onAddLesson, onEditLesson, onDeleteLesson, onLessonDragEnd,
}: ModuleCardProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(module.title)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: module.module_id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))

  function handleSaveTitle() {
    if (editTitle.trim() && editTitle.trim() !== module.title) {
      onUpdateTitle(editTitle.trim())
    }
    setEditing(false)
  }

  return (
    <Card ref={setNodeRef} style={style} className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* Module Header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-muted/30">
          <button {...attributes} {...listeners} className="cursor-grab touch-none text-muted-foreground hover:text-foreground">
            <GripVertical className="h-4 w-4" />
          </button>

          <CollapsibleTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </CollapsibleTrigger>

          <span className="text-xs font-medium text-muted-foreground mr-1">Module {index + 1}:</span>

          {editing ? (
            <div className="flex items-center gap-1 flex-1">
              <Input
                className="h-7 text-sm"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSaveTitle(); if (e.key === "Escape") setEditing(false); }}
                autoFocus
              />
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveTitle}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditing(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <span className="text-sm font-medium flex-1 truncate">{module.title}</span>
          )}

          <span className="text-xs text-muted-foreground">{module.lessons.length} lessons</span>

          {!editing && (
            <div className="flex items-center gap-0.5">
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditTitle(module.title); setEditing(true); }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Lessons */}
        <CollapsibleContent>
          <CardContent className="p-0">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onLessonDragEnd}>
              <SortableContext items={module.lessons.map(l => l.lesson_id)} strategy={verticalListSortingStrategy}>
                <div className="divide-y">
                  {module.lessons.map(lesson => (
                    <LessonItem
                      key={lesson.lesson_id}
                      lesson={lesson}
                      onEdit={() => onEditLesson(lesson)}
                      onDelete={() => onDeleteLesson(lesson.lesson_id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {module.lessons.length === 0 && (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                No lessons yet. Add one below.
              </div>
            )}

            <div className="px-4 py-2 border-t">
              <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={onAddLesson}>
                <Plus className="h-3.5 w-3.5" /> Add Lesson
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
