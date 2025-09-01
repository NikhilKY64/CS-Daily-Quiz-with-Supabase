"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Trash2, UserPlus, Users, Trophy, Flame } from "lucide-react"
import {
  getAllStudents,
  createNewStudent,
  setCurrentStudent,
  getCurrentStudentId,
  deleteStudent,
  type StudentProgress,
} from "@/lib/student-storage"

interface StudentSelectorProps {
  onStudentSelected: (student: StudentProgress) => void
}

export function StudentSelector({ onStudentSelected }: StudentSelectorProps) {
  const [students, setStudents] = useState<StudentProgress[]>([])
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null)
  const [newStudentName, setNewStudentName] = useState("")
  const [showNewStudentDialog, setShowNewStudentDialog] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStudents()
  }, [])

  const loadStudents = async () => {
    try {
      setLoading(true)
      const allStudents = await getAllStudents()
      const current = getCurrentStudentId()
      setStudents(allStudents)
      setCurrentStudentId(current)
    } catch (error) {
      console.error('Error loading students:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectStudent = (student: StudentProgress) => {
    setCurrentStudent(student.studentId)
    setCurrentStudentId(student.studentId)
    onStudentSelected(student)
  }

  const handleCreateStudent = async () => {
    if (newStudentName.trim()) {
      try {
        const newStudent = await createNewStudent(newStudentName.trim())
        setNewStudentName("")
        setShowNewStudentDialog(false)
        await loadStudents()
        onStudentSelected(newStudent)
      } catch (error) {
        console.error('Error creating student:', error)
      }
    }
  }

  const handleDeleteStudent = async (studentId: string) => {
    if (students.length > 1) {
      try {
        await deleteStudent(studentId)
        await loadStudents()

        // If we deleted the current student, select the first remaining one
        if (currentStudentId === studentId && students.length > 1) {
          const remainingStudents = students.filter((s) => s.studentId !== studentId)
          if (remainingStudents.length > 0) {
            handleSelectStudent(remainingStudents[0])
          }
        }
      } catch (error) {
        console.error('Error deleting student:', error)
      }
    }
  }

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <div>Loading students...</div>
        </CardContent>
      </Card>
    )
  }

  if (students.length === 0) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Users className="h-6 w-6" />
            Welcome to Quiz App
          </CardTitle>
          <CardDescription>Create your first student profile to get started</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="studentName">Student Name</Label>
            <Input
              id="studentName"
              placeholder="Enter your name"
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateStudent()}
            />
          </div>
          <Button onClick={handleCreateStudent} className="w-full" disabled={!newStudentName.trim()}>
            <UserPlus className="h-4 w-4 mr-2" />
            Create Profile
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            Select Student
          </span>
          <Dialog open={showNewStudentDialog} onOpenChange={setShowNewStudentDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Student</DialogTitle>
                <DialogDescription>Create a new student profile to track their quiz progress</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newStudentName">Student Name</Label>
                  <Input
                    id="newStudentName"
                    placeholder="Enter student name"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateStudent()}
                  />
                </div>
                <Button onClick={handleCreateStudent} className="w-full" disabled={!newStudentName.trim()}>
                  Create Student
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>Choose a student profile to continue with their quiz progress</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {students.map((student) => (
            <div
              key={student.studentId}
              className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${
                currentStudentId === student.studentId ? "border-primary bg-primary/5" : "border-border"
              }`}
              onClick={() => handleSelectStudent(student)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{student.studentName}</h3>
                    {currentStudentId === student.studentId && <Badge variant="secondary">Current</Badge>}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Trophy className="h-4 w-4" />
                      {student.totalPoints} points
                    </span>
                    <span className="flex items-center gap-1">
                      <Flame className="h-4 w-4" />
                      {student.currentStreak} day streak
                    </span>
                    <span>{student.quizHistory.length} quizzes completed</span>
                  </div>
                </div>
                {students.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteStudent(student.studentId)
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
