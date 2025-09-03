"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trophy, Medal, Award, Crown, ChevronLeft, Target, Flame, Calendar } from "lucide-react"
import { getAllStudents, getStudentData, type StudentProgress } from "@/lib/student-storage"

interface LeaderboardProps {
  onBack: () => void
  userRole?: "student" | "teacher"
}

type SortBy = "points" | "streak" | "recent" | "quizzes"

export function Leaderboard({ onBack, userRole = "student" }: LeaderboardProps) {
  const [students, setStudents] = useState<StudentProgress[]>([])
  const [sortBy, setSortBy] = useState<SortBy>("points")
  const [currentStudent, setCurrentStudent] = useState<StudentProgress | null>(null)
  const [nextReset, setNextReset] = useState<string | null>(null)
  const [daysUntilReset, setDaysUntilReset] = useState<number | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Import the getLeaderboard function from supabaseClient
        const { getLeaderboard, getLeaderboardMeta } = await import('@/lib/supabaseClient')
        
        // Get leaderboard data directly from Supabase
        const leaderboardData = await getLeaderboard(20) // Get top 20 students
        
        // Get current student data
        const current = await getStudentData()
        
        // Get leaderboard meta data for reset countdown
        const leaderboardMeta = await getLeaderboardMeta()
        if (leaderboardMeta?.next_reset) {
          setNextReset(leaderboardMeta.next_reset)
          
          // Calculate days until reset
          const nextResetDate = new Date(leaderboardMeta.next_reset)
          const today = new Date()
          const diffTime = nextResetDate.getTime() - today.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          setDaysUntilReset(diffDays)
        }
        
        // Convert leaderboard data to StudentProgress format
        const leaderboardStudents = leaderboardData.map(profile => ({
          studentId: profile.id || '',
          studentName: profile.name || '',
          totalPoints: profile.total_points || 0,
          currentStreak: profile.current_streak || 0,
          lastAttemptDate: null,
          todayCompleted: false,
          quizHistory: []
        }))
        
        // Make sure current student is in the list
        if (current && !leaderboardStudents.find(s => s.studentId === current.studentId)) {
          leaderboardStudents.push(current)
        }
        
        setStudents(leaderboardStudents)
        setCurrentStudent(current)
      } catch (error) {
        console.error('Error fetching leaderboard data:', error)
      }
    }

    fetchData()
  }, [])

  const getSortedStudents = () => {
    const sorted = [...students].sort((a, b) => {
      switch (sortBy) {
        case "points":
          return b.totalPoints - a.totalPoints
        case "streak":
          return b.currentStreak - a.currentStreak
        case "recent":
          // Sort by most recent activity
          const aDate = a.lastAttemptDate ? new Date(a.lastAttemptDate).getTime() : 0
          const bDate = b.lastAttemptDate ? new Date(b.lastAttemptDate).getTime() : 0
          return bDate - aDate
        case "quizzes":
          return b.quizHistory.length - a.quizHistory.length
        default:
          return b.totalPoints - a.totalPoints
      }
    })
    return sorted
  }

  const sortedStudents = getSortedStudents()
  const currentStudentRank = sortedStudents.findIndex((s) => s.studentId === currentStudent?.studentId) + 1

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shadow-sm border border-primary/20">
            #{rank}
          </div>
        )
    }
  }

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">1st Place</Badge>
      case 2:
        return <Badge className="bg-muted text-muted-foreground hover:bg-muted/80">2nd Place</Badge>
      case 3:
        return <Badge className="bg-amber-600 hover:bg-amber-700">3rd Place</Badge>
      default:
        return <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary hover:bg-primary/10">#{rank}</Badge>
    }
  }

  const getScoreDisplay = (student: StudentProgress) => {
    switch (sortBy) {
      case "points":
        return `${student.totalPoints} pts`
      case "streak":
        return `${student.currentStreak} days`
      case "recent":
        return student.lastAttemptDate ? new Date(student.lastAttemptDate).toLocaleDateString() : "Never"
      case "quizzes":
        return `${student.quizHistory.length} quizzes`
      default:
        return `${student.totalPoints} pts`
    }
  }

  const getAverageScore = (student: StudentProgress) => {
    if (student.quizHistory.length === 0) return 0
    const totalScore = student.quizHistory.reduce((sum, quiz) => sum + quiz.score, 0)
    const totalQuestions = student.quizHistory.reduce((sum, quiz) => sum + quiz.totalQuestions, 0)
    return totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Leaderboard</h2>
          <p className="text-muted-foreground">See how you rank against other students</p>
          {daysUntilReset !== null && (
            <p className="text-sm text-primary mt-1">
              Leaderboard will reset in {daysUntilReset} {daysUntilReset === 1 ? 'day' : 'days'}
            </p>
          )}
        </div>
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      {/* Current Student Rank (for students only) */}
      {userRole === "student" && currentStudent && (
        <Card className="border-primary/20 shadow-md hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="bg-primary/5">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Your Ranking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {getRankIcon(currentStudentRank)}
                <div>
                  <p className="font-medium">{currentStudent.studentName}</p>
                  <p className="text-sm text-muted-foreground">
                    {getScoreDisplay(currentStudent)} • {getAverageScore(currentStudent)}% avg
                  </p>
                </div>
              </div>
              {getRankBadge(currentStudentRank)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sort Controls */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Sort by</span>
            <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="points">Total Points</SelectItem>
                <SelectItem value="streak">Current Streak</SelectItem>
                <SelectItem value="recent">Recent Activity</SelectItem>
                <SelectItem value="quizzes">Quiz Count</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Rankings
          </CardTitle>
          <CardDescription>
            {sortBy === "points" && "Ranked by total points earned"}
            {sortBy === "streak" && "Ranked by current daily streak"}
            {sortBy === "recent" && "Ranked by most recent activity"}
            {sortBy === "quizzes" && "Ranked by total quizzes completed"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No students have taken any quizzes yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedStudents.map((student, index) => {
                const rank = index + 1
                const isCurrentStudent = userRole === "student" && student.studentId === currentStudent?.studentId

                return (
                  <div
                    key={student.studentId}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                      isCurrentStudent ? "bg-primary/5 border-primary/20" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {getRankIcon(rank)}

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${isCurrentStudent ? "text-primary" : ""}`}>
                            {student.studentName}
                            {isCurrentStudent && <span className="text-xs text-primary">(You)</span>}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {student.totalPoints} pts
                          </div>
                          <div className="flex items-center gap-1">
                            <Flame className="h-3 w-3" />
                            {student.currentStreak} streak
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {student.quizHistory.length} quizzes
                          </div>
                          {student.quizHistory.length > 0 && <span>{getAverageScore(student)}% avg</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-medium">{getScoreDisplay(student)}</p>
                        {student.lastAttemptDate && (
                          <p className="text-xs text-muted-foreground">
                            {student.todayCompleted
                              ? "Active today"
                              : "Last seen " + new Date(student.lastAttemptDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {getRankBadge(rank)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{students.length}</div>
            <p className="text-xs text-muted-foreground">participating</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{students.filter((s) => s.todayCompleted).length}</div>
            <p className="text-xs text-muted-foreground">completed quiz today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Highest Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {students.length > 0 ? Math.max(...students.map((s) => s.totalPoints)) : 0}
            </div>
            <p className="text-xs text-muted-foreground">points</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
