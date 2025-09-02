// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nqkbhtgfoblwzndjgxzc.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xa2JodGdmb2Jsd3puZGpneHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MDA5NTgsImV4cCI6MjA3MjE3Njk1OH0.4M-Uzr0lr8dc-eWzj-NO-Tz7iSkCQ8famVjwy2PqFW0'

// Validate configuration
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase configuration. Please check your environment variables.')
}

// Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Test connection function
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1)
    if (error) {
      console.error('Supabase connection test failed:', error)
      return { success: false, error: error.message }
    }
    console.log('Supabase connection successful')
    return { success: true }
  } catch (err) {
    console.error('Supabase connection test error:', err)
    return { success: false, error: err.message }
  }
}

// Test quiz_questions table specifically
export async function testQuizQuestionsTable() {
  try {
    console.log('=== TESTING QUIZ_QUESTIONS TABLE ===')
    console.log('Testing table existence and structure...')
    
    // Test if table exists by trying to select from it
    const { data, error } = await supabase.from('quiz_questions').select('*').limit(1)
    if (error) {
      console.error('Quiz questions table test failed:', error)
      return { success: false, error: error.message, tableExists: false }
    }
    
    console.log('Quiz questions table exists and is accessible')
    console.log('Sample data structure:', data)
    
    // Test table structure by trying to insert a test record
    const testQuestion = {
      question: 'Test question for table structure',
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
      correct_answer: 0,
      explanation: 'Test explanation',
      category: 'Test',
      difficulty: 'Easy',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('Attempting to insert test question...')
    const { data: insertData, error: insertError } = await supabase
      .from('quiz_questions')
      .insert(testQuestion)
      .select()
    
    if (insertError) {
      console.error('Test insert failed:', insertError)
      return { success: false, error: insertError.message, tableExists: true, canInsert: false }
    }
    
    console.log('Test insert successful:', insertData)
    
    // Clean up test data
    if (insertData && insertData[0]) {
      await supabase.from('quiz_questions').delete().eq('id', insertData[0].id)
      console.log('Test data cleaned up')
    }
    
    return { success: true, tableExists: true, canInsert: true }
  } catch (err) {
    console.error('Quiz questions table test error:', err)
    return { success: false, error: err.message, tableExists: false, canInsert: false }
  }
}

// Client-side only API client
let api;

// Only initialize trae on the client side
if (typeof window !== 'undefined') {
  // Dynamic import for client-side only
  import('trae').then((trae) => {
    // Trae client pointing to Supabase REST API
    // Supabase REST is available under /rest/v1
    api = trae.create({ baseUrl: `${SUPABASE_URL}/rest/v1` });
    api.defaults({
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      }
    });
  }).catch(err => {
    console.error('Failed to load trae:', err);
  });
}

// Auth helpers
export async function signUpUser(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  return data
}

export async function signInUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signInWithGitHub() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: window.location.origin
    }
  })
  if (error) throw error
  return data
}

export async function resetPassword(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
  return data
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  return { success: true }
}

// Data helpers (students)
export async function addStudent(name, email) {
  if (typeof window === 'undefined') {
    // Server-side: use Supabase client
    const { data, error } = await supabase.from('students').insert({ name, email }).select()
    if (error) throw error
    return data[0]
  } else {
    // Client-side: use trae API
    const body = JSON.stringify({ name, email })
    const res = await api.post('/students', body)
    return res.data
  }
}

export async function getStudents() {
  if (typeof window === 'undefined') {
    // Server-side: use Supabase client
    const { data, error } = await supabase.from('students').select('*')
    if (error) throw error
    return data
  } else {
    // Client-side: use trae API
    const res = await api.get('/students?select=*')
    return res.data
  }
}

// Data helpers (profiles)
export async function createProfile(userId, name) {
  const created_at = new Date().toISOString()
  if (typeof window === 'undefined') {
    // Server-side: use Supabase client
    const { data, error } = await supabase.from('profiles').insert({ id: userId, name, created_at }).select()
    if (error) throw error
    return data[0]
  } else {
    // Client-side: use trae API with fallback
    const body = JSON.stringify({ id: userId, name, created_at })
    try {
      const res = await api.post('/profiles', body)
      return res.data
    } catch (postError) {
      console.error('Error creating profile with trae:', postError)
      // Fallback to fetch API
      const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ id: userId, name, created_at })
      })
      
      if (!res.ok) {
        throw new Error(`HTTP error creating profile! status: ${res.status}`)
      }
      
      const data = await res.json()
      return data[0]
    }
  }
}

export async function getProfile(userId) {
  if (typeof window === 'undefined') {
    // Server-side: use Supabase client
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId)
    if (error) throw error
    return data[0] || null
  } else {
    // Client-side: use trae API with fallback
    try {
      const res = await api.get(`/profiles?id=eq.${encodeURIComponent(userId)}&select=*`)
      return res.data[0] || null
    } catch (getError) {
      console.error('Error getting profile with trae:', getError)
      // Fallback to fetch API
      const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=*`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!res.ok) {
        throw new Error(`HTTP error getting profile! status: ${res.status}`)
      }
      
      const data = await res.json()
      return data[0] || null
    }
  }
}

export async function getAllProfiles() {
  if (typeof window === 'undefined') {
    // Server-side: use Supabase client
    const { data, error } = await supabase.from('profiles').select('*')
    if (error) throw error
    return data
  } else {
    // Client-side: use trae API with fallback
    try {
      const res = await api.get('/profiles?select=*')
      return res.data
    } catch (getError) {
      console.error('Error getting all profiles with trae:', getError)
      // Fallback to fetch API
      const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!res.ok) {
        throw new Error(`HTTP error getting profiles! status: ${res.status}`)
      }
      
      const data = await res.json()
      return data
    }
  }
}

// App settings helpers
export async function getTeacherPassword() {
  // Expect a table app_settings with columns: key (text PK), value (text)
  // Row example: { key: 'teacher_password', value: 'your-password' }
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'teacher_password')
    .single()
  if (error) throw error
  return data?.value || ''
}

export async function getLeaderboard(limit = 10) {
  if (typeof window === 'undefined') {
    // Server-side: use Supabase client
    const { data, error } = await supabase.from('profiles').select('*').order('total_points', { ascending: false }).limit(limit)
    if (error) throw error
    return data
  } else {
    // Client-side: use trae API with fallback
    try {
      const res = await api.get(`/profiles?select=*&order=total_points.desc&limit=${limit}`)
      return res.data
    } catch (getError) {
      console.error('Error getting leaderboard with trae:', getError)
      // Fallback to fetch API
      const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*&order=total_points.desc&limit=${limit}`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!res.ok) {
        throw new Error(`HTTP error getting leaderboard! status: ${res.status}`)
      }
      
      const data = await res.json()
      return data
    }
  }
}

// Data helpers (quiz_results)
export async function saveQuizResult(userId, score, total) {
  if (typeof window === 'undefined') {
    // Server-side: use Supabase client
    const { data, error } = await supabase.from('quiz_results').insert({ user_id: userId, score, total }).select()
    if (error) throw error
    return data[0]
  } else {
    // Client-side: use trae API
    if (!api) {
      throw new Error('API client not initialized. Please wait for client-side initialization.')
    }
    const body = JSON.stringify({ user_id: userId, score, total })
    const res = await api.post('/quiz_results', body)
    return res.data
  }
}

export async function getQuizResults(userId) {
  if (typeof window === 'undefined') {
    // Server-side: use Supabase client
    const { data, error } = await supabase.from('quiz_results').select('*').eq('user_id', userId)
    if (error) throw error
    return data
  } else {
    // Client-side: use trae API
    if (!api) {
      throw new Error('API client not initialized. Please wait for client-side initialization.')
    }
    const res = await api.get(`/quiz_results?user_id=eq.${encodeURIComponent(userId)}&select=*`)
    return res.data
  }
}

// Question management functions
export async function createQuizQuestion(questionData) {
  console.log('=== CREATE QUIZ QUESTION CALLED ===')
  console.log('Question data received:', questionData)
  console.log('Window type:', typeof window)
  
  const questionObj = {
    question: questionData.question,
    options: questionData.options,
    correct_answer: questionData.correct_answer,
    explanation: questionData.explanation || '',
    category: questionData.category || 'General',
    difficulty: questionData.difficulty || 'Medium',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  console.log('Question object to insert:', questionObj)
  
  if (typeof window === 'undefined') {
    // Server-side: use Supabase client
    console.log('Using server-side Supabase client')
    const { data, error } = await supabase.from('quiz_questions').insert(questionObj).select()
    console.log('Server-side result:', { data, error })
    if (error) throw error
    return data[0]
  } else {
    // Client-side: try trae API first, fallback to fetch
    console.log('Using client-side API')
    console.log('API object:', api)
    
    try {
      // Try trae API if available
      if (api) {
        console.log('Using trae API')
    const body = JSON.stringify(questionObj)
        console.log('Request body:', body)
    const res = await api.post('/quiz_questions', body)
        console.log('Trae API response:', res)
        return res.data[0]
      } else {
        console.log('Trae API not available, using fetch fallback')
        throw new Error('Trae API not initialized')
      }
    } catch (traeError) {
      console.log('Trae API failed, falling back to fetch:', traeError)
      
      // Fallback to fetch API
      const res = await fetch(`${SUPABASE_URL}/rest/v1/quiz_questions`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(questionObj)
      })
      
      if (!res.ok) {
        const errorText = await res.text()
        console.error('Fetch API error response:', errorText)
        throw new Error(`HTTP error creating quiz question! status: ${res.status}, message: ${errorText}`)
      }
      
      const data = await res.json()
      console.log('Fetch API response:', data)
      return data[0]
    }
  }
}

export const getQuizQuestions = async () => {
  if (typeof window === 'undefined') {
    // Server-side: use Supabase client
    const { data, error } = await supabase.from('quiz_questions').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data
  } else {
    // Client-side: use trae API
    const res = await api.get('/quiz_questions?select=*&order=created_at.desc')
    return res.data
  }
}

export async function updateQuizQuestion(questionId, updateData) {
  const updates = {
    ...updateData,
    updated_at: new Date().toISOString()
  }
  
  if (typeof window === 'undefined') {
    // Server-side: use Supabase client
    const { data, error } = await supabase.from('quiz_questions').update(updates).eq('id', questionId).select()
    if (error) throw error
    return data[0]
  } else {
    // Client-side: use trae API
    const body = JSON.stringify(updates)
    const res = await api.patch(`/quiz_questions?id=eq.${questionId}`, body)
    return res.data[0]
  }
}

export async function deleteQuizQuestion(questionId) {
  if (typeof window === 'undefined') {
    // Server-side: use Supabase client
    const { error } = await supabase.from('quiz_questions').delete().eq('id', questionId)
    if (error) throw error
    return { success: true }
  } else {
    // Client-side: use trae API
    const res = await api.delete(`/quiz_questions?id=eq.${questionId}`)
    return res.data
  }
}

// Upload monitoring functions
export async function getQuestionCount() {
  try {
    if (typeof window === 'undefined') {
      // Server-side: use Supabase client
      const { count, error } = await supabase.from('quiz_questions').select('*', { count: 'exact', head: true })
      if (error) throw error
      return count || 0
    } else {
      // Client-side: use trae API
      const res = await api.get('/quiz_questions?select=count')
      return res.data.length
    }
  } catch (error) {
    console.error('Error getting question count:', error)
    return 0
  }
}

export async function getRecentQuestions(limit) {
  try {
    if (typeof window === 'undefined') {
      // Server-side: use Supabase client
      const { data, error } = await supabase.from('quiz_questions').select('*').order('created_at', { ascending: false }).limit(limit)
      if (error) throw error
      return data
    } else {
      // Client-side: use trae API
      if (!api) {
        throw new Error('API client not initialized. Please wait for client-side initialization.')
      }
      const res = await api.get(`/quiz_questions?select=*&order=created_at.desc&limit=${limit}`)
      return res.data
    }
  } catch (error) {
    console.error('Error getting recent questions:', error)
    return []
  }
}

export async function verifyQuestionUpload(questionId) {
  try {
    if (typeof window === 'undefined') {
      // Server-side: use Supabase client
      const { data, error } = await supabase.from('quiz_questions').select('*').eq('id', questionId)
      if (error) throw error
      return data.length > 0 ? data[0] : null
    } else {
      // Client-side: use trae API
      const res = await api.get(`/quiz_questions?id=eq.${questionId}&select=*`)
      return res.data.length > 0 ? res.data[0] : null
    }
  } catch (error) {
    console.error('Error verifying question upload:', error)
    return null
  }
}

// Profile update function
export async function updateProfile(userId, profileData) {
  if (typeof window === 'undefined') {
    // Server-side: use Supabase client
    const { data, error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', userId)
      .select()
    if (error) throw error
    return data[0]
  } else {
    // Client-side: use trae API with fallback
    // Use supabase client directly so RLS sees the session
    const { data, error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', userId)
      .select()
    if (error) throw error
      return data[0]
  }
}

// Quiz attempt functions
export async function createQuizAttempt(userId, score, totalQuestions, timeSpent) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  const quizAttempt = {
    user_id: userId,
    score: score || 0,
    total_questions: totalQuestions || 0,
    time_spent: timeSpent || 0,
    date: today,
    created_at: now.toISOString()
  }
  
  try {
    if (typeof window === 'undefined') {
      // Server-side: use Supabase client directly
      // First, update the user's profile with streak and points
      let { data: profileData } = await supabase
        .from('profiles')
        .select('current_streak, last_attempt_date, total_points')
        .eq('id', userId)
        .single();
      
      // Auto-create profile if missing
      if (!profileData) {
        // Try to derive a friendly name from the auth user
        let displayName = 'Student'
        try {
          const { data: { user } } = await supabase.auth.getUser()
          displayName = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student'
        } catch {}
        const { data: createdProfile } = await supabase
          .from('profiles')
          .insert({ id: userId, name: displayName, total_points: 0 })
          .select('current_streak, last_attempt_date, total_points')
          .single();
        profileData = createdProfile || { current_streak: 0, last_attempt_date: null, total_points: 0 }
      }
      
      if (profileData) {
        let newStreak = profileData.current_streak || 0;
        const lastAttemptDate = profileData.last_attempt_date;
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        // Update streak based on last attempt date
        if (lastAttemptDate === yesterday) {
          // Consecutive day, increase streak
          newStreak += 1;
        } else if (lastAttemptDate !== today) {
          // Not consecutive and not today, reset streak to 1
          newStreak = 1;
        }
        // If lastAttemptDate === today, keep current streak (already attempted today)
        
        // Calculate points (1 point per correct answer)
        const pointsEarned = score * 1;
        const newTotalPoints = (profileData.total_points || 0) + pointsEarned;
        
        // Update profile
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({
            current_streak: newStreak,
            last_attempt_date: today,
            today_completed: true,
            total_points: newTotalPoints,
            last_quiz_score: score,
            last_quiz_percentage: Math.round((score / totalQuestions) * 100)
          })
          .eq('id', userId);
        if (profileUpdateError) {
          console.error('Profile update error (server path):', profileUpdateError)
        }
      }
      
      // Then create the quiz attempt record
      const { data, error } = await supabase.from('quiz_attempts').insert(quizAttempt).select()
      if (error) throw error
      return data[0]
    } else {
      // Client-side: use Supabase client with the user's session so RLS sees auth.uid()
      // Get or create profile
      let { data: profileData } = await supabase
        .from('profiles')
        .select('current_streak, last_attempt_date, total_points')
        .eq('id', userId)
        .single();

      if (!profileData) {
        let displayName = 'Student'
        try {
          const { data: { user } } = await supabase.auth.getUser()
          displayName = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student'
        } catch {}
        await supabase.from('profiles').insert({ id: userId, name: displayName, total_points: 0 })
        const { data: created } = await supabase
          .from('profiles')
          .select('current_streak, last_attempt_date, total_points')
          .eq('id', userId)
          .single()
        profileData = created || { current_streak: 0, last_attempt_date: null, total_points: 0 }
      }
      
      if (profileData) {
        let newStreak = profileData.current_streak || 0;
        const lastAttemptDate = profileData.last_attempt_date;
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        if (lastAttemptDate === yesterday) {
          newStreak += 1;
        } else if (lastAttemptDate !== today) {
          newStreak = 1;
        }
        
        const pointsEarned = score * 1;
        const newTotalPoints = (profileData.total_points || 0) + pointsEarned;
        
        const { error: clientUpdateError } = await supabase
          .from('profiles')
          .update({
          current_streak: newStreak,
          last_attempt_date: today,
          today_completed: true,
          total_points: newTotalPoints,
          last_quiz_score: score,
          last_quiz_percentage: Math.round((score / totalQuestions) * 100)
          })
          .eq('id', userId)
        if (clientUpdateError) {
          console.error('Profile update error (client path):', clientUpdateError)
        }
      }

      // Insert attempt with the session token
      const { data, error } = await supabase.from('quiz_attempts').insert(quizAttempt).select()
      if (error) throw error
      return data[0]
    }
  } catch (error) {
    console.error('Error creating quiz attempt:', error);
    throw error;
  }
}

export async function getQuizAttempts(userId) {
  if (typeof window === 'undefined') {
    // Server-side: use Supabase client
    const { data, error } = await supabase.from('quiz_attempts').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (error) throw error
    return data
  } else {
    // Client-side: use trae API
    try {
      const res = await api.get(`/quiz_attempts?user_id=eq.${userId}&select=*&order=created_at.desc`)
      return res.data
    } catch (error) {
      console.error('Error getting quiz attempts with trae:', error)
      // Fallback to fetch API
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/quiz_attempts?user_id=eq.${userId}&select=*&order=created_at.desc`, {
        method: 'GET',
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!res.ok) {
        throw new Error(`HTTP error getting quiz attempts! status: ${res.status}`)
      }
      
      return await res.json()
    }
  }
}

export async function createQuizAttemptQuestions(attemptId, questionDataArray) {
  // Accept an array of client-side QuizQuestionResult objects
  const nowIso = new Date().toISOString()
  const rows = (Array.isArray(questionDataArray) ? questionDataArray : [questionDataArray]).map((q) => ({
    attempt_id: attemptId,
    question_id: q.questionId || null,
    question_text: q.question || '',
    selected_answer: typeof q.selectedAnswer === 'number' ? q.selectedAnswer : null,
    correct_answer: typeof q.correctAnswer === 'number' ? q.correctAnswer : null,
    is_correct: typeof q.isCorrect === 'boolean' ? q.isCorrect : null,
    time_spent: q.timeSpent || 0,
    created_at: nowIso,
  }))
  
  try {
    if (typeof window === 'undefined') {
      // Server-side: use Supabase client
      const { data, error } = await supabase.from('quiz_attempt_questions').insert(rows).select()
      if (error) throw error
      return data
    } else {
      // Client-side: use trae API
      try {
        const body = JSON.stringify(rows)
        const res = await api.post('/quiz_attempt_questions', body)
        return res.data
      } catch (traeError) {
        console.error('Error creating quiz attempt questions with trae:', traeError)
        // Fallback to fetch API
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/quiz_attempt_questions`, {
          method: 'POST',
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(rows)
        })
        
        if (!res.ok) {
          throw new Error(`HTTP error creating quiz attempt questions! status: ${res.status}`)
        }
        
        const data = await res.json()
        return data
      }
    }
  } catch (error) {
    console.error('Error in createQuizAttemptQuestions:', error)
    throw new Error(`Error creating quiz attempt questions: ${error.message}`)
  }
}

export async function getQuizAttemptQuestions(attemptId) {
  if (typeof window === 'undefined') {
    // Server-side: use Supabase client
    const { data, error } = await supabase.from('quiz_attempt_questions').select('*').eq('attempt_id', attemptId)
    if (error) throw error
    return data
  } else {
    // Client-side: use trae API
    try {
      const res = await api.get(`/quiz_attempt_questions?attempt_id=eq.${attemptId}&select=*`)
      return res.data
    } catch (error) {
      console.error('Error getting quiz attempt questions with trae:', error)
      // Fallback to fetch API
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/quiz_attempt_questions?attempt_id=eq.${attemptId}&select=*`, {
        method: 'GET',
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!res.ok) {
        throw new Error(`HTTP error getting quiz attempt questions! status: ${res.status}`)
      }
      
      return await res.json()
    }
  }
}