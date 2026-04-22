import os
import re
import sys

def main():
    api_path = r"c:/Users/WELCOME/Desktop/Recruit/UI/lib/api.ts"
    out_dir = r"c:/Users/WELCOME/Desktop/Recruit/UI/lib/api"
    os.makedirs(out_dir, exist_ok=True)
    
    with open(api_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Extract types
    # types are typically: export interface Name { ... } or export type Name = ...;
    # Regex to grab block of type / interface
    # Handling nested brackets is tricky with pure regex, but TypeScript interfaces in api.ts are mostly flat.
    
    type_pattern = re.compile(r'((?:(?:\/\*\*.*?\*\/|//[^\n]*)\s*)*export\s+(?:interface|type)\s+\w+.*?^})', re.MULTILINE | re.DOTALL)
    # The above assumes interface ends with `^}`. If it's a type like `export type ActivityType = "x" | "y";`, it ends with `;`
    
    # Let's use a simpler heuristic. We'll split the file by lines and parse block by block.
    
    blocks = []
    lines = content.split('\n')
    
    current_block = []
    
    # We will just categorize functions by their URLs in fetchApi.
    
    # Let's manually define the new files.
    client_ts = """export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "omit", // Will be changed to include in step #17
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "API Request Failed");
  }

  return response.json();
}

export async function fetchApiWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Try fallback logic
  let token = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("auth_token");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as any) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "omit", // Will change to include
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "API Request Failed");
  }

  return response.json();
}
"""

    # For types, it is much easier to just grab all interfaces and types
    type_lines = []
    auth_lines = ["import { fetchApi, fetchApiWithAuth } from './client';", "import * as T from './types';"]
    courses_lines = ["import { fetchApi, fetchApiWithAuth } from './client';", "import * as T from './types';"]
    jobs_lines = ["import { fetchApi, fetchApiWithAuth } from './client';", "import * as T from './types';"]
    payments_lines = ["import { fetchApi, fetchApiWithAuth } from './client';", "import * as T from './types';"]
    admin_lines = ["import { fetchApi, fetchApiWithAuth } from './client';", "import * as T from './types';"]
    notifications_lines = ["import { fetchApi, fetchApiWithAuth } from './client';", "import * as T from './types';"]
    tracking_lines = ["import { fetchApi, fetchApiWithAuth } from './client';", "import * as T from './types';"]

    i = 0
    in_type = False
    in_function = False
    brace_count = 0
    buffer = []
    
    while i < len(lines):
        line = lines[i]
        
        # very basic comment handling
        if line.startswith('// ') or line.startswith('/**'):
            # Grab the whole comment block
            idx = i
            while idx < len(lines) and (lines[idx].strip().startswith('//') or lines[idx].strip().startswith('/*') or lines[idx].strip().startswith('*')):
                buffer.append(lines[idx])
                if lines[idx].strip().endswith('*/'):
                    idx += 1
                    break
                idx += 1
            i = idx
            continue

        if not in_type and not in_function:
            if line.startswith('export interface') or line.startswith('export type'):
                in_type = True
                buffer.append(line)
                brace_count += line.count('{') - line.count('}')
                if brace_count == 0 and ';' in line and not line.endswith('{'):
                    in_type = False
                    type_lines.extend(buffer)
                    buffer = []
            elif line.startswith('export async function') or line.startswith('export function'):
                in_function = True
                buffer.append(line)
                brace_count += line.count('{') - line.count('}')
            elif 'export const mapMaterialToUI = ' in line:
               in_function = True
               buffer.append(line)
               brace_count += line.count('{') - line.count('}')
            else:
                pass # ignore client constants etc
        else:
            buffer.append(line)
            brace_count += line.count('{') - line.count('}')
            if brace_count == 0:
                if in_type:
                    type_lines.extend(buffer)
                    type_lines.append("")
                elif in_function:
                    content_str = "\\n".join(buffer)
                    if 'export const mapMaterialToUI' in content_str:
                         courses_lines.extend(buffer)
                    elif '/auth' in content_str or 'login' in content_str or 'register' in content_str or '/profile' in content_str or '/onboarding' in content_str:
                        auth_lines.extend(buffer)
                    elif '/courses' in content_str or '/students/materials' in content_str:
                        courses_lines.extend(buffer)
                    elif '/jobs' in content_str or '/applications' in content_str:
                        jobs_lines.extend(buffer)
                    elif '/payments' in content_str:
                        payments_lines.extend(buffer)
                    elif '/admin' in content_str:
                        admin_lines.extend(buffer)
                    elif '/notifications' in content_str:
                        notifications_lines.extend(buffer)
                    elif '/tracking' in content_str or 'heartbeat' in content_str:
                        tracking_lines.extend(buffer)
                    else:
                        print(f"Unknown category for function: {buffer[0]}")
                        auth_lines.extend(buffer) # fallback
                    
                    auth_lines.append("")
                    courses_lines.append("")
                    jobs_lines.append("")
                    payments_lines.append("")
                    admin_lines.append("")
                    notifications_lines.append("")
                    tracking_lines.append("")
                
                in_type = False
                in_function = False
                buffer = []
        i += 1

    # In auth_lines, etc... replace "export async function getX(): Promise<Y>" with Promise<T.Y>
    # Also fix T.T if we accidentally over-prefix.
    def prefix_types(lines_list):
        out = []
        for line in lines_list:
            # We want to prefix types used in `Promise<Type>` or `Type[]` or `: Type`
            # This is hard to do perfectly with regex without a full parser,
            # But we only need it to compile.
            # Actually, it's safer to just export everything from types.ts and import * as types? 
            # Or export all types from types.ts, and in each file import what we need.
            # Easiest way in generated files: import * as Types from "./types"; then use standard substitution, but that's risky.
            out.append(line)
        return out

    # Write files
    with open(os.path.join(out_dir, "client.ts"), "w", encoding="utf-8") as f:
        f.write(client_ts)
        
    with open(os.path.join(out_dir, "types.ts"), "w", encoding="utf-8") as f:
        f.write("\\n".join(type_lines))
"""

if __name__ == "__main__":
    print("Script started but paused — manual split might be more accurate using standard TS tools.")
