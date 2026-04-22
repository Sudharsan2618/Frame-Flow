const { Project, SyntaxKind } = require("ts-morph");
const fs = require("fs");
const path = require("path");

const project = new Project();
const sourceFile = project.addSourceFileAtPath(path.join(__dirname, "../lib/api.backup.ts"));

const outDir = path.join(__dirname, "../lib/api");
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

// Ensure clean dir
const existingFiles = fs.readdirSync(outDir);
for (const file of existingFiles) {
    if (file !== "client.ts" && file !== "index.ts") {
       fs.unlinkSync(path.join(outDir, file));
    }
}

const types = [];
const auth = [];
const courses = [];
const jobs = [];
const payments = [];
const admin = [];
const notifications = [];
const tracking = [];

// Get all exported interfaces and types
for (const decl of sourceFile.getInterfaces()) {
    if (decl.isExported()) types.push(decl.getText());
}
for (const decl of sourceFile.getTypeAliases()) {
    if (decl.isExported()) types.push(decl.getText());
}

// Get all exported functions and variables
for (const decl of sourceFile.getFunctions()) {
    if (!decl.isExported()) continue;
    if (decl.getName() === "fetchApi" || decl.getName() === "fetchApiWithAuth") continue;
    
    categorize(decl.getName(), decl.getText());
}

for (const decl of sourceFile.getVariableStatements()) {
    if (!decl.isExported()) continue;
    const txt = decl.getText();
    if (txt.includes("API_BASE_URL")) continue; // Client const
    
    const varDecl = decl.getDeclarations()[0];
    if (varDecl) categorize(varDecl.getName(), txt);
}

function categorize(name, text) {
    const s = text.toLowerCase();
    
    if (s.includes('/auth') || s.includes('login') || s.includes('register') || s.includes('/profile') || s.includes('/onboarding') || name.includes("User")) {
        auth.push(text);
    } else if (s.includes('/courses') || s.includes('/materials') || s.includes('flashcard') || s.includes('material') || s.includes('/quizzes') || name.includes('StudentDashboard')) {
        courses.push(text);
    } else if (s.includes('/jobs') || s.includes('/applications') || s.includes('match') || name.includes('Job')) {
        jobs.push(text);
    } else if (s.includes('/payments') || s.includes('order') || s.includes('certificate') || name.includes("Payment")) {
        payments.push(text);
    } else if (s.includes('/admin')) {
        admin.push(text);
    } else if (s.includes('/notifications')) {
        notifications.push(text);
    } else if (s.includes('/tracking') || s.includes('session') || s.includes('heartbeat') || name.includes('Tracking')) {
        tracking.push(text);
    } else {
        courses.push(text); // Default fallback
    }
}

// Write the files
fs.writeFileSync(path.join(outDir, 'types.ts'), types.join('\\n\\n') + '\\n');

const STANDARD_IMPORTS = `import { fetchApi, fetchApiWithAuth } from './client';\nimport * as T from './types';\n\n`;

function writeModule(name, arr) {
    if (arr.length === 0) return;
    
    let text = arr.join('\\n\\n');
    fs.writeFileSync(path.join(outDir, name), STANDARD_IMPORTS + text + '\\n');
}

writeModule('auth.ts', auth);
writeModule('courses.ts', courses);
writeModule('jobs.ts', jobs);
writeModule('payments.ts', payments);
writeModule('admin.ts', admin);
writeModule('notifications.ts', notifications);
writeModule('tracking.ts', tracking);

// Generate imports for typescript compiler
// Note: We don't prefix with T. inside the function text itself because that requires AST manipulation inside function bodies.
// To fix "Cannot find name 'User'", we just add `import { InterfaceName } from './types'` for whatever interfaces are used.
// A simpler way is to just do a global replace in the generated text, but word boundary regex works if done carefully.
const allTypeNames = [];
for (const decl of sourceFile.getInterfaces()) allTypeNames.push(decl.getName());
for (const decl of sourceFile.getTypeAliases()) allTypeNames.push(decl.getName());

const modules = ['auth.ts', 'courses.ts', 'jobs.ts', 'payments.ts', 'admin.ts', 'notifications.ts', 'tracking.ts'];

for (const mod of modules) {
    const p = path.join(outDir, mod);
    if (!fs.existsSync(p)) continue;
    
    let content = fs.readFileSync(p, 'utf8');
    
    // Instead of prefixing every occurrence with T., let's just generate named imports for whatever types are used in this file
    const usedTypes = new Set();
    for (const tn of allTypeNames) {
        if (new RegExp("\\\\b" + tn + "\\\\b").test(content)) {
            usedTypes.add(tn);
        }
    }
    
    if (usedTypes.size > 0) {
       const importLine = `import { ${Array.from(usedTypes).join(", ")} } from './types';\\n\\n`;
       // Replace the dummy `import * as T from './types';`
       content = content.replace("import * as T from './types';\\n\\n", importLine);
       fs.writeFileSync(p, content);
    } else {
       content = content.replace("import * as T from './types';\\n\\n", "");
       fs.writeFileSync(p, content);
    }
}

console.log("AST Split completed successfully.");
