"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UploadDropzone } from "@/components/course-builder/upload-dropzone"

interface VideoEditorProps {
  contentUrl: string
  videoExternalId: string
  videoExternalPlatform: string
  courseSlug: string
  onChange: (data: { content_url?: string; video_external_id?: string; video_external_platform?: string }) => void
}

function extractYouTubeId(url: string): string {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : url
}

export function VideoEditor({ contentUrl, videoExternalId, videoExternalPlatform, courseSlug, onChange }: VideoEditorProps) {
  const isYouTube = !!videoExternalId || videoExternalPlatform === "youtube"
  const [tab, setTab] = useState(isYouTube ? "youtube" : "upload")
  const [ytUrl, setYtUrl] = useState(videoExternalId ? `https://youtube.com/watch?v=${videoExternalId}` : "")

  function handleYouTubeChange(url: string) {
    setYtUrl(url)
    const id = extractYouTubeId(url)
    onChange({ video_external_id: id, video_external_platform: "youtube", content_url: "" })
  }

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="upload">Upload Video</TabsTrigger>
        <TabsTrigger value="youtube">YouTube URL</TabsTrigger>
      </TabsList>
      <TabsContent value="upload" className="mt-3">
        <UploadDropzone
          accept={{ "video/*": [".mp4", ".webm", ".mov"] }}
          maxSizeMB={500}
          onUploadComplete={(url) => onChange({ content_url: url, video_external_id: "", video_external_platform: "" })}
          courseSlug={courseSlug}
          label="Drop video file (MP4, WebM, MOV — max 500MB)"
          currentUrl={contentUrl}
        />
      </TabsContent>
      <TabsContent value="youtube" className="mt-3 space-y-2">
        <Label>YouTube Video URL</Label>
        <Input
          placeholder="https://youtube.com/watch?v=..."
          value={ytUrl}
          onChange={e => handleYouTubeChange(e.target.value)}
        />
        {videoExternalId && (
          <div className="rounded-md overflow-hidden aspect-video bg-black mt-2">
            <iframe
              src={`https://www.youtube.com/embed/${videoExternalId}`}
              className="w-full h-full"
              allowFullScreen
            />
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
