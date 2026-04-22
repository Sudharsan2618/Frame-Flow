"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ExternalLinkEditorProps {
  contentUrl: string
  onChange: (url: string) => void
}

export function ExternalLinkEditor({ contentUrl, onChange }: ExternalLinkEditorProps) {
  return (
    <div className="space-y-2">
      <Label>External URL</Label>
      <Input
        type="url"
        placeholder="https://example.com/resource"
        value={contentUrl}
        onChange={e => onChange(e.target.value)}
      />
      <p className="text-xs text-muted-foreground">Students will be able to open this link in a new tab.</p>
    </div>
  )
}
