// ==================== STUDENT DATA ====================
export const studentDashboard = {
  name: "Alex Johnson",
  enrolledCourses: 4,
  completedCourses: 2,
  totalHours: 128,
  avgScore: 87,
  streakDays: 12,
  upcomingWebinars: [
    { id: 1, title: "Intro to Machine Learning", date: "2026-02-15", time: "10:00 AM", instructor: "Dr. Sarah Chen" },
    { id: 2, title: "Advanced React Patterns", date: "2026-02-18", time: "2:00 PM", instructor: "Mark Rivera" },
  ],
  recommendedJobs: [
    { id: 1, title: "Junior Frontend Developer", company: "TechStart Inc.", match: 92 },
    { id: 2, title: "Data Analyst Intern", company: "DataViz Corp.", match: 85 },
  ],
  recentActivity: [
    { id: 1, type: "course", action: "Completed Module 5", course: "Python for Data Science", time: "2 hours ago" },
    { id: 2, type: "quiz", action: "Scored 95%", course: "Web Development Fundamentals", time: "1 day ago" },
    { id: 3, type: "badge", action: "Earned 'Python Pro' badge", course: "Python for Data Science", time: "2 days ago" },
  ],
  progressData: [
    { month: "Sep", hours: 12 },
    { month: "Oct", hours: 18 },
    { month: "Nov", hours: 25 },
    { month: "Dec", hours: 20 },
    { month: "Jan", hours: 30 },
    { month: "Feb", hours: 23 },
  ],
}

export const courses = [
  { id: 1, title: "Python for Data Science", category: "Data Science", level: "Intermediate", price: 49.99, rating: 4.8, students: 2340, instructor: "Dr. Sarah Chen", image: "/courses/python.jpg", duration: "32 hours", modules: 12, progress: 75, isFree: false },
  { id: 2, title: "Web Development Fundamentals", category: "Web Dev", level: "Beginner", price: 0, rating: 4.6, students: 5120, instructor: "Mark Rivera", image: "/courses/webdev.jpg", duration: "24 hours", modules: 8, progress: 45, isFree: true },
  { id: 3, title: "UX/UI Design Mastery", category: "Design", level: "Advanced", price: 79.99, rating: 4.9, students: 1890, instructor: "Lisa Park", image: "/courses/design.jpg", duration: "40 hours", modules: 15, progress: 0, isFree: false },
  { id: 4, title: "Machine Learning A-Z", category: "Data Science", level: "Advanced", price: 89.99, rating: 4.7, students: 3210, instructor: "Dr. James White", image: "/courses/ml.jpg", duration: "48 hours", modules: 20, progress: 30, isFree: false },
  { id: 5, title: "Digital Marketing Essentials", category: "Marketing", level: "Beginner", price: 0, rating: 4.5, students: 4500, instructor: "Anna Brooks", image: "/courses/marketing.jpg", duration: "18 hours", modules: 6, progress: 0, isFree: true },
  { id: 6, title: "Cloud Architecture with AWS", category: "Cloud", level: "Intermediate", price: 69.99, rating: 4.8, students: 1560, instructor: "Tom Mitchell", image: "/courses/cloud.jpg", duration: "36 hours", modules: 14, progress: 0, isFree: false },
]

export const courseDetail = {
  id: 1,
  title: "Python for Data Science",
  instructor: "Dr. Sarah Chen",
  modules: [
    { id: 1, title: "Introduction to Python", duration: "2h 30m", lessons: 5, completed: true },
    { id: 2, title: "Data Types & Variables", duration: "3h 00m", lessons: 7, completed: true },
    { id: 3, title: "Control Flow", duration: "2h 45m", lessons: 6, completed: true },
    { id: 4, title: "Functions & Modules", duration: "3h 15m", lessons: 8, completed: true },
    { id: 5, title: "NumPy Fundamentals", duration: "3h 30m", lessons: 7, completed: false },
    { id: 6, title: "Pandas for Data Analysis", duration: "4h 00m", lessons: 9, completed: false },
    { id: 7, title: "Data Visualization", duration: "3h 00m", lessons: 6, completed: false },
    { id: 8, title: "Statistics in Python", duration: "3h 45m", lessons: 8, completed: false },
  ],
  currentLesson: {
    title: "Introduction to NumPy Arrays",
    type: "video",
    content: "Learn about the fundamental building blocks of NumPy - arrays. We'll cover creation, indexing, slicing, and basic operations.",
  },
  resources: [
    { id: 1, type: "PDF", title: "NumPy Quick Reference", action: "Open PDF" },
    { id: 2, type: "Rich Text", title: "Lesson Notes & Examples", action: "Read Notes" },
    { id: 3, type: "Audio", title: "Audio Summary", action: "Play Audio" },
    { id: 4, type: "Gallery", title: "Array Visuals", action: "View Gallery" },
    { id: 5, type: "Flashcards", title: "Key Term Flashcards", action: "Open Cards" },
  ],
}

export const webinars = [
  { id: 1, title: "Intro to Machine Learning", date: "2026-02-15", time: "10:00 AM", instructor: "Dr. Sarah Chen", attendees: 245, status: "upcoming", description: "Dive into the basics of ML algorithms and learn how to build your first model." },
  { id: 2, title: "Advanced React Patterns", date: "2026-02-18", time: "2:00 PM", instructor: "Mark Rivera", attendees: 189, status: "upcoming", description: "Master compound components, render props, and custom hooks." },
  { id: 3, title: "Career in Tech Panel", date: "2026-02-22", time: "11:00 AM", instructor: "Panel Discussion", attendees: 520, status: "upcoming", description: "Industry leaders share insights on breaking into the tech industry." },
  { id: 4, title: "Python Best Practices", date: "2026-01-28", time: "3:00 PM", instructor: "Dr. James White", attendees: 312, status: "completed", description: "Learn clean code practices and PEP 8 conventions for Python." },
]

export const materials = [
  { id: 1, title: "Python Cheat Sheet", type: "PDF", course: "Python for Data Science", size: "2.4 MB", downloads: 1230 },
  { id: 2, title: "React Component Library", type: "ZIP", course: "Web Development Fundamentals", size: "8.1 MB", downloads: 890 },
  { id: 3, title: "Design System Templates", type: "Figma", course: "UX/UI Design Mastery", size: "15.3 MB", downloads: 567 },
  { id: 4, title: "ML Algorithm Reference", type: "PDF", course: "Machine Learning A-Z", size: "4.7 MB", downloads: 1045 },
  { id: 5, title: "AWS Architecture Diagrams", type: "PDF", course: "Cloud Architecture with AWS", size: "3.2 MB", downloads: 432 },
  { id: 6, title: "Marketing Strategy Workbook", type: "DOCX", course: "Digital Marketing Essentials", size: "1.8 MB", downloads: 789 },
]

export const studentJobs = [
  { id: 1, title: "Junior Frontend Developer", company: "TechStart Inc.", location: "Remote", type: "Full-time", skills: ["React", "TypeScript", "CSS"], salary: "$65,000 - $80,000", posted: "2 days ago", match: 92 },
  { id: 2, title: "Data Analyst Intern", company: "DataViz Corp.", location: "New York, NY", type: "Internship", skills: ["Python", "SQL", "Tableau"], salary: "$25/hr", posted: "1 week ago", match: 85 },
  { id: 3, title: "UX Designer", company: "DesignHub", location: "San Francisco, CA", type: "Full-time", skills: ["Figma", "User Research", "Prototyping"], salary: "$75,000 - $95,000", posted: "3 days ago", match: 78 },
  { id: 4, title: "Cloud Engineer", company: "CloudScale Solutions", location: "Remote", type: "Full-time", skills: ["AWS", "Docker", "Kubernetes"], salary: "$90,000 - $120,000", posted: "5 days ago", match: 70 },
  { id: 5, title: "Marketing Coordinator", company: "GrowthLab", location: "Austin, TX", type: "Full-time", skills: ["SEO", "Content Marketing", "Analytics"], salary: "$50,000 - $65,000", posted: "1 day ago", match: 65 },
]

export const studentApplications = [
  { id: 1, jobTitle: "Junior Frontend Developer", company: "TechStart Inc.", appliedDate: "2026-01-20", status: "Forwarded to Company" },
  { id: 2, jobTitle: "Data Analyst Intern", company: "DataViz Corp.", appliedDate: "2026-01-25", status: "Submitted to Admin" },
  { id: 3, jobTitle: "UX Designer", company: "DesignHub", appliedDate: "2026-02-01", status: "Interview Scheduled" },
]

export const studentProfile = {
  name: "Alex Johnson",
  email: "alex.johnson@email.com",
  avatar: "",
  bio: "Passionate about data science and web development. Currently building skills to transition into a full-time tech role.",
  location: "San Francisco, CA",
  skills: ["Python", "JavaScript", "React", "SQL", "Data Analysis", "Machine Learning"],
  education: "B.S. Computer Science, UC Berkeley",
  completedCourses: ["Python for Data Science", "Web Development Fundamentals"],
  portfolio: [
    {
      id: 1,
      title: "Sales Forecast Dashboard",
      description: "Interactive Tableau dashboard analyzing quarterly sales trends.",
      tags: ["Tableau", "SQL", "Data Viz"],
    },
    {
      id: 2,
      title: "Course Progress Tracker",
      description: "React app for tracking learning milestones and badges.",
      tags: ["React", "TypeScript", "UI"],
    },
  ],
  badges: [
    { name: "Python Pro", earned: "2026-01-15" },
    { name: "Web Wizard", earned: "2026-01-28" },
    { name: "Quick Learner", earned: "2026-02-05" },
  ],
}

// ==================== COMPANY DATA ====================
export const companyDashboard = {
  name: "TechStart Inc.",
  totalStudents: 15420,
  activeJobs: 8,
  totalApplications: 342,
  hiredThisMonth: 5,
  skillsBreakdown: [
    { skill: "JavaScript", count: 4520 },
    { skill: "Python", count: 3890 },
    { skill: "React", count: 3210 },
    { skill: "SQL", count: 2980 },
    { skill: "AWS", count: 1560 },
    { skill: "Design", count: 1890 },
  ],
  recentHires: [
    { name: "Maria Santos", role: "Frontend Developer", date: "2026-02-01" },
    { name: "David Kim", role: "Data Scientist", date: "2026-01-28" },
  ],
  applicationTrend: [
    { month: "Sep", applications: 28 },
    { month: "Oct", applications: 35 },
    { month: "Nov", applications: 42 },
    { month: "Dec", applications: 38 },
    { month: "Jan", applications: 55 },
    { month: "Feb", applications: 48 },
  ],
}

export const companyJobs = [
  { id: 1, title: "Junior Frontend Developer", status: "Active", applications: 45, posted: "2026-01-15", deadline: "2026-03-15", skills: ["React", "TypeScript", "CSS"], type: "Full-time", location: "Remote" },
  { id: 2, title: "Data Analyst", status: "Active", applications: 32, posted: "2026-01-20", deadline: "2026-03-20", skills: ["Python", "SQL", "Tableau"], type: "Full-time", location: "New York, NY" },
  { id: 3, title: "UX Design Intern", status: "Paused", applications: 28, posted: "2026-01-10", deadline: "2026-02-28", skills: ["Figma", "User Research"], type: "Internship", location: "San Francisco, CA" },
  { id: 4, title: "Backend Engineer", status: "Active", applications: 51, posted: "2026-02-01", deadline: "2026-04-01", skills: ["Node.js", "PostgreSQL", "AWS"], type: "Full-time", location: "Remote" },
]

export const companyCandidates = [
  { id: 1, name: "Alex Johnson", job: "Junior Frontend Developer", stage: "new", skills: ["React", "TypeScript", "Python"], score: 92, appliedDate: "2026-01-22" },
  { id: 2, name: "Sarah Williams", job: "Junior Frontend Developer", stage: "reviewing", skills: ["React", "JavaScript", "CSS"], score: 88, appliedDate: "2026-01-24" },
  { id: 3, name: "James Lee", job: "Data Analyst", stage: "interviewing", skills: ["Python", "SQL", "R"], score: 90, appliedDate: "2026-01-18" },
  { id: 4, name: "Emily Davis", job: "UX Design Intern", stage: "offer", skills: ["Figma", "Sketch", "User Research"], score: 95, appliedDate: "2026-01-15" },
  { id: 5, name: "Michael Brown", job: "Backend Engineer", stage: "new", skills: ["Node.js", "PostgreSQL", "Docker"], score: 86, appliedDate: "2026-02-02" },
  { id: 6, name: "Sophia Martinez", job: "Data Analyst", stage: "reviewing", skills: ["Python", "Tableau", "SQL"], score: 82, appliedDate: "2026-01-28" },
]

export const talentPoolAnalytics = {
  totalStudents: 15420,
  avgCompletionRate: 72,
  topSkills: [
    { skill: "JavaScript", students: 4520, growth: 12 },
    { skill: "Python", students: 3890, growth: 18 },
    { skill: "React", students: 3210, growth: 15 },
    { skill: "SQL", students: 2980, growth: 8 },
    { skill: "AWS", students: 1560, growth: 22 },
    { skill: "Figma", students: 1890, growth: 10 },
  ],
  completionByCategory: [
    { category: "Web Dev", rate: 78 },
    { category: "Data Science", rate: 65 },
    { category: "Design", rate: 82 },
    { category: "Cloud", rate: 58 },
    { category: "Marketing", rate: 71 },
  ],
  studentGrowth: [
    { month: "Sep", students: 11200 },
    { month: "Oct", students: 12100 },
    { month: "Nov", students: 13050 },
    { month: "Dec", students: 13800 },
    { month: "Jan", students: 14600 },
    { month: "Feb", students: 15420 },
  ],
}

export const companyProfile = {
  name: "TechStart Inc.",
  industry: "Technology",
  size: "50-200 employees",
  location: "San Francisco, CA",
  website: "https://techstart.example.com",
  description: "TechStart Inc. is a leading technology company focused on building innovative solutions for the modern workforce. We believe in nurturing talent and creating opportunities for growth.",
  founded: "2018",
  contactEmail: "hr@techstart.example.com",
}

// ==================== ADMIN DATA ====================
export const adminDashboard = {
  totalRevenue: 245680,
  monthlyRevenue: 32450,
  totalUsers: 18750,
  totalStudents: 15420,
  totalCompanies: 342,
  totalAdmins: 12,
  newUsersThisMonth: 1250,
  activeCoursesCount: 48,
  totalJobPostings: 156,
  jobMatchesThisMonth: 89,
  engagementRate: 68,
  revenueTrend: [
    { month: "Sep", revenue: 22400 },
    { month: "Oct", revenue: 25800 },
    { month: "Nov", revenue: 28900 },
    { month: "Dec", revenue: 27200 },
    { month: "Jan", revenue: 31500 },
    { month: "Feb", revenue: 32450 },
  ],
  userGrowth: [
    { month: "Sep", students: 11200, companies: 280 },
    { month: "Oct", students: 12100, companies: 295 },
    { month: "Nov", students: 13050, companies: 310 },
    { month: "Dec", students: 13800, companies: 320 },
    { month: "Jan", students: 14600, companies: 335 },
    { month: "Feb", students: 15420, companies: 342 },
  ],
}

export const adminUsers = [
  { id: 1, name: "Alex Johnson", email: "alex@email.com", role: "Student", status: "Active", joinDate: "2025-09-15", coursesCompleted: 2 },
  { id: 2, name: "Sarah Williams", email: "sarah@email.com", role: "Student", status: "Active", joinDate: "2025-10-02", coursesCompleted: 3 },
  { id: 3, name: "TechStart Inc.", email: "hr@techstart.com", role: "Company", status: "Active", joinDate: "2025-08-20", coursesCompleted: 0 },
  { id: 4, name: "James Lee", email: "james@email.com", role: "Student", status: "Inactive", joinDate: "2025-07-10", coursesCompleted: 1 },
  { id: 5, name: "DesignHub", email: "careers@designhub.com", role: "Company", status: "Active", joinDate: "2025-11-05", coursesCompleted: 0 },
  { id: 6, name: "Emily Davis", email: "emily@email.com", role: "Student", status: "Active", joinDate: "2025-12-01", coursesCompleted: 4 },
  { id: 7, name: "DataViz Corp.", email: "hr@dataviz.com", role: "Company", status: "Active", joinDate: "2025-09-28", coursesCompleted: 0 },
  { id: 8, name: "Michael Brown", email: "michael@email.com", role: "Student", status: "Active", joinDate: "2026-01-05", coursesCompleted: 1 },
]

export const adminApplications = [
  { id: 1, studentName: "Alex Johnson", studentSkills: ["React", "TypeScript", "Python"], jobTitle: "Junior Frontend Developer", company: "TechStart Inc.", requiredSkills: ["React", "TypeScript", "CSS"], appliedDate: "2026-01-22", status: "Pending Review", matchScore: 92 },
  { id: 2, studentName: "Sarah Williams", studentSkills: ["React", "JavaScript", "CSS", "Node.js"], jobTitle: "Backend Engineer", company: "TechStart Inc.", requiredSkills: ["Node.js", "PostgreSQL", "AWS"], appliedDate: "2026-01-24", status: "Pending Review", matchScore: 65 },
  { id: 3, studentName: "James Lee", studentSkills: ["Python", "SQL", "R", "Tableau"], jobTitle: "Data Analyst", company: "DataViz Corp.", requiredSkills: ["Python", "SQL", "Tableau"], appliedDate: "2026-01-18", status: "Forwarded", matchScore: 90 },
  { id: 4, studentName: "Emily Davis", studentSkills: ["Figma", "Sketch", "User Research", "Prototyping"], jobTitle: "UX Design Intern", company: "TechStart Inc.", requiredSkills: ["Figma", "User Research"], appliedDate: "2026-01-15", status: "Forwarded", matchScore: 95 },
  { id: 5, studentName: "Michael Brown", studentSkills: ["Node.js", "PostgreSQL", "Docker", "AWS"], jobTitle: "Backend Engineer", company: "TechStart Inc.", requiredSkills: ["Node.js", "PostgreSQL", "AWS"], appliedDate: "2026-02-02", status: "Pending Review", matchScore: 86 },
]

export const adminAnalytics = {
  courseEffectiveness: [
    { course: "Python for Data Science", completionRate: 75, avgScore: 82, satisfaction: 4.8 },
    { course: "Web Dev Fundamentals", completionRate: 68, avgScore: 78, satisfaction: 4.6 },
    { course: "UX/UI Design Mastery", completionRate: 82, avgScore: 88, satisfaction: 4.9 },
    { course: "Machine Learning A-Z", completionRate: 55, avgScore: 74, satisfaction: 4.7 },
    { course: "Cloud Architecture", completionRate: 60, avgScore: 80, satisfaction: 4.8 },
  ],
  jobSuccessRates: [
    { month: "Sep", applications: 120, forwards: 45, hires: 12 },
    { month: "Oct", applications: 145, forwards: 58, hires: 18 },
    { month: "Nov", applications: 168, forwards: 62, hires: 22 },
    { month: "Dec", applications: 155, forwards: 55, hires: 15 },
    { month: "Jan", applications: 190, forwards: 72, hires: 28 },
    { month: "Feb", applications: 175, forwards: 68, hires: 25 },
  ],
}

// ==================== MENTOR DATA ====================
export const mentors = [
  {
    id: 1,
    firstName: "Raj",
    lastName: "Patel",
    name: "Raj Patel",
    headline: "Senior SWE @ Google",
    bio: "Senior software engineer at Google with 8+ years of experience. Passionate about helping aspiring developers navigate their career.",
    expertiseAreas: ["System Design", "DSA", "Career Guidance"],
    yearsOfExperience: 8,
    currentCompany: "Google",
    roleTitle: "Senior Software Engineer",
    profilePictureUrl: "",
    sessionDurationMinutes: 45,
    sessionPrice: 2500.00,
    currency: "INR",
    isFree: false,
    isActive: true,
    isVerified: true,
    totalSessions: 124,
    averageRating: 4.9,
    linkedinUrl: "https://linkedin.com/in/rajpatel",
    calendarLink: "https://calendly.com/rajpatel",
    availabilitySchedule: {
      monday: ["09:00-12:00", "14:00-17:00"],
      wednesday: ["09:00-12:00", "14:00-17:00"],
      friday: ["10:00-13:00"],
    },
    timezone: "Asia/Kolkata",
  },
  {
    id: 2,
    firstName: "Priya",
    lastName: "Sharma",
    name: "Priya Sharma",
    headline: "PM @ Microsoft",
    bio: "Product manager at Microsoft. Previously worked at startups and large tech companies. Loves mentoring on product careers.",
    expertiseAreas: ["Product Management", "Career Transition", "Interview Prep"],
    yearsOfExperience: 6,
    currentCompany: "Microsoft",
    roleTitle: "Product Manager",
    profilePictureUrl: "",
    sessionDurationMinutes: 30,
    sessionPrice: 0.00,
    currency: "INR",
    isFree: true,
    isActive: true,
    isVerified: true,
    totalSessions: 89,
    averageRating: 4.8,
    linkedinUrl: "https://linkedin.com/in/priyasharma",
    calendarLink: "https://calendly.com/priyasharma",
    availabilitySchedule: {
      tuesday: ["10:00-13:00", "15:00-18:00"],
      thursday: ["10:00-13:00", "15:00-18:00"],
      saturday: ["09:00-12:00"],
    },
    timezone: "Asia/Kolkata",
  },
  {
    id: 3,
    firstName: "Aman",
    lastName: "Gupta",
    name: "Aman Gupta",
    headline: "Staff Engineer @ Amazon",
    bio: "Staff engineer at Amazon with deep expertise in distributed systems and cloud architecture. Helping engineers level up their system design skills.",
    expertiseAreas: ["Cloud Architecture", "AWS", "System Design", "Backend Development"],
    yearsOfExperience: 12,
    currentCompany: "Amazon",
    roleTitle: "Staff Software Engineer",
    profilePictureUrl: "",
    sessionDurationMinutes: 60,
    sessionPrice: 3500.00,
    currency: "INR",
    isFree: false,
    isActive: true,
    isVerified: true,
    totalSessions: 210,
    averageRating: 4.95,
    linkedinUrl: "https://linkedin.com/in/amangupta",
    calendarLink: "https://calendly.com/amangupta",
    availabilitySchedule: {
      monday: ["18:00-21:00"],
      wednesday: ["18:00-21:00"],
      saturday: ["10:00-14:00"],
    },
    timezone: "Asia/Kolkata",
  },
  {
    id: 4,
    firstName: "Neha",
    lastName: "Verma",
    name: "Neha Verma",
    headline: "Lead Data Scientist @ Flipkart",
    bio: "Lead data scientist with 7 years in ML/AI. Mentoring aspiring data scientists on building production ML systems and cracking interviews.",
    expertiseAreas: ["Machine Learning", "Data Science", "Python", "Interview Prep"],
    yearsOfExperience: 7,
    currentCompany: "Flipkart",
    roleTitle: "Lead Data Scientist",
    profilePictureUrl: "",
    sessionDurationMinutes: 45,
    sessionPrice: 2000.00,
    currency: "INR",
    isFree: false,
    isActive: true,
    isVerified: true,
    totalSessions: 156,
    averageRating: 4.85,
    linkedinUrl: "https://linkedin.com/in/nehaverma",
    calendarLink: "https://calendly.com/nehaverma",
    availabilitySchedule: {
      tuesday: ["17:00-20:00"],
      thursday: ["17:00-20:00"],
      sunday: ["10:00-13:00"],
    },
    timezone: "Asia/Kolkata",
  },
  {
    id: 5,
    firstName: "Karthik",
    lastName: "Rajan",
    name: "Karthik Rajan",
    headline: "Design Lead @ Swiggy",
    bio: "Design lead with 9 years of experience in product design. Specializes in mentoring designers on portfolio building and design thinking.",
    expertiseAreas: ["UI/UX Design", "Portfolio Review", "Design Systems", "Career Guidance"],
    yearsOfExperience: 9,
    currentCompany: "Swiggy",
    roleTitle: "Design Lead",
    profilePictureUrl: "",
    sessionDurationMinutes: 30,
    sessionPrice: 0.00,
    currency: "INR",
    isFree: true,
    isActive: true,
    isVerified: false,
    totalSessions: 67,
    averageRating: 4.7,
    linkedinUrl: "https://linkedin.com/in/karthikrajan",
    calendarLink: "https://calendly.com/karthikrajan",
    availabilitySchedule: {
      monday: ["11:00-13:00"],
      friday: ["11:00-13:00", "16:00-18:00"],
    },
    timezone: "Asia/Kolkata",
  },
]

export const mentorSessions = [
  { id: 1, mentorName: "Raj Patel", mentorRole: "Senior SWE @ Google", topic: "System Design Interview Prep", date: "2026-02-15", time: "10:00 AM", status: "scheduled", duration: 45 },
  { id: 2, mentorName: "Priya Sharma", mentorRole: "PM @ Microsoft", topic: "Career Transition Guidance", date: "2026-02-12", time: "3:00 PM", status: "completed", duration: 30, rating: 5, feedback: "Extremely helpful session. Got clarity on my career direction." },
  { id: 3, mentorName: "Neha Verma", mentorRole: "Lead Data Scientist @ Flipkart", topic: "ML Interview Strategy", date: "2026-02-18", time: "5:00 PM", status: "scheduled", duration: 45 },
  { id: 4, mentorName: "Raj Patel", mentorRole: "Senior SWE @ Google", topic: "Resume Review & Career Advice", date: "2026-02-05", time: "11:00 AM", status: "completed", duration: 45, rating: 4, feedback: "Great insights on structuring my resume for FAANG companies." },
]

// ==================== REFERRAL DATA ====================
export const referralContacts = [
  {
    id: 1,
    referrerStudentId: 1,
    referrerName: "Alex Johnson",
    referredName: "David Kumar",
    referredEmail: "david.kumar@email.com",
    referredPhone: "+91-9876543210",
    relationship: "College Friend",
    status: "converted" as const,
    referredAt: "2026-01-10",
    contactedAt: "2026-01-12",
    convertedAt: "2026-01-20",
    notes: "Interested in frontend development courses",
  },
  {
    id: 2,
    referrerStudentId: 1,
    referrerName: "Alex Johnson",
    referredName: "Sneha Iyer",
    referredEmail: "sneha.iyer@email.com",
    referredPhone: "+91-9876543211",
    relationship: "Work Colleague",
    status: "interested" as const,
    referredAt: "2026-01-25",
    contactedAt: "2026-01-27",
    convertedAt: null,
    notes: "Looking for data science career transition",
  },
  {
    id: 3,
    referrerStudentId: 2,
    referrerName: "Sarah Williams",
    referredName: "Rohan Mehta",
    referredEmail: "rohan.mehta@email.com",
    referredPhone: "+91-9876543212",
    relationship: "University Batchmate",
    status: "contacted" as const,
    referredAt: "2026-02-01",
    contactedAt: "2026-02-03",
    convertedAt: null,
    notes: "Interested in UX design courses",
  },
  {
    id: 4,
    referrerStudentId: 1,
    referrerName: "Alex Johnson",
    referredName: "Pooja Shah",
    referredEmail: "pooja.shah@email.com",
    referredPhone: "+91-9876543213",
    relationship: "Family",
    status: "pending" as const,
    referredAt: "2026-02-08",
    contactedAt: null,
    convertedAt: null,
    notes: "Fresh graduate, interested in full-stack development",
  },
  {
    id: 5,
    referrerStudentId: 3,
    referrerName: "James Lee",
    referredName: "Ankit Desai",
    referredEmail: "ankit.desai@email.com",
    referredPhone: "+91-9876543214",
    relationship: "Meetup Contact",
    status: "not_interested" as const,
    referredAt: "2026-01-15",
    contactedAt: "2026-01-18",
    convertedAt: null,
    notes: "Was interested in ML courses but decided to go with another platform",
  },
]

export const referralStats = {
  totalReferrals: 12,
  convertedReferrals: 5,
  pendingReferrals: 3,
  conversionRate: 41.7,
  rewardEarned: 2500,
  rewardCurrency: "INR",
}

// ==================== PLACEMENT PACKAGE DATA ====================
export const placementPackages = [
  {
    id: 1,
    name: "Basic Placement",
    description: "Essential placement support for job seekers",
    features: ["Resume Review", "1 Mock Interview", "Job Matching", "Email Support"],
    validityDays: 90,
    price: 4999.00,
    currency: "INR",
    jobGuarantee: false,
    isActive: true,
    displayOrder: 1,
    enrolledStudents: 234,
    successRate: 65,
  },
  {
    id: 2,
    name: "Pro Placement",
    description: "Comprehensive placement package with dedicated support",
    features: [
      "Resume Review & Optimization",
      "3 Mock Interviews",
      "Priority Job Matching",
      "Dedicated Mentor (2 sessions)",
      "LinkedIn Profile Review",
      "Priority Support",
    ],
    validityDays: 180,
    price: 14999.00,
    currency: "INR",
    jobGuarantee: false,
    isActive: true,
    displayOrder: 2,
    enrolledStudents: 156,
    successRate: 78,
    popular: true,
  },
  {
    id: 3,
    name: "Premium Placement",
    description: "Complete placement guarantee with unlimited support",
    features: [
      "Complete Resume Makeover",
      "Unlimited Mock Interviews",
      "Priority Job Matching",
      "Dedicated Mentor (Unlimited)",
      "LinkedIn + Portfolio Review",
      "Salary Negotiation Coaching",
      "24/7 Support",
      "Job Guarantee",
    ],
    validityDays: 365,
    price: 49999.00,
    currency: "INR",
    jobGuarantee: true,
    isActive: true,
    displayOrder: 3,
    enrolledStudents: 89,
    successRate: 92,
  },
]

export const studentPlacementStatus = {
  currentPackage: "Pro Placement",
  enrolledDate: "2026-01-15",
  expiresDate: "2026-07-15",
  resumeReviewed: true,
  mockInterviewsDone: 1,
  mockInterviewsTotal: 3,
  mentorSessionsDone: 1,
  mentorSessionsTotal: 2,
  linkedinReviewed: false,
  applicationsSent: 8,
  interviewsScheduled: 3,
}

// ==================== ADMIN MENTOR MANAGEMENT ====================
export const adminMentors = [
  { id: 1, name: "Raj Patel", company: "Google", roleTitle: "Senior Software Engineer", expertise: ["System Design", "DSA"], totalSessions: 124, rating: 4.9, status: "Active", verified: true, revenue: 310000 },
  { id: 2, name: "Priya Sharma", company: "Microsoft", roleTitle: "Product Manager", expertise: ["Product Management", "Career Transition"], totalSessions: 89, rating: 4.8, status: "Active", verified: true, revenue: 0 },
  { id: 3, name: "Aman Gupta", company: "Amazon", roleTitle: "Staff Software Engineer", expertise: ["Cloud Architecture", "AWS"], totalSessions: 210, rating: 4.95, status: "Active", verified: true, revenue: 735000 },
  { id: 4, name: "Neha Verma", company: "Flipkart", roleTitle: "Lead Data Scientist", expertise: ["Machine Learning", "Data Science"], totalSessions: 156, rating: 4.85, status: "Active", verified: true, revenue: 312000 },
  { id: 5, name: "Karthik Rajan", company: "Swiggy", roleTitle: "Design Lead", expertise: ["UI/UX Design", "Portfolio Review"], totalSessions: 67, rating: 4.7, status: "Active", verified: false, revenue: 0 },
]

// ==================== ADMIN REFERRAL MANAGEMENT ====================
export const adminReferralStats = {
  totalReferrals: 145,
  convertedThisMonth: 18,
  conversionRate: 38.5,
  topReferrers: [
    { name: "Alex Johnson", referrals: 12, conversions: 5 },
    { name: "Sarah Williams", referrals: 8, conversions: 3 },
    { name: "James Lee", referrals: 6, conversions: 2 },
    { name: "Emily Davis", referrals: 5, conversions: 2 },
    { name: "Michael Brown", referrals: 4, conversions: 1 },
  ],
  referralTrend: [
    { month: "Sep", referrals: 12, conversions: 4 },
    { month: "Oct", referrals: 18, conversions: 7 },
    { month: "Nov", referrals: 22, conversions: 9 },
    { month: "Dec", referrals: 20, conversions: 8 },
    { month: "Jan", referrals: 28, conversions: 12 },
    { month: "Feb", referrals: 25, conversions: 10 },
  ],
}

export const adminPlacementStats = {
  totalEnrollments: 479,
  activeStudents: 312,
  totalPlacements: 167,
  successRate: 74.5,
  totalRevenue: 4856000,
  packageBreakdown: [
    { package: "Basic", enrolled: 234, placed: 95, revenue: 1169766 },
    { package: "Pro", enrolled: 156, placed: 52, revenue: 2339844 },
    { package: "Premium", enrolled: 89, placed: 20, revenue: 4449911 },
  ],
}
