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
  const userId = await getCurrentStudentId()
  if (!userId) {
    // Not logged in → treat as guest without mutating anything
    return {
      studentId: "guest",
      studentName: "Guest",
      totalPoints: 0,
      currentStreak: 0,
      lastAttemptDate: null,
      todayCompleted: false,
      lastQuizScore: 0,
      lastQuizPercentage: 0,
      quizHistory: [],
    }
  }

  // Get profile
  let profile = await getProfile(userId)
  if (!profile) {
    // Create a new profile if one doesn't exist (uses name from auth in supabaseClient)
    try {
      profile = await createProfile(userId, "Student")
    } catch {
      // If we still can't create, return minimal structure
      return {
        studentId: userId,
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

  // Normalize today_completed flag based on last_attempt_date vs today (UTC day)
  const todayUtc = new Date().toISOString().split('T')[0]
  let normalizedTodayCompleted = !!profile.today_completed
  console.log('[getStudentData] Loaded profile:', profile)
  // Reset today_completed if it's a new day
  if (profile.last_attempt_date !== todayUtc && normalizedTodayCompleted) {
    try {
      const updateRes = await updateProfile(userId, { today_completed: false })
      normalizedTodayCompleted = false
      console.log('[getStudentData] Reset today_completed to false for new day. Update result:', updateRes)
    } catch (e) {
      console.warn('[getStudentData] Failed to reset today_completed:', e)
    }
  }

  // Attempts and history are best-effort; do not fail user profile rendering
  let attempts: any[] = []
  try {
    console.log('=== GETTING QUIZ ATTEMPTS ===')
    console.log('User ID:', userId)
    attempts = await getQuizAttempts(userId)
    console.log('Quiz attempts loaded:', attempts)
    console.log('Attempts length:', attempts?.length || 0)
  } catch (e) {
    console.warn('Could not load attempts:', e)
  }

  let quizHistory: QuizResult[] = []
  console.log('=== BUILDING QUIZ HISTORY ===')
  for (const attempt of attempts) {
    try {
      console.log('Processing attempt:', attempt)
      const questions = await getQuizAttemptQuestions(attempt.id)
      console.log('Questions for attempt:', questions)
      const quizResult: QuizResult = {
        date: attempt.date,
        score: attempt.score,
        totalQuestions: attempt.total_questions,
        timeSpent: attempt.time_spent,
        questions: questions.map((q: any) => ({
          questionId: q.question_id?.toString?.() || '',
          question: q.question_text || '',
          selectedAnswer: q.selected_answer,
          correctAnswer: q.correct_answer,
          isCorrect: q.is_correct,
          timeSpent: q.time_spent
        }))
      }
      console.log('Quiz result created:', quizResult)
      quizHistory.push(quizResult)
    } catch (e) {
      console.warn('Could not load attempt questions:', e)
    }
  }
  console.log('Final quiz history:', quizHistory)
  console.log('Final quiz history length:', quizHistory?.length || 0)

  // Reconcile points conservatively (only increase)
  const sumPoints = attempts.reduce((acc: number, a: any) => acc + (a.score || 0), 0)
  let effectiveTotalPoints = typeof profile.total_points === 'number' ? profile.total_points : 0
  if (sumPoints > effectiveTotalPoints) {
    effectiveTotalPoints = sumPoints
    try {
      await updateProfile(userId, { total_points: sumPoints })
    } catch (e) {
      console.warn('Could not reconcile total_points from attempts:', e)
    }
  }

  return {
    studentId: profile.id,
    studentName: profile.name,
    totalPoints: effectiveTotalPoints,
    currentStreak: profile.current_streak,
    lastAttemptDate: profile.last_attempt_date,
    todayCompleted: normalizedTodayCompleted,
    lastQuizScore: profile.last_quiz_score,
    lastQuizPercentage: profile.last_quiz_percentage,
    quizHistory
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
    return profiles.map((profile: { 
      id: string;
      name: string;
      total_points: number;
      current_streak: number;
      last_attempt_date: string | null;
      today_completed: boolean;
      last_quiz_score?: number;
      last_quiz_percentage?: number;
    }) => ({
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

    // Save to results table for progress tracking
    try {
      await import('./supabaseClient').then(({ saveQuizResult }) =>
        saveQuizResult(userId, result.score, result.totalQuestions, result.timeSpent)
      );
    } catch (err) {
      console.error('Error saving to results table:', err);
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
