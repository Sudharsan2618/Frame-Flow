const fs = require('fs');
const path = require('path');

const inFilePath = path.join(__dirname, '../lib/api.ts');
const outDir = path.join(__dirname, '../lib/api');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const content = fs.readFileSync(inFilePath, 'utf-8');
const lines = content.split('\n');

const clientContent = `export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = \`\${API_BASE_URL}\${endpoint}\`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "omit",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "API Request Failed");
  }

  return response.json();
}

export async function fetchApiWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let token = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("auth_token");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as any) || {}),
  };

  if (token) {
    headers["Authorization"] = \`Bearer \${token}\`;
  }

  const url = \`\${API_BASE_URL}\${endpoint}\`;
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "omit",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "API Request Failed");
  }

  return response.json();
}
`;

const types = [];
const auth = [];
const courses = [];
const jobs = [];
const payments = [];
const admin = [];
const notifications = [];
const tracking = [];

let currentArray = null;
let braceCount = 0;
let buffer = [];
let inBlock = false;
let blockType = null; // 'type', 'func'

const STANDARD_IMPORTS = `import { fetchApi, fetchApiWithAuth } from './client';\nimport * as T from './types';\n\n`;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Exclude definitions of constants that are going to client.ts
  if (!inBlock && (line.includes('const API_BASE') || line.includes('function fetchApi'))) {
     continue;
  }

  if (!inBlock) {
    if (line.trim().startsWith('export interface') || line.trim().startsWith('export type')) {
      inBlock = true;
      blockType = 'type';
      buffer.push(line);
      braceCount += (line.match(/\\{/g) || []).length - (line.match(/\\}/g) || []).length;
      if (braceCount === 0 && line.includes(';') && !line.includes('{')) {
        inBlock = false;
        types.push(buffer.join('\\n'));
        buffer = [];
      }
    } else if (line.trim().startsWith('export async function') || line.trim().startsWith('export function') || line.trim().startsWith('export const mapMaterialToUI')) {
      inBlock = true;
      blockType = 'func';
      buffer.push(line);
      braceCount += (line.match(/\\{/g) || []).length - (line.match(/\\}/g) || []).length;
      // if single line function layout
      if (braceCount === 0 && line.includes('}')) {
        inBlock = false;
        categorizeFunc(buffer.join('\\n'));
        buffer = [];
      }
    } else if (line.trim() !== '' && !line.trim().startsWith('/**') && !line.trim().startsWith('*') && !line.trim().startsWith('//') && !line.trim().startsWith('*/') && !line.trim().startsWith('import')) {
       // Could be a generic const we might need, like API_BASE
    }
  } else {
    buffer.push(line);
    braceCount += (line.match(/\\{/g) || []).length - (line.match(/\\}/g) || []).length;
    if (braceCount === 0) {
      inBlock = false;
      const str = buffer.join('\\n');
      if (blockType === 'type') {
         types.push(str);
      } else {
         categorizeFunc(str);
      }
      buffer = [];
    }
  }
}

function categorizeFunc(str) {
  if (str.includes('mapMaterialToUI')) { courses.push(str); return; }
  const s = str.toLowerCase();
  if (s.includes('/auth') || s.includes('login') || s.includes('register') || s.includes('/profile') || s.includes('/onboarding')) {
    auth.push(str);
  } else if (s.includes('/courses') || s.includes('/quizzes') || s.includes('material') || s.includes('studentdashboard') || s.includes('flashcard')) {
    courses.push(str);
  } else if (s.includes('/jobs') || s.includes('/applications') || s.includes('match')) {
    jobs.push(str);
  } else if (s.includes('/payments') || s.includes('order') || s.includes('certificate')) {
    payments.push(str);
  } else if (s.includes('/admin')) {
    admin.push(str);
  } else if (s.includes('/notifications')) {
    notifications.push(str);
  } else if (s.includes('/tracking') || s.includes('session') || s.includes('heartbeat')) {
    tracking.push(str);
  } else {
    auth.push(str); // fallback
  }
}

// Write the files
fs.writeFileSync(path.join(outDir, 'client.ts'), clientContent);
fs.writeFileSync(path.join(outDir, 'types.ts'), types.join('\\n\\n') + '\\n');

function writeModule(name, arr) {
  if (arr.length === 0) return;
  // Replace types like Promise<CourseListItem> with Promise<T.CourseListItem>
  // This is a naive replace but should cover most cases in our api.ts
  let text = arr.join('\\n\\n');
  
  // Use regex to prepend T. to any capitalized word that is used as a Type in signatures.
  // Actually, standard T imports are easier via simple exports: export * as T from './types'
  // But wait, it's inside the same file, we can just replace the interfaces explicitly.
  const allTypeNames = types.map(t => {
     const m = t.match(/export (?:interface|type) ([A-Za-z0-9_]+)/);
     return m ? m[1] : null;
  }).filter(Boolean);

  let newText = text;
  // Add T. prefix
  allTypeNames.forEach(tn => {
     // match word boundaries
     const reg = new RegExp("\\\\b" + tn + "\\\\b", 'g');
     newText = newText.replace(reg, "T." + tn);
  });

  fs.writeFileSync(path.join(outDir, name), STANDARD_IMPORTS + newText + '\\n');
}

writeModule('auth.ts', auth);
writeModule('courses.ts', courses);
writeModule('jobs.ts', jobs);
writeModule('payments.ts', payments);
writeModule('admin.ts', admin);
writeModule('notifications.ts', notifications);
writeModule('tracking.ts', tracking);

// Generate index.ts to re-export everything for backward compatibility
const indexContent = `export * from './client';
export * from './types';
export * from './auth';
export * from './courses';
export * from './jobs';
export * from './payments';
export * from './admin';
export * from './notifications';
export * from './tracking';
`;

fs.writeFileSync(path.join(outDir, 'index.ts'), indexContent);

// Rename original api.ts to api.backup.ts
fs.renameSync(inFilePath, inFilePath.replace('api.ts', 'api.backup.ts'));

// Create a new api.ts that just exports from api/index.ts
fs.writeFileSync(inFilePath, `export * from './api/index';\n`);

console.log('Successfully split api.ts');
