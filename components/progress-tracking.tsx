"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, TrendingUp, Target, Clock, Award, ChevronLeft, ChevronRight } from "lucide-react"
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { supabase } from "@/lib/supabaseClient"

interface ProgressTrackingProps {
  onBack: () => void
}
export function ProgressTracking({ onBack }: ProgressTrackingProps) {
  const [quizHistory, setQuizHistory] = useState<any[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("30"); // days
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 5;
  const [isDark, setIsDark] = useState(false);
  // Resolved chart colors (runtime-resolved from CSS variables)
  const [scoreColor, setScoreColor] = useState<string>('hsl(var(--primary))');
  const [timeColor, setTimeColor] = useState<string>('#3b82f6');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not logged in");
        // Fetch quiz attempts (replace 'results' with your table if needed)
        const { data, error } = await supabase
          .from("results")
          .select("id, score, total_questions, created_at, time_spent")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });
        if (error) throw error;
        setQuizHistory((data || []).map((q: { created_at: string; score: number; total_questions: number; time_spent?: number }) => ({
          date: q.created_at,
          score: q.score,
          totalQuestions: q.total_questions,
          timeSpent: q.time_spent || 0,
        })));

        // Calculate streak (consecutive days with a quiz)
        let streak = 0;
        let prevDate: string | null = null;
        for (let i = (data || []).length - 1; i >= 0; i--) {
          const d = new Date(data[i].created_at);
          d.setHours(0,0,0,0);
          if (!prevDate) {
            prevDate = d.toISOString();
            streak = 1;
          } else {
            const prev = new Date(prevDate);
            prev.setDate(prev.getDate() - 1);
            if (d.getTime() === prev.getTime()) {
              streak++;
              prevDate = d.toISOString();
            } else {
              break;
            }
          }
        }
        setCurrentStreak(streak);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // detect dark mode for chart contrast
    try {
      const dark = document.documentElement.classList.contains("dark");
      setIsDark(dark);

      // Resolve CSS variables to usable color strings.
      const styles = getComputedStyle(document.documentElement);
      const primaryRaw = styles.getPropertyValue('--primary').trim();
      const chart2Raw = styles.getPropertyValue('--chart-2').trim() || styles.getPropertyValue('--chart-1').trim();

      const resolveColor = (raw: string, fallback: string) => {
        if (!raw) return fallback;
        // If raw already includes a function or valid color token, use it directly
        if (raw.startsWith('#') || raw.startsWith('rgb') || raw.startsWith('hsl') || raw.includes('(')) return raw;
        // Otherwise assume it's HSL components like "221.2 83.2% 53.3%" and wrap with hsl(...)
        return `hsl(${raw})`;
      };

      setScoreColor(resolveColor(primaryRaw, 'hsl(var(--primary))'));
      setTimeColor(resolveColor(chart2Raw, '#3b82f6'));
    } catch (e) {
      // ignore and keep defaults
    }
  }, []);

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Loading progress data...</p>
        </CardContent>
      </Card>
    );
  }
  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="py-8 text-center">
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // Filter quiz history based on time range
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - Number.parseInt(timeRange))

  const filteredHistory = quizHistory.filter((quiz) => new Date(quiz.date) >= cutoffDate);

  // Prepare chart data
  // Helper to format ms to mm:ss
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const chartData = filteredHistory.map((quiz) => ({
    date: new Date(quiz.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: quiz.score,
    percentage: Math.round((quiz.score / quiz.totalQuestions) * 100),
    timeSpent: quiz.timeSpent, // keep ms, format in tooltip/label
  }))

  // Calculate statistics
  const totalQuizzes = filteredHistory.length
  const averageScore = totalQuizzes > 0 ? filteredHistory.reduce((sum, quiz) => sum + quiz.score, 0) / totalQuizzes : 0
  const averagePercentage = totalQuizzes > 0 ? (averageScore / 5) * 100 : 0 // Assuming 5 questions per quiz
  const averageTime =
    totalQuizzes > 0 ? filteredHistory.reduce((sum, quiz) => sum + quiz.timeSpent, 0) / totalQuizzes / 1000 / 60 : 0 // minutes
  const bestScore = totalQuizzes > 0 ? Math.max(...filteredHistory.map((quiz) => quiz.score)) : 0;
  // currentStreak is now from state

  // Pagination for quiz history
  const paginatedHistory = filteredHistory.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage)

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100
    if (percentage >= 80) return "text-green-600"
    if (percentage >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getPerformanceTrend = () => {
    if (filteredHistory.length < 2) return "neutral"

    const recent = filteredHistory.slice(-3)
    const older = filteredHistory.slice(-6, -3)

    if (recent.length === 0 || older.length === 0) return "neutral"

    const recentAvg = recent.reduce((sum, quiz) => sum + quiz.score, 0) / recent.length
    const olderAvg = older.reduce((sum, quiz) => sum + quiz.score, 0) / older.length

    if (recentAvg > olderAvg) return "improving"
    if (recentAvg < olderAvg) return "declining"
    return "stable"
  }

  const performanceTrend = getPerformanceTrend()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Progress</h2>
          <div className="text-muted-foreground text-base mt-1">Track your learning journey</div>
        </div>
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>


      {/* Time Range Filter */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Time Range</span>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 3 months</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-like">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-sky-50 text-sky-600">
              <Target className="h-6 w-6" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stat-number">{totalQuizzes}</div>
            <p className="stat-subtext">in selected period</p>
          </CardContent>
        </Card>

  <Card className="card-like">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600">
              <Award className="h-6 w-6" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stat-number">{averageScore.toFixed(1)}/5</div>
            <p className="stat-subtext">{averagePercentage.toFixed(0)}% average</p>
          </CardContent>
        </Card>

  <Card className="card-like">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="stat-number">{bestScore}/5</div>
            <p className="stat-subtext">personal best</p>
          </CardContent>
        </Card>

  <Card className="card-like">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Time</CardTitle>
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="stat-number">{averageTime.toFixed(1)}m</div>
            <p className="stat-subtext">per quiz</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Performance Trend
          </CardTitle>
          <CardDescription>
            Your performance is{" "}
            <Badge
              variant={
                performanceTrend === "improving"
                  ? "default"
                  : performanceTrend === "declining"
                    ? "destructive"
                    : "secondary"
              }
            >
              {performanceTrend === "improving"
                ? "Improving"
                : performanceTrend === "declining"
                  ? "Declining"
                  : "Stable"}
            </Badge>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Charts */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Score Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Score Trend</CardTitle>
              <CardDescription>Your quiz scores over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="scoreAreaColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={scoreColor} stopOpacity={0.32}/>
                      <stop offset="95%" stopColor={scoreColor} stopOpacity={0.06}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                  <XAxis dataKey="date" stroke={isDark ? '#cbd5e1' : '#475569'} tick={{ fill: isDark ? '#cbd5e1' : '#475569' }} />
                  <YAxis domain={[0, 5]} stroke={isDark ? '#cbd5e1' : '#475569'} tick={{ fill: isDark ? '#cbd5e1' : '#475569' }} />
                  {/* No label to avoid overlap */}
                  <Tooltip
                    contentStyle={{ backgroundColor: isDark ? '#0b1220' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
                    formatter={(value, name) => [
                      name === "score" ? `${value}/5` : `${value}%`,
                      name === "score" ? "Score" : "Percentage",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke={scoreColor}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#scoreAreaColor)"
                    dot={{ r: 4, stroke: scoreColor, strokeWidth: 2, fill: isDark ? 'var(--card)' : '#fff' }}
                    activeDot={{ r: 6, fill: scoreColor }}
                    connectNulls={true}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Time Spent Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Time Spent</CardTitle>
              <CardDescription>Time spent per quiz</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="timeAreaColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={timeColor} stopOpacity={0.32}/>
                      <stop offset="95%" stopColor={timeColor} stopOpacity={0.06}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                  <XAxis dataKey="date" stroke={isDark ? '#cbd5e1' : '#475569'} tick={{ fill: isDark ? '#cbd5e1' : '#475569' }} />
                  <YAxis
                    domain={[0, 480]}
                    ticks={[120, 240, 360, 480]}
                    tickFormatter={(v) => `${v / 60} min`}
                    stroke={isDark ? '#cbd5e1' : '#475569'}
                    tick={{ fill: isDark ? '#cbd5e1' : '#475569' }}
                  />
                  <Tooltip contentStyle={{ backgroundColor: isDark ? '#0b1220' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }} formatter={(value) => {
                    const min = Math.floor(Number(value) / 60);
                    const sec = Number(value) % 60;
                    return [`${min}m ${sec}s`, "Time Spent"];
                  }} />
                  <Area
                    type="monotone"
                    dataKey="timeSpent"
                    stroke={timeColor}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#timeAreaColor)"
                    dot={{ r: 4, stroke: timeColor, strokeWidth: 2, fill: isDark ? 'var(--card)' : '#fff' }}
                    activeDot={{ r: 6, fill: timeColor }}
                    connectNulls={true}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quiz History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Quiz History
          </CardTitle>
          <CardDescription>Detailed history of your quiz attempts</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredHistory.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No quiz history found for the selected time range.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedHistory.map((quiz, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">
                        {new Date(quiz.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <Badge
                        className={
                          quiz.score >= 4
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : quiz.score >= 3
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }
                      >
                        {quiz.score}/{quiz.totalQuestions}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {Math.round((quiz.score / quiz.totalQuestions) * 100)}% • {formatTime(quiz.timeSpent)}
                    </p>
                  </div>
                  <div className={`text-lg font-bold ${getScoreColor(quiz.score, quiz.totalQuestions)}`}>
                    {Math.round((quiz.score / quiz.totalQuestions) * 100)}%
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>

                  <span className="text-sm text-muted-foreground">
                    Page {currentPage + 1} of {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage === totalPages - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
