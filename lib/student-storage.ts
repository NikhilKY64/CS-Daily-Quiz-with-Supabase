import { supabase, getProfile, createProfile, updateProfile, getAllProfiles, createQuizAttempt, getQuizAttempts, createQuizAttemptQuestions, getQuizAttemptQuestions } from './supabaseClient'

export interface StudentProgress {
  studentId: string
  studentName: string
  totalPoints: number
  currentStreak: number
  lastAttemptDate: string | null
  todayCompleted: boolean
  lastQuizScore?: number
  lastQuizPercentage?: number
  quizHistory: QuizResult[]
}

export interface QuizResult {
  date: string
  score: number
  totalQuestions: number
  timeSpent: number
  questions: QuizQuestionResult[]
}

export interface QuizQuestionResult {
  questionId: string
  question: string
  selectedAnswer: number
  correctAnswer: number
  isCorrect: boolean
  timeSpent: number
}

// Get current authenticated user ID
export async function getCurrentStudentId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id || null
  } catch {
    return null
  }
}

// Set current student (not needed with auth, but kept for compatibility)
export function setCurrentStudent(studentId: string): void {
  // With Supabase auth, the current user is managed by the session
  // This function is kept for backward compatibility but doesn't do anything
  console.log('setCurrentStudent called with:', studentId, '(managed by Supabase auth)')
}

// Get student data from Supabase
export async function getStudentData(): Promise<StudentProgress> {
  try {
    const userId = await getCurrentStudentId()
    if (!userId) {
      return {
        studentId: "default",
        studentName: "Student",
        totalPoints: 0,
        currentStreak: 0,
        lastAttemptDate: null,
        todayCompleted: false,
        lastQuizScore: 0,
        lastQuizPercentage: 0,
        quizHistory: [],
      }
    }

    // Get profile data
    let profile = await getProfile(userId)
if (!profile) {
  // Create a new profile if one doesn't exist
  profile = await createProfile(userId, "New Student") // You might want to get a default name from somewhere else
}
    
    // Get quiz attempts (quiz history)
    const attempts = await getQuizAttempts(userId)
    
    // Convert attempts to QuizResult format
    const quizHistory: QuizResult[] = []
    for (const attempt of attempts) {
      const questions = await getQuizAttemptQuestions(attempt.id)
      const quizResult: QuizResult = {
        date: attempt.date,
        score: attempt.score,
        totalQuestions: attempt.total_questions,
        timeSpent: attempt.time_spent,
        questions: questions.map(q => ({
          questionId: q.question_id?.toString() || '',
          question: q.quiz_questions?.question || '',
          selectedAnswer: q.selected_answer,
          correctAnswer: q.correct_answer,
          isCorrect: q.is_correct,
          timeSpent: q.time_spent
        }))
      }
      quizHistory.push(quizResult)
    }

    return {
      studentId: profile.id,
      studentName: profile.name,
      totalPoints: profile.total_points,
      currentStreak: profile.current_streak,
      lastAttemptDate: profile.last_attempt_date,
      todayCompleted: profile.today_completed,
      lastQuizScore: profile.last_quiz_score,
      lastQuizPercentage: profile.last_quiz_percentage,
      quizHistory
    }
  } catch (error) {
    console.error('Error getting student data:', error)
    return {
      studentId: "default",
      studentName: "Student",
      totalPoints: 0,
      currentStreak: 0,
      lastAttemptDate: null,
      todayCompleted: false,
      lastQuizScore: 0,
      lastQuizPercentage: 0,
      quizHistory: [],
    }
  }
}

// Save student data to Supabase
export async function saveStudentData(data: StudentProgress): Promise<void> {
  try {
    const userId = await getCurrentStudentId()
    if (!userId) return

    // Update profile
    await updateProfile(userId, {
      name: data.studentName,
      total_points: data.totalPoints,
      current_streak: data.currentStreak,
      last_attempt_date: data.lastAttemptDate,
      today_completed: data.todayCompleted
    })
  } catch (error) {
    console.error('Error saving student data:', error)
  }
}

// Get all students from Supabase
export async function getAllStudents(): Promise<StudentProgress[]> {
  try {
    const profiles = await getAllProfiles()
    return profiles.map(profile => ({
      studentId: profile.id,
      studentName: profile.name,
      totalPoints: profile.total_points,
      currentStreak: profile.current_streak,
      lastAttemptDate: profile.last_attempt_date,
      todayCompleted: profile.today_completed,
      lastQuizScore: profile.last_quiz_score,
      lastQuizPercentage: profile.last_quiz_percentage,
      quizHistory: [] // Quiz history loaded separately when needed
    }))
  } catch (error) {
    console.error('Error getting all students:', error)
    return []
  }
}

// Check if user can take quiz today
export async function canTakeQuizToday(): Promise<boolean> {
  try {
    const data = await getStudentData()
    return !data.todayCompleted
  } catch {
    return true
  }
}

// Complete quiz and save to Supabase
export async function completeQuiz(result: QuizResult): Promise<StudentProgress> {
  try {
    const userId = await getCurrentStudentId()
    if (!userId) throw new Error('No authenticated user')

    // Create quiz attempt in Supabase - this now handles streak and points calculation
    const attempt = await createQuizAttempt(
      userId,
      result.score,
      result.totalQuestions,
      result.timeSpent
    )

    // Save quiz attempt questions
    if (result.questions.length > 0) {
      await createQuizAttemptQuestions(attempt.id, result.questions)
    }
    
    // Get updated student data after the quiz completion
    const updatedData = await getStudentData()
    return updatedData
  } catch (error) {
    console.error('Error completing quiz:', error)
    throw error
  }
}

// Create new student (handled by auth now, but kept for compatibility)
export async function createNewStudent(name: string): Promise<StudentProgress> {
  try {
    const userId = await getCurrentStudentId()
    if (!userId) throw new Error('No authenticated user')

    // Profile should already be created during signup
    // This function now just returns the current student data
    return await getStudentData()
  } catch (error) {
    console.error('Error creating new student:', error)
    return {
      studentId: "default",
      studentName: name,
      totalPoints: 0,
      currentStreak: 0,
      lastAttemptDate: null,
      todayCompleted: false,
      lastQuizScore: 0,
      lastQuizPercentage: 0,
      quizHistory: [],
    }
  }
}

// Delete student (not applicable with auth, but kept for compatibility)
export function deleteStudent(studentId: string): void {
  console.log('deleteStudent called with:', studentId, '(not applicable with Supabase auth)')
  // With Supabase auth, users manage their own accounts
  // This would require admin privileges or account deletion
}
