/**
 * API Client — connects the frontend to the FastAPI backend.
 * Replaces mock-data imports for all course-related pages.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// ── Types matching the backend schemas ──

export interface Category {
  category_id: number;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
}

export interface InstructorBrief {
  instructor_id: number;
  first_name: string;
  last_name: string;
  headline: string | null;
  profile_picture_url: string | null;
}

export interface CourseListItem {
  course_id: number;
  title: string;
  slug: string;
  short_description: string | null;
  difficulty_level: string;
  pricing_model: string;
  price: string; // Decimal comes as string from API
  currency: string;
  discount_price: string | null;
  duration_hours: string | null;
  total_modules: number;
  total_lessons: number;
  thumbnail_url: string | null;
  is_published: boolean;
  total_enrollments: number;
  average_rating: string;
  total_reviews: number;
  created_at: string;
  category: Category | null;
  instructor: InstructorBrief | null;
  skills: string[];
}

export interface CourseListResponse {
  courses: CourseListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface LessonBrief {
  lesson_id: number;
  title: string;
  content_type: string;
  order_index: number;
  duration_minutes: number | null;
  is_preview: boolean;
  is_mandatory: boolean;
}

export interface LessonFull {
  lesson_id: number;
  title: string;
  description: string | null;
  content_type: string;
  order_index: number;
  duration_minutes: number | null;
  is_preview: boolean;
  is_mandatory: boolean;
  content_url: string | null;
  video_external_id: string | null;
  video_external_platform: string | null;
  text_content: string | null;
  quiz_id: number | null;
}

export interface ModuleOut {
  module_id: number;
  title: string;
  description: string | null;
  order_index: number;
  duration_minutes: number | null;
  is_preview: boolean;
  lessons: LessonBrief[];
}

export interface CourseDetail {
  course_id: number;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  difficulty_level: string;
  pricing_model: string;
  price: string;
  currency: string;
  discount_price: string | null;
  duration_hours: string | null;
  total_modules: number;
  total_lessons: number;
  thumbnail_url: string | null;
  preview_video_url: string | null;
  is_published: boolean;
  total_enrollments: number;
  average_rating: string;
  total_reviews: number;
  created_at: string;
  category: Category | null;
  instructor: InstructorBrief | null;
  skills: string[];
  modules: ModuleOut[];
}

export interface MaterialOut {
  material_id: number;
  title: string;
  description: string | null;
  file_type: string;
  file_url: string;
  file_size_bytes: number | null;
  pricing_model: string;
  price: string;
  currency: string;
  download_count: number;
  course_id: number | null;
}

export interface QuizQuestionOut {
  question_id: number;
  question_text: string;
  question_type: string;
  options: { text: string }[] | null;
  points: number;
  order_index: number;
}

export interface QuizOut {
  quiz_id: number;
  title: string;
  description: string | null;
  instructions: string | null;
  pass_percentage: string;
  time_limit_minutes: number | null;
  max_attempts: number | null;
  total_questions: number;
  questions: QuizQuestionOut[];
}

export interface FlashcardOut {
  flashcard_id: number;
  front_content: string;
  back_content: string;
  order_index: number | null;
}

export interface FlashcardDeckOut {
  deck_id: number;
  title: string;
  description: string | null;
  total_cards: number;
  flashcards: FlashcardOut[];
}

// ── Tracking & Analytics Types ──

export interface DeviceInfo {
  device_type?: "desktop" | "mobile" | "tablet";
  browser?: string;
  os?: string;
  screen_resolution?: string;
}

export interface VideoProgress {
  current_time_seconds: number;
  total_duration_seconds: number;
  percentage_watched: number;
  playback_rate?: number;
  is_completed?: boolean;
}

export interface QuizResult {
  quiz_id: number;
  attempt_id?: number;
  score: number;
  percentage: number;
  passed: boolean;
  time_taken_seconds: number;
  answers?: any[];
}

export interface FlashcardSession {
  deck_id: number;
  card_id?: number;
  mastery_level: number;
  is_correct?: boolean;
  response_time_ms?: number;
}

export interface ActivityDetails {
  video_progress?: VideoProgress;
  quiz_result?: QuizResult;
  flashcard_session?: FlashcardSession;
  time_spent_seconds?: number;
  scroll_depth_percentage?: number;
  note?: { content_length: number };
  document?: { url: string; type: string };
}

export type ActivityType =
  | "lesson_started"
  | "lesson_completed"
  | "video_watched"
  | "video_paused"
  | "video_seeked"
  | "document_viewed"
  | "audio_played"
  | "quiz_started"
  | "quiz_submitted"
  | "flashcard_interaction"
  | "note_taken"
  | "resource_downloaded"
  | "page_viewed"
  | "course_enrolled"
  | "course_completed";

export interface TrackActivityRequest {
  student_id: number;
  course_id: number;
  module_id?: number;
  lesson_id?: number;
  activity_type: ActivityType;
  session_id?: string;
  details?: ActivityDetails;
  device_info?: DeviceInfo;
}

export interface StartSessionRequest {
  user_id: number;
  device_info?: DeviceInfo;
}

export interface SessionResponse {
  session_id: string;
  started_at: string;
  message: string;
}

export interface HeartbeatRequest {
  session_id: string;
  current_page?: string;
}

export interface StudentActivitySummary {
  student_id: number;
  course_id: number;
  total_time_spent_seconds: number;
  lessons_started: number;
  lessons_completed: number;
  videos_watched: number;
  quizzes_taken: number;
  flashcards_reviewed: number;
  resources_downloaded: number;
  last_activity_at: string | null;
}

export interface CourseEngagementSummary {
  course_id: number;
  active_students: number;
  total_activities: number;
  avg_time_spent_minutes: number;
  completion_rate: number;
  activity_breakdown: Record<string, number>;
}

// ── API Functions ──

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

async function fetchApiWithAuth<T>(
  path: string,
  options?: { method?: string; body?: unknown; token?: string }
): Promise<T> {
  const token = options?.token || (typeof window !== "undefined" ? localStorage.getItem("auth_token") : null);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: options?.method || "GET",
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json();
}

/** List courses with optional filters */
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

/** Get active categories */
export async function getCategories(): Promise<Category[]> {
  return fetchApi<Category[]>("/courses/categories");
}

/** Get full course detail by slug */
export async function getCourseDetail(slug: string): Promise<CourseDetail> {
  return fetchApi<CourseDetail>(`/courses/${slug}`);
}

/** Get a specific lesson's full content */
export async function getLesson(lessonId: number): Promise<LessonFull> {
  return fetchApi<LessonFull>(`/courses/lessons/${lessonId}`);
}

/** Get a quiz with questions */
export async function getQuiz(quizId: number): Promise<QuizOut> {
  return fetchApi<QuizOut>(`/courses/quizzes/${quizId}`);
}

/** Get materials for a course */
export async function getCourseMaterials(courseId: number): Promise<MaterialOut[]> {
  return fetchApi<MaterialOut[]>(`/courses/${courseId}/materials`);
}

/** Get all materials (iterates over all course IDs) */
export async function getAllMaterials(): Promise<(MaterialOut & { courseName: string })[]> {
  return fetchApiWithAuth<(MaterialOut & { courseName: string })[]>("/students/materials/all");
}

/** Get a flashcard deck */
export async function getFlashcardDeck(deckId: number): Promise<FlashcardDeckOut> {
  return fetchApi<FlashcardDeckOut>(`/courses/flashcards/${deckId}`);
}

// ── Tracking & Analytics Functions ──

/** Start a tracking session */
export async function startTrackingSession(req: StartSessionRequest): Promise<SessionResponse> {
  return fetchApiWithAuth<SessionResponse>("/tracking/sessions/start", {
    method: "POST",
    body: req,
  });
}

/** Send heartbeat */
export async function sendHeartbeat(req: HeartbeatRequest): Promise<{ success: boolean }> {
  return fetchApiWithAuth<{ success: boolean }>("/tracking/sessions/heartbeat", {
    method: "POST",
    body: req,
  });
}

/** End session */
export async function endTrackingSession(sessionId: string): Promise<SessionResponse> {
  return fetchApiWithAuth<SessionResponse>("/tracking/sessions/end", {
    method: "POST",
    body: { session_id: sessionId, logout_type: "manual" },
  });
}

/** Track a learning activity */
export async function trackActivity(req: TrackActivityRequest): Promise<{ success: boolean }> {
  return fetchApiWithAuth<{ success: boolean }>("/tracking/activities", {
    method: "POST",
    body: req,
  });
}

/** Get student analytics for a course */
export async function getStudentAnalytics(studentId: number, courseId: number): Promise<StudentActivitySummary> {
  return fetchApiWithAuth<StudentActivitySummary>(`/tracking/analytics/student/${studentId}/course/${courseId}`);
}

/** Get course engagement (Admin/Instructor) */
export async function getCourseAnalytics(courseId: number, periodDays = 30): Promise<CourseEngagementSummary> {
  return fetchApiWithAuth<CourseEngagementSummary>(`/tracking/analytics/course/${courseId}/engagement?period_days=${periodDays}`);
}

// ── Enrollment Types & Functions ──

export interface EnrollmentOut {
  enrollment_id: number;
  student_id: number;
  course_id: number;
  status: string;
  progress_percentage: string;
  enrolled_at: string;
  started_at: string | null;
  completed_at: string | null;
  certificate_issued: boolean;
  certificate_url: string | null;
  certificate_issued_at: string | null;
  course: CourseListItem | null;
}

/** Get all enrollments for a student */
export async function getEnrollments(studentId: number): Promise<EnrollmentOut[]> {
  return fetchApi<EnrollmentOut[]>(`/students/enrollments?student_id=${studentId}`);
}

/** Enroll a student in a course */
export async function enrollInCourse(
  courseId: number,
  studentId: number
): Promise<EnrollmentOut> {
  return fetchApiWithAuth<EnrollmentOut>(`/students/enroll/${courseId}`, {
    method: "POST",
    body: { student_id: studentId },
  });
}

// ── Lesson Progress Functions ──

export interface ProgressUpdate {
  lesson_id: number;
  progress_percentage?: number;
  time_spent_seconds?: number;
  video_position_seconds?: number;
  is_completed?: boolean;
}

export interface LessonProgressOut {
  progress_id: number;
  lesson_id: number;
  is_completed: boolean;
  progress_percentage: string;
  time_spent_seconds: number;
  video_position_seconds: number;
  last_accessed_at: string;
}

/** Get all lesson progress for a student in a course */
export async function getCourseProgress(studentId: number, courseId: number): Promise<LessonProgressOut[]> {
  return fetchApiWithAuth<LessonProgressOut[]>(`/students/enrollments/${courseId}/progress?student_id=${studentId}`);
}

/** Update lesson progress */
export async function updateLessonProgress(
  studentId: number, 
  courseId: number, 
  progress: ProgressUpdate
): Promise<LessonProgressOut> {
  return fetchApiWithAuth<LessonProgressOut>(`/students/enrollments/${courseId}/progress?student_id=${studentId}`, {
    method: "POST",
    body: progress,
  });
}

// ── Helper functions to map API data to UI shapes ──

/** Convert API course to the shape the UI expects for the course catalog */
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

/** Convert API material to UI shape */
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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}


// ── Search Logging ──

export async function logSearch(studentId: number, query: string, searchType: string = "course", resultsCount: number = 0) {
  const res = await fetch(`${API_BASE}/tracking/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      student_id: studentId,
      query,
      search_type: searchType,
      results_count: resultsCount,
    }),
  });
  if (!res.ok) throw new Error("Search log failed");
  return res.json();
}


// ── Resume Analysis ──

export interface ResumeAnalysis {
  student_id: number;
  file_url: string;
  analyzed_at: string;
  extracted_data: {
    skills: string[];
    experience_years: number;
    education: string[];
    certifications: string[];
    job_titles: string[];
    summary: string;
    languages: string[];
  };
  match_score_ready: boolean;
}

export async function uploadResume(studentId: number, file: File): Promise<{ success: boolean; analysis: ResumeAnalysis }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/tracking/resume/upload?student_id=${studentId}`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function getResumeAnalysis(studentId: number): Promise<ResumeAnalysis | null> {
  const res = await fetch(`${API_BASE}/tracking/resume/${studentId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch resume analysis");
  return res.json();
}


// ── Student Profile ──

export interface StudentProfile {
  user_id: number;
  email: string;
  phone: string | null;
  student_id: number;
  first_name: string;
  last_name: string;
  bio: string | null;
  headline: string | null;
  location: string | null;
  education: string | null;
  experience_years: number;
  profile_picture_url: string | null;
  resume_url: string | null;
  cover_letter_url: string | null;
  availability_status: boolean;
  preferred_job_types: string[];
  preferred_locations: string[];
  preferred_remote_types: string[];
  salary_expectation_min: number | null;
  salary_expectation_max: number | null;
  salary_currency: string;
  notice_period_days: number | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  personal_website: string | null;
  total_courses_enrolled: number;
  total_courses_completed: number;
  total_learning_hours: number;
  average_quiz_score: number;
  streak_days: number;
}

/** Get full student profile (requires auth) */
export async function getStudentProfile(): Promise<StudentProfile> {
  return fetchApiWithAuth<StudentProfile>("/auth/profile/student");
}

/** Update student profile (requires auth) */
export async function updateStudentProfile(data: Partial<StudentProfile>): Promise<StudentProfile> {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const res = await fetch(`${API_BASE}/auth/profile/student`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to update profile" }));
    throw new Error(err.detail || "Failed to update profile");
  }
  return res.json();
}


// ── Company Profile ──

export interface CompanyProfile {
  user_id: number;
  email: string;
  phone: string | null;
  company_id: number;
  company_name: string;
  description: string | null;
  industry: string | null;
  company_size: string | null;
  founded_year: number | null;
  headquarters_location: string | null;
  logo_url: string | null;
  banner_url: string | null;
  website_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  is_verified: boolean;
  billing_email: string | null;
  gst_number: string | null;
  billing_address: string | null;
  total_jobs_posted: number;
  total_hires: number;
}

/** Get full company profile (requires auth) */
export async function getCompanyProfile(): Promise<CompanyProfile> {
  return fetchApiWithAuth<CompanyProfile>("/auth/profile/company");
}

/** Update company profile (requires auth) */
export async function updateCompanyProfile(data: Partial<CompanyProfile>): Promise<CompanyProfile> {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const res = await fetch(`${API_BASE}/auth/profile/company`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to update profile" }));
    throw new Error(err.detail || "Failed to update profile");
  }
  return res.json();
}


// ── Company Jobs ──

export interface JobSkillInput {
  name: string;
  is_mandatory: boolean;
  min_experience_years?: number | null;
}

export interface JobCreatePayload {
  title: string;
  description: string;
  responsibilities?: string;
  requirements?: string;
  nice_to_have?: string;
  department?: string;
  employment_type: string;
  remote_type: string;
  location?: string;
  experience_min_years: number;
  experience_max_years?: number | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency: string;
  salary_is_visible: boolean;
  benefits: string[];
  skills: JobSkillInput[];
  status: string;
  deadline?: string | null;
}

export interface JobSkillOut {
  skill_id: number;
  name: string;
  is_mandatory: boolean;
  min_experience_years?: number | null;
}

export interface JobOut {
  job_id: number;
  company_id: number;
  title: string;
  slug: string;
  description: string;
  responsibilities?: string | null;
  requirements?: string | null;
  nice_to_have?: string | null;
  department?: string | null;
  employment_type: string;
  remote_type: string;
  location?: string | null;
  experience_min_years: number;
  experience_max_years?: number | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency: string;
  salary_is_visible: boolean;
  benefits: string[];
  status: string;
  posted_at?: string | null;
  deadline?: string | null;
  views_count: number;
  applications_count: number;
  skills: JobSkillOut[];
  embedding_status?: string | null;
  created_at?: string | null;
}

/** Create a new job posting (company, requires auth) */
export async function createCompanyJob(data: JobCreatePayload): Promise<JobOut> {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const res = await fetch(`${API_BASE}/jobs/company`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to create job" }));
    throw new Error(err.detail || "Failed to create job");
  }
  return res.json();
}

/** List all jobs for the authenticated company */
export async function getCompanyJobs(): Promise<JobOut[]> {
  return fetchApiWithAuth<JobOut[]>("/jobs/company");
}


// ── Student Jobs ──

export interface SkillBrief {
  skill_id: number;
  name: string;
  is_mandatory: boolean;
  min_experience_years: number | null;
}

export interface MatchBreakdown {
  composite_score: number;
  vector_score: number;
  skill_score: number | null;
  experience_score: number;
  preference_score: number;
}

export interface MatchedSkill {
  skill_name: string;
  is_mandatory: boolean;
  proficiency_level: number;
  years_of_experience: number;
}

export interface MissingSkill {
  skill_name: string;
  is_mandatory: boolean;
}

export interface SkillSummary {
  total: number;
  mandatory_matched: number;
  mandatory_total: number;
  optional_matched: number;
  optional_total: number;
}

export interface GapCourse {
  course_id: number;
  title: string;
  slug: string;
  price: number;
  currency: string;
  thumbnail_url: string | null;
  teaches_skills: string[];
}

export interface CompanyBrief {
  company_id: number;
  company_name: string;
  logo_url: string | null;
  industry: string | null;
  company_location: string | null;
}

export interface JobListItem {
  job_id: number;
  title: string;
  slug: string;
  description: string;
  employment_type: string;
  remote_type: string;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  salary_is_visible: boolean;
  experience_min_years: number;
  experience_max_years: number | null;
  benefits: string[] | null;
  posted_at: string | null;
  deadline: string | null;
  department: string | null;
  applications_count: number;
  match_score: number | null;
  match_breakdown: MatchBreakdown | null;
  matched_skills: MatchedSkill[];
  missing_skills: MissingSkill[];
  skills: SkillBrief[];
  company: CompanyBrief;
}

export interface CompanyDetail extends CompanyBrief {
  company_website: string | null;
  company_size: string | null;
  company_description: string | null;
}

export interface JobDetailFull {
  job_id: number;
  title: string;
  slug: string;
  description: string;
  responsibilities: string | null;
  requirements: string | null;
  nice_to_have: string | null;
  employment_type: string;
  remote_type: string;
  location: string | null;
  department: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  salary_is_visible: boolean;
  experience_min_years: number;
  experience_max_years: number | null;
  benefits: string[] | null;
  posted_at: string | null;
  deadline: string | null;
  applications_count: number;
  match_score: number | null;
  match_breakdown: MatchBreakdown | null;
  matched_skills: MatchedSkill[];
  missing_skills: MissingSkill[];
  skill_summary: SkillSummary | null;
  gap_courses: GapCourse[];
  has_applied: boolean;
  skills: SkillBrief[];
  company: CompanyDetail;
}

export interface ApplicationOut {
  application_id: number;
  job_id: number;
  status: string;
  cover_letter: string | null;
  expected_salary: number | null;
  notice_period_days: number | null;
  applied_at: string | null;
  updated_at: string | null;
  job_title: string | null;
  company_name: string | null;
  company_logo: string | null;
  match_score: number | null;
}

export interface ApplyPayload {
  cover_letter?: string;
  expected_salary?: number;
  notice_period_days?: number;
}

/** Get AI-recommended jobs for authenticated student (hybrid matching, all >= 65% composite) */
export async function getRecommendedJobs(limit = 50): Promise<{ jobs: JobListItem[]; threshold: number; total: number }> {
  return fetchApiWithAuth(`/student-jobs/recommended?limit=${limit}`);
}

/** Get all active jobs with optional filters */
export async function getStudentJobs(params: {
  search?: string;
  employment_type?: string;
  remote_type?: string;
  location?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ jobs: JobListItem[]; total: number }> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.employment_type) query.set("employment_type", params.employment_type);
  if (params.remote_type) query.set("remote_type", params.remote_type);
  if (params.location) query.set("location", params.location);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));
  return fetchApiWithAuth(`/student-jobs?${query.toString()}`);
}

/** Get full job detail with match breakdown, skill gaps, and course recommendations */
export async function getJobDetail(jobId: number): Promise<JobDetailFull> {
  return fetchApiWithAuth(`/student-jobs/${jobId}`);
}

/** Apply to a job */
export async function applyToJob(jobId: number, data: ApplyPayload): Promise<ApplicationOut> {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const res = await fetch(`${API_BASE}/student-jobs/${jobId}/apply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to apply" }));
    throw new Error(err.detail || "Failed to apply");
  }
  return res.json();
}

/** Get student's applications */
export async function getMyApplications(): Promise<{ applications: ApplicationOut[]; total: number }> {
  return fetchApiWithAuth("/student-jobs/applications/me");
}


// ── Student Dashboard ──

export interface DashboardStats {
  enrolled_courses: number;
  completed_courses: number;
  total_learning_hours: number;
  average_quiz_score: number;
  streak_days: number;
}

export interface EnrolledCourseSummary {
  course_id: number;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  progress_percentage: number;
  total_lessons: number;
  completed_lessons: number;
  last_accessed_at: string | null;
}

export interface RecentActivityItem {
  activity_type: string;
  description: string;
  course_name: string | null;
  timestamp: string;
}

export interface StudentDashboardData {
  first_name: string;
  last_name: string;
  stats: DashboardStats;
  enrolled_courses: EnrolledCourseSummary[];
  recent_activity: RecentActivityItem[];
  learning_hours_by_month: { month: string; hours: number }[];
}

/** Get student dashboard data (requires auth) */
export async function getStudentDashboard(): Promise<StudentDashboardData> {
  return fetchApiWithAuth<StudentDashboardData>("/auth/dashboard/student");
}


// ══════════════════════════════════════════════════════════════════════════
// ADMIN PORTAL API
// ══════════════════════════════════════════════════════════════════════════

// ── Admin Dashboard ──

export interface AdminDashboardData {
  total_students: number;
  total_companies: number;
  active_courses: number;
  active_jobs: number;
  total_applications: number;
  pending_review: number;
  forwarded: number;
  hired: number;
  total_enrollments: number;
  new_users_30d: number;
}

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  return fetchApiWithAuth<AdminDashboardData>("/admin/dashboard");
}

export interface DashboardChartData {
  user_growth: { month: string; students: number; companies: number; total: number }[];
  application_trend: { month: string; applications: number; forwarded: number; hired: number }[];
  status_distribution: { status: string; count: number }[];
  top_jobs: { title: string; company_name: string; count: number; pending: number; forwarded: number }[];
  jobs_trend: { month: string; jobs_posted: number }[];
  enrollment_trend: { month: string; enrollments: number }[];
}

export async function getAdminDashboardCharts(): Promise<DashboardChartData> {
  return fetchApiWithAuth<DashboardChartData>("/admin/dashboard/charts");
}

// ── Admin User Management ──

export interface AdminUser {
  user_id: number;
  email: string;
  user_type: string;
  status: string;
  created_at: string;
  last_login_at: string | null;
  onboarding_completed: boolean;
  name: string;
  student_id: number | null;
  first_name: string | null;
  last_name: string | null;
  headline: string | null;
  profile_picture_url: string | null;
  company_id: number | null;
  company_name: string | null;
  logo_url: string | null;
  industry: string | null;
  enrollments_count: number;
  applications_count: number;
}

export async function getAdminUsers(params: {
  search?: string;
  role?: string;
  status?: string;
  sort_by?: string;
  sort_order?: string;
  limit?: number;
  offset?: number;
}): Promise<{ users: AdminUser[]; total: number; summary: { student_count: number; company_count: number; active_count: number } }> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.role) query.set("role", params.role);
  if (params.status) query.set("status", params.status);
  if (params.sort_by) query.set("sort_by", params.sort_by);
  if (params.sort_order) query.set("sort_order", params.sort_order);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));
  return fetchApiWithAuth(`/admin/users?${query.toString()}`);
}

export async function updateUserStatus(userId: number, newStatus: string): Promise<{ success: boolean }> {
  return fetchApiWithAuth(`/admin/users/${userId}/status?new_status=${newStatus}`, { method: "PUT" });
}

export async function deleteUser(userId: number): Promise<{ success: boolean }> {
  return fetchApiWithAuth(`/admin/users/${userId}`, { method: "DELETE" });
}

// ── Admin Course Management ──

export interface AdminCourse {
  course_id: number;
  title: string;
  slug: string;
  short_description: string | null;
  difficulty_level: string;
  pricing_model: string;
  price: number;
  currency: string;
  is_published: boolean;
  created_at: string;
  updated_at: string | null;
  duration_hours: string | null;
  thumbnail_url: string | null;
  category_name: string | null;
  instructor_name: string | null;
  enrollment_count: number;
  module_count: number;
  lesson_count: number;
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

// ── Admin Job Matching Hub ──

export interface AdminJob {
  job_id: number;
  title: string;
  slug: string;
  employment_type: string;
  remote_type: string;
  location: string | null;
  job_status: string;
  posted_at: string | null;
  deadline: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  department: string | null;
  experience_min_years: number;
  company_id: number;
  company_name: string;
  logo_url: string | null;
  industry: string | null;
  applications_count: number;
  pending_count: number;
  forwarded_count: number;
  hired_count: number;
}

export interface JobApplicant {
  application_id: number;
  student_id: number;
  application_status: string;
  cover_letter: string | null;
  resume_url: string | null;
  expected_salary: number | null;
  notice_period_days: number | null;
  applied_at: string;
  admin_notes: string | null;
  admin_match_score: number | null;
  first_name: string | null;
  last_name: string | null;
  name: string;
  headline: string | null;
  profile_picture_url: string | null;
  current_location: string | null;
  total_experience_months: number | null;
  student_resume_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  email: string;
  user_id: number;
  match_score: number;
  match_breakdown: MatchBreakdown | null;
  matched_skills: MatchedSkill[];
  missing_skills: MissingSkill[];
  skills: string[];
}

export async function getAdminJobs(params: {
  search?: string;
  status?: string;
  sort_by?: string;
  sort_order?: string;
  limit?: number;
  offset?: number;
}): Promise<{ jobs: AdminJob[]; total: number; summary: { total_jobs: number; total_pending: number; total_forwarded: number; total_applications: number } }> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  if (params.sort_by) query.set("sort_by", params.sort_by);
  if (params.sort_order) query.set("sort_order", params.sort_order);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));
  return fetchApiWithAuth(`/admin/jobs?${query.toString()}`);
}

export async function getJobApplicants(jobId: number, params: {
  search?: string;
  status?: string;
  min_match?: number;
  sort_by?: string;
  sort_order?: string;
  limit?: number;
  offset?: number;
}): Promise<{ applicants: JobApplicant[]; total: number; job: { job_id: number; title: string } }> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  if (params.min_match) query.set("min_match", String(params.min_match));
  if (params.sort_by) query.set("sort_by", params.sort_by);
  if (params.sort_order) query.set("sort_order", params.sort_order);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));
  return fetchApiWithAuth(`/admin/jobs/${jobId}/applicants?${query.toString()}`);
}

export async function bulkApproveApplications(applicationIds: number[]): Promise<{ success: boolean; updated: number }> {
  const ids = applicationIds.map((id) => `application_ids=${id}`).join("&");
  return fetchApiWithAuth(`/admin/applications/bulk-approve?${ids}`, { method: "POST" });
}

export async function updateApplicationStatus(
  applicationId: number,
  newStatus: string,
  notes?: string,
): Promise<{ success: boolean }> {
  const query = new URLSearchParams({ new_status: newStatus });
  if (notes) query.set("notes", notes);
  return fetchApiWithAuth(`/admin/applications/${applicationId}/status?${query.toString()}`, { method: "PUT" });
}


// ══════════════════════════════════════════════════════════════════════════
// COMPANY CANDIDATES API
// ══════════════════════════════════════════════════════════════════════════

export interface CompanyCandidate {
  application_id: number;
  student_id: number;
  job_id: number;
  application_status: string;
  company_stage: string | null;
  cover_letter: string | null;
  resume_url: string | null;
  expected_salary: number | null;
  notice_period_days: number | null;
  applied_at: string;
  forwarded_at: string | null;
  admin_match_score: number | null;
  first_name: string | null;
  last_name: string | null;
  name: string;
  headline: string | null;
  profile_picture_url: string | null;
  current_location: string | null;
  total_experience_months: number | null;
  student_resume_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  email: string;
  job_title: string;
  department: string | null;
  match_score: number;
  skills: string[];
  courses_count: number;
}

export async function getCompanyCandidates(params: {
  stage?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ candidates: CompanyCandidate[]; total: number }> {
  const query = new URLSearchParams();
  if (params.stage) query.set("stage", params.stage);
  if (params.search) query.set("search", params.search);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));
  return fetchApiWithAuth(`/jobs/company/candidates?${query.toString()}`);
}

export async function updateCandidateStage(
  applicationId: number,
  newStage: string,
): Promise<{ success: boolean }> {
  return fetchApiWithAuth(`/jobs/company/candidates/${applicationId}/stage?new_stage=${newStage}`, { method: "PUT" });
}

// ── Notifications ──

export interface Notification {
  notification_id: number;
  type: string;
  title: string;
  message: string;
  action_url: string | null;
  action_text: string | null;
  reference_type: string | null;
  reference_id: number | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export async function getNotifications(params: {
  limit?: number;
  offset?: number;
  unread_only?: boolean;
}): Promise<{ notifications: Notification[]; total: number }> {
  const query = new URLSearchParams();
  if (params.limit) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));
  if (params.unread_only) query.set("unread_only", "true");
  return fetchApiWithAuth(`/notifications?${query.toString()}`);
}

export async function getUnreadCount(): Promise<{ unread_count: number }> {
  return fetchApiWithAuth("/notifications/unread-count");
}

export async function markNotificationRead(notificationId: number): Promise<{ success: boolean }> {
  return fetchApiWithAuth(`/notifications/${notificationId}/read`, { method: "PUT" });
}

export async function markAllNotificationsRead(): Promise<{ success: boolean; updated: number }> {
  return fetchApiWithAuth("/notifications/read-all", { method: "PUT" });
}

export async function deleteNotification(notificationId: number): Promise<{ success: boolean }> {
  return fetchApiWithAuth(`/notifications/${notificationId}`, { method: "DELETE" });
}

// ── Course Reviews ──

export interface CourseReview {
  review_id: number;
  rating: number;
  review_text: string | null;
  helpful_count: number;
  is_featured: boolean;
  created_at: string;
  student_name: string;
  student_picture: string | null;
  student_headline: string | null;
}

export interface ReviewStats {
  total_reviews: number;
  average_rating: number;
  five_star: number;
  four_star: number;
  three_star: number;
  two_star: number;
  one_star: number;
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
  const res = await fetch(`${API_BASE}/courses/${courseId}/reviews?${query.toString()}`);
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

// ── Certificates ──

export interface Certificate {
  enrollment_id: number;
  course_title: string;
  course_slug: string;
  difficulty_level: string;
  duration_hours: number;
  certificate_url: string;
  issued_at: string | null;
  completed_at: string | null;
}

export async function issueCertificate(enrollmentId: number): Promise<{
  success: boolean;
  already_issued: boolean;
  certificate_url: string;
  issued_at?: string;
}> {
  return fetchApiWithAuth(`/certificates/issue/${enrollmentId}`, { method: "POST" });
}

export async function getMyCertificates(): Promise<{ certificates: Certificate[]; total: number }> {
  return fetchApiWithAuth("/certificates/my");
}

export function getCertificateViewUrl(enrollmentId: number): string {
  return `${API_BASE}/certificates/view/${enrollmentId}`;
}


// ── Razorpay Payments ──

export interface PaymentOrderResponse {
  order_id: string;
  amount: number;         // in paise (₹499 = 49900)
  currency: string;
  key_id: string;
  payment_id: number;     // our internal DB payment ID
  course_title: string;
  course_id: number;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  payment_id: number;
  enrollment_id: number;
  course_slug: string;
}

export interface PaymentRecord {
  payment_id: number;
  payment_type: string;
  amount: string;
  currency: string;
  tax_amount: string;
  tax_percentage: string;
  total_amount: string;
  status: string;
  gateway_name: string | null;
  gateway_payment_id: string | null;
  gateway_order_id: string | null;
  invoice_number: string | null;
  reference_type: string | null;
  reference_id: number | null;
  created_at: string;
  completed_at: string | null;
  reference_title: string | null;
}

export interface PaymentHistoryResponse {
  payments: PaymentRecord[];
  total: number;
}

/** Create a Razorpay order for a paid course */
export async function createPaymentOrder(courseId: number): Promise<PaymentOrderResponse> {
  return fetchApiWithAuth<PaymentOrderResponse>("/payments/create-order", {
    method: "POST",
    body: { course_id: courseId },
  });
}

/** Verify Razorpay payment after checkout success */
export async function verifyPayment(
  razorpayPaymentId: string,
  razorpayOrderId: string,
  razorpaySignature: string
): Promise<VerifyPaymentResponse> {
  return fetchApiWithAuth<VerifyPaymentResponse>("/payments/verify", {
    method: "POST",
    body: {
      razorpay_payment_id: razorpayPaymentId,
      razorpay_order_id: razorpayOrderId,
      razorpay_signature: razorpaySignature,
    },
  });
}

/** Get payment history for the current user */
export async function getPaymentHistory(): Promise<PaymentHistoryResponse> {
  return fetchApiWithAuth<PaymentHistoryResponse>("/payments/history");
}

/** Load Razorpay Checkout JS SDK dynamically */
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
