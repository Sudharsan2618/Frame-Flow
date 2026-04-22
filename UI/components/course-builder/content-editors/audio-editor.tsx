"use client"

import { Label } from "@/components/ui/label"
import { UploadDropzone } from "@/components/course-builder/upload-dropzone"

interface AudioEditorProps {
  contentUrl: string
  courseSlug: string
  onChange: (url: string) => void
}

export function AudioEditor({ contentUrl, courseSlug, onChange }: AudioEditorProps) {
  return (
    <div className="space-y-2">
      <Label>Upload Audio</Label>
      <UploadDropzone
        accept={{ "audio/*": [".mp3", ".wav", ".ogg", ".m4a"] }}
        maxSizeMB={100}
        onUploadComplete={onChange}
        courseSlug={courseSlug}
        label="Drop audio file here (MP3, WAV, OGG — max 100MB)"
        currentUrl={contentUrl}
      />
      {contentUrl && (
        <audio controls src={contentUrl} className="w-full mt-2" />
      )}
    </div>
  )
}
