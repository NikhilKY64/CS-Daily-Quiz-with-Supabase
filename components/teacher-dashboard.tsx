"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings, Plus, Eye, Download, Upload, Users, BookOpen, BarChart3, Edit } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { QuestionForm } from "@/components/question-form"
import { QuestionPreview } from "@/components/question-preview"
import { Leaderboard } from "@/components/leaderboard"
import { ImportExportDialog } from "@/components/import-export-dialog"
import { getQuestionBank, addQuestion, updateQuestion } from "@/lib/question-storage"
import { getQuizTitle, updateQuizTitle } from '../lib/import-export'
import type { Question } from "@/lib/types"

interface TeacherDashboardProps {
  quizTitle: string
  onTitleChange: (title: string) => void
}

export function TeacherDashboard({ quizTitle, onTitleChange }: TeacherDashboardProps) {
  const [questionCount, setQuestionCount] = useState(0)
  const [studentCount, setStudentCount] = useState(0)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState(quizTitle)
  const [showQuestionForm, setShowQuestionForm] = useState(false)
  const [showQuestionPreview, setShowQuestionPreview] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [showImportExport, setShowImportExport] = useState(false)
  const [importExportMode, setImportExportMode] = useState<"import" | "export">("import")

  const loadData = async () => {
    try {
      const questions = await getQuestionBank()
      setQuestionCount(Object.keys(questions).length)

      const { getAllProfiles } = await import('@/lib/supabaseClient.js')
      const students = await getAllProfiles()
      setStudentCount(students ? students.length : 0)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      // Show a more user-friendly error message
      alert('Failed to load dashboard data. Please try refreshing the page.')
    }
  }

  useEffect(() => {
    async function fetchTitle() {
      const title = await getQuizTitle()
      setTempTitle(title)
    }
    fetchTitle()
  }, [])

  useEffect(() => {
    loadData()
  }, [])

  const handleTitleSave = async () => {
    await updateQuizTitle(tempTitle)
    onTitleChange(tempTitle)
    setIsEditingTitle(false)
  }

  const handleCreateQuestion = () => {
    setEditingQuestion(null)
    setShowQuestionForm(true)
  }

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question)
    setShowQuestionForm(true)
    setShowQuestionPreview(false)
  }

  const handleSaveQuestion = async (questionData: Omit<Question, "id" | "createdAt" | "updatedAt">) => {
    try {
      console.log('Saving question:', questionData)
      console.log('Is editing?', editingQuestion ? 'Yes' : 'No')
      
      if (editingQuestion) {
        console.log('Updating question with ID:', editingQuestion.id)
        await updateQuestion(editingQuestion.id, questionData)
      } else {
        console.log('Adding new question')
        await addQuestion(questionData)
      }

      console.log('Question saved successfully')
      setShowQuestionForm(false)
      setEditingQuestion(null)
      await loadData()
    } catch (error) {
  console.error('Error saving question:', error)
  // Show detailed message if available
  const message = (error as any)?.message ? (error as any).message : String(error)
  alert('Failed to save question. ' + message)
    }
  }

  const handleCancelQuestion = () => {
    setShowQuestionForm(false)
    setEditingQuestion(null)
  }

  const handleShowLeaderboard = () => {
    setShowLeaderboard(true)
  }

  const handleBackFromLeaderboard = () => {
    setShowLeaderboard(false)
  }

  const handleImport = () => {
    setImportExportMode("import")
    setShowImportExport(true)
  }

  const handleExport = () => {
    setImportExportMode("export")
    setShowImportExport(true)
  }

  const handleImportComplete = () => {
    loadData()
  }

  if (showLeaderboard) {
    return <Leaderboard onBack={handleBackFromLeaderboard} userRole="teacher" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Teacher Dashboard</h2>
          <p className="text-muted-foreground">Manage your quiz and track student progress</p>
        </div>

        <Dialog open={isEditingTitle} onOpenChange={setIsEditingTitle}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit Quiz Title
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Quiz Title</DialogTitle>
              <DialogDescription>Change the name of your quiz that students will see</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="quiz-title">Quiz Title</Label>
                <Input
                  id="quiz-title"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  placeholder="Enter quiz title..."
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleTitleSave}>Save Changes</Button>
                <Button variant="outline" onClick={() => setIsEditingTitle(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{questionCount}</div>
            <p className="text-xs text-muted-foreground">in question bank</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{studentCount}</div>
            <p className="text-xs text-muted-foreground">participating</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quiz Status</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{questionCount >= 5 ? "Active" : "Setup"}</div>
            <p className="text-xs text-muted-foreground">
              {questionCount >= 5 ? "Ready for students" : "Need more questions"}
            </p>
          </CardContent>
        </Card>
      </div>

      {showQuestionForm && (
        <QuestionForm
          question={editingQuestion || undefined}
          onSave={handleSaveQuestion}
          onCancel={handleCancelQuestion}
        />
      )}

      {showQuestionPreview && (
        <QuestionPreview onEdit={handleEditQuestion} onRefresh={loadData} onBack={() => setShowQuestionPreview(false)} />
      )}

      {!showQuestionForm && !showQuestionPreview && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  Add Questions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">Create new multiple choice questions</p>
                <Button className="w-full" onClick={handleCreateQuestion}>
                  Create Question
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  Preview Questions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">View, edit, or delete existing questions</p>
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => setShowQuestionPreview(true)}
                >
                  Browse Questions
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">View student rankings and progress</p>
                <Button variant="outline" className="w-full bg-transparent" onClick={handleShowLeaderboard}>
                  View Rankings
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Question Bank Management
              </CardTitle>
              <CardDescription>Import or export your question sets to share with other teachers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="outline" className="flex-1 bg-transparent" onClick={handleImport}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Questions
                </Button>
                <Button variant="outline" className="flex-1 bg-transparent" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Questions
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {(showQuestionForm || showQuestionPreview) && (
        <div className="flex justify-start">
          <Button
            variant="outline"
            onClick={() => {
              setShowQuestionForm(false)
              setShowQuestionPreview(false)
              setEditingQuestion(null)
            }}
          >
            Back to Dashboard
          </Button>
        </div>
      )}

      <ImportExportDialog
        isOpen={showImportExport}
        onClose={() => setShowImportExport(false)}
        mode={importExportMode}
        onImportComplete={handleImportComplete}
      />
    </div>
  )
}
