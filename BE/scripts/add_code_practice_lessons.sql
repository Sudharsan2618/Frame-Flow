-- ============================================================================
-- SQL MASTERCLASS - CODE PLAYGROUND UPDATE SCRIPT
-- ============================================================================
-- Adds "Code Practice" lessons to the SQL Masterclass course (course_id = 4)
-- These lessons contain text_content instructions that point students
-- to use the Code Playground feature in the course player.
-- ============================================================================

-- IMPORTANT: This script uses module IDs relative to course_id = 4.
-- You MUST first check your actual module IDs with:
--   SELECT module_id, title, order_index FROM modules WHERE course_id = 4 ORDER BY order_index;
-- Then update the module_id references below if they differ.

-- ============================================================================
-- STEP 1: Query existing modules for course_id = 4
-- Run this first to get the actual module_id values:
-- ============================================================================
-- SELECT module_id, title, order_index FROM modules WHERE course_id = 4 ORDER BY order_index;

-- ============================================================================
-- STEP 0: Fix sequence (REQUIRED — prevents duplicate key errors)
-- The lesson_id sequence may be behind the actual max ID in the table.
-- ============================================================================
SELECT setval(
  pg_get_serial_sequence('lessons', 'lesson_id'),
  (SELECT MAX(lesson_id) FROM lessons)
);

-- Helper: Get the max lesson order_index per module to append at the end
-- We'll use order_index = (SELECT COALESCE(MAX(order_index), 0) + 1 FROM lessons WHERE module_id = X)

-- ── Module 1: RDBMS & SQL Fundamentals ──
INSERT INTO lessons (module_id, title, description, content_type, order_index, duration_minutes, is_preview, text_content)
SELECT 
  m.module_id,
  '🧪 Practice: Basic SQL Queries',
  'Hands-on practice with SELECT statements, WHERE clauses, and basic filtering. Use the Code Playground below to run queries against a sample database.',
  'text',
  COALESCE((SELECT MAX(order_index) FROM lessons WHERE module_id = m.module_id), 0) + 1,
  15,
  FALSE,
  E'## 🧪 Code Practice: Basic SQL Queries\n\nOpen the **Code Playground** panel below to practice SQL queries!\n\n### Available Tables\n- `employees` — employee records with salary, department, hire date\n- `departments` — department names and locations\n- `products` — product catalog with prices and stock\n- `orders` — customer orders with status tracking\n\n### Try These Queries\n\n**1. Select all employees:**\n```sql\nSELECT * FROM employees;\n```\n\n**2. Filter by salary:**\n```sql\nSELECT first_name, last_name, salary \nFROM employees \nWHERE salary > 70000;\n```\n\n**3. Sort results:**\n```sql\nSELECT * FROM employees \nORDER BY hire_date DESC;\n```\n\n**4. Count employees:**\n```sql\nSELECT COUNT(*) AS total_employees FROM employees;\n```\n\n👉 Click the **Code Playground** tab below and try these queries!'
FROM modules m 
WHERE m.course_id = 4 AND m.order_index = 1
LIMIT 1;

-- ── Module 2: SQL Query Techniques ──
INSERT INTO lessons (module_id, title, description, content_type, order_index, duration_minutes, is_preview, text_content)
SELECT 
  m.module_id,
  '🧪 Practice: WHERE, AND, OR, IN, BETWEEN',
  'Practice filtering data with multiple conditions using WHERE clause operators.',
  'text',
  COALESCE((SELECT MAX(order_index) FROM lessons WHERE module_id = m.module_id), 0) + 1,
  20,
  FALSE,
  E'## 🧪 Code Practice: Filtering Data\n\nMaster the WHERE clause with these exercises!\n\n### Exercises\n\n**1. Multiple conditions with AND:**\n```sql\nSELECT first_name, last_name, salary, department_id\nFROM employees\nWHERE salary > 60000 AND department_id = 1;\n```\n\n**2. Using OR:**\n```sql\nSELECT * FROM employees\nWHERE department_id = 1 OR department_id = 3;\n```\n\n**3. IN operator:**\n```sql\nSELECT * FROM products\nWHERE category IN (''Electronics'', ''Accessories'');\n```\n\n**4. BETWEEN for ranges:**\n```sql\nSELECT * FROM employees\nWHERE salary BETWEEN 60000 AND 80000;\n```\n\n**5. LIKE for pattern matching:**\n```sql\nSELECT * FROM employees\nWHERE email LIKE ''%@company.com'';\n```\n\n### Your Turn!\nTry writing a query that finds all orders with status ''delivered'' and total_amount > 100000.\n\n👉 Open the **Code Playground** below to practice!'
FROM modules m 
WHERE m.course_id = 4 AND m.order_index = 2
LIMIT 1;

-- ── Module 3: JOINs ──
INSERT INTO lessons (module_id, title, description, content_type, order_index, duration_minutes, is_preview, text_content)
SELECT 
  m.module_id,
  '🧪 Practice: SQL JOINs',
  'Practice INNER JOIN, LEFT JOIN, and multi-table queries using the Code Playground.',
  'text',
  COALESCE((SELECT MAX(order_index) FROM lessons WHERE module_id = m.module_id), 0) + 1,
  25,
  FALSE,
  E'## 🧪 Code Practice: SQL JOINs\n\nJOINs are the most powerful feature of SQL. Practice them here!\n\n### Exercises\n\n**1. INNER JOIN — Employees with Department Names:**\n```sql\nSELECT e.first_name, e.last_name, d.department_name, e.salary\nFROM employees e\nINNER JOIN departments d ON e.department_id = d.department_id;\n```\n\n**2. LEFT JOIN — All departments, even empty ones:**\n```sql\nSELECT d.department_name, COUNT(e.employee_id) AS emp_count\nFROM departments d\nLEFT JOIN employees e ON d.department_id = e.department_id\nGROUP BY d.department_name;\n```\n\n**3. JOIN Orders with Products:**\n```sql\nSELECT o.order_id, o.customer_name, p.product_name, \n       o.quantity, p.price, o.total_amount\nFROM orders o\nJOIN products p ON o.product_id = p.product_id\nORDER BY o.order_date DESC;\n```\n\n**4. Self JOIN — Employees and their Managers:**\n```sql\nSELECT e.first_name || '' '' || e.last_name AS employee,\n       m.first_name || '' '' || m.last_name AS manager\nFROM employees e\nLEFT JOIN employees m ON e.manager_id = m.employee_id;\n```\n\n### Challenge!\nWrite a query that shows each department name, the number of employees, and the average salary.\n\n👉 Open the **Code Playground** below!'
FROM modules m 
WHERE m.course_id = 4 AND m.order_index = 3
LIMIT 1;

-- ── Module 4: Aggregation & GROUP BY ──
INSERT INTO lessons (module_id, title, description, content_type, order_index, duration_minutes, is_preview, text_content)
SELECT 
  m.module_id,
  '🧪 Practice: GROUP BY, HAVING & Aggregates',
  'Practice aggregate functions (COUNT, SUM, AVG, MAX, MIN) and GROUP BY with HAVING clauses.',
  'text',
  COALESCE((SELECT MAX(order_index) FROM lessons WHERE module_id = m.module_id), 0) + 1,
  25,
  FALSE,
  E'## 🧪 Code Practice: Aggregation\n\nMaster GROUP BY, HAVING, and aggregate functions!\n\n### Exercises\n\n**1. Count employees per department:**\n```sql\nSELECT d.department_name, COUNT(*) AS employee_count\nFROM employees e\nJOIN departments d ON e.department_id = d.department_id\nGROUP BY d.department_name\nORDER BY employee_count DESC;\n```\n\n**2. Average salary per department:**\n```sql\nSELECT d.department_name,\n       ROUND(AVG(e.salary), 2) AS avg_salary,\n       MIN(e.salary) AS min_salary,\n       MAX(e.salary) AS max_salary\nFROM employees e\nJOIN departments d ON e.department_id = d.department_id\nGROUP BY d.department_name;\n```\n\n**3. HAVING — Filter groups:**\n```sql\nSELECT d.department_name, COUNT(*) AS emp_count\nFROM employees e\nJOIN departments d ON e.department_id = d.department_id\nGROUP BY d.department_name\nHAVING COUNT(*) > 1;\n```\n\n**4. Top customers by spending:**\n```sql\nSELECT customer_name,\n       COUNT(*) AS total_orders,\n       SUM(total_amount) AS total_spent\nFROM orders\nGROUP BY customer_name\nORDER BY total_spent DESC;\n```\n\n### Challenge!\nFind the product category with the highest total revenue from orders.\n\n👉 Open the **Code Playground** below!'
FROM modules m 
WHERE m.course_id = 4 AND m.order_index = 4
LIMIT 1;

-- ── Module 5: Subqueries ──
INSERT INTO lessons (module_id, title, description, content_type, order_index, duration_minutes, is_preview, text_content)
SELECT 
  m.module_id,
  '🧪 Practice: Subqueries & Nested Queries',
  'Practice subqueries in WHERE, FROM, and SELECT clauses.',
  'text',
  COALESCE((SELECT MAX(order_index) FROM lessons WHERE module_id = m.module_id), 0) + 1,
  20,
  FALSE,
  E'## 🧪 Code Practice: Subqueries\n\nLearn to nest queries inside other queries!\n\n### Exercises\n\n**1. Employees earning above average:**\n```sql\nSELECT first_name, last_name, salary\nFROM employees\nWHERE salary > (SELECT AVG(salary) FROM employees)\nORDER BY salary DESC;\n```\n\n**2. Products with orders:**\n```sql\nSELECT product_name, price\nFROM products\nWHERE product_id IN (\n    SELECT DISTINCT product_id FROM orders\n);\n```\n\n**3. Department with highest avg salary:**\n```sql\nSELECT d.department_name, ROUND(AVG(e.salary), 2) AS avg_sal\nFROM employees e\nJOIN departments d ON e.department_id = d.department_id\nGROUP BY d.department_name\nORDER BY avg_sal DESC\nLIMIT 1;\n```\n\n**4. Employees in the same dept as highest earner:**\n```sql\nSELECT first_name, last_name, salary\nFROM employees\nWHERE department_id = (\n    SELECT department_id FROM employees\n    ORDER BY salary DESC LIMIT 1\n);\n```\n\n👉 Open **Code Playground** below!'
FROM modules m 
WHERE m.course_id = 4 AND m.order_index = 5
LIMIT 1;

-- ── Module 6: Indexing & Transactions ──
INSERT INTO lessons (module_id, title, description, content_type, order_index, duration_minutes, is_preview, text_content)
SELECT 
  m.module_id,
  '🧪 Practice: CREATE, INSERT & UPDATE',
  'Practice data manipulation — create tables, insert records, and update data.',
  'text',
  COALESCE((SELECT MAX(order_index) FROM lessons WHERE module_id = m.module_id), 0) + 1,
  20,
  FALSE,
  E'## 🧪 Code Practice: Data Manipulation\n\nPractice creating tables and modifying data!\n\n### Exercises\n\n**1. Create a new table:**\n```sql\nCREATE TABLE students (\n    student_id INTEGER PRIMARY KEY,\n    name TEXT NOT NULL,\n    grade TEXT,\n    gpa REAL\n);\n```\n\n**2. Insert records:**\n```sql\nINSERT INTO students VALUES (1, ''Alice'', ''A'', 3.8);\nINSERT INTO students VALUES (2, ''Bob'', ''B'', 3.2);\nINSERT INTO students VALUES (3, ''Charlie'', ''A'', 3.9);\n```\n\n**3. Verify your data:**\n```sql\nSELECT * FROM students;\n```\n\n**4. Update a record:**\n```sql\nUPDATE employees SET salary = salary * 1.10\nWHERE department_id = 1;\n\nSELECT first_name, salary FROM employees WHERE department_id = 1;\n```\n\n💡 **Tip:** The database resets when you click the reset button, so feel free to experiment!\n\n👉 Open the **Code Playground** below!'
FROM modules m 
WHERE m.course_id = 4 AND m.order_index = 6
LIMIT 1;

-- ── Module 7: Final Practice ──
INSERT INTO lessons (module_id, title, description, content_type, order_index, duration_minutes, is_preview, text_content)
SELECT 
  m.module_id,
  '🧪 Final Challenge: SQL Mastery Test',
  'Comprehensive SQL practice covering all topics: SELECT, JOIN, GROUP BY, HAVING, subqueries, and DML.',
  'text',
  COALESCE((SELECT MAX(order_index) FROM lessons WHERE module_id = m.module_id), 0) + 1,
  30,
  FALSE,
  E'## 🏆 Final Challenge: SQL Mastery\n\nPut all your SQL skills to the test!\n\n### Challenge 1: Complex JOIN + Aggregation\nWrite a query that shows each department, total salary cost, avg salary, and employee count — but only departments with avg salary > 65000.\n\n```sql\nSELECT d.department_name,\n       SUM(e.salary) AS total_cost,\n       ROUND(AVG(e.salary), 2) AS avg_salary,\n       COUNT(*) AS headcount\nFROM employees e\nJOIN departments d ON e.department_id = d.department_id\nGROUP BY d.department_name\nHAVING AVG(e.salary) > 65000\nORDER BY total_cost DESC;\n```\n\n### Challenge 2: Revenue Analysis\nFind the top 3 customers by total revenue, including how many orders they placed.\n\n### Challenge 3: Product Performance\nFor each product category, find the total quantity ordered and total revenue.\n\n### Challenge 4: Employee Report\nCreate a comprehensive report showing: employee name, department, salary, and whether their salary is ABOVE or BELOW the department average.\n\n```sql\nSELECT e.first_name || '' '' || e.last_name AS name,\n       d.department_name,\n       e.salary,\n       CASE \n           WHEN e.salary > dept_avg.avg_sal THEN ''Above Avg''\n           ELSE ''Below Avg''\n       END AS salary_status\nFROM employees e\nJOIN departments d ON e.department_id = d.department_id\nJOIN (\n    SELECT department_id, AVG(salary) AS avg_sal\n    FROM employees GROUP BY department_id\n) dept_avg ON e.department_id = dept_avg.department_id\nORDER BY d.department_name, e.salary DESC;\n```\n\n🎉 **Congratulations on completing the SQL Masterclass!**\n\n👉 Open the **Code Playground** below to try these challenges!'
FROM modules m 
WHERE m.course_id = 4 AND m.order_index = 7
LIMIT 1;

-- ============================================================================
-- STEP 3: Update course total_lessons count
-- ============================================================================
UPDATE courses 
SET total_lessons = (
    SELECT COUNT(*) 
    FROM lessons l 
    JOIN modules m ON l.module_id = m.module_id 
    WHERE m.course_id = 4
)
WHERE course_id = 4;

-- ============================================================================
-- VERIFICATION: Run these after the script to verify
-- ============================================================================
-- Check the new lessons were added:
-- SELECT l.lesson_id, l.title, l.content_type, m.title AS module_title, l.order_index
-- FROM lessons l JOIN modules m ON l.module_id = m.module_id
-- WHERE m.course_id = 4 AND l.content_type = 'text'
-- ORDER BY m.order_index, l.order_index;

-- Check updated course total:
-- SELECT course_id, title, total_lessons FROM courses WHERE course_id = 4;
