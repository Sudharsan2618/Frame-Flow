"use client"

import { Label } from "@/components/ui/label"
import { UploadDropzone } from "@/components/course-builder/upload-dropzone"

interface PdfEditorProps {
  contentUrl: string
  courseSlug: string
  onChange: (url: string) => void
}

export function PdfEditor({ contentUrl, courseSlug, onChange }: PdfEditorProps) {
  return (
    <div className="space-y-2">
      <Label>Upload PDF</Label>
      <UploadDropzone
        accept={{ "application/pdf": [".pdf"] }}
        maxSizeMB={50}
        onUploadComplete={onChange}
        courseSlug={courseSlug}
        label="Drop PDF file here (max 50MB)"
        currentUrl={contentUrl}
      />
    </div>
  )
}
