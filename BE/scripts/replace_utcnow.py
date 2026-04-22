import os

files = [
    "app/models/application.py",
    "app/api/v1/endpoints/jobs.py",
    "app/api/v1/endpoints/certificates.py",
    "app/api/v1/endpoints/reviews.py"
]

for filepath in files:
    if not os.path.exists(filepath):
        continue
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    if "datetime.utcnow" in content:
        content = content.replace("datetime.utcnow()", "utc_now()")
        content = content.replace("default=datetime.utcnow", "default=utc_now")
        content = content.replace("onupdate=datetime.utcnow", "onupdate=utc_now")
        
        # In case there are some direct datetime.utcnow assignments not covered
        content = content.replace("datetime.utcnow", "utc_now") 

        # Add import if missing
        if "from app.utils.time import utc_now" not in content:
            lines = content.split('\n')
            insert_idx = 0
            for i, line in enumerate(lines):
                if line.startswith("import ") or line.startswith("from "):
                    insert_idx = i
                    break
            lines.insert(insert_idx, "from app.utils.time import utc_now")
            content = '\n'.join(lines)

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
            print(f"Updated {filepath}")
