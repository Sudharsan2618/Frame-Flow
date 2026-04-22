"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, X, FileIcon, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { requestSignedUpload, uploadFileToGCS } from "@/lib/api/admin-courses"
import { cn } from "@/lib/utils"

interface UploadDropzoneProps {
  accept: Record<string, string[]>
  maxSizeMB?: number
  onUploadComplete: (url: string) => void
  courseSlug?: string
  label?: string
  currentUrl?: string | null
  className?: string
}

export function UploadDropzone({
  accept,
  maxSizeMB = 500,
  onUploadComplete,
  courseSlug,
  label = "Drop file here or click to upload",
  currentUrl,
  className,
}: UploadDropzoneProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(!!currentUrl)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File too large. Max ${maxSizeMB}MB.`)
      return
    }

    setError(null)
    setUploading(true)
    setProgress(0)
    setFileName(file.name)
    setDone(false)

    try {
      const { upload_url, public_url } = await requestSignedUpload(file.name, file.type, courseSlug)
      await uploadFileToGCS(upload_url, file, file.type, setProgress)
      setDone(true)
      onUploadComplete(public_url)
    } catch (e: any) {
      setError(e.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }, [maxSizeMB, courseSlug, onUploadComplete])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
    disabled: uploading,
  })

  function handleRemove() {
    setFileName(null)
    setDone(false)
    setProgress(0)
    onUploadComplete("")
  }

  const displayName = fileName || (currentUrl ? currentUrl.split("/").pop() : null)

  return (
    <div className={cn("space-y-2", className)}>
      {done && displayName ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-foreground truncate flex-1">{displayName}</span>
          <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleRemove}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 cursor-pointer transition-colors",
            isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
            uploading && "pointer-events-none opacity-60",
          )}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">{fileName} — {progress}%</p>
              <div className="w-full max-w-[200px] h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
              </div>
            </>
          ) : (
            <>
              <Upload className="h-6 w-6 text-muted-foreground" />
              <p className="text-xs text-muted-foreground text-center">{label}</p>
            </>
          )}
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
