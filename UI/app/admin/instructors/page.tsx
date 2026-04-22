"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react"
import {
  getInstructors, createInstructor, updateInstructor, deleteInstructor,
  type InstructorItem,
} from "@/lib/api/admin-courses"

export default function InstructorsPage() {
  const [instructors, setInstructors] = useState<InstructorItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<InstructorItem | null>(null)
  const [saving, setSaving] = useState(false)

  // Form
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [bio, setBio] = useState("")
  const [headline, setHeadline] = useState("")
  const [expertise, setExpertise] = useState("")

  const load = useCallback(() => {
    setLoading(true)
    getInstructors()
      .then(setInstructors)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null)
    setFirstName("")
    setLastName("")
    setBio("")
    setHeadline("")
    setExpertise("")
    setDialogOpen(true)
  }

  function openEdit(inst: InstructorItem) {
    setEditing(inst)
    setFirstName(inst.first_name)
    setLastName(inst.last_name)
    setBio(inst.bio || "")
    setHeadline(inst.headline || "")
    setExpertise(inst.expertise_areas || "")
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) return
    setSaving(true)
    try {
      const data = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        bio: bio || null,
        headline: headline || null,
        expertise_areas: expertise || null,
      }
      if (editing) {
        await updateInstructor(editing.instructor_id, data)
      } else {
        await createInstructor(data)
      }
      setDialogOpen(false)
      load()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(inst: InstructorItem) {
    if (!confirm(`Delete instructor "${inst.first_name} ${inst.last_name}"?`)) return
    try {
      await deleteInstructor(inst.instructor_id)
      load()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Instructors</h1>
          <p className="text-sm text-muted-foreground">Manage course instructors</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add Instructor</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Headline</TableHead>
                  <TableHead>Expertise</TableHead>
                  <TableHead>Courses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instructors.map(inst => (
                  <TableRow key={inst.instructor_id}>
                    <TableCell className="font-medium">{inst.first_name} {inst.last_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{inst.headline || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{inst.expertise_areas || "—"}</TableCell>
                    <TableCell>{inst.course_count ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={inst.is_active ? "default" : "secondary"}>
                        {inst.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(inst)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(inst)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {instructors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No instructors found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Instructor" : "Add Instructor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Headline</Label>
              <Input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="e.g. Senior Software Engineer" />
            </div>
            <div className="space-y-2">
              <Label>Expertise Areas</Label>
              <Input value={expertise} onChange={e => setExpertise(e.target.value)} placeholder="e.g. Python, SQL, Machine Learning" />
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea rows={3} value={bio} onChange={e => setBio(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !firstName.trim() || !lastName.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
