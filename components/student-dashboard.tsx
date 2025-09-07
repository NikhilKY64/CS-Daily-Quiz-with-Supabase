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
    quizHistory: [] as { score: number }[],
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
        quizHistory: data.quizHistory || [],
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
      setStudentData((prev) => ({
        ...prev,
        totalPoints: currentStudent.totalPoints || 0,
        currentStreak: currentStudent.currentStreak || 0,
        lastAttemptDate: currentStudent.lastAttemptDate,
        todayCompleted: Boolean(currentStudent.todayCompleted),
        lastQuizScore: currentStudent.lastQuizScore || 0,
        lastQuizPercentage: currentStudent.lastQuizPercentage || 0,
      }))
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
  if (loading || studentData.todayCompleted) return
  setShowQuiz(true)
  }

  const handleQuizComplete = async (result: QuizResult) => {
    setShowQuiz(false)
    // Update local state immediately
    setStudentData(prev => ({
      ...prev,
      todayCompleted: true,
      // Also update other relevant fields to avoid UI flicker
      lastQuizScore: result.score,
      lastQuizPercentage: Math.round((result.score / result.totalQuestions) * 100),
      // Increment streak if last attempt was yesterday (will be properly updated by loadStudentData later)
      currentStreak: (() => {
        try {
          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          const prevLast = prev.lastAttemptDate ? prev.lastAttemptDate.split('T')[0] : null
          return prevLast === yesterday ? prev.currentStreak + 1 : prev.currentStreak
        } catch {
          return prev.currentStreak
        }
      })()
    }))
    
    // Then refresh all student data - but don't await to avoid UI flicker
    loadStudentData()
  }

  const handleQuizExit = () => {
    setShowQuiz(false)
  }

  const handleShowProgress = () => {
    // Only keep a lightweight debug trace in development builds
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.debug('Open Progress view', { totalPoints: studentData.totalPoints, currentStreak: studentData.currentStreak })
    }
    setShowProgress(true)
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

  // We're now using studentData.todayCompleted directly instead of canTakeQuiz

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
          <p className="text-muted-foreground">Answer all questions to complete today&apos;s challenge</p>
        </div>
        <DailyQuiz onComplete={handleQuizComplete} onExit={handleQuizExit} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-like">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Points</CardTitle>
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600">
              <Target className="h-6 w-6" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stat-number">{studentData.totalPoints}</div>
            <p className="stat-subtext">Keep learning!</p>
          </CardContent>
        </Card>

  <Card className="card-like">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-orange-50 text-orange-600">
              <Flame className="h-6 w-6" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stat-number">{studentData.currentStreak}</div>
            <p className="stat-subtext">days in a row</p>
          </CardContent>
        </Card>

  <Card className="card-like">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Attempt</CardTitle>
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-sky-50 text-sky-600">
              <Calendar className="h-6 w-6" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stat-number">{studentData.lastAttemptDate ? new Date(studentData.lastAttemptDate).toLocaleDateString() : "Never"}</div>
            <p className="stat-subtext">{studentData.todayCompleted ? "Completed today!" : "Ready to start"}</p>
          </CardContent>
        </Card>

  <Card className="card-like">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Quiz Score</CardTitle>
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-yellow-50 text-amber-600">
              <Trophy className="h-6 w-6" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stat-number">{studentData.lastQuizScore > 0 ? `${studentData.lastQuizScore}/5` : "No attempts"}</div>
            <p className="stat-subtext">{studentData.lastQuizPercentage > 0 ? `${studentData.lastQuizPercentage}% correct` : "Take a quiz to see results"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Quiz Section */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Today&apos;s Quiz
          </CardTitle>
          <CardDescription>Answer 5 random questions to earn points and maintain your streak</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Daily Challenge</p>
              <p className="text-xs text-muted-foreground">5 multiple choice questions</p>
            </div>
            <Badge variant={!studentData.todayCompleted ? "default" : "secondary"}>{!studentData.todayCompleted ? "Available" : "Completed"}</Badge>
          </div>

          <Button className="w-full" disabled={studentData.todayCompleted} size="lg" onClick={handleStartQuiz}>
            <Play className="h-4 w-4 mr-2" />
            {!studentData.todayCompleted ? "Start Daily Quiz" : "Quiz Completed Today"}
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
            <div className="text-muted-foreground text-base mt-1 ml-7">Track your learning journey</div>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full bg-transparent" onClick={handleShowProgress}>
              View History
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
