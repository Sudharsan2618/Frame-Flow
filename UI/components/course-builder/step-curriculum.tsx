"use client"

import { useState, useEffect, useCallback } from "react"
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Loader2 } from "lucide-react"
import { ModuleCard } from "@/components/course-builder/module-card"
import { LessonEditorDialog } from "@/components/course-builder/lesson-editor-dialog"
import {
  getCourseForBuilder, addModule, reorderModules,
  deleteModule as apiDeleteModule, updateModule as apiUpdateModule,
  deleteLesson as apiDeleteLesson, reorderLessons,
  type CourseBuilderData, type ModuleBuilderData, type LessonBuilderData,
} from "@/lib/api/admin-courses"

interface StepCurriculumProps {
  courseId: number
  courseSlug: string
  onNext: () => void
  onBack: () => void
  onCourseDataUpdate: (data: CourseBuilderData) => void
}

export function StepCurriculum({ courseId, courseSlug, onNext, onBack, onCourseDataUpdate }: StepCurriculumProps) {
  const [course, setCourse] = useState<CourseBuilderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [newModuleTitle, setNewModuleTitle] = useState("")
  const [addingModule, setAddingModule] = useState(false)

  // Lesson editor dialog state
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<LessonBuilderData | null>(null)
  const [editingModuleId, setEditingModuleId] = useState<number | null>(null)

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))

  const loadCourse = useCallback(async () => {
    try {
      const data = await getCourseForBuilder(courseId)
      setCourse(data)
      onCourseDataUpdate(data)
    } catch (e) {
      console.error("Failed to load course:", e)
    } finally {
      setLoading(false)
    }
  }, [courseId, onCourseDataUpdate])

  useEffect(() => { loadCourse() }, [loadCourse])

  async function handleAddModule() {
    if (!newModuleTitle.trim()) return
    setAddingModule(true)
    try {
      await addModule(courseId, { title: newModuleTitle.trim() })
      setNewModuleTitle("")
      await loadCourse()
    } catch (e) {
      console.error("Failed to add module:", e)
    } finally {
      setAddingModule(false)
    }
  }

  async function handleDeleteModule(moduleId: number) {
    if (!confirm("Delete this module and all its lessons?")) return
    try {
      await apiDeleteModule(courseId, moduleId)
      await loadCourse()
    } catch (e) {
      console.error("Failed to delete module:", e)
    }
  }

  async function handleUpdateModuleTitle(moduleId: number, title: string) {
    try {
      await apiUpdateModule(courseId, moduleId, { title })
      await loadCourse()
    } catch (e) {
      console.error("Failed to update module:", e)
    }
  }

  async function handleDeleteLesson(moduleId: number, lessonId: number) {
    if (!confirm("Delete this lesson?")) return
    try {
      await apiDeleteLesson(courseId, moduleId, lessonId)
      await loadCourse()
    } catch (e) {
      console.error("Failed to delete lesson:", e)
    }
  }

  function handleAddLesson(moduleId: number) {
    setEditingModuleId(moduleId)
    setEditingLesson(null)
    setLessonDialogOpen(true)
  }

  function handleEditLesson(moduleId: number, lesson: LessonBuilderData) {
    setEditingModuleId(moduleId)
    setEditingLesson(lesson)
    setLessonDialogOpen(true)
  }

  async function handleModuleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id || !course) return

    const oldIndex = course.modules.findIndex(m => m.module_id === active.id)
    const newIndex = course.modules.findIndex(m => m.module_id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(course.modules, oldIndex, newIndex)
    setCourse({ ...course, modules: reordered })

    try {
      await reorderModules(courseId, reordered.map(m => m.module_id))
    } catch (e) {
      console.error("Reorder failed:", e)
      await loadCourse()
    }
  }

  async function handleLessonDragEnd(moduleId: number, event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id || !course) return

    const mod = course.modules.find(m => m.module_id === moduleId)
    if (!mod) return

    const oldIndex = mod.lessons.findIndex(l => l.lesson_id === active.id)
    const newIndex = mod.lessons.findIndex(l => l.lesson_id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reorderedLessons = arrayMove(mod.lessons, oldIndex, newIndex)
    const updatedModules = course.modules.map(m =>
      m.module_id === moduleId ? { ...m, lessons: reorderedLessons } : m
    )
    setCourse({ ...course, modules: updatedModules })

    try {
      await reorderLessons(courseId, moduleId, reorderedLessons.map(l => l.lesson_id))
    } catch (e) {
      console.error("Reorder lessons failed:", e)
      await loadCourse()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
        <span className="text-sm text-muted-foreground">Loading curriculum...</span>
      </div>
    )
  }

  const modules = course?.modules || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Curriculum</h2>
          <p className="text-sm text-muted-foreground">
            {modules.length} module{modules.length !== 1 ? "s" : ""} · {modules.reduce((s, m) => s + m.lessons.length, 0)} lessons
          </p>
        </div>
      </div>

      {/* Module list with DnD */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleModuleDragEnd}>
        <SortableContext items={modules.map(m => m.module_id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {modules.map((mod, idx) => (
              <ModuleCard
                key={mod.module_id}
                module={mod}
                index={idx}
                onDelete={() => handleDeleteModule(mod.module_id)}
                onUpdateTitle={(title) => handleUpdateModuleTitle(mod.module_id, title)}
                onAddLesson={() => handleAddLesson(mod.module_id)}
                onEditLesson={(lesson) => handleEditLesson(mod.module_id, lesson)}
                onDeleteLesson={(lessonId) => handleDeleteLesson(mod.module_id, lessonId)}
                onLessonDragEnd={(event) => handleLessonDragEnd(mod.module_id, event)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add Module */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Input
              placeholder="New module title..."
              value={newModuleTitle}
              onChange={e => setNewModuleTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddModule()}
            />
            <Button onClick={handleAddModule} disabled={addingModule || !newModuleTitle.trim()}>
              {addingModule ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Add Module
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <Button onClick={onNext}>Next: Review & Publish →</Button>
      </div>

      {/* Lesson Editor Dialog */}
      <LessonEditorDialog
        open={lessonDialogOpen}
        onOpenChange={setLessonDialogOpen}
        courseId={courseId}
        courseSlug={courseSlug}
        moduleId={editingModuleId!}
        lesson={editingLesson}
        onSaved={() => {
          setLessonDialogOpen(false)
          loadCourse()
        }}
      />
    </div>
  )
}
