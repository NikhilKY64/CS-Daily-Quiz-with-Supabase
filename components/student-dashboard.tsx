"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Target, Trophy, Play, Clock, Flame } from "lucide-react"
import { DailyQuiz } from "@/components/daily-quiz"
import { ProgressTracking } from "@/components/progress-tracking"
import { Leaderboard } from "@/components/leaderboard"
import { getStudentData, canTakeQuizToday, type QuizResult } from "@/lib/student-storage"

interface StudentDashboardProps {
  quizTitle: string
  currentStudent?: {
    totalPoints: number;
    currentStreak: number;
    lastAttemptDate: string | null;
    todayCompleted: boolean;
    lastQuizScore?: number;
    lastQuizPercentage?: number;
  } | null
}

export function StudentDashboard({ quizTitle, currentStudent }: StudentDashboardProps) {
  const [studentData, setStudentData] = useState({
    totalPoints: 0,
    currentStreak: 0,
    lastAttemptDate: null as string | null,
    todayCompleted: false,
    lastQuizScore: 0,
    lastQuizPercentage: 0,
  })
  const [showQuiz, setShowQuiz] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [canTakeQuiz, setCanTakeQuiz] = useState(true)
  const [loading, setLoading] = useState(true)

  const loadStudentData = async () => {
    try {
      setLoading(true)
      const data = await getStudentData()
      setStudentData({
        totalPoints: data.totalPoints,
        currentStreak: data.currentStreak,
        lastAttemptDate: data.lastAttemptDate,
        todayCompleted: data.todayCompleted,
        lastQuizScore: data.lastQuizScore || 0,
        lastQuizPercentage: data.lastQuizPercentage || 0,
      })
      const canTake = await canTakeQuizToday()
      setCanTakeQuiz(canTake)
    } catch (error) {
      console.error('Error loading student data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (currentStudent) {
      setStudentData({
        totalPoints: currentStudent.totalPoints || 0,
        currentStreak: currentStudent.currentStreak || 0,
        lastAttemptDate: currentStudent.lastAttemptDate,
        todayCompleted: currentStudent.todayCompleted || false,
        lastQuizScore: currentStudent.lastQuizScore || 0,
        lastQuizPercentage: currentStudent.lastQuizPercentage || 0,
      })
      setLoading(false)
    } else {
      loadStudentData()
    }

    // Auto-open leaderboard if flagged
    try {
      const flag = sessionStorage.getItem('openLeaderboard')
      if (flag === '1') {
        sessionStorage.removeItem('openLeaderboard')
        setShowLeaderboard(true)
      }
    } catch {}
  }, [currentStudent])

  // Listen for a custom event to open leaderboard from header without navigation
  useEffect(() => {
    const handler = () => setShowLeaderboard(true)
    if (typeof window !== 'undefined') {
      window.addEventListener('open-leaderboard', handler as EventListener)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('open-leaderboard', handler as EventListener)
      }
    }
  }, [])

  const handleStartQuiz = () => {
    setShowQuiz(true)
  }

  const handleQuizComplete = async (result: QuizResult) => {
    setShowQuiz(false)
    await loadStudentData() // Refresh student data
  }

  const handleQuizExit = () => {
    setShowQuiz(false)
  }

  const handleShowProgress = () => {
    console.log('=== PROGRESS BUTTON CLICKED ===')
    console.log('Current student data:', studentData)
    console.log('Current state - showProgress:', showProgress)
    console.log('Current state - showQuiz:', showQuiz)
    console.log('Current state - showLeaderboard:', showLeaderboard)
    console.log('About to set showProgress to true')
    console.log('Student data type:', typeof studentData)
    console.log('Student data keys:', Object.keys(studentData || {}))
    console.log('Total points:', studentData?.totalPoints)
    console.log('Current streak:', studentData?.currentStreak)
    setShowProgress(true)
    console.log('showProgress state set to true')
  }

  const handleBackFromProgress = () => {
    setShowProgress(false)
  }

  const handleShowLeaderboard = () => {
    setShowLeaderboard(true)
  }

  const handleBackFromLeaderboard = () => {
    setShowLeaderboard(false)
  }

  // canTakeQuiz is now managed in state

  if (showLeaderboard) {
    return <Leaderboard onBack={handleBackFromLeaderboard} userRole="student" />
  }

  if (showProgress) {
    return <ProgressTracking onBack={handleBackFromProgress} />
  }

  if (showQuiz) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-foreground">Daily Quiz</h2>
          <p className="text-muted-foreground">Answer all questions to complete today's challenge</p>
        </div>
        <DailyQuiz onComplete={handleQuizComplete} onExit={handleQuizExit} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Points</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{studentData.totalPoints}</div>
            <p className="text-xs text-muted-foreground">Keep learning!</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{studentData.currentStreak}</div>
            <p className="text-xs text-muted-foreground">days in a row</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Attempt</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {studentData.lastAttemptDate ? new Date(studentData.lastAttemptDate).toLocaleDateString() : "Never"}
            </div>
            <p className="text-xs text-muted-foreground">
              {studentData.todayCompleted ? "Completed today!" : "Ready to start"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Quiz Score</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {studentData.lastQuizScore > 0 ? `${studentData.lastQuizScore}/5` : "No attempts"}
            </div>
            <p className="text-xs text-muted-foreground">
              {studentData.lastQuizPercentage > 0 ? `${studentData.lastQuizPercentage}% correct` : "Take a quiz to see results"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Quiz Section */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Today's Quiz
          </CardTitle>
          <CardDescription>Answer 5 random questions to earn points and maintain your streak</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Daily Challenge</p>
              <p className="text-xs text-muted-foreground">5 multiple choice questions</p>
            </div>
            <Badge variant={canTakeQuiz ? "default" : "secondary"}>{canTakeQuiz ? "Available" : "Completed"}</Badge>
          </div>

          <Button className="w-full" disabled={!canTakeQuiz} size="lg" onClick={handleStartQuiz}>
            <Play className="h-4 w-4 mr-2" />
            {canTakeQuiz ? "Start Daily Quiz" : "Quiz Completed Today"}
          </Button>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">See how you rank against other students</p>
            <Button variant="outline" className="w-full bg-transparent" onClick={handleShowLeaderboard}>
              View Rankings
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">Track your learning journey</p>
            <Button variant="outline" className="w-full bg-transparent" onClick={handleShowProgress}>
              View History
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
