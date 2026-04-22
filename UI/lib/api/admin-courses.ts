import { fetchApiWithAuth, API_BASE_URL } from './client'

// ── Types ──

export interface SignedUploadResponse {
  upload_url: string
  blob_name: string
  public_url: string
}

export interface CourseBuilderData {
  course_id: number
  title: string
  slug: string
  description?: string | null
  short_description?: string | null
  category_id?: number | null
  difficulty_level: string
  instructor_id?: number | null
  pricing_model: string
  price: number
  currency: string
  discount_price?: number | null
  duration_hours?: number | null
  thumbnail_url?: string | null
  preview_video_url?: string | null
  meta_title?: string | null
  meta_description?: string | null
  is_published: boolean
  total_modules: number
  total_lessons: number
  skill_ids: number[]
  modules: ModuleBuilderData[]
}

export interface ModuleBuilderData {
  module_id: number
  title: string
  description?: string | null
  order_index: number
  duration_minutes?: number | null
  is_preview: boolean
  lessons: LessonBuilderData[]
}

export interface LessonBuilderData {
  lesson_id: number
  title: string
  description?: string | null
  content_type: string
  order_index: number
  duration_minutes?: number | null
  content_url?: string | null
  video_external_id?: string | null
  video_external_platform?: string | null
  text_content?: string | null
  is_preview: boolean
  is_mandatory: boolean
}

export interface CategoryItem {
  category_id: number
  name: string
  slug: string
  description?: string | null
  parent_category_id?: number | null
  icon_url?: string | null
  display_order: number
  is_active: boolean
}

export interface SkillItem {
  skill_id: number
  name: string
  slug: string
  category?: string | null
  description?: string | null
  icon_url?: string | null
  is_active: boolean
}

export interface InstructorItem {
  instructor_id: number
  user_id?: number
  first_name: string
  last_name: string
  bio?: string | null
  headline?: string | null
  expertise_areas?: string | null
  profile_picture_url?: string | null
  is_active: boolean
  course_count?: number
}

export interface QuizBuilderData {
  quiz_id?: number
  title: string
  description?: string | null
  instructions?: string | null
  pass_percentage: number
  time_limit_minutes?: number | null
  max_attempts?: number | null
  shuffle_questions: boolean
  shuffle_options: boolean
  show_correct_answers: boolean
  total_questions: number
  questions: QuizQuestionData[]
}

export interface QuizQuestionData {
  question_id?: number
  question_text: string
  question_type: string
  options?: any[] | null
  correct_answer?: string | null
  explanation?: string | null
  points: number
  order_index: number
}

export interface FlashcardDeckData {
  deck_id?: number
  title: string
  description?: string | null
  total_cards: number
  cards: FlashcardItemData[]
}

export interface FlashcardItemData {
  flashcard_id?: number
  front_content: string
  back_content: string
  front_image_url?: string | null
  back_image_url?: string | null
  order_index?: number | null
}

// ── Upload ──

export async function requestSignedUpload(
  filename: string,
  content_type: string,
  course_slug?: string,
): Promise<SignedUploadResponse> {
  return fetchApiWithAuth<SignedUploadResponse>('/admin/upload/signed', {
    method: 'POST',
    body: JSON.stringify({ filename, content_type, course_slug }),
  })
}

export async function uploadFileToGCS(
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl, true)
    xhr.setRequestHeader('Content-Type', contentType)

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)))
    xhr.onerror = () => reject(new Error('Upload network error'))
    xhr.send(file)
  })
}

// ── Course CRUD ──

export async function createCourse(data: Record<string, any>): Promise<{ course_id: number; slug: string }> {
  return fetchApiWithAuth('/admin/courses/builder', { method: 'POST', body: JSON.stringify(data) })
}

export async function getCourseForBuilder(courseId: number): Promise<CourseBuilderData> {
  return fetchApiWithAuth<CourseBuilderData>(`/admin/courses/builder/${courseId}`)
}

export async function updateCourse(courseId: number, data: Record<string, any>): Promise<void> {
  await fetchApiWithAuth(`/admin/courses/builder/${courseId}`, { method: 'PUT', body: JSON.stringify(data) })
}

// ── Module CRUD ──

export async function addModule(courseId: number, data: { title: string; description?: string; is_preview?: boolean }): Promise<{ module_id: number; order_index: number }> {
  return fetchApiWithAuth(`/admin/courses/builder/${courseId}/modules`, { method: 'POST', body: JSON.stringify(data) })
}

export async function updateModule(courseId: number, moduleId: number, data: Record<string, any>): Promise<void> {
  await fetchApiWithAuth(`/admin/courses/builder/${courseId}/modules/${moduleId}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteModule(courseId: number, moduleId: number): Promise<void> {
  await fetchApiWithAuth(`/admin/courses/builder/${courseId}/modules/${moduleId}`, { method: 'DELETE' })
}

export async function reorderModules(courseId: number, orderedIds: number[]): Promise<void> {
  await fetchApiWithAuth(`/admin/courses/builder/${courseId}/modules/reorder`, { method: 'PUT', body: JSON.stringify({ ordered_ids: orderedIds }) })
}

// ── Lesson CRUD ──

export async function addLesson(courseId: number, moduleId: number, data: Record<string, any>): Promise<{ lesson_id: number; order_index: number }> {
  return fetchApiWithAuth(`/admin/courses/builder/${courseId}/modules/${moduleId}/lessons`, { method: 'POST', body: JSON.stringify(data) })
}

export async function updateLesson(courseId: number, moduleId: number, lessonId: number, data: Record<string, any>): Promise<void> {
  await fetchApiWithAuth(`/admin/courses/builder/${courseId}/modules/${moduleId}/lessons/${lessonId}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteLesson(courseId: number, moduleId: number, lessonId: number): Promise<void> {
  await fetchApiWithAuth(`/admin/courses/builder/${courseId}/modules/${moduleId}/lessons/${lessonId}`, { method: 'DELETE' })
}

export async function reorderLessons(courseId: number, moduleId: number, orderedIds: number[]): Promise<void> {
  await fetchApiWithAuth(`/admin/courses/builder/${courseId}/modules/${moduleId}/lessons/reorder`, { method: 'PUT', body: JSON.stringify({ ordered_ids: orderedIds }) })
}

// ── Quiz ──

export async function getBuilderQuiz(lessonId: number): Promise<QuizBuilderData | null> {
  return fetchApiWithAuth(`/admin/courses/builder/lessons/${lessonId}/quiz`)
}

export async function saveQuiz(lessonId: number, data: Record<string, any>): Promise<{ quiz_id: number }> {
  return fetchApiWithAuth(`/admin/courses/builder/lessons/${lessonId}/quiz`, { method: 'POST', body: JSON.stringify(data) })
}

// ── Flashcards ──

export async function getFlashcards(lessonId: number): Promise<FlashcardDeckData | null> {
  return fetchApiWithAuth(`/admin/courses/builder/lessons/${lessonId}/flashcards`)
}

export async function saveFlashcards(lessonId: number, data: Record<string, any>): Promise<{ deck_id: number }> {
  return fetchApiWithAuth(`/admin/courses/builder/lessons/${lessonId}/flashcards`, { method: 'POST', body: JSON.stringify(data) })
}

// ── Publish ──

export async function publishCourse(courseId: number): Promise<{ success: boolean; errors: string[] }> {
  return fetchApiWithAuth(`/admin/courses/builder/${courseId}/publish`, { method: 'POST' })
}

// ── Categories ──

export async function getAdminCategories(): Promise<CategoryItem[]> {
  return fetchApiWithAuth('/admin/categories')
}

export async function createCategory(data: Record<string, any>): Promise<{ category_id: number }> {
  return fetchApiWithAuth('/admin/categories', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateCategory(id: number, data: Record<string, any>): Promise<void> {
  await fetchApiWithAuth(`/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteCategory(id: number): Promise<void> {
  await fetchApiWithAuth(`/admin/categories/${id}`, { method: 'DELETE' })
}

// ── Skills ──

export async function getSkills(search?: string): Promise<SkillItem[]> {
  const q = search ? `?search=${encodeURIComponent(search)}` : ''
  return fetchApiWithAuth(`/admin/skills${q}`)
}

export async function createSkill(data: Record<string, any>): Promise<{ skill_id: number }> {
  return fetchApiWithAuth('/admin/skills', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateSkill(id: number, data: Record<string, any>): Promise<void> {
  await fetchApiWithAuth(`/admin/skills/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteSkill(id: number): Promise<void> {
  await fetchApiWithAuth(`/admin/skills/${id}`, { method: 'DELETE' })
}

// ── Instructors ──

export async function getInstructors(): Promise<InstructorItem[]> {
  return fetchApiWithAuth('/admin/instructors')
}

export async function createInstructor(data: Record<string, any>): Promise<{ instructor_id: number }> {
  return fetchApiWithAuth('/admin/instructors', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateInstructor(id: number, data: Record<string, any>): Promise<void> {
  await fetchApiWithAuth(`/admin/instructors/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteInstructor(id: number): Promise<void> {
  await fetchApiWithAuth(`/admin/instructors/${id}`, { method: 'DELETE' })
}
