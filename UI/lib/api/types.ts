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

export interface QuizResultOut {
  score: string;
  percentage: string;
  passed: boolean;
  total_questions: number;
  correct_answers: number;
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

export interface DashboardChartData {
  user_growth: { month: string; students: number; companies: number; total: number }[];
  application_trend: { month: string; applications: number; forwarded: number; hired: number }[];
  status_distribution: { status: string; count: number }[];
  top_jobs: { title: string; company_name: string; count: number; pending: number; forwarded: number }[];
  jobs_trend: { month: string; jobs_posted: number }[];
  enrollment_trend: { month: string; enrollments: number }[];
}

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
