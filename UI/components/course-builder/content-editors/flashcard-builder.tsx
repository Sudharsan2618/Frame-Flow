"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"
import { getFlashcards, type FlashcardDeckData, type FlashcardItemData } from "@/lib/api/admin-courses"

interface FlashcardBuilderProps {
  lessonId: number | null
  onChange: (data: Partial<FlashcardDeckData>) => void
  deckData: Partial<FlashcardDeckData>
}

function emptyCard(): FlashcardItemData {
  return { front_content: "", back_content: "", front_image_url: null, back_image_url: null }
}

export function FlashcardBuilder({ lessonId, onChange, deckData }: FlashcardBuilderProps) {
  const [title, setTitle] = useState(deckData.title || "")
  const [description, setDescription] = useState(deckData.description || "")
  const [cards, setCards] = useState<FlashcardItemData[]>(deckData.cards || [emptyCard()])

  useEffect(() => {
    if (lessonId && !deckData.cards?.length) {
      getFlashcards(lessonId).then(data => {
        if (data && data.cards?.length) {
          setTitle(data.title)
          setDescription(data.description || "")
          setCards(data.cards)
        }
      }).catch(() => {})
    }
  }, [lessonId])

  useEffect(() => {
    onChange({ title, description, cards, total_cards: cards.length })
  }, [title, description, cards])

  function updateCard(idx: number, patch: Partial<FlashcardItemData>) {
    setCards(prev => prev.map((c, i) => i === idx ? { ...c, ...patch } : c))
  }

  function removeCard(idx: number) {
    setCards(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Deck Title</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Vocabulary Flashcards" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Description</Label>
          <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />
        </div>
      </div>

      <div className="space-y-3">
        {cards.map((card, idx) => (
          <Card key={idx}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground mt-2">#{idx + 1}</span>
                <div className="flex-1 grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Front</Label>
                    <Textarea
                      rows={2} className="text-sm"
                      placeholder="Question / Term"
                      value={card.front_content}
                      onChange={e => updateCard(idx, { front_content: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Back</Label>
                    <Textarea
                      rows={2} className="text-sm"
                      placeholder="Answer / Definition"
                      value={card.back_content}
                      onChange={e => updateCard(idx, { back_content: e.target.value })}
                    />
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => removeCard(idx)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button variant="outline" className="gap-1" onClick={() => setCards(prev => [...prev, emptyCard()])}>
        <Plus className="h-4 w-4" /> Add Card
      </Button>

      <p className="text-xs text-muted-foreground">{cards.length} card{cards.length !== 1 ? "s" : ""} in deck</p>
    </div>
  )
}
