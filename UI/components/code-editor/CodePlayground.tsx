"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  Play,
  RotateCcw,
  Loader2,
  ChevronDown,
  Table2,
  Terminal,
  AlertCircle,
  CheckCircle2,
  Clock,
  Database,
  Code2,
  Copy,
  Check,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  executeSql,
  resetSqlSandbox,
  type SqlResult,
  type SqlExecutionResult,
} from "@/lib/sql-sandbox"

// ── Default sample queries (fallback when no lesson context) ──
const DEFAULT_SQL_SAMPLES = [
  {
    label: "Show all tables",
    query: "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;",
  },
  {
    label: "All Employees",
    query: "SELECT * FROM employees;",
  },
  {
    label: "JOIN — Employees + Departments",
    query: `SELECT e.first_name, e.last_name, d.department_name, e.salary
FROM employees e
JOIN departments d ON e.department_id = d.department_id
ORDER BY e.salary DESC;`,
  },
  {
    label: "GROUP BY — Average Salary per Dept",
    query: `SELECT d.department_name, 
       COUNT(*) AS employee_count,
       ROUND(AVG(e.salary), 2) AS avg_salary
FROM employees e
JOIN departments d ON e.department_id = d.department_id
GROUP BY d.department_name
HAVING COUNT(*) > 1
ORDER BY avg_salary DESC;`,
  },
  {
    label: "SUBQUERY — Above Average Salary",
    query: `SELECT first_name, last_name, salary
FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees)
ORDER BY salary DESC;`,
  },
]

// ── Extract SQL code blocks from markdown lesson content ──
function parseSqlFromMarkdown(markdown: string): { label: string; query: string }[] {
  const results: { label: string; query: string }[] = []

  // Match ```sql ... ``` code blocks, and capture the heading/bold text before each
  const lines = markdown.split('\n')
  let currentLabel = ''
  let inCodeBlock = false
  let currentQuery = ''

  for (const line of lines) {
    // Track the last label-like line (bold text, heading, or numbered item)
    const boldMatch = line.match(/^\*\*(?:\d+\.\s*)?(.+?)[:.]?\*\*$/)
    const headingMatch = line.match(/^#{1,4}\s+(.+)$/)
    if (boldMatch && !inCodeBlock) {
      currentLabel = boldMatch[1].trim()
    } else if (headingMatch && !inCodeBlock) {
      currentLabel = headingMatch[1].trim()
    }

    // Start of SQL code block
    if (line.trim().startsWith('```sql') && !inCodeBlock) {
      inCodeBlock = true
      currentQuery = ''
      continue
    }

    // End of code block
    if (line.trim() === '```' && inCodeBlock) {
      inCodeBlock = false
      if (currentQuery.trim()) {
        results.push({
          label: currentLabel || `Query ${results.length + 1}`,
          query: currentQuery.trim(),
        })
      }
      continue
    }

    // Inside code block
    if (inCodeBlock) {
      currentQuery += line + '\n'
    }
  }

  return results
}

interface CodePlaygroundProps {
  lessonContent?: string
  onAllExercisesComplete?: () => void
}

const PYTHON_SAMPLES = [
  { label: "Hello World", query: 'print("Hello, World!")' },
  {
    label: "Fibonacci",
    query: `def fibonacci(n):
    a, b = 0, 1
    result = []
    while a < n:
        result.append(a)
        a, b = b, a + b
    return result

print(fibonacci(100))`,
  },
  {
    label: "List Comprehension",
    query: `squares = [x**2 for x in range(1, 11)]
evens = [x for x in squares if x % 2 == 0]
print(f"Squares: {squares}")
print(f"Even squares: {evens}")`,
  },
]

// ── Judge0 CE API for Python execution ──
const JUDGE0_API = "https://judge0-ce.p.rapidapi.com"

async function executePython(code: string): Promise<{
  success: boolean
  output: string
  executionTimeMs: number
}> {
  const start = performance.now()

  try {
    // Submit code
    const submitRes = await fetch(`${JUDGE0_API}/submissions?base64_encoded=true&wait=true`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Key": "YOUR_RAPIDAPI_KEY", // User needs to add their key
        "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
      },
      body: JSON.stringify({
        language_id: 71, // Python 3
        source_code: btoa(code),
        stdin: "",
      }),
    })

    if (!submitRes.ok) {
      // Fallback: run Python locally via eval-like approach
      // For demo, show a helpful message
      const elapsed = performance.now() - start
      return {
        success: false,
        output:
          "⚠️ Python execution requires a Judge0 API key.\n\n" +
          "To enable Python execution:\n" +
          "1. Get a free API key at https://rapidapi.com/judge0-official/api/judge0-ce\n" +
          "2. Add it to CodePlayground.tsx\n\n" +
          "For now, use the SQL editor — it works 100% in-browser!",
        executionTimeMs: Math.round(elapsed * 100) / 100,
      }
    }

    const result = await submitRes.json()
    const elapsed = performance.now() - start

    const stdout = result.stdout ? atob(result.stdout) : ""
    const stderr = result.stderr ? atob(result.stderr) : ""
    const compileOutput = result.compile_output ? atob(result.compile_output) : ""

    if (result.status?.id >= 6) {
      // Error status
      return {
        success: false,
        output: stderr || compileOutput || result.status?.description || "Execution error",
        executionTimeMs: Math.round(elapsed * 100) / 100,
      }
    }

    return {
      success: true,
      output: stdout || "(No output)",
      executionTimeMs: Math.round(elapsed * 100) / 100,
    }
  } catch (err: any) {
    const elapsed = performance.now() - start
    return {
      success: false,
      output:
        "⚠️ Python execution requires a Judge0 API key.\n\n" +
        "The SQL editor works fully in-browser — try it out!\n\n" +
        "To enable Python: Get a free key at rapidapi.com/judge0-official/api/judge0-ce",
      executionTimeMs: Math.round(elapsed * 100) / 100,
    }
  }
}

// ── Component ──
export default function CodePlayground({ lessonContent, onAllExercisesComplete }: CodePlaygroundProps) {
  // Parse lesson-specific SQL samples from markdown content
  const lessonSqlSamples = React.useMemo(() => {
    if (!lessonContent) return null
    const parsed = parseSqlFromMarkdown(lessonContent)
    return parsed.length > 0 ? parsed : null
  }, [lessonContent])

  const SQL_SAMPLES = lessonSqlSamples || DEFAULT_SQL_SAMPLES

  const [language, setLanguage] = useState<"sql" | "python">("sql")
  const [code, setCode] = useState(SQL_SAMPLES[0].query)
  const [selectedLabel, setSelectedLabel] = useState(SQL_SAMPLES[0].label)
  const [isRunning, setIsRunning] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [result, setResult] = useState<SqlExecutionResult | null>(null)
  const [pythonOutput, setPythonOutput] = useState<{ success: boolean; output: string; executionTimeMs: number } | null>(null)
  const [showSamples, setShowSamples] = useState(false)
  const [copied, setCopied] = useState(false)
  const [dbReady, setDbReady] = useState(false)
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set())
  const allExercisesCompleteRef = useRef(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const samplesRef = useRef<HTMLDivElement>(null)

  // Pre-initialize SQL.js
  useEffect(() => {
    executeSql("SELECT 1;").then(() => setDbReady(true)).catch(() => {})
  }, [])

  // Close samples dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (samplesRef.current && !samplesRef.current.contains(e.target as Node)) {
        setShowSamples(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Switch language + load default sample
  const handleLanguageSwitch = (lang: "sql" | "python") => {
    setLanguage(lang)
    setResult(null)
    setPythonOutput(null)
    if (lang === "sql") {
      setCode(SQL_SAMPLES[0].query)
      setSelectedLabel(SQL_SAMPLES[0].label)
    } else {
      setCode(PYTHON_SAMPLES[0].query)
      setSelectedLabel(PYTHON_SAMPLES[0].label)
    }
  }

  // Run code
  const handleRun = useCallback(async () => {
    if (!code.trim()) return
    setIsRunning(true)
    setResult(null)
    setPythonOutput(null)

    try {
      if (language === "sql") {
        const res = await executeSql(code)
        setResult(res)

        // Track exercise completion for lesson-specific exercises
        if (res.success && lessonSqlSamples && lessonSqlSamples.length > 0) {
          const matchIdx = lessonSqlSamples.findIndex(s => code.trim() === s.query.trim())
          if (matchIdx >= 0) {
            setCompletedExercises(prev => {
              const next = new Set(prev)
              next.add(matchIdx)
              // Check if ALL exercises are now complete
              if (next.size >= lessonSqlSamples.length && !allExercisesCompleteRef.current) {
                allExercisesCompleteRef.current = true
                onAllExercisesComplete?.()
              }
              return next
            })
          }
        }
      } else {
        const res = await executePython(code)
        setPythonOutput(res)
      }
    } finally {
      setIsRunning(false)
    }
  }, [code, language, lessonSqlSamples, onAllExercisesComplete])

  // Reset database
  const handleReset = async () => {
    setIsResetting(true)
    await resetSqlSandbox()
    setResult(null)
    setPythonOutput(null)
    setIsResetting(false)
  }

  // Copy code
  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Keyboard shortcut: Ctrl+Enter to run
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault()
      handleRun()
    }
  }

  const samples = language === "sql" ? SQL_SAMPLES : PYTHON_SAMPLES

  return (
    <div className="bg-slate-950 rounded-xl border border-slate-800/60 overflow-hidden shadow-2xl">
      {/* ── Header Bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          {/* Language Toggle */}
          <div className="flex bg-slate-800/60 rounded-lg p-0.5">
            <button
              onClick={() => handleLanguageSwitch("sql")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                language === "sql"
                  ? "bg-emerald-500/20 text-emerald-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              SQL
            </button>
            <button
              onClick={() => handleLanguageSwitch("python")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                language === "python"
                  ? "bg-blue-500/20 text-blue-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Python
            </button>
          </div>

          {/* DB status */}
          {language === "sql" && (
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${dbReady ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                {dbReady ? "SQLite Ready" : "Loading..."}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Sample Queries Dropdown */}
          <div className="relative" ref={samplesRef}>
            <button
              onClick={() => setShowSamples(!showSamples)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="max-w-[140px] truncate">{selectedLabel}</span>
              <ChevronDown className={`w-3 h-3 transition-transform shrink-0 ${showSamples ? "rotate-180" : ""}`} />
            </button>
            {showSamples && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-slate-800 border border-slate-700/60 rounded-lg shadow-2xl z-50 py-1 max-h-80 overflow-y-auto">
                {samples.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCode(s.query)
                      setSelectedLabel(s.label)
                      setShowSamples(false)
                      setResult(null)
                      setPythonOutput(null)
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700/60 hover:text-white transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors"
            title="Copy code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Reset DB (SQL only) */}
          {language === "sql" && (
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="p-1.5 rounded-md text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 transition-colors disabled:opacity-50"
              title="Reset database"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {/* ── Code Editor ── */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-10 bg-slate-900/40 flex flex-col items-center pt-3 text-slate-600 text-[10px] font-mono select-none border-r border-slate-800/40">
          {code.split("\n").map((_, i) => (
            <div key={i} className="leading-[20px]">{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          className="w-full bg-transparent text-slate-200 font-mono text-sm pl-12 pr-4 py-3 resize-none focus:outline-none min-h-[180px] max-h-[350px] leading-[20px] placeholder:text-slate-600"
          placeholder={language === "sql" ? "Type your SQL query here..." : "Write your Python code here..."}
          style={{ tabSize: 2 }}
        />
      </div>

      {/* ── Run Bar ── */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/50 border-t border-b border-slate-800/40">
        <div className="flex items-center gap-3">
          <Button
            onClick={handleRun}
            disabled={isRunning || !code.trim()}
            size="sm"
            className="h-8 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs gap-1.5 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            {isRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            {isRunning ? "Running..." : "Run"}
          </Button>
          <span className="text-[10px] text-slate-600 font-medium">
            Ctrl+Enter to run
          </span>
        </div>

        {/* Execution time */}
        {(result || pythonOutput) && (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <Clock className="w-3 h-3" />
            {(result?.executionTimeMs ?? pythonOutput?.executionTimeMs ?? 0).toFixed(1)}ms
          </div>
        )}
      </div>

      {/* ── Output Panel ── */}
      <div className="min-h-[80px] max-h-[350px] overflow-auto">
        {/* Nothing run yet */}
        {!result && !pythonOutput && !isRunning && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Terminal className="w-8 h-8 text-slate-700 mb-2" />
            <p className="text-xs text-slate-600 font-medium">Output will appear here</p>
            <p className="text-[10px] text-slate-700 mt-0.5">Click Run or press Ctrl+Enter</p>
          </div>
        )}

        {/* Running spinner */}
        {isRunning && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          </div>
        )}

        {/* SQL Results */}
        {result && !isRunning && (
          <div className="p-3">
            {result.success ? (
              <>
                {result.results.length > 0 ? (
                  result.results.map((r, idx) => (
                    <div key={idx} className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Table2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                          {r.values.length} row{r.values.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-slate-800/60">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-800/60">
                              {r.columns.map((col, i) => (
                                <th
                                  key={i}
                                  className="px-3 py-2 text-left text-slate-300 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-700/40"
                                >
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {r.values.map((row, ri) => (
                              <tr
                                key={ri}
                                className={`${
                                  ri % 2 === 0 ? "bg-slate-900/30" : "bg-slate-900/10"
                                } hover:bg-slate-800/40 transition-colors`}
                              >
                                {row.map((val, vi) => (
                                  <td
                                    key={vi}
                                    className="px-3 py-1.5 text-slate-300 border-b border-slate-800/30 whitespace-nowrap font-mono"
                                  >
                                    {val === null ? (
                                      <span className="text-slate-600 italic">NULL</span>
                                    ) : (
                                      String(val)
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-medium">
                      Query executed successfully.
                      {result.rowsAffected !== undefined && result.rowsAffected > 0 && (
                        <span className="text-slate-400 ml-1">({result.rowsAffected} row{result.rowsAffected !== 1 ? "s" : ""} affected)</span>
                      )}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <pre className="text-xs text-red-400 font-mono whitespace-pre-wrap break-words">{result.error}</pre>
              </div>
            )}
          </div>
        )}

        {/* Python Results */}
        {pythonOutput && !isRunning && (
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">Output</span>
            </div>
            <pre
              className={`text-xs font-mono p-3 rounded-lg whitespace-pre-wrap break-words ${
                pythonOutput.success
                  ? "bg-slate-900/50 text-slate-300 border border-slate-800/40"
                  : "bg-red-950/20 text-red-400 border border-red-900/30"
              }`}
            >
              {pythonOutput.output}
            </pre>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-900/30 border-t border-slate-800/30">
        <div className="flex items-center gap-3">
          {language === "sql" && lessonSqlSamples && lessonSqlSamples.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-600 font-medium">Exercises:</span>
              <div className="flex items-center gap-1">
                {lessonSqlSamples.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      completedExercises.has(i) ? "bg-emerald-400" : "bg-slate-700"
                    }`}
                    title={`Exercise ${i + 1}: ${completedExercises.has(i) ? "Completed" : "Pending"}`}
                  />
                ))}
              </div>
              <span className="text-[9px] text-slate-600 font-medium">
                {completedExercises.size}/{lessonSqlSamples.length}
              </span>
            </div>
          ) : language === "sql" ? (
            <span className="text-[9px] text-slate-600 font-medium">
              Tables: employees, departments, products, orders
            </span>
          ) : null}
        </div>
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-slate-700/40 text-slate-600 bg-transparent">
          {language === "sql" ? "SQLite (WASM)" : "Python 3"}
        </Badge>
      </div>
    </div>
  )
}
