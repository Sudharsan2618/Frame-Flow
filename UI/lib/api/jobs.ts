import { fetchApi, fetchApiWithAuth, API_BASE_URL } from './client';
import { Category, InstructorBrief, CourseListItem, CourseListResponse, LessonBrief, LessonFull, ModuleOut, CourseDetail, MaterialOut, QuizQuestionOut, QuizOut, FlashcardOut, FlashcardDeckOut, DeviceInfo, VideoProgress, QuizResult, FlashcardSession, ActivityDetails, TrackActivityRequest, StartSessionRequest, SessionResponse, HeartbeatRequest, StudentActivitySummary, CourseEngagementSummary, EnrollmentOut, ProgressUpdate, LessonProgressOut, ResumeAnalysis, StudentProfile, CompanyProfile, JobSkillInput, JobCreatePayload, JobSkillOut, JobOut, SkillBrief, MatchBreakdown, MatchedSkill, MissingSkill, SkillSummary, GapCourse, CompanyBrief, JobListItem, CompanyDetail, JobDetailFull, ApplicationOut, ApplyPayload, DashboardStats, EnrolledCourseSummary, RecentActivityItem, StudentDashboardData, AdminDashboardData, DashboardChartData, AdminUser, AdminCourse, AdminJob, JobApplicant, CompanyCandidate, Notification, CourseReview, ReviewStats, Certificate, PaymentOrderResponse, VerifyPaymentResponse, PaymentRecord, PaymentHistoryResponse, ActivityType } from './types';
import * as T from './types';

export async function createCompanyJob(data: JobCreatePayload): Promise<JobOut> {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const res = await fetch(`${API_BASE_URL}/jobs/company`, {
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

export async function getCompanyJobs(): Promise<JobOut[]> {
  return fetchApiWithAuth<JobOut[]>("/jobs/company");
}

export async function getRecommendedJobs(limit = 50): Promise<{ jobs: JobListItem[]; threshold: number; total: number }> {
  return fetchApiWithAuth(`/student-jobs/recommended?limit=${limit}`);
}

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

export async function getJobDetail(jobId: number): Promise<JobDetailFull> {
  return fetchApiWithAuth(`/student-jobs/${jobId}`);
}

export async function applyToJob(jobId: number, data: ApplyPayload): Promise<ApplicationOut> {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const res = await fetch(`${API_BASE_URL}/student-jobs/${jobId}/apply`, {
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

export async function getMyApplications(): Promise<{ applications: ApplicationOut[]; total: number }> {
  return fetchApiWithAuth("/student-jobs/applications/me");
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
