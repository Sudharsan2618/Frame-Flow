import os
import re

api_dir = r"c:\Users\WELCOME\Desktop\Recruit\UI\lib\api"

# 1. Fix courses.ts
courses_path = os.path.join(api_dir, "courses.ts")
with open(courses_path, "r", encoding="utf-8") as f:
    courses = f.read()

courses = courses.replace("body: { is_completed: isCompleted },", "body: JSON.stringify({ is_completed: isCompleted }),")
courses = courses.replace("body: progress,", "body: JSON.stringify(progress),")
if "function capitalize" not in courses:
    courses = """function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

""" + courses

with open(courses_path, "w", encoding="utf-8") as f:
    f.write(courses)


# 2. Fix payments.ts
payments_path = os.path.join(api_dir, "payments.ts")
with open(payments_path, "r", encoding="utf-8") as f:
    payments = f.read()

payments = payments.replace("body: { course_id: courseId },", "body: JSON.stringify({ course_id: courseId }),")
payments = payments.replace("razorpay_payment_id: razorpayPaymentId,", "JSON.stringify({ razorpay_payment_id: razorpayPaymentId,")
payments = payments.replace("razorpay_signature: razorpaySignature\\n    }", "razorpay_signature: razorpaySignature\\n    })")
payments = payments.replace("razorpay_order_id: razorpayOrderId,", "razorpay_order_id: razorpayOrderId,")
# Actually it's easier to use a regex replacement or simpler string replace for payments.ts
payments = re.sub(r'body: {\s*razorpay_payment_id: razorpayPaymentId,\s*razorpay_order_id: razorpayOrderId,\s*razorpay_signature: razorpaySignature\s*}',
                  r'body: JSON.stringify({ razorpay_payment_id: razorpayPaymentId, razorpay_order_id: razorpayOrderId, razorpay_signature: razorpaySignature })', payments)

with open(payments_path, "w", encoding="utf-8") as f:
    f.write(payments)


# 3. Fix tracking.ts
tracking_path = os.path.join(api_dir, "tracking.ts")
with open(tracking_path, "r", encoding="utf-8") as f:
    tracking = f.read()

tracking = tracking.replace("body: req,", "body: JSON.stringify(req),")
tracking = tracking.replace("body: { session_id: sessionId, logout_type: \\"manual\\" },", "body: JSON.stringify({ session_id: sessionId, logout_type: \\"manual\\" }),")
tracking = tracking.replace("body: { session_id: sessionId, logout_type: \"manual\" },", "body: JSON.stringify({ session_id: sessionId, logout_type: \"manual\" }),")

with open(tracking_path, "w", encoding="utf-8") as f:
    f.write(tracking)

print("Applied body JSON fixes.")
