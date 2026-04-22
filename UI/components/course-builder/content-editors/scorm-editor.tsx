"use client"

import { Label } from "@/components/ui/label"
import { UploadDropzone } from "@/components/course-builder/upload-dropzone"

interface ScormEditorProps {
  contentUrl: string
  courseSlug: string
  onChange: (url: string) => void
}

export function ScormEditor({ contentUrl, courseSlug, onChange }: ScormEditorProps) {
  return (
    <div className="space-y-2">
      <Label>Upload SCORM Package</Label>
      <UploadDropzone
        accept={{ "application/zip": [".zip"] }}
        maxSizeMB={200}
        onUploadComplete={onChange}
        courseSlug={courseSlug}
        label="Drop SCORM ZIP package here (max 200MB)"
        currentUrl={contentUrl}
      />
      <p className="text-xs text-muted-foreground">Upload a SCORM 1.2 or 2004 compatible ZIP package.</p>
    </div>
  )
}
