import { fetchApi, fetchApiWithAuth, API_BASE_URL } from './client';
import { Category, InstructorBrief, CourseListItem, CourseListResponse, LessonBrief, LessonFull, ModuleOut, CourseDetail, MaterialOut, QuizQuestionOut, QuizOut, FlashcardOut, FlashcardDeckOut, DeviceInfo, VideoProgress, QuizResult, FlashcardSession, ActivityDetails, TrackActivityRequest, StartSessionRequest, SessionResponse, HeartbeatRequest, StudentActivitySummary, CourseEngagementSummary, EnrollmentOut, ProgressUpdate, LessonProgressOut, ResumeAnalysis, StudentProfile, CompanyProfile, JobSkillInput, JobCreatePayload, JobSkillOut, JobOut, SkillBrief, MatchBreakdown, MatchedSkill, MissingSkill, SkillSummary, GapCourse, CompanyBrief, JobListItem, CompanyDetail, JobDetailFull, ApplicationOut, ApplyPayload, DashboardStats, EnrolledCourseSummary, RecentActivityItem, StudentDashboardData, AdminDashboardData, DashboardChartData, AdminUser, AdminCourse, AdminJob, JobApplicant, CompanyCandidate, Notification, CourseReview, ReviewStats, Certificate, PaymentOrderResponse, VerifyPaymentResponse, PaymentRecord, PaymentHistoryResponse, ActivityType } from './types';
import * as T from './types';

export async function getStudentProfile(): Promise<StudentProfile> {
  return fetchApiWithAuth<StudentProfile>("/auth/profile/student");
}

export async function updateStudentProfile(data: Partial<StudentProfile>): Promise<StudentProfile> {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const res = await fetch(`${API_BASE_URL}/auth/profile/student`, {
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

export async function getCompanyProfile(): Promise<CompanyProfile> {
  return fetchApiWithAuth<CompanyProfile>("/auth/profile/company");
}

export async function updateCompanyProfile(data: Partial<CompanyProfile>): Promise<CompanyProfile> {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const res = await fetch(`${API_BASE_URL}/auth/profile/company`, {
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

export async function getStudentDashboard(): Promise<StudentDashboardData> {
  return fetchApiWithAuth<StudentDashboardData>("/auth/dashboard/student");
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
