"""
Upload Seed Assets to GCS
===========================
Generates course thumbnails placeholder info and PDF cheat sheets,
then uploads them to the GCS bucket.

Usage:
    python -m scripts.upload_seed_assets

Prerequisites:
    - GCS bucket created (run scripts.setup_gcp first)
    - GOOGLE_APPLICATION_CREDENTIALS set in .env
"""

import sys
import os
import io

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings

try:
    from google.cloud import storage
except ImportError:
    print("[ERROR] google-cloud-storage not installed. Run: pip install google-cloud-storage")
    sys.exit(1)


# ── PDF Content (simple text-based PDFs) ──
# We create minimal PDFs using raw PDF syntax — no extra dependencies needed.

def create_text_pdf(title: str, content: str) -> bytes:
    """Create a simple PDF with title and content using raw PDF format."""
    lines = content.split("\n")
    text_objects = []
    y = 750

    # Title
    text_objects.append(f"BT /F1 18 Tf 50 {y} Td ({_escape_pdf(title)}) Tj ET")
    y -= 30
    text_objects.append(f"BT /F1 10 Tf 50 {y} Td (---) Tj ET")
    y -= 20

    # Content lines
    for line in lines:
        if y < 50:
            break
        line = line.strip()
        if not line:
            y -= 10
            continue
        text_objects.append(
            f"BT /F1 10 Tf 50 {y} Td ({_escape_pdf(line[:90])}) Tj ET"
        )
        y -= 14

    stream = "\n".join(text_objects)
    stream_bytes = stream.encode("latin-1")

    pdf = (
        b"%PDF-1.4\n"
        b"1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n"
        b"2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n"
        b"3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>>>> endobj\n"
        b"4 0 obj <</Length " + str(len(stream_bytes)).encode() + b">>\n"
        b"stream\n" + stream_bytes + b"\nendstream\nendobj\n"
        b"5 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj\n"
        b"xref\n0 6\n"
        b"0000000000 65535 f \n"
        b"0000000009 00000 n \n"
        b"0000000058 00000 n \n"
        b"0000000115 00000 n \n"
        b"0000000280 00000 n \n"
        b"0000000500 00000 n \n"
        b"trailer <</Size 6 /Root 1 0 R>>\n"
        b"startxref\n570\n%%EOF"
    )
    return pdf


def _escape_pdf(text: str) -> str:
    """Escape special characters for PDF strings."""
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


# ── PDF Contents ──

PDFS = {
    "materials/pdfs/python-cheatsheet.pdf": {
        "title": "Python Cheat Sheet for Data Science",
        "content": """Variables and Types
  x = 10          # int
  y = 3.14        # float
  name = 'hello'  # str
  flag = True     # bool

Lists
  my_list = [1, 2, 3]
  my_list.append(4)
  my_list[0]  # => 1
  len(my_list)  # => 4
  [x**2 for x in my_list]  # list comprehension

Dictionaries
  d = {'key': 'value', 'age': 25}
  d['key']  # => 'value'
  d.get('missing', 'default')
  d.keys(), d.values(), d.items()

String Methods
  s = 'Hello World'
  s.lower(), s.upper(), s.strip()
  s.split(' '), '-'.join(['a','b'])
  f'Name: {name}'  # f-string

Control Flow
  if x > 0:
      print('positive')
  elif x == 0:
      print('zero')
  else:
      print('negative')

Loops
  for item in my_list:
      print(item)
  for i, v in enumerate(my_list):
      print(i, v)

Functions
  def greet(name, greeting='Hello'):
      return f'{greeting}, {name}!'

  # Lambda
  square = lambda x: x ** 2

File I/O
  with open('file.txt', 'r') as f:
      content = f.read()

Error Handling
  try:
      result = 10 / 0
  except ZeroDivisionError:
      print('Cannot divide by zero')
  finally:
      print('Done')
""",
    },
    "materials/pdfs/numpy-pandas-reference.pdf": {
        "title": "NumPy and Pandas Quick Reference",
        "content": """NumPy Basics
  import numpy as np
  a = np.array([1, 2, 3, 4, 5])
  a.shape, a.dtype, a.ndim
  np.zeros((3, 4)), np.ones((2, 3))
  np.arange(0, 10, 2), np.linspace(0, 1, 5)

NumPy Operations
  a + b, a * b, a @ b  # element-wise, dot product
  a.sum(), a.mean(), a.std(), a.max()
  a.reshape(5, 1), a.T  # reshape, transpose
  np.where(a > 3, 'yes', 'no')

Pandas Basics
  import pandas as pd
  df = pd.read_csv('data.csv')
  df.head(), df.tail(), df.info()
  df.describe(), df.shape, df.columns

Selection
  df['column'], df[['col1', 'col2']]
  df.loc[0:5, 'name':'age']
  df.iloc[0:5, 0:3]
  df[df['age'] > 25]

Operations
  df.groupby('category').mean()
  df.sort_values('score', ascending=False)
  df['new_col'] = df['a'] + df['b']
  df.drop('col', axis=1), df.drop(0, axis=0)

Missing Data
  df.isna().sum()
  df.dropna(), df.fillna(0)
  df.interpolate()

Merging
  pd.merge(df1, df2, on='id', how='left')
  pd.concat([df1, df2], axis=0)
""",
    },
    "materials/pdfs/html-css-reference.pdf": {
        "title": "HTML5 and CSS3 Reference Card",
        "content": """HTML5 Semantic Elements
  <header> - Page/section header
  <nav> - Navigation links
  <main> - Main content area
  <section> - Thematic grouping
  <article> - Self-contained content
  <aside> - Sidebar content
  <footer> - Page/section footer

HTML5 Form Elements
  <input type="text|email|password|number|date|file">
  <select>, <option>, <textarea>
  <input type="checkbox|radio|range|color">
  required, placeholder, pattern, min, max

CSS Selectors
  element, .class, #id
  element.class, parent > child
  element:hover, element:nth-child(n)
  element::before, element::after

CSS Box Model
  margin > border > padding > content
  box-sizing: border-box;

Flexbox
  display: flex;
  justify-content: center|space-between;
  align-items: center|stretch;
  flex-direction: row|column;
  flex-wrap: wrap;
  gap: 1rem;

CSS Grid
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto;
  gap: 1rem;
  place-items: center;

Responsive Design
  @media (max-width: 768px) { ... }
  @media (min-width: 1024px) { ... }
  <meta name='viewport' content='width=device-width'>
""",
    },
    "materials/pdfs/ml-algorithms-guide.pdf": {
        "title": "ML Algorithms Comparison Guide",
        "content": """Linear Regression
  Type: Supervised (Regression)
  Use: Predicting continuous values
  Pros: Simple, interpretable, fast
  Cons: Assumes linearity

Logistic Regression
  Type: Supervised (Classification)
  Use: Binary/multi-class classification
  Pros: Interpretable, probabilistic output
  Cons: Linear decision boundary

Decision Trees
  Type: Supervised (Both)
  Use: Classification and regression
  Pros: Interpretable, handles non-linear
  Cons: Prone to overfitting

Random Forest
  Type: Supervised (Both)
  Use: Complex prediction tasks
  Pros: Reduces overfitting, feature importance
  Cons: Slower, less interpretable

Support Vector Machines (SVM)
  Type: Supervised (Both)
  Use: High-dimensional classification
  Pros: Works well with clear margins
  Cons: Slow on large datasets

K-Nearest Neighbors (KNN)
  Type: Supervised (Both)
  Use: Pattern recognition
  Pros: Simple, no training phase
  Cons: Slow at prediction, needs scaling

K-Means Clustering
  Type: Unsupervised
  Use: Grouping similar data points
  Pros: Simple, scalable
  Cons: Must specify k, spherical clusters

Neural Networks
  Type: Supervised / Unsupervised
  Use: Complex patterns (images, text, etc)
  Pros: Universal approximators
  Cons: Need lots of data, black box
""",
    },
}


def upload_assets():
    """Generate and upload all seed assets to GCS."""
    from google.oauth2 import service_account

    bucket_name = settings.GCS_BUCKET_NAME
    print(f"[UPLOAD] Uploading seed assets to gs://{bucket_name}/")

    # Load credentials from service account key file
    creds_path = settings.GOOGLE_APPLICATION_CREDENTIALS
    if creds_path and os.path.isfile(creds_path):
        credentials = service_account.Credentials.from_service_account_file(creds_path)
        client = storage.Client(project=settings.GCS_PROJECT_ID, credentials=credentials)
    else:
        client = storage.Client(project=settings.GCS_PROJECT_ID)

    bucket = client.bucket(bucket_name)

    # Upload PDFs
    for blob_path, pdf_info in PDFS.items():
        print(f"   [PDF] {blob_path}")
        pdf_bytes = create_text_pdf(pdf_info["title"], pdf_info["content"])
        blob = bucket.blob(blob_path)
        blob.upload_from_string(pdf_bytes, content_type="application/pdf")
        blob.make_public()
        print(f"         -> {blob.public_url}")

    print("")
    print("[DONE] All assets uploaded!")
    print("")
    print("[NOTE] Course thumbnails are placeholder URLs.")
    print(f"   You can upload real images to:")
    print(f"   gs://{bucket_name}/courses/thumbnails/python-data-science.webp")
    print(f"   gs://{bucket_name}/courses/thumbnails/web-dev-fundamentals.webp")
    print(f"   gs://{bucket_name}/courses/thumbnails/ml-a-z.webp")


if __name__ == "__main__":
    upload_assets()
