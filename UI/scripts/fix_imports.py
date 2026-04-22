import glob
import os
import re

api_dir = r"c:\Users\WELCOME\Desktop\Recruit\UI\lib\api"
types_file = os.path.join(api_dir, "types.ts")

# 1. Extract all type names
with open(types_file, "r", encoding="utf-8") as f:
    types_content = f.read()

type_names = re.findall(r"export (?:interface|type) ([A-Za-z0-9_]+)", types_content)
all_types_import = f"import {{ {', '.join(type_names)} }} from './types';\n"
client_import = "import { fetchApi, fetchApiWithAuth, API_BASE_URL } from './client';\n"

# 2. Fix imports and API_BASE in all modules
modules = ["auth.ts", "courses.ts", "jobs.ts", "payments.ts", "admin.ts", "notifications.ts", "tracking.ts"]

for mod in modules:
    mod_path = os.path.join(api_dir, mod)
    if not os.path.exists(mod_path):
        continue
    
    with open(mod_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Fix API_BASE -> API_BASE_URL
    content = content.replace("API_BASE", "API_BASE_URL")
    content = content.replace("API_BASE_URL_URL", "API_BASE_URL") # handle double replacement

    # Replace old imports
    # Remove existing import lines
    lines = content.split('\n')
    new_lines = []
    for line in lines:
        if line.startswith("import {") and "from './client'" in line:
            continue
        if line.startswith("import {") and "from './types'" in line:
            continue
        new_lines.append(line)
    
    # Prepend new imports
    final_content = client_import + all_types_import + "\n".join(new_lines)

    with open(mod_path, "w", encoding="utf-8") as f:
        f.write(final_content)

print(f"Fixed imports for {len(modules)} modules.")
