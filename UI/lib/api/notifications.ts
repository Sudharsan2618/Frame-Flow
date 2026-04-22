import { fetchApi, fetchApiWithAuth, API_BASE_URL } from './client';
import { Category, InstructorBrief, CourseListItem, CourseListResponse, LessonBrief, LessonFull, ModuleOut, CourseDetail, MaterialOut, QuizQuestionOut, QuizOut, FlashcardOut, FlashcardDeckOut, DeviceInfo, VideoProgress, QuizResult, FlashcardSession, ActivityDetails, TrackActivityRequest, StartSessionRequest, SessionResponse, HeartbeatRequest, StudentActivitySummary, CourseEngagementSummary, EnrollmentOut, ProgressUpdate, LessonProgressOut, ResumeAnalysis, StudentProfile, CompanyProfile, JobSkillInput, JobCreatePayload, JobSkillOut, JobOut, SkillBrief, MatchBreakdown, MatchedSkill, MissingSkill, SkillSummary, GapCourse, CompanyBrief, JobListItem, CompanyDetail, JobDetailFull, ApplicationOut, ApplyPayload, DashboardStats, EnrolledCourseSummary, RecentActivityItem, StudentDashboardData, AdminDashboardData, DashboardChartData, AdminUser, AdminCourse, AdminJob, JobApplicant, CompanyCandidate, Notification, CourseReview, ReviewStats, Certificate, PaymentOrderResponse, VerifyPaymentResponse, PaymentRecord, PaymentHistoryResponse, ActivityType } from './types';
import * as T from './types';

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
