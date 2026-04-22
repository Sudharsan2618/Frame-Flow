import { fetchApi, fetchApiWithAuth, API_BASE_URL } from './client';
import { Category, InstructorBrief, CourseListItem, CourseListResponse, LessonBrief, LessonFull, ModuleOut, CourseDetail, MaterialOut, QuizQuestionOut, QuizOut, FlashcardOut, FlashcardDeckOut, DeviceInfo, VideoProgress, QuizResult, FlashcardSession, ActivityDetails, TrackActivityRequest, StartSessionRequest, SessionResponse, HeartbeatRequest, StudentActivitySummary, CourseEngagementSummary, EnrollmentOut, ProgressUpdate, LessonProgressOut, ResumeAnalysis, StudentProfile, CompanyProfile, JobSkillInput, JobCreatePayload, JobSkillOut, JobOut, SkillBrief, MatchBreakdown, MatchedSkill, MissingSkill, SkillSummary, GapCourse, CompanyBrief, JobListItem, CompanyDetail, JobDetailFull, ApplicationOut, ApplyPayload, DashboardStats, EnrolledCourseSummary, RecentActivityItem, StudentDashboardData, AdminDashboardData, DashboardChartData, AdminUser, AdminCourse, AdminJob, JobApplicant, CompanyCandidate, Notification, CourseReview, ReviewStats, Certificate, PaymentOrderResponse, VerifyPaymentResponse, PaymentRecord, PaymentHistoryResponse, ActivityType } from './types';
import * as T from './types';

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
  return `${API_BASE_URL}/certificates/view/${enrollmentId}`;
}

export async function createPaymentOrder(courseId: number): Promise<PaymentOrderResponse> {
  return fetchApiWithAuth<PaymentOrderResponse>("/payments/create-order", {
    method: "POST",
    body: JSON.stringify({ course_id: courseId }),
  });
}

export async function verifyPayment(
  razorpayPaymentId: string,
  razorpayOrderId: string,
  razorpaySignature: string
): Promise<VerifyPaymentResponse> {
  return fetchApiWithAuth<VerifyPaymentResponse>("/payments/verify", {
    method: "POST",
    body: JSON.stringify({
      razorpay_payment_id: razorpayPaymentId,
      razorpay_order_id: razorpayOrderId,
      razorpay_signature: razorpaySignature
    }),
  });
}

export async function getPaymentHistory(): Promise<PaymentHistoryResponse> {
  return fetchApiWithAuth<PaymentHistoryResponse>("/payments/history");
}
