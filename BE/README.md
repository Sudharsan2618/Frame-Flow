# RecruitLMS Backend

FastAPI backend for the LMS + Recruitment Platform.

## Architecture

```
BE/
├── app/
│   ├── main.py              # FastAPI entry point
│   ├── config.py             # Pydantic settings (env-based)
│   ├── api/v1/               # API endpoints
│   │   ├── router.py         # V1 router
│   │   └── endpoints/
│   │       └── courses.py    # Course & student learning APIs
│   ├── models/
│   │   └── course.py         # SQLAlchemy ORM models
│   ├── schemas/
│   │   └── course.py         # Pydantic request/response models
│   ├── services/
│   │   └── course_service.py # Business logic layer
│   ├── repositories/
│   │   └── course_repository.py # Database queries
│   ├── db/
│   │   └── postgres.py       # Async PostgreSQL connection
│   └── storage/
│       └── gcs.py            # GCP Cloud Storage helper
├── scripts/
│   ├── setup_gcp.py          # Create GCS bucket
│   ├── seed_courses.py       # Seed 3 courses into PostgreSQL
│   └── upload_seed_assets.py # Upload PDFs to GCS
├── requirements.txt
├── .env.example
└── README.md
```

## Quick Start

### 1. Install Dependencies

```bash
cd BE
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
copy .env.example .env
# Edit .env with your PostgreSQL credentials
```

### 3. Set Up PostgreSQL

Make sure PostgreSQL is running and create the database:

```bash
psql -U postgres -c "CREATE DATABASE recruit_lms_db;"
psql -U postgres -d recruit_lms_db -f ../DB/001_postgresql_schema.sql
```

### 4. Seed Course Data

```bash
python -m scripts.seed_courses
```

This seeds:
- 📘 **Python for Data Science** (FREE) — 3 modules, 12 lessons, 1 quiz
- 📗 **Web Dev Fundamentals** (FREE) — 3 modules, 11 lessons, 1 quiz  
- 📕 **Machine Learning A-Z** (₹4,999) — 3 modules, 11 lessons, 1 quiz
- 📄 4 downloadable PDF materials
- 🃏 2 flashcard decks (12 cards)
- 🎓 1 demo student (student@recruitlms.com)

### 5. Set Up GCP Cloud Storage (Optional)

```bash
# Install gcloud CLI: https://cloud.google.com/sdk/docs/install
gcloud auth application-default login
python -m scripts.setup_gcp
python -m scripts.upload_seed_assets
```

### 6. Run the Server

```bash
uvicorn app.main:app --reload --port 8080
```

## API Endpoints

### Course Discovery
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/courses` | List courses (paginated, filterable) |
| GET | `/api/v1/courses/categories` | List categories |
| GET | `/api/v1/courses/{slug}` | Course detail + curriculum |
| GET | `/api/v1/courses/lessons/{id}` | Get lesson content |
| GET | `/api/v1/courses/quizzes/{id}` | Get quiz questions |
| POST | `/api/v1/courses/quizzes/{id}/submit` | Submit quiz answers |
| GET | `/api/v1/courses/{id}/materials` | Course materials |
| GET | `/api/v1/courses/flashcards/{id}` | Flashcard deck |

### Student Learning
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/students/enroll/{course_id}` | Enroll in course |
| GET | `/api/v1/students/enrollments` | My enrollments |
| POST | `/api/v1/students/enrollments/{course_id}/progress` | Update lesson progress |
| GET | `/api/v1/students/enrollments/{course_id}/progress` | Get all lesson progress |

### Utility
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/docs` | Swagger UI |
| GET | `/redoc` | ReDoc |

## Seed Course Content

### Course 1: Python for Data Science (FREE)
- **Module 1**: Python Fundamentals (4 video lessons + 1 quiz)
- **Module 2**: NumPy & Pandas (3 video lessons)
- **Module 3**: Data Visualization (3 video + 1 text project)

### Course 2: Web Development Fundamentals (FREE)
- **Module 1**: HTML5 Essentials (3 video + 1 quiz)
- **Module 2**: CSS3 & Responsive Design (3 video lessons)
- **Module 3**: JavaScript ES6+ (3 video + 1 text project)

### Course 3: Machine Learning A-Z (₹4,999)  
- **Module 1**: ML Foundations (3 video + 1 quiz)
- **Module 2**: Supervised Learning (3 video + 1 text lesson)
- **Module 3**: Neural Networks (3 video lessons)

All video lessons use real YouTube video IDs from educational channels.
