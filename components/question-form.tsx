"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Plus, Check, Upload, CheckCircle, XCircle } from "lucide-react"
import type { Question } from "@/lib/types"

interface QuestionFormProps {
  question?: Question
  onSave: (question: Omit<Question, "id" | "createdAt" | "updatedAt">) => void
  onCancel: () => void
  showUploadStatus?: boolean
}

export function QuestionForm({ question, onSave, onCancel, showUploadStatus = false }: QuestionFormProps) {
  const [formData, setFormData] = useState({
    question: question?.question || "",
    options: question?.options || ["", "", "", ""],
    correctAnswer: question?.correctAnswer || 0,
    explanation: question?.explanation || "",
    category: question?.category || "",
    difficulty: question?.difficulty || ("medium" as const),
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploadStatus, setUploadStatus] = useState<{
    isUploading: boolean
    success: boolean | null
    message: string
  }>({
    isUploading: false,
    success: null,
    message: ""
  })

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.question.trim()) {
      newErrors.question = "Question is required"
    }

    const validOptions = formData.options.filter((opt) => opt.trim())
    if (validOptions.length < 2) {
      newErrors.options = "At least 2 options are required"
    }

    if (formData.correctAnswer >= validOptions.length) {
      newErrors.correctAnswer = "Please select a valid correct answer"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    const validOptions = formData.options.filter((opt) => opt.trim())

    const questionData = {
      question: formData.question.trim(),
      options: validOptions,
      correctAnswer: formData.correctAnswer,
      explanation: formData.explanation.trim() || undefined,
      category: formData.category.trim() || undefined,
      difficulty: formData.difficulty,
    }
    
    console.log('=== QUESTION FORM SUBMITTED ===')
    console.log('Form data being sent:', questionData)
    console.log('Valid options count:', validOptions.length)
    console.log('Correct answer index:', formData.correctAnswer)

    onSave(questionData)
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...formData.options]
    newOptions[index] = value
    setFormData({ ...formData, options: newOptions })
  }

  const addOption = () => {
    if (formData.options.length < 6) {
      setFormData({ ...formData, options: [...formData.options, ""] })
    }
  }

  const removeOption = (index: number) => {
    if (formData.options.length > 2) {
      const newOptions = formData.options.filter((_, i) => i !== index)
      setFormData({
        ...formData,
        options: newOptions,
        correctAnswer:
          formData.correctAnswer >= index ? Math.max(0, formData.correctAnswer - 1) : formData.correctAnswer,
      })
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{question ? "Edit Question" : "Create New Question"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Question Text */}
          <div className="space-y-2">
            <Label htmlFor="question">Question *</Label>
            <Textarea
              id="question"
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              placeholder="Enter your question here..."
              className="min-h-[100px]"
            />
            {errors.question && <p className="text-sm text-destructive">{errors.question}</p>}
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Answer Options *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                disabled={formData.options.length >= 6}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Option
              </Button>
            </div>

            <div className="space-y-2">
              {formData.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={formData.correctAnswer === index ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData({ ...formData, correctAnswer: index })}
                    className="shrink-0"
                  >
                    {formData.correctAnswer === index ? <Check className="h-4 w-4" /> : String.fromCharCode(65 + index)}
                  </Button>

                  <Input
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    className="flex-1"
                  />

                  {formData.options.length > 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeOption(index)}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {errors.options && <p className="text-sm text-destructive">{errors.options}</p>}
            {errors.correctAnswer && <p className="text-sm text-destructive">{errors.correctAnswer}</p>}
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Computer Science, Math"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value: "easy" | "medium" | "hard") => setFormData({ ...formData, difficulty: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Explanation */}
          <div className="space-y-2">
            <Label htmlFor="explanation">Explanation (Optional)</Label>
            <Textarea
              id="explanation"
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              placeholder="Provide an explanation for the correct answer..."
              className="min-h-[80px]"
            />
          </div>

          {/* Upload Status */}
          {showUploadStatus && uploadStatus.message && (
            <div className={`flex items-center gap-2 p-3 rounded-md ${
              uploadStatus.success === true ? 'bg-green-50 text-green-700 border border-green-200' :
              uploadStatus.success === false ? 'bg-red-50 text-red-700 border border-red-200' :
              'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {uploadStatus.success === true ? (
                <CheckCircle className="h-4 w-4" />
              ) : uploadStatus.success === false ? (
                <XCircle className="h-4 w-4" />
              ) : (
                <Upload className="h-4 w-4 animate-pulse" />
              )}
              <span className="text-sm">{uploadStatus.message}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button 
              type="submit" 
              className="flex-1"
              disabled={uploadStatus.isUploading}
            >
              {uploadStatus.isUploading ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-pulse" />
                  Uploading...
                </>
              ) : (
                <>
                  {question ? "Update Question" : "Create Question"}
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
