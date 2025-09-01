"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Clock, ChevronLeft, ChevronRight, CheckCircle, XCircle, Trophy } from "lucide-react"
import type { Question } from "@/lib/types"
import type { QuizResult, QuizQuestionResult } from "@/lib/student-storage"
import { getRandomQuestions } from "@/lib/question-storage"
import { completeQuiz } from "@/lib/student-storage"

interface DailyQuizProps {
  onComplete: (result: QuizResult) => void
  onExit: () => void
}

type QuizState = "loading" | "quiz" | "results"

export function DailyQuiz({ onComplete, onExit }: DailyQuizProps) {
  const [state, setState] = useState<QuizState>("loading")
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [startTime, setStartTime] = useState<number>(0)
  const [questionStartTime, setQuestionStartTime] = useState<number>(0)
  const [questionTimes, setQuestionTimes] = useState<number[]>([])
  const [showResults, setShowResults] = useState(false)
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null)

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        // Load random questions
        const randomQuestions = await getRandomQuestions(5)
        if (randomQuestions.length < 5) {
          // Not enough questions
          setState("results")
          return
        }

        setQuestions(randomQuestions)
        setAnswers(new Array(randomQuestions.length).fill(-1))
        setQuestionTimes(new Array(randomQuestions.length).fill(0))
        setStartTime(Date.now())
        setQuestionStartTime(Date.now())
        setState("quiz")
      } catch (error) {
        console.error('Error loading questions:', error)
        setState("results")
      }
    }

    loadQuestions()
  }, [])

  const currentQuestion = questions[currentQuestionIndex]

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...answers]
    newAnswers[currentQuestionIndex] = answerIndex
    setAnswers(newAnswers)

    // Record time spent on this question
    const timeSpent = Date.now() - questionStartTime
    const newQuestionTimes = [...questionTimes]
    newQuestionTimes[currentQuestionIndex] = timeSpent
    setQuestionTimes(newQuestionTimes)
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setQuestionStartTime(Date.now())
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
      setQuestionStartTime(Date.now())
    }
  }

  const handleSubmit = () => {
    // Record final question time if not already recorded
    if (questionTimes[currentQuestionIndex] === 0) {
      const timeSpent = Date.now() - questionStartTime
      const newQuestionTimes = [...questionTimes]
      newQuestionTimes[currentQuestionIndex] = timeSpent
      setQuestionTimes(newQuestionTimes)
    }

    // Calculate results
    const totalTime = Date.now() - startTime
    let correctCount = 0

    const questionResults: QuizQuestionResult[] = questions.map((question, index) => {
      const isCorrect = answers[index] === question.correctAnswer
      if (isCorrect) correctCount++

      return {
        questionId: question.id,
        question: question.question,
        selectedAnswer: answers[index],
        correctAnswer: question.correctAnswer,
        isCorrect,
        timeSpent: questionTimes[index],
      }
    })

    const result: QuizResult = {
      date: new Date().toISOString(),
      score: correctCount,
      totalQuestions: questions.length,
      timeSpent: totalTime,
      questions: questionResults,
    }

    setQuizResult(result)
    setShowResults(true)
  }

  const handleFinish = async () => {
    if (quizResult) {
      try {
        await completeQuiz(quizResult)
        onComplete(quizResult)
      } catch (error) {
        console.error('Error completing quiz:', error)
        // Still call onComplete to allow user to continue
        onComplete(quizResult)
      }
    }
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100
    if (percentage >= 80) return "text-green-600"
    if (percentage >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreMessage = (score: number, total: number) => {
    const percentage = (score / total) * 100
    if (percentage >= 90) return "Excellent work!"
    if (percentage >= 80) return "Great job!"
    if (percentage >= 70) return "Good effort!"
    if (percentage >= 60) return "Keep practicing!"
    return "Don't give up!"
  }

  if (state === "loading") {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Loading your daily quiz...</p>
        </CardContent>
      </Card>
    )
  }

  if (questions.length < 5) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-destructive">Not Enough Questions</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            There are not enough questions in the question bank to create a daily quiz. At least 5 questions are
            required.
          </p>
          <Button onClick={onExit}>Back to Dashboard</Button>
        </CardContent>
      </Card>
    )
  }

  if (showResults && quizResult) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Quiz Complete!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score Summary */}
          <div className="text-center space-y-2">
            <div className={`text-4xl font-bold ${getScoreColor(quizResult.score, quizResult.totalQuestions)}`}>
              {quizResult.score}/{quizResult.totalQuestions}
            </div>
            <p className="text-lg font-medium">{getScoreMessage(quizResult.score, quizResult.totalQuestions)}</p>
            <p className="text-sm text-muted-foreground">
              Completed in {formatTime(quizResult.timeSpent)} • {quizResult.score} points earned
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Score</span>
              <span>{Math.round((quizResult.score / quizResult.totalQuestions) * 100)}%</span>
            </div>
            <Progress value={(quizResult.score / quizResult.totalQuestions) * 100} className="h-3" />
          </div>

          {/* Question Review */}
          <div className="space-y-3">
            <h3 className="font-semibold">Question Review</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {quizResult.questions.map((q, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    q.isCorrect
                      ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
                      : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                  }`}
                >
                  {q.isCorrect ? (
                    <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">Question {index + 1}</p>
                    <p className="text-xs text-muted-foreground">
                      {q.isCorrect ? "Correct" : `Correct answer: ${String.fromCharCode(65 + q.correctAnswer)}`}
                    </p>
                  </div>
                  <Badge variant={q.isCorrect ? "default" : "destructive"} className="shrink-0">
                    {q.isCorrect ? "✓" : "✗"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleFinish} className="w-full" size="lg">
            Finish Quiz
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Progress Header */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {formatTime(Date.now() - startTime)}
            </div>
          </div>
          <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="h-2" />
        </CardContent>
      </Card>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg leading-relaxed">{currentQuestion.question}</CardTitle>
          {currentQuestion.category && (
            <Badge variant="outline" className="w-fit">
              {currentQuestion.category}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {currentQuestion.options.map((option, index) => (
            <Button
              key={index}
              variant={answers[currentQuestionIndex] === index ? "default" : "outline"}
              className="w-full justify-start text-left h-auto py-3 px-4"
              onClick={() => handleAnswerSelect(index)}
            >
              <span className="font-medium mr-3">{String.fromCharCode(65 + index)}.</span>
              <span className="flex-1">{option}</span>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handlePrevious} disabled={currentQuestionIndex === 0}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="flex gap-2">
          {questions.map((_, index) => (
            <div
              key={index}
              className={`w-3 h-3 rounded-full ${
                index === currentQuestionIndex
                  ? "bg-primary"
                  : answers[index] !== -1
                    ? "bg-green-500"
                    : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        {currentQuestionIndex === questions.length - 1 ? (
          <Button
            onClick={handleSubmit}
            disabled={answers.some((answer) => answer === -1)}
            className="bg-green-600 hover:bg-green-700"
          >
            Submit Quiz
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={answers[currentQuestionIndex] === -1}>
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>

      {/* Exit Button */}
      <div className="text-center pt-4">
        <Button variant="ghost" onClick={onExit} className="text-muted-foreground">
          Exit Quiz
        </Button>
      </div>
    </div>
  )
}
