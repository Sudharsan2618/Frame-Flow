import { fetchApi, fetchApiWithAuth, API_BASE_URL } from './client';
import { CourseListItem, CourseListResponse, CourseDetail, EnrollmentOut, ProgressUpdate, LessonProgressOut, CourseReview, ReviewStats, MaterialOut, AdminCourse, QuizResultOut } from './types';
import * as T from './types';

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export async function getCourses(params?: {
  page?: number;
  page_size?: number;
  category?: string;
  difficulty?: string;
  pricing?: string;
  search?: string;
}): Promise<CourseListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.page_size) query.set("page_size", String(params.page_size));
  if (params?.category) query.set("category", params.category);
  if (params?.difficulty) query.set("difficulty", params.difficulty);
  if (params?.pricing) query.set("pricing", params.pricing);
  if (params?.search) query.set("search", params.search);

  const qs = query.toString();
  return fetchApi<CourseListResponse>(`/courses${qs ? `?${qs}` : ""}`);
}

export async function getCategories(): Promise<T.Category[]> {
  return fetchApi<T.Category[]>("/courses/categories");
}

export async function getCourseDetail(slug: string): Promise<CourseDetail> {
  return fetchApi<CourseDetail>(`/courses/${slug}`);
}

export async function getLesson(lessonId: number): Promise<T.LessonFull> {
  return fetchApi<T.LessonFull>(`/courses/lessons/${lessonId}`);
}

export async function getQuiz(quizId: number): Promise<T.QuizOut> {
  return fetchApi<T.QuizOut>(`/courses/quizzes/${quizId}`);
}

export async function getCourseMaterials(courseId: number): Promise<MaterialOut[]> {
  return fetchApi<MaterialOut[]>(`/courses/${courseId}/materials`);
}

export async function getAllMaterials(): Promise<(MaterialOut & { courseName: string })[]> {
  return fetchApiWithAuth<(MaterialOut & { courseName: string })[]>("/students/materials/all");
}

export async function getFlashcardDeck(deckId: number): Promise<T.FlashcardDeckOut> {
  return fetchApi<T.FlashcardDeckOut>(`/courses/flashcards/${deckId}`);
}

export async function getEnrollments(studentId: number): Promise<EnrollmentOut[]> {
  return fetchApi<EnrollmentOut[]>(`/students/enrollments?student_id=${studentId}`);
}

export async function enrollInCourse(
  courseId: number,
  studentId: number
): Promise<EnrollmentOut> {
  return fetchApiWithAuth<EnrollmentOut>(`/students/enroll/${courseId}`, {
    method: "POST",
    body: JSON.stringify({ student_id: studentId }),
  });
}

export async function getCourseProgress(studentId: number, courseId: number): Promise<LessonProgressOut[]> {
  return fetchApiWithAuth<LessonProgressOut[]>(`/students/enrollments/${courseId}/progress?student_id=${studentId}`);
}

export async function updateLessonProgress(
  studentId: number, 
  courseId: number, 
  progress: ProgressUpdate
): Promise<LessonProgressOut> {
  return fetchApiWithAuth<LessonProgressOut>(`/students/enrollments/${courseId}/progress?student_id=${studentId}`, {
    method: "POST",
    body: JSON.stringify(progress),
  });
}

export async function submitQuiz(
  quizId: number,
  enrollmentId: number,
  answers: Record<string, number | string>
): Promise<QuizResultOut> {
  return fetchApiWithAuth<QuizResultOut>(
    `/courses/quizzes/${quizId}/submit?enrollment_id=${enrollmentId}`,
    {
      method: "POST",
      body: JSON.stringify({ answers }),
    }
  );
}

export function mapCourseToUI(course: CourseListItem) {
  const price = parseFloat(course.price);
  const isFree = course.pricing_model === "free" || price === 0;
  const instructorName = course.instructor
    ? `${course.instructor.first_name} ${course.instructor.last_name}`
    : "Unknown";

  return {
    id: course.course_id,
    title: course.title,
    slug: course.slug,
    category: course.category?.name || "General",
    level: capitalize(course.difficulty_level),
    price: isFree ? 0 : price,
    rating: parseFloat(course.average_rating) || 0,
    students: course.total_enrollments,
    instructor: instructorName,
    image: course.thumbnail_url || "",
    duration: course.duration_hours ? `${course.duration_hours} hours` : "Self-paced",
    modules: course.total_modules,
    progress: 0, // Would come from enrollment/progress API
    isFree,
    skills: course.skills,
    shortDescription: course.short_description,
  };
}

export function mapMaterialToUI(material: MaterialOut & { courseName: string }) {
  const sizeKB = material.file_size_bytes
    ? material.file_size_bytes > 1024 * 1024
      ? `${(material.file_size_bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${(material.file_size_bytes / 1024).toFixed(0)} KB`
    : "—";

  return {
    id: material.material_id,
    title: material.title,
    type: material.file_type,
    course: material.courseName,
    size: sizeKB,
    downloads: material.download_count,
    fileUrl: material.file_url,
    description: material.description,
  };
}

export async function getAdminCourses(params: {
  search?: string;
  status?: string;
  sort_by?: string;
  sort_order?: string;
  limit?: number;
  offset?: number;
}): Promise<{ courses: AdminCourse[]; total: number; summary: { published_count: number; draft_count: number; total_enrollments: number } }> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  if (params.sort_by) query.set("sort_by", params.sort_by);
  if (params.sort_order) query.set("sort_order", params.sort_order);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));
  return fetchApiWithAuth(`/admin/courses?${query.toString()}`);
}

export async function toggleCoursePublish(courseId: number, publish: boolean): Promise<{ success: boolean }> {
  return fetchApiWithAuth(`/admin/courses/${courseId}/publish?publish=${publish}`, { method: "PUT" });
}

export async function deleteAdminCourse(courseId: number): Promise<{ success: boolean }> {
  return fetchApiWithAuth(`/admin/courses/${courseId}`, { method: "DELETE" });
}

export async function getCourseReviews(courseId: number, params?: {
  sort_by?: string;
  limit?: number;
  offset?: number;
}): Promise<{ reviews: CourseReview[]; stats: ReviewStats }> {
  const query = new URLSearchParams();
  if (params?.sort_by) query.set("sort_by", params.sort_by);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));
  const res = await fetch(`${API_BASE_URL}/courses/${courseId}/reviews?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch reviews");
  return res.json();
}

export async function getMyReview(courseId: number): Promise<{ review: { review_id: number; rating: number; review_text: string; created_at: string } | null }> {
  return fetchApiWithAuth(`/courses/${courseId}/reviews/me`);
}

export async function submitReview(courseId: number, rating: number, reviewText: string): Promise<{ success: boolean; review_id: number }> {
  const query = new URLSearchParams({ rating: String(rating), review_text: reviewText });
  return fetchApiWithAuth(`/courses/${courseId}/reviews?${query.toString()}`, { method: "POST" });
}

export async function updateReview(courseId: number, rating: number, reviewText: string): Promise<{ success: boolean }> {
  const query = new URLSearchParams({ rating: String(rating), review_text: reviewText });
  return fetchApiWithAuth(`/courses/${courseId}/reviews?${query.toString()}`, { method: "PUT" });
}

export async function deleteReview(courseId: number): Promise<{ success: boolean }> {
  return fetchApiWithAuth(`/courses/${courseId}/reviews`, { method: "DELETE" });
}

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
