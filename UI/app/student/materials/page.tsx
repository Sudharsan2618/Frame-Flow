"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Download, FileText, FileArchive, Palette } from "lucide-react"
import { useState, useEffect } from "react"
import { getAllMaterials, mapMaterialToUI } from "@/lib/api"
import { MaterialsSkeleton } from "@/components/skeletons"

const typeIcons: Record<string, React.ElementType> = {
  PDF: FileText,
  ZIP: FileArchive,
  Figma: Palette,
  DOCX: FileText,
}

export default function MaterialsLibrary() {
  const [search, setSearch] = useState("")
  const [materials, setMaterials] = useState<ReturnType<typeof mapMaterialToUI>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMaterials() {
      try {
        setLoading(true)
        setError(null)
        const data = await getAllMaterials()
        setMaterials(data.map(mapMaterialToUI))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load materials")
        console.error("Failed to fetch materials:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchMaterials()
  }, [])

  const filtered = materials.filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    m.course.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Materials Library</h1>
        <p className="text-muted-foreground">Download course materials, templates, and resources.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search materials..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {loading && <MaterialsSkeleton />}

      {error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-lg font-medium text-destructive">Failed to load materials</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      )}

      {!loading && !error && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="hidden md:table-cell">Course</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="hidden sm:table-cell">Size</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => {
                  const Icon = typeIcons[m.type] || FileText
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{m.title}</p>
                            <p className="text-xs text-muted-foreground md:hidden">{m.course}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{m.course}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="text-xs">{m.type}</Badge>
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{m.size}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5"
                          asChild
                        >
                          <a href={m.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">Download</span>
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No materials found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
