import { fetchApi, fetchApiWithAuth, API_BASE_URL } from './client';
import { Category, InstructorBrief, CourseListItem, CourseListResponse, LessonBrief, LessonFull, ModuleOut, CourseDetail, MaterialOut, QuizQuestionOut, QuizOut, FlashcardOut, FlashcardDeckOut, DeviceInfo, VideoProgress, QuizResult, FlashcardSession, ActivityDetails, TrackActivityRequest, StartSessionRequest, SessionResponse, HeartbeatRequest, StudentActivitySummary, CourseEngagementSummary, EnrollmentOut, ProgressUpdate, LessonProgressOut, ResumeAnalysis, StudentProfile, CompanyProfile, JobSkillInput, JobCreatePayload, JobSkillOut, JobOut, SkillBrief, MatchBreakdown, MatchedSkill, MissingSkill, SkillSummary, GapCourse, CompanyBrief, JobListItem, CompanyDetail, JobDetailFull, ApplicationOut, ApplyPayload, DashboardStats, EnrolledCourseSummary, RecentActivityItem, StudentDashboardData, AdminDashboardData, DashboardChartData, AdminUser, AdminCourse, AdminJob, JobApplicant, CompanyCandidate, Notification, CourseReview, ReviewStats, Certificate, PaymentOrderResponse, VerifyPaymentResponse, PaymentRecord, PaymentHistoryResponse, ActivityType } from './types';
import * as T from './types';

export async function startTrackingSession(req: StartSessionRequest): Promise<SessionResponse> {
  return fetchApiWithAuth<SessionResponse>("/tracking/sessions/start", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function sendHeartbeat(req: HeartbeatRequest): Promise<{ success: boolean }> {
  return fetchApiWithAuth<{ success: boolean }>("/tracking/sessions/heartbeat", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function endTrackingSession(sessionId: string): Promise<SessionResponse> {
  return fetchApiWithAuth<SessionResponse>("/tracking/sessions/end", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, logout_type: "manual" }),
  });
}

export async function trackActivity(req: TrackActivityRequest): Promise<{ success: boolean }> {
  return fetchApiWithAuth<{ success: boolean }>("/tracking/activities", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function getStudentAnalytics(studentId: number, courseId: number): Promise<StudentActivitySummary> {
  return fetchApiWithAuth<StudentActivitySummary>(`/tracking/analytics/student/${studentId}/course/${courseId}`);
}

export async function getCourseAnalytics(courseId: number, periodDays = 30): Promise<CourseEngagementSummary> {
  return fetchApiWithAuth<CourseEngagementSummary>(`/tracking/analytics/course/${courseId}/engagement?period_days=${periodDays}`);
}

export async function logSearch(studentId: number, query: string, searchType: string = "course", resultsCount: number = 0) {
  const res = await fetch(`${API_BASE_URL}/tracking/search`, {
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

export async function uploadResume(studentId: number, file: File): Promise<{ success: boolean; analysis: ResumeAnalysis }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE_URL}/tracking/resume/upload?student_id=${studentId}`, {
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
  const res = await fetch(`${API_BASE_URL}/tracking/resume/${studentId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch resume analysis");
  return res.json();
}
