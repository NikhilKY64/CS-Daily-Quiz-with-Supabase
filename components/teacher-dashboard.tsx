"use client"

import React, { useState, useEffect } from "react"
import dynamic from 'next/dynamic'
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
  const [showAdminPanel, setShowAdminPanel] = useState(false)

  // Dynamic client-only Admin panel
  const AdminPanel = dynamic(() => import('./admin-panel'), { ssr: false })
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [passwordInput, setPasswordInput] = useState("")
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  

  const loadData = async () => {
    try {
      const questions = await getQuestionBank()
      setQuestionCount(Object.keys(questions).length)

      const { getAllProfiles } = await import('@/lib/supabaseClient.js')
      const students = await getAllProfiles()
      setStudentCount(students ? students.length : 0)
      try {
        const { getCurrentUser, getProfile } = await import('@/lib/supabaseClient.js')
        const authResp = await getCurrentUser()
        if (authResp && authResp.id) {
          const profile = await getProfile(authResp.id)
          setIsAdmin(!!(profile && profile.is_admin))
        }
      } catch (e) {
        console.error('Failed to determine admin flag:', e)
      }
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
          <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 dark:border-red-700 dark:bg-red-900/30">
            <p className="text-sm text-red-800 font-bold dark:text-red-200">Warning: Any changes you make here — like adding or editing questions — will affect all users. Please proceed carefully</p>
          </div>
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
        <div className="ml-3">
          <Button variant="ghost" size="sm" onClick={() => setShowAdminPanel(true)}>
            Manage Admins
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600">
              <BookOpen className="h-6 w-6" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{questionCount}</div>
            <p className="text-xs text-muted-foreground">in question bank</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-sky-50 text-sky-600">
              <Users className="h-6 w-6" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{studentCount}</div>
            <p className="text-xs text-muted-foreground">participating</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quiz Status</CardTitle>
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-amber-50 text-amber-600">
              <BarChart3 className="h-6 w-6" />
            </div>
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
                  onClick={() => {
                    setPasswordInput("")
                    setPasswordError(null)
                    setShowPasswordDialog(true)
                  }}
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

      {/* Admin management dialog */}
      {showAdminPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-overlay fixed inset-0" onClick={() => setShowAdminPanel(false)} />
          <div className="relative w-full max-w-3xl p-6">
            <div className="bg-background rounded-lg p-4 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Manage Admins</h3>
                <Button variant="ghost" onClick={() => setShowAdminPanel(false)}>Close</Button>
              </div>
              <div>
                {/* Render client-only AdminPanel component */}
                <AdminPanel />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password dialog used for gating Browse Questions */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Teacher Password</DialogTitle>
            <DialogDescription>Provide the teacher password to access the question browser.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="teacher-password">Password</Label>
              <Input
                id="teacher-password"
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
              />
              {passwordError && <p className="text-sm text-destructive mt-2">{passwordError}</p>}
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordDialog(false)
                  setPasswordInput("")
                  setPasswordError(null)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  setIsVerifyingPassword(true)
                  setPasswordError(null)
                  try {
                    const { getTeacherPassword } = await import('@/lib/supabaseClient.js')
                    const stored = await getTeacherPassword()
                    if (passwordInput === stored) {
                      setShowPasswordDialog(false)
                      setShowQuestionPreview(true)
                    } else {
                      setPasswordError('Incorrect password')
                    }
                  } catch (err) {
                    console.error('Error verifying teacher password', err)
                    setPasswordError('Verification failed. Please try again.')
                  } finally {
                    setIsVerifyingPassword(false)
                  }
                }}
                disabled={isVerifyingPassword}
              >
                {isVerifyingPassword ? 'Verifying...' : 'Verify'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      
    </div>
  )
}
