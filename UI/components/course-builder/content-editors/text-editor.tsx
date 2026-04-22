"use client"

import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface TextEditorProps {
  textContent: string
  onChange: (text: string) => void
}

export function TextEditor({ textContent, onChange }: TextEditorProps) {
  return (
    <div className="space-y-2">
      <Label>Content (Markdown supported)</Label>
      <Textarea
        placeholder="Write your lesson content here... Markdown is supported."
        rows={12}
        value={textContent}
        onChange={e => onChange(e.target.value)}
        className="font-mono text-sm"
      />
      <p className="text-xs text-muted-foreground">Supports headings, bold, italic, code blocks, lists, and links.</p>
    </div>
  )
}
