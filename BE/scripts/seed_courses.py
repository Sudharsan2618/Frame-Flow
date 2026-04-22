"""
Course Seed Data Script
========================
Seeds the PostgreSQL database with 3 real courses:
  1. Python for Data Science (FREE)
  2. Web Development Fundamentals (FREE)
  3. Machine Learning A-Z (PAID ₹4,999)

Usage:
    python -m scripts.seed_courses
"""

import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings

engine = create_engine(settings.SYNC_DATABASE_URL, echo=False)

# ── Long text content stored as Python variables to avoid triple-quote issues ──

LESSON_4_TEXT = '''# Functions in Python

## Defining Functions
```python
def greet(name: str) -> str:
    """Return a greeting message."""
    return f"Hello, {name}!"

print(greet("World"))
```

## Default Arguments
```python
def power(base, exponent=2):
    return base ** exponent

print(power(3))     # 9
print(power(3, 3))  # 27
```

## *args and **kwargs
```python
def summarize(*args, **kwargs):
    print(f"Positional: {args}")
    print(f"Keyword: {kwargs}")

summarize(1, 2, 3, name="test", value=42)
```

## Lambda Functions
```python
square = lambda x: x ** 2
numbers = [1, 2, 3, 4, 5]
squared = list(map(square, numbers))
print(squared)  # [1, 4, 9, 16, 25]
```

## Key Takeaways
- Functions make code reusable and readable
- Use type hints for better code documentation
- Lambda functions are concise for simple operations
- Modules help organize code into separate files
'''

LESSON_12_TEXT = '''# Data Visualization Capstone Project

## Objective
Build an interactive analytics dashboard analyzing the **Iris Dataset**.

## Steps

### 1. Load the Data
```python
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

df = pd.read_csv("https://raw.githubusercontent.com/mwaskom/seaborn-data/master/iris.csv")
print(df.head())
print(df.describe())
```

### 2. Distribution Analysis
```python
fig, axes = plt.subplots(2, 2, figsize=(12, 10))
for i, col in enumerate(df.columns[:4]):
    ax = axes[i // 2, i % 2]
    sns.histplot(data=df, x=col, hue="species", kde=True, ax=ax)
    ax.set_title(f"Distribution of {col}")
plt.tight_layout()
plt.savefig("distributions.png", dpi=150)
plt.show()
```

### 3. Correlation Heatmap
```python
plt.figure(figsize=(8, 6))
numeric_df = df.select_dtypes(include="number")
sns.heatmap(numeric_df.corr(), annot=True, cmap="coolwarm", center=0)
plt.title("Feature Correlation Heatmap")
plt.savefig("correlation.png", dpi=150)
plt.show()
```

### 4. Pair Plot
```python
sns.pairplot(df, hue="species", diag_kind="kde")
plt.suptitle("Iris Dataset Pair Plot", y=1.02)
plt.savefig("pairplot.png", dpi=150)
plt.show()
```

## Deliverable
Submit your notebook with all visualizations and a 200-word summary of your findings.
'''

LESSON_22_TEXT = '''# Build a Portfolio Website

## Objective
Create a responsive personal portfolio website using HTML, CSS, and JavaScript.

## Requirements
1. **Navigation Bar** - Fixed header with smooth scroll links
2. **Hero Section** - Full-screen intro with your name and title
3. **About Section** - Brief bio with a profile image
4. **Projects Grid** - Responsive card layout showcasing 3+ projects
5. **Contact Form** - Working form with JavaScript validation
6. **Footer** - Social media links

## Tech Stack
- Semantic HTML5
- CSS3 Flexbox & Grid
- Vanilla JavaScript (no frameworks)

## Starter Code

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Portfolio</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <nav class="navbar">
        <a href="#home" class="logo">Portfolio</a>
        <ul class="nav-links">
            <li><a href="#about">About</a></li>
            <li><a href="#projects">Projects</a></li>
            <li><a href="#contact">Contact</a></li>
        </ul>
    </nav>

    <section id="home" class="hero">
        <h1>Your Name</h1>
        <p>Full-Stack Developer</p>
    </section>

    <section id="projects" class="projects">
        <h2>My Projects</h2>
        <div class="project-grid">
            <!-- Add project cards here -->
        </div>
    </section>

    <script src="script.js"></script>
</body>
</html>
```

## Submission
Deploy on GitHub Pages and submit the live URL.
'''

LESSON_30_TEXT = '''# Model Evaluation Metrics

## Confusion Matrix
```python
from sklearn.metrics import confusion_matrix, classification_report
from sklearn.model_selection import cross_val_score

y_pred = model.predict(X_test)
cm = confusion_matrix(y_test, y_pred)
print(cm)
print(classification_report(y_test, y_pred))
```

## Key Metrics
| Metric | Formula | When to Use |
|--------|---------|-------------|
| **Accuracy** | (TP+TN) / Total | Balanced classes |
| **Precision** | TP / (TP+FP) | Minimize false positives |
| **Recall** | TP / (TP+FN) | Minimize false negatives |
| **F1-Score** | 2 * (P*R)/(P+R) | Imbalanced classes |

## Cross-Validation
```python
scores = cross_val_score(model, X, y, cv=5, scoring="f1_weighted")
print(f"CV F1: {scores.mean():.3f} +/- {scores.std():.3f}")
```

## Overfitting vs Underfitting
- **Overfitting**: Train accuracy >> Test accuracy - Regularize or get more data
- **Underfitting**: Both accuracies low - Use a more complex model

## Hyperparameter Tuning
```python
from sklearn.model_selection import GridSearchCV

param_grid = {
    "n_estimators": [100, 200, 500],
    "max_depth": [5, 10, 20, None],
}
grid = GridSearchCV(RandomForestClassifier(), param_grid, cv=5, scoring="f1_weighted")
grid.fit(X_train, y_train)
print(f"Best params: {grid.best_params_}")
```
'''


def seed():
    """Run all seed operations inside a single transaction."""
    with engine.begin() as conn:
        print("[SEED] Clearing old data...")
        # Delete in order of dependency
        conn.execute(text("DELETE FROM course_skills"))
        conn.execute(text("DELETE FROM materials"))
        conn.execute(text("DELETE FROM flashcards"))
        conn.execute(text("DELETE FROM flashcard_decks"))
        conn.execute(text("DELETE FROM quiz_questions"))
        conn.execute(text("DELETE FROM quizzes"))
        conn.execute(text("DELETE FROM lessons"))
        conn.execute(text("DELETE FROM modules"))
        conn.execute(text("DELETE FROM enrollments")) # Clear enrollments too to avoid FK issues
        conn.execute(text("DELETE FROM courses"))
        # We keep instructors/users/students as they are platform-wide, 
        # but content is cleared for a fresh seed.
        
        print("[SEED] Seeding course data...")

        # ── 1. Categories (insert one at a time to handle dual unique constraints) ──
        print("   [+] Categories...")
        categories = [
            ("Data Science", "data-science", "Courses on data analysis, statistics, and ML", 1),
            ("Web Development", "web-development", "Frontend and backend web technologies", 2),
            ("Machine Learning", "machine-learning", "AI and ML algorithms and applications", 3),
            ("Programming", "programming", "General programming and software engineering", 4),
        ]
        for name, slug, desc, order in categories:
            conn.execute(text(
                "INSERT INTO categories (name, slug, description, display_order, is_active) "
                "VALUES (:name, :slug, :desc, :ord, true) "
                "ON CONFLICT DO NOTHING"
            ), {"name": name, "slug": slug, "desc": desc, "ord": order})

        # ── 2. Skills ──
        print("   [+] Skills...")
        skills = [
            ("Python", "python", "Programming"),
            ("NumPy", "numpy", "Data Science"),
            ("Pandas", "pandas", "Data Science"),
            ("Matplotlib", "matplotlib", "Data Science"),
            ("HTML", "html", "Web Development"),
            ("CSS", "css", "Web Development"),
            ("JavaScript", "javascript", "Programming"),
            ("React", "react", "Web Development"),
            ("Machine Learning", "machine-learning", "Data Science"),
            ("TensorFlow", "tensorflow", "Data Science"),
            ("Scikit-Learn", "scikit-learn", "Data Science"),
            ("Data Visualization", "data-visualization", "Data Science"),
            ("SQL", "sql", "Programming"),
            ("Git", "git", "Programming"),
        ]
        for name, slug, cat in skills:
            conn.execute(text(
                "INSERT INTO skills (name, slug, category, is_active) "
                "VALUES (:name, :slug, :cat, true) "
                "ON CONFLICT DO NOTHING"
            ), {"name": name, "slug": slug, "cat": cat})

        # ── 3. Instructors ──
        print("   [+] Instructors...")
        conn.execute(text(
            "INSERT INTO users (user_id, email, password_hash, user_type, status, email_verified) VALUES "
            "(100, 'instructor1@recruitlms.com', '$2b$12$placeholder_hash_for_dev', 'instructor', 'active', true) "
            "ON CONFLICT DO NOTHING"
        ))
        conn.execute(text(
            "INSERT INTO users (user_id, email, password_hash, user_type, status, email_verified) VALUES "
            "(101, 'instructor2@recruitlms.com', '$2b$12$placeholder_hash_for_dev', 'instructor', 'active', true) "
            "ON CONFLICT DO NOTHING"
        ))

        conn.execute(text(
            "INSERT INTO instructors (instructor_id, user_id, first_name, last_name, bio, headline, is_active) VALUES "
            "(1, 100, 'Priya', 'Sharma', "
            "'Senior Data Scientist at Google with 10+ years of experience in ML and AI. Former professor at IIT Delhi.', "
            "'Senior Data Scientist | Google | IIT Delhi', true) "
            "ON CONFLICT DO NOTHING"
        ))
        conn.execute(text(
            "INSERT INTO instructors (instructor_id, user_id, first_name, last_name, bio, headline, is_active) VALUES "
            "(2, 101, 'Arjun', 'Mehta', "
            "'Full-stack developer and tech educator. Built products used by 1M+ users. Active YouTube creator.', "
            "'Full-Stack Developer | Tech Educator', true) "
            "ON CONFLICT DO NOTHING"
        ))

        # ── 4. Demo Student ──
        print("   [+] Demo student...")
        conn.execute(text(
            "INSERT INTO users (user_id, email, password_hash, user_type, status, email_verified) VALUES "
            "(200, 'student@recruitlms.com', '$2b$12$placeholder_hash_for_dev', 'student', 'active', true) "
            "ON CONFLICT DO NOTHING"
        ))
        conn.execute(text(
            "INSERT INTO students (student_id, user_id, first_name, last_name, bio, headline) VALUES "
            "(1, 200, 'Rahul', 'Kumar', 'Aspiring data scientist', 'B.Tech CS Student | Data Science Enthusiast') "
            "ON CONFLICT DO NOTHING"
        ))

        # ══════════════════════════════════════════════════════════════
        # COURSE 1: Python for Data Science (FREE)
        # ══════════════════════════════════════════════════════════════
        print("   [+] Course 1: Python for Data Science (FREE)...")
        conn.execute(text(
            "INSERT INTO courses ("
            "  course_id, title, slug, description, short_description, "
            "  category_id, difficulty_level, instructor_id, "
            "  pricing_model, price, currency, "
            "  duration_hours, total_modules, total_lessons, "
            "  thumbnail_url, preview_video_url, "
            "  is_published, published_at, "
            "  total_enrollments, average_rating, total_reviews, "
            "  meta_title, meta_description"
            ") VALUES ("
            "  1, "
            "  'Python for Data Science', "
            "  'python-for-data-science', "
            "  'Master Python programming for data science from scratch. Learn NumPy, Pandas, Matplotlib, and build real-world data analysis projects.', "
            "  'Complete Python for Data Science — from zero to data analyst. Includes NumPy, Pandas, and Matplotlib.', "
            "  (SELECT category_id FROM categories WHERE slug = 'data-science'), "
            "  'beginner', 1, "
            "  'free', 0, 'INR', "
            "  8.5, 3, 12, "
            "  'https://img.youtube.com/vi/rfscVS0vtbw/maxresdefault.jpg', "
            "  NULL, "
            "  true, NOW(), "
            "  1547, 4.72, 328, "
            "  'Python for Data Science | Free Online Course', "
            "  'Learn Python for data science with hands-on projects. Free course covering NumPy, Pandas, Matplotlib.'"
            ") ON CONFLICT DO NOTHING"
        ))

        # Module 1: Python Basics
        conn.execute(text(
            "INSERT INTO modules (module_id, course_id, title, description, order_index, duration_minutes, is_preview) VALUES "
            "(1, 1, 'Python Fundamentals', 'Get started with Python — variables, data types, control flow, and functions.', 1, 120, true) "
            "ON CONFLICT DO NOTHING"
        ))

        # Lessons 1-3: Video lessons
        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  video_external_id, video_external_platform, is_preview, is_mandatory) VALUES "
            "(1, 1, 'Introduction to Python', 'Why Python is the top language for data science', 'video', 1, 15, "
            "  'rfscVS0vtbw', 'youtube', true, true), "
            "(2, 1, 'Variables and Data Types', 'Strings, integers, floats, booleans, and type conversions', 'video', 2, 22, "
            "  'cQT33yu9pY8', 'youtube', false, true), "
            "(3, 1, 'Control Flow — If/Else and Loops', 'Conditionals, for loops, while loops, and list comprehensions', 'video', 3, 28, "
            "  'PqFKRqpHrjw', 'youtube', false, true) "
            "ON CONFLICT DO NOTHING"
        ))

        # Lesson 4: Text lesson (uses parameterized query to avoid quote issues)
        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  text_content, is_preview, is_mandatory) VALUES "
            "(4, 1, 'Functions and Modules', 'Write reusable code with functions, args, kwargs, and imports', 'text', 4, 20, "
            "  :text_content, false, true) "
            "ON CONFLICT DO NOTHING"
        ), {"text_content": LESSON_4_TEXT})

        # Lesson 5: Quiz lesson
        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, is_preview, is_mandatory) VALUES "
            "(5, 1, 'Python Basics Quiz', 'Test your understanding of Python fundamentals', 'quiz', 5, 10, false, true) "
            "ON CONFLICT DO NOTHING"
        ))

        # Lesson 35: PDF lesson
        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, is_preview, is_mandatory, content_url) VALUES "
            "(35, 1, 'Python Setup Guide (PDF)', 'Step-by-step guide to installing Python and Jupyter', 'pdf', 6, 15, true, true, "
            "  'https://storage.googleapis.com/recruitlms-assets/materials/pdfs/python-cheatsheet.pdf') "
            "ON CONFLICT DO NOTHING"
        ))

        # Quiz 1
        conn.execute(text(
            "INSERT INTO quizzes (quiz_id, lesson_id, title, description, instructions, pass_percentage, time_limit_minutes, max_attempts, total_questions) VALUES "
            "(1, 5, 'Python Fundamentals Quiz', 'Test your knowledge of Python basics', "
            "'Choose the best answer for each question. You need 70%% to pass.', 70.00, 15, 3, 5) "
            "ON CONFLICT DO NOTHING"
        ))

        # Quiz 1 Questions
        q1_options = json.dumps([
            {"text": "<class 'int'>", "is_correct": False},
            {"text": "<class 'float'>", "is_correct": True},
            {"text": "<class 'str'>", "is_correct": False},
            {"text": "<class 'double'>", "is_correct": False},
        ])
        q2_options = json.dumps([
            {"text": "function", "is_correct": False},
            {"text": "def", "is_correct": True},
            {"text": "func", "is_correct": False},
            {"text": "define", "is_correct": False},
        ])
        q3_options = json.dumps([
            {"text": "True", "is_correct": False},
            {"text": "False", "is_correct": True},
        ])
        q4_options = json.dumps([
            {"text": "4", "is_correct": False},
            {"text": "5", "is_correct": True},
            {"text": "6", "is_correct": False},
            {"text": "Error", "is_correct": False},
        ])
        q5_options = json.dumps([
            {"text": "list", "is_correct": False},
            {"text": "dict", "is_correct": False},
            {"text": "array", "is_correct": True},
            {"text": "tuple", "is_correct": False},
        ])

        conn.execute(text(
            "INSERT INTO quiz_questions (question_id, quiz_id, question_text, question_type, options, correct_answer, explanation, points, order_index) VALUES "
            "(1, 1, 'What is the output of: print(type(3.14))?', 'multiple_choice', :q1, 'float', 'In Python, 3.14 is a floating-point number.', 1, 1), "
            "(2, 1, 'Which keyword is used to define a function in Python?', 'multiple_choice', :q2, 'def', 'Python uses the def keyword to define functions.', 1, 2), "
            "(3, 1, 'Python is a statically-typed language.', 'true_false', :q3, 'False', 'Python is dynamically-typed.', 1, 3), "
            "(4, 1, 'What does len() return for the string Hello?', 'multiple_choice', :q4, '5', 'len() returns the number of characters.', 1, 4), "
            "(5, 1, 'Which of the following is NOT a valid Python data type?', 'multiple_choice', :q5, 'array', 'array requires importing the array module.', 1, 5) "
            "ON CONFLICT DO NOTHING"
        ), {"q1": q1_options, "q2": q2_options, "q3": q3_options, "q4": q4_options, "q5": q5_options})

        # Module 2: NumPy & Pandas
        conn.execute(text(
            "INSERT INTO modules (module_id, course_id, title, description, order_index, duration_minutes, is_preview) VALUES "
            "(2, 1, 'Data Manipulation with NumPy & Pandas', 'Master the two most important libraries for data wrangling in Python.', 2, 160, false) "
            "ON CONFLICT DO NOTHING"
        ))

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  video_external_id, video_external_platform, is_preview, is_mandatory) VALUES "
            "(6, 2, 'NumPy Arrays and Operations', 'Creating arrays, indexing, slicing, and vectorized operations', 'video', 1, 25, "
            "  'QUT1VHiLmmI', 'youtube', false, true), "
            "(7, 2, 'Pandas DataFrames', 'Loading data, filtering, grouping, and aggregation', 'video', 2, 30, "
            "  'vmEHCJofslg', 'youtube', false, true), "
            "(8, 2, 'Data Cleaning with Pandas', 'Handling missing values, duplicates, and data type conversions', 'video', 3, 25, "
            "  'bDhvCp3_lYw', 'youtube', false, true) "
            "ON CONFLICT DO NOTHING"
        ))

        # Module 3: Data Visualization
        conn.execute(text(
            "INSERT INTO modules (module_id, course_id, title, description, order_index, duration_minutes, is_preview) VALUES "
            "(3, 1, 'Data Visualization with Matplotlib', 'Create compelling charts, graphs, and dashboards.', 3, 140, false) "
            "ON CONFLICT DO NOTHING"
        ))

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  video_external_id, video_external_platform, is_preview, is_mandatory) VALUES "
            "(9, 3, 'Matplotlib Basics', 'Line plots, bar charts, scatter plots, and customization', 'video', 1, 28, "
            "  'UO98lJQ3QGI', 'youtube', false, true), "
            "(10, 3, 'Advanced Visualization', 'Subplots, heatmaps, 3D plots, and styling', 'video', 2, 22, "
            "  'DAQNHzOcO5A', 'youtube', false, true), "
            "(11, 3, 'Seaborn for Statistical Plots', 'Statistical visualization with Seaborn library', 'video', 3, 18, "
            "  'GcXcSZ0gQps', 'youtube', false, true) "
            "ON CONFLICT DO NOTHING"
        ))

        # Lesson 12: Text project lesson
        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  text_content, is_preview, is_mandatory) VALUES "
            "(12, 3, 'Data Visualization Project', 'Build a complete analytics dashboard from a real dataset', 'text', 4, 30, "
            "  :text_content, false, true) "
            "ON CONFLICT DO NOTHING"
        ), {"text_content": LESSON_12_TEXT})

        # ══════════════════════════════════════════════════════════════
        # COURSE 2: Web Development Fundamentals (FREE)
        # ══════════════════════════════════════════════════════════════
        print("   [+] Course 2: Web Development Fundamentals (FREE)...")
        conn.execute(text(
            "INSERT INTO courses ("
            "  course_id, title, slug, description, short_description, "
            "  category_id, difficulty_level, instructor_id, "
            "  pricing_model, price, currency, "
            "  duration_hours, total_modules, total_lessons, "
            "  thumbnail_url, is_published, published_at, "
            "  total_enrollments, average_rating, total_reviews, "
            "  meta_title, meta_description"
            ") VALUES ("
            "  2, "
            "  'Web Development Fundamentals', "
            "  'web-development-fundamentals', "
            "  'Learn to build modern, responsive websites from scratch. Covers HTML5, CSS3, and JavaScript ES6+ with hands-on projects.', "
            "  'Build responsive websites from scratch with HTML, CSS, and JavaScript. Perfect for beginners.', "
            "  (SELECT category_id FROM categories WHERE slug = 'web-development'), "
            "  'beginner', 2, "
            "  'free', 0, 'INR', "
            "  6.0, 3, 11, "
            "  'https://img.youtube.com/vi/UB1O30fR-EE/maxresdefault.jpg', "
            "  true, NOW(), "
            "  2103, 4.65, 445, "
            "  'Web Development Fundamentals | Free HTML CSS JS Course', "
            "  'Build modern responsive websites. Free course covering HTML5, CSS3, JavaScript ES6+.'"
            ") ON CONFLICT DO NOTHING"
        ))

        # Module 4: HTML
        conn.execute(text(
            "INSERT INTO modules (module_id, course_id, title, description, order_index, duration_minutes, is_preview) VALUES "
            "(4, 2, 'HTML5 Essentials', 'Structure web pages with semantic HTML5 elements.', 1, 100, true) "
            "ON CONFLICT DO NOTHING"
        ))

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  video_external_id, video_external_platform, is_preview, is_mandatory) VALUES "
            "(13, 4, 'HTML Document Structure', 'DOCTYPE, head, body, meta tags, and semantic elements', 'video', 1, 18, "
            "  'UB1O30fR-EE', 'youtube', true, true), "
            "(14, 4, 'Forms and Input Elements', 'Text inputs, selects, checkboxes, validation attributes', 'video', 2, 22, "
            "  'fNcJuPIZ2WE', 'youtube', false, true), "
            "(15, 4, 'Tables, Lists, and Media', 'Tables, ordered/unordered lists, images, audio, video elements', 'video', 3, 16, "
            "  'kUMe1FH4CHE', 'youtube', false, true) "
            "ON CONFLICT DO NOTHING"
        ))

        # Lesson 23: HTML Quiz lesson
        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, is_preview, is_mandatory) VALUES "
            "(23, 4, 'HTML Basics Quiz', 'Test your HTML knowledge', 'quiz', 4, 8, false, true) "
            "ON CONFLICT DO NOTHING"
        ))

        # Module 5: CSS
        conn.execute(text(
            "INSERT INTO modules (module_id, course_id, title, description, order_index, duration_minutes, is_preview) VALUES "
            "(5, 2, 'CSS3 and Responsive Design', 'Style and layout with CSS3, Flexbox, and Grid.', 2, 120, false) "
            "ON CONFLICT DO NOTHING"
        ))

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  video_external_id, video_external_platform, is_preview, is_mandatory) VALUES "
            "(16, 5, 'CSS Selectors and Box Model', 'Selectors, specificity, margins, padding, borders', 'video', 1, 25, "
            "  'yfoY53QXEnI', 'youtube', false, true), "
            "(17, 5, 'Flexbox Layout', 'Build flexible layouts with CSS Flexbox', 'video', 2, 20, "
            "  'fYq5PXgSsbE', 'youtube', false, true), "
            "(18, 5, 'CSS Grid', 'Advanced 2D layouts with CSS Grid', 'video', 3, 22, "
            "  '9zBsdzdE4sM', 'youtube', false, true) "
            "ON CONFLICT DO NOTHING"
        ))

        # Module 6: JavaScript
        conn.execute(text(
            "INSERT INTO modules (module_id, course_id, title, description, order_index, duration_minutes, is_preview) VALUES "
            "(6, 2, 'JavaScript ES6+ Essentials', 'Add interactivity with modern JavaScript.', 3, 140, false) "
            "ON CONFLICT DO NOTHING"
        ))

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  video_external_id, video_external_platform, is_preview, is_mandatory) VALUES "
            "(19, 6, 'JavaScript Basics', 'Variables, data types, operators, and template literals', 'video', 1, 30, "
            "  'hdI2bqOjy3c', 'youtube', false, true), "
            "(20, 6, 'DOM Manipulation', 'Select, modify, and create HTML elements with JavaScript', 'video', 2, 25, "
            "  'y17RuWkWdn8', 'youtube', false, true), "
            "(21, 6, 'Async JavaScript', 'Promises, async/await, and the Fetch API', 'video', 3, 22, "
            "  'PoRJizFvM7s', 'youtube', false, true) "
            "ON CONFLICT DO NOTHING"
        ))

        # Lesson 22: Text project lesson
        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  text_content, is_preview, is_mandatory) VALUES "
            "(22, 6, 'Web Dev Project: Portfolio Site', 'Build a responsive portfolio website', 'text', 4, 35, "
            "  :text_content, false, true) "
            "ON CONFLICT DO NOTHING"
        ), {"text_content": LESSON_22_TEXT})

        # Quiz 2: HTML
        conn.execute(text(
            "INSERT INTO quizzes (quiz_id, lesson_id, title, pass_percentage, time_limit_minutes, max_attempts, total_questions) VALUES "
            "(2, 23, 'HTML5 Essentials Quiz', 70.00, 10, 3, 4) "
            "ON CONFLICT DO NOTHING"
        ))

        html_q1 = json.dumps([
            {"text": "<navigation>", "is_correct": False},
            {"text": "<nav>", "is_correct": True},
            {"text": "<menu>", "is_correct": False},
            {"text": "<header>", "is_correct": False},
        ])
        html_q2 = json.dumps([
            {"text": "True", "is_correct": False},
            {"text": "False", "is_correct": True},
        ])
        html_q3 = json.dumps([
            {"text": "mandatory", "is_correct": False},
            {"text": "required", "is_correct": True},
            {"text": "validate", "is_correct": False},
            {"text": "notempty", "is_correct": False},
        ])
        html_q4 = json.dumps([
            {"text": "<video>", "is_correct": False},
            {"text": "<embed>", "is_correct": False},
            {"text": "<iframe>", "is_correct": True},
            {"text": "<object>", "is_correct": False},
        ])

        conn.execute(text(
            "INSERT INTO quiz_questions (question_id, quiz_id, question_text, question_type, options, correct_answer, explanation, points, order_index) VALUES "
            "(6, 2, 'Which HTML5 element is used for navigation links?', 'multiple_choice', :q1, 'nav', 'The nav element represents navigation links.', 1, 1), "
            "(7, 2, 'The div element is a semantic HTML5 element.', 'true_false', :q2, 'False', 'div is a generic container with no semantic meaning.', 1, 2), "
            "(8, 2, 'What attribute makes an input field required?', 'multiple_choice', :q3, 'required', 'The required attribute prevents form submission until filled.', 1, 3), "
            "(9, 2, 'Which element is used to embed a YouTube video?', 'multiple_choice', :q4, 'iframe', 'YouTube videos are embedded using iframe.', 1, 4) "
            "ON CONFLICT DO NOTHING"
        ), {"q1": html_q1, "q2": html_q2, "q3": html_q3, "q4": html_q4})

        # ══════════════════════════════════════════════════════════════
        # COURSE 3: Machine Learning A-Z (PAID ₹4,999)
        # ══════════════════════════════════════════════════════════════
        print("   [+] Course 3: Machine Learning A-Z (PAID Rs.4,999)...")
        conn.execute(text(
            "INSERT INTO courses ("
            "  course_id, title, slug, description, short_description, "
            "  category_id, difficulty_level, instructor_id, "
            "  pricing_model, price, currency, discount_price, "
            "  duration_hours, total_modules, total_lessons, "
            "  thumbnail_url, is_published, published_at, "
            "  total_enrollments, average_rating, total_reviews, "
            "  meta_title, meta_description"
            ") VALUES ("
            "  3, "
            "  'Machine Learning A-Z: From Theory to Production', "
            "  'machine-learning-a-z', "
            "  'A comprehensive ML course covering supervised, unsupervised learning, and neural networks. Build 10+ real-world projects.', "
            "  'Master ML from theory to production — supervised, unsupervised, neural networks with 10+ projects.', "
            "  (SELECT category_id FROM categories WHERE slug = 'machine-learning'), "
            "  'intermediate', 1, "
            "  'one_time', 4999, 'INR', 2999, "
            "  14.0, 3, 11, "
            "  'https://img.youtube.com/vi/ukzFI9rgwfU/maxresdefault.jpg', "
            "  true, NOW(), "
            "  874, 4.85, 213, "
            "  'Machine Learning A-Z | Comprehensive ML Course', "
            "  'Master machine learning from theory to production. 10+ projects with Python, Scikit-Learn, TensorFlow.'"
            ") ON CONFLICT DO NOTHING"
        ))

        # Module 7: ML Foundations
        conn.execute(text(
            "INSERT INTO modules (module_id, course_id, title, description, order_index, duration_minutes, is_preview) VALUES "
            "(7, 3, 'Machine Learning Foundations', 'Understand the core concepts, types of ML, and the ML pipeline.', 1, 120, true) "
            "ON CONFLICT DO NOTHING"
        ))

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  video_external_id, video_external_platform, is_preview, is_mandatory) VALUES "
            "(24, 7, 'What is Machine Learning?', 'Types of ML, real-world applications, and the ML workflow', 'video', 1, 20, "
            "  'ukzFI9rgwfU', 'youtube', true, true), "
            "(25, 7, 'Setting Up Your ML Environment', 'Install Python, Jupyter, Scikit-Learn, and TensorFlow', 'video', 2, 15, "
            "  '1S4gJGFVNAI', 'youtube', true, true), "
            "(26, 7, 'Data Preprocessing Pipeline', 'Cleaning, normalization, encoding, and train-test split', 'video', 3, 25, "
            "  'OTnHhEJNjMo', 'youtube', false, true) "
            "ON CONFLICT DO NOTHING"
        ))

        # Lesson 34: ML Quiz lesson
        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, is_preview, is_mandatory) VALUES "
            "(34, 7, 'ML Foundations Quiz', 'Test your ML knowledge', 'quiz', 4, 10, false, true) "
            "ON CONFLICT DO NOTHING"
        ))

        # Module 8: Supervised Learning
        conn.execute(text(
            "INSERT INTO modules (module_id, course_id, title, description, order_index, duration_minutes, is_preview) VALUES "
            "(8, 3, 'Supervised Learning Algorithms', 'Linear Regression, Decision Trees, Random Forests, SVMs, and more.', 2, 180, false) "
            "ON CONFLICT DO NOTHING"
        ))

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  video_external_id, video_external_platform, is_preview, is_mandatory) VALUES "
            "(27, 8, 'Linear Regression — Theory and Code', 'Simple and multiple linear regression with Scikit-Learn', 'video', 1, 30, "
            "  'NUXdtN1W1FE', 'youtube', false, true), "
            "(28, 8, 'Classification: Logistic Regression and KNN', 'Binary and multiclass classification', 'video', 2, 28, "
            "  'yIYKR4sgzI8', 'youtube', false, true), "
            "(29, 8, 'Decision Trees and Random Forests', 'Ensemble methods for better predictions', 'video', 3, 30, "
            "  'J4Wdy0Wc_xQ', 'youtube', false, true) "
            "ON CONFLICT DO NOTHING"
        ))

        # Lesson 30: Text lesson
        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  text_content, is_preview, is_mandatory) VALUES "
            "(30, 8, 'Model Evaluation and Cross-Validation', 'Accuracy, precision, recall, F1-score, confusion matrix', 'text', 4, 20, "
            "  :text_content, false, true) "
            "ON CONFLICT DO NOTHING"
        ), {"text_content": LESSON_30_TEXT})

        # Module 9: Neural Networks
        conn.execute(text(
            "INSERT INTO modules (module_id, course_id, title, description, order_index, duration_minutes, is_preview) VALUES "
            "(9, 3, 'Neural Networks and Deep Learning', 'Build neural networks with TensorFlow and Keras.', 3, 200, false) "
            "ON CONFLICT DO NOTHING"
        ))

        conn.execute(text(
            "INSERT INTO lessons (lesson_id, module_id, title, description, content_type, order_index, duration_minutes, "
            "  video_external_id, video_external_platform, is_preview, is_mandatory) VALUES "
            "(31, 9, 'Neural Network Fundamentals', 'Perceptrons, activation functions, backpropagation', 'video', 1, 28, "
            "  'aircAruvnKk', 'youtube', false, true), "
            "(32, 9, 'Building a Neural Network with TensorFlow', 'Sequential model, Dense layers, training', 'video', 2, 35, "
            "  'tPYj3fFJGjk', 'youtube', false, true), "
            "(33, 9, 'Convolutional Neural Networks', 'Image classification with CNNs', 'video', 3, 30, "
            "  'YRhxdVk_sIs', 'youtube', false, true) "
            "ON CONFLICT DO NOTHING"
        ))

        # Quiz 3: ML Foundations
        conn.execute(text(
            "INSERT INTO quizzes (quiz_id, lesson_id, title, pass_percentage, time_limit_minutes, max_attempts, total_questions) VALUES "
            "(3, 34, 'ML Foundations Quiz', 70.00, 12, 3, 4) "
            "ON CONFLICT DO NOTHING"
        ))

        ml_q1 = json.dumps([
            {"text": "Supervised Learning", "is_correct": True},
            {"text": "Unsupervised Learning", "is_correct": False},
            {"text": "Reinforcement Learning", "is_correct": False},
            {"text": "Semi-supervised Learning", "is_correct": False},
        ])
        ml_q2 = json.dumps([
            {"text": "True", "is_correct": True},
            {"text": "False", "is_correct": False},
        ])
        ml_q3 = json.dumps([
            {"text": "Logistic Regression", "is_correct": False},
            {"text": "Linear Regression", "is_correct": True},
            {"text": "KNN", "is_correct": False},
            {"text": "Decision Tree", "is_correct": False},
        ])
        ml_q4 = json.dumps([
            {"text": "Number of clusters", "is_correct": False},
            {"text": "Number of nearest neighbors", "is_correct": True},
            {"text": "Number of features", "is_correct": False},
            {"text": "Kernel size", "is_correct": False},
        ])

        conn.execute(text(
            "INSERT INTO quiz_questions (question_id, quiz_id, question_text, question_type, options, correct_answer, explanation, points, order_index) VALUES "
            "(10, 3, 'Which type of ML uses labeled training data?', 'multiple_choice', :q1, 'Supervised Learning', 'Supervised learning uses labeled data for training.', 1, 1), "
            "(11, 3, 'Overfitting means model performs well on training but poorly on test data.', 'true_false', :q2, 'True', 'Overfitting is memorizing training data instead of learning patterns.', 1, 2), "
            "(12, 3, 'Which algorithm is best for predicting continuous values?', 'multiple_choice', :q3, 'Linear Regression', 'Linear regression predicts continuous outcomes.', 1, 3), "
            "(13, 3, 'What does the k in KNN stand for?', 'multiple_choice', :q4, 'Number of nearest neighbors', 'K is how many nearest data points to consider.', 1, 4) "
            "ON CONFLICT DO NOTHING"
        ), {"q1": ml_q1, "q2": ml_q2, "q3": ml_q3, "q4": ml_q4})

        # ── Course Skills Junction ──
        print("   [+] Course-Skill associations...")
        conn.execute(text(
            "INSERT INTO course_skills (course_id, skill_id, is_primary) VALUES "
            "(1, (SELECT skill_id FROM skills WHERE slug = 'python'), true), "
            "(1, (SELECT skill_id FROM skills WHERE slug = 'numpy'), false), "
            "(1, (SELECT skill_id FROM skills WHERE slug = 'pandas'), false), "
            "(1, (SELECT skill_id FROM skills WHERE slug = 'matplotlib'), false), "
            "(1, (SELECT skill_id FROM skills WHERE slug = 'data-visualization'), false), "
            "(2, (SELECT skill_id FROM skills WHERE slug = 'html'), true), "
            "(2, (SELECT skill_id FROM skills WHERE slug = 'css'), true), "
            "(2, (SELECT skill_id FROM skills WHERE slug = 'javascript'), true), "
            "(3, (SELECT skill_id FROM skills WHERE slug = 'python'), false), "
            "(3, (SELECT skill_id FROM skills WHERE slug = 'machine-learning'), true), "
            "(3, (SELECT skill_id FROM skills WHERE slug = 'tensorflow'), false), "
            "(3, (SELECT skill_id FROM skills WHERE slug = 'scikit-learn'), false) "
            "ON CONFLICT DO NOTHING"
        ))

        # ── Materials ──
        print("   [+] Materials...")
        conn.execute(text(
            "INSERT INTO materials (material_id, title, description, course_id, file_type, file_url, file_size_bytes, pricing_model, is_published) VALUES "
            "(1, 'Python Cheat Sheet', 'Complete Python syntax reference for data science', 1, 'PDF', "
            "  'https://storage.googleapis.com/recruitlms-assets/materials/pdfs/python-cheatsheet.pdf', 245760, 'free', true), "
            "(2, 'NumPy & Pandas Quick Reference', 'Key functions and methods for NumPy and Pandas', 1, 'PDF', "
            "  'https://storage.googleapis.com/recruitlms-assets/materials/pdfs/numpy-pandas-reference.pdf', 184320, 'free', true), "
            "(3, 'HTML5 & CSS3 Reference Card', 'All HTML5 tags and CSS3 properties in one document', 2, 'PDF', "
            "  'https://storage.googleapis.com/recruitlms-assets/materials/pdfs/html-css-reference.pdf', 204800, 'free', true), "
            "(4, 'ML Algorithms Comparison Guide', 'When to use which algorithm — pros, cons, and use cases', 3, 'PDF', "
            "  'https://storage.googleapis.com/recruitlms-assets/materials/pdfs/ml-algorithms-guide.pdf', 327680, 'free', true) "
            "ON CONFLICT DO NOTHING"
        ))

        # ── Flashcard Decks ──
        print("   [+] Flashcard decks...")
        conn.execute(text(
            "INSERT INTO flashcard_decks (deck_id, course_id, title, description, total_cards) VALUES "
            "(1, 1, 'Python Data Types', 'Quick review of Python built-in data types', 6), "
            "(2, 3, 'ML Key Concepts', 'Essential ML terminology and concepts', 6) "
            "ON CONFLICT DO NOTHING"
        ))

        conn.execute(text(
            "INSERT INTO flashcards (flashcard_id, deck_id, front_content, back_content, order_index) VALUES "
            "(1, 1, 'What is a Python list?', 'An ordered, mutable collection of items. Created with [] or list(). Supports indexing and slicing.', 1), "
            "(2, 1, 'Difference between list and tuple?', 'Lists are mutable, tuples are immutable. Tuples use () and are faster.', 2), "
            "(3, 1, 'What is a dictionary?', 'An unordered collection of key-value pairs. Keys must be unique and hashable.', 3), "
            "(4, 1, 'How to handle missing values in Pandas?', 'Use df.dropna() to remove, df.fillna(value) to replace, or df.interpolate().', 4), "
            "(5, 1, 'What does df.groupby() do?', 'Groups DataFrame rows by a column and allows aggregate operations like sum(), mean(), count().', 5), "
            "(6, 1, 'NumPy array vs Python list?', 'NumPy arrays are faster, use less memory, support vectorized operations.', 6), "
            "(7, 2, 'What is the bias-variance tradeoff?', 'High bias = underfitting. High variance = overfitting. Goal: minimize both.', 1), "
            "(8, 2, 'What is gradient descent?', 'An optimization algorithm that adjusts parameters to minimize a loss function.', 2), "
            "(9, 2, 'What is cross-validation?', 'Evaluate model by splitting data into k folds, training on k-1 and testing on 1.', 3), "
            "(10, 2, 'What is regularization?', 'Prevents overfitting by adding a penalty term (L1 = Lasso, L2 = Ridge).', 4), "
            "(11, 2, 'What is a confusion matrix?', 'A table showing True Positives, True Negatives, False Positives, False Negatives.', 5), "
            "(12, 2, 'What is feature engineering?', 'Creating new features from raw data — includes encoding, scaling, and transformations.', 6) "
            "ON CONFLICT DO NOTHING"
        ))

        print("")
        print("[DONE] Seed data complete!")
        print("   Course 1: Python for Data Science (FREE) -- 3 modules, 12 lessons, 1 quiz")
        print("   Course 2: Web Development Fundamentals (FREE) -- 3 modules, 11 lessons, 1 quiz")
        print("   Course 3: Machine Learning A-Z (PAID Rs.4,999) -- 3 modules, 11 lessons, 1 quiz")
        print("   4 downloadable materials")
        print("   2 flashcard decks (12 cards)")
        print("   1 demo student (student@recruitlms.com)")


if __name__ == "__main__":
    seed()
