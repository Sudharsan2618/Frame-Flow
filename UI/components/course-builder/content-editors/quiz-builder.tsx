"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2, GripVertical } from "lucide-react"
import { getBuilderQuiz, saveQuiz, type QuizBuilderData, type QuizQuestionData } from "@/lib/api/admin-courses"

interface QuizBuilderProps {
  lessonId: number | null
  onChange: (data: Partial<QuizBuilderData>) => void
  quizData: Partial<QuizBuilderData>
}

interface OptionItem {
  text: string
  is_correct: boolean
}

function emptyQuestion(): QuizQuestionData {
  return {
    question_text: "",
    question_type: "multiple_choice",
    options: [{ text: "", is_correct: true }, { text: "", is_correct: false }],
    correct_answer: "",
    explanation: "",
    points: 1,
    order_index: 0,
  }
}

export function QuizBuilder({ lessonId, onChange, quizData }: QuizBuilderProps) {
  const [title, setTitle] = useState(quizData.title || "")
  const [description, setDescription] = useState(quizData.description || "")
  const [passPercentage, setPassPercentage] = useState(quizData.pass_percentage ?? 70)
  const [timeLimit, setTimeLimit] = useState(quizData.time_limit_minutes ?? "")
  const [maxAttempts, setMaxAttempts] = useState(quizData.max_attempts ?? "")
  const [shuffleQuestions, setShuffleQuestions] = useState(quizData.shuffle_questions ?? false)
  const [questions, setQuestions] = useState<QuizQuestionData[]>(quizData.questions || [emptyQuestion()])

  // Load existing quiz if editing
  useEffect(() => {
    if (lessonId && !quizData.questions?.length) {
      getBuilderQuiz(lessonId).then(data => {
        if (data && data.questions?.length) {
          setTitle(data.title)
          setDescription(data.description || "")
          setPassPercentage(data.pass_percentage)
          setTimeLimit(data.time_limit_minutes ?? "")
          setMaxAttempts(data.max_attempts ?? "")
          setShuffleQuestions(data.shuffle_questions)
          setQuestions(data.questions)
        }
      }).catch(() => {})
    }
  }, [lessonId])

  // Sync upward
  useEffect(() => {
    onChange({
      title, description, pass_percentage: passPercentage,
      time_limit_minutes: timeLimit ? Number(timeLimit) : null,
      max_attempts: maxAttempts ? Number(maxAttempts) : null,
      shuffle_questions: shuffleQuestions, shuffle_options: false,
      show_correct_answers: true,
      questions,
      total_questions: questions.length,
    })
  }, [title, description, passPercentage, timeLimit, maxAttempts, shuffleQuestions, questions])

  function updateQuestion(idx: number, patch: Partial<QuizQuestionData>) {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, ...patch } : q))
  }

  function removeQuestion(idx: number) {
    setQuestions(prev => prev.filter((_, i) => i !== idx))
  }

  function updateOption(qIdx: number, oIdx: number, patch: Partial<OptionItem>) {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q
      const opts = [...(q.options as OptionItem[] || [])]
      opts[oIdx] = { ...opts[oIdx], ...patch }
      // For multiple_choice / true_false: only one correct
      if (patch.is_correct && (q.question_type === "multiple_choice" || q.question_type === "true_false")) {
        opts.forEach((o, j) => { if (j !== oIdx) o.is_correct = false })
      }
      return { ...q, options: opts }
    }))
  }

  function addOption(qIdx: number) {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q
      return { ...q, options: [...(q.options as OptionItem[] || []), { text: "", is_correct: false }] }
    }))
  }

  function removeOption(qIdx: number, oIdx: number) {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q
      const opts = (q.options as OptionItem[] || []).filter((_, j) => j !== oIdx)
      return { ...q, options: opts }
    }))
  }

  return (
    <div className="space-y-4">
      {/* Quiz settings */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Quiz Title</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Knowledge Check" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Pass Percentage</Label>
          <Input type="number" min={0} max={100} value={passPercentage} onChange={e => setPassPercentage(Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Time Limit (min)</Label>
          <Input type="number" min={0} value={timeLimit} onChange={e => setTimeLimit(e.target.value)} placeholder="No limit" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Max Attempts</Label>
          <Input type="number" min={0} value={maxAttempts} onChange={e => setMaxAttempts(e.target.value)} placeholder="Unlimited" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={shuffleQuestions} onCheckedChange={setShuffleQuestions} />
        <Label className="text-xs">Shuffle questions</Label>
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {questions.map((q, qIdx) => (
          <Card key={qIdx}>
            <CardContent className="p-3 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground mt-2">Q{qIdx + 1}</span>
                <div className="flex-1 space-y-2">
                  <Textarea
                    rows={2}
                    placeholder="Question text..."
                    value={q.question_text}
                    onChange={e => updateQuestion(qIdx, { question_text: e.target.value })}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Select value={q.question_type} onValueChange={v => updateQuestion(qIdx, { question_type: v })}>
                      <SelectTrigger className="h-8 text-xs w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                        <SelectItem value="multiple_select">Multiple Select</SelectItem>
                        <SelectItem value="true_false">True / False</SelectItem>
                        <SelectItem value="short_answer">Short Answer</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number" min={1} className="h-8 text-xs w-20"
                      value={q.points} onChange={e => updateQuestion(qIdx, { points: Number(e.target.value) })}
                      placeholder="Points"
                    />
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => removeQuestion(qIdx)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Options for MC / MS / TF */}
              {(q.question_type === "multiple_choice" || q.question_type === "multiple_select" || q.question_type === "true_false") && (
                <div className="space-y-1.5 pl-6">
                  {(q.options as OptionItem[] || []).map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <Checkbox
                        checked={opt.is_correct}
                        onCheckedChange={(checked) => updateOption(qIdx, oIdx, { is_correct: !!checked })}
                      />
                      <Input
                        className="h-7 text-xs flex-1"
                        placeholder={`Option ${oIdx + 1}`}
                        value={opt.text}
                        onChange={e => updateOption(qIdx, oIdx, { text: e.target.value })}
                      />
                      {q.question_type !== "true_false" && (
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => removeOption(qIdx, oIdx)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {q.question_type !== "true_false" && (
                    <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => addOption(qIdx)}>
                      <Plus className="h-3 w-3" /> Add Option
                    </Button>
                  )}
                </div>
              )}

              {/* Short answer */}
              {q.question_type === "short_answer" && (
                <div className="pl-6 space-y-1.5">
                  <Label className="text-xs">Correct Answer</Label>
                  <Input
                    className="h-7 text-xs"
                    value={q.correct_answer || ""}
                    onChange={e => updateQuestion(qIdx, { correct_answer: e.target.value })}
                  />
                </div>
              )}

              {/* Explanation */}
              <div className="pl-6 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Explanation (optional)</Label>
                <Input
                  className="h-7 text-xs"
                  value={q.explanation || ""}
                  onChange={e => updateQuestion(qIdx, { explanation: e.target.value })}
                  placeholder="Why this answer is correct..."
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button variant="outline" className="gap-1" onClick={() => setQuestions(prev => [...prev, emptyQuestion()])}>
        <Plus className="h-4 w-4" /> Add Question
      </Button>
    </div>
  )
}
