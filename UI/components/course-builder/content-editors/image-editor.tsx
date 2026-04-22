"use client"

import { Label } from "@/components/ui/label"
import { UploadDropzone } from "@/components/course-builder/upload-dropzone"

interface ImageEditorProps {
  contentUrl: string
  courseSlug: string
  onChange: (url: string) => void
}

export function ImageEditor({ contentUrl, courseSlug, onChange }: ImageEditorProps) {
  return (
    <div className="space-y-2">
      <Label>Upload Image</Label>
      <UploadDropzone
        accept={{ "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif"] }}
        maxSizeMB={20}
        onUploadComplete={onChange}
        courseSlug={courseSlug}
        label="Drop image file here (JPG, PNG, WebP, GIF — max 20MB)"
        currentUrl={contentUrl}
      />
      {contentUrl && (
        <img src={contentUrl} alt="Preview" className="mt-2 max-h-48 rounded-md border object-contain" />
      )}
    </div>
  )
}
