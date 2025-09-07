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
export function getClient() {
  const opts = {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }

  // On the server create a fresh client per call (no global leakage).
  if (typeof window === 'undefined') {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, opts)
  }

  // In the browser ensure a singleton across HMR/dev reloads to avoid
  // creating multiple GoTrueClient instances which log warnings and may
  // behave unexpectedly when sharing storage keys.
  const g = globalThis
  if (!g.__supabase_client) {
    g.__supabase_client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, opts)
  }
  return g.__supabase_client
}

export const supabase = getClient()

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
export async function signUpUser(email, password, displayName = null) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error

  // If supabase returned a user id (some setups create user immediately), create a profile row
  try {
    const userId = data?.user?.id || (data?.user_metadata && data.user_metadata['id']) || null
    const nameToUse = displayName || (data?.user?.user_metadata?.name) || null
    if (userId && nameToUse) {
      // best-effort insert; ignore conflict errors
      await supabase.from('profiles').upsert({ id: userId, name: nameToUse, total_points: 0 })
    }
  } catch (e) {
    // ignore profile creation errors here; handled later in afterAuthSuccess
    console.log('Profile creation during signup failed:', e?.message || e)
  }

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

  // Update admin flag for a profile (client + server friendly)
  export async function updateAdminFlag(userId, isAdmin) {
    const payload = { is_admin: !!isAdmin }
    try {
      // Use Supabase client directly on both server and client so auth context and RLS apply correctly
      const { data, error } = await supabase.from('profiles').update(payload).eq('id', userId).select()
      if (error) {
        console.error('[updateAdminFlag] Supabase error:', error)
        throw error
      }
      return data && data[0]
    } catch (err) {
      console.error('[updateAdminFlag] Unexpected error:', err)
      throw err
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
  if (error) {
    // If the table doesn't exist or the record doesn't exist, initialize with default password
    if (error.code === 'PGRST116') {
      await setTeacherPassword('teacher123')
      return 'teacher123'
    }
    throw error
  }
  return data?.value || ''
}

export async function setTeacherPassword(password) {
  try {
    // Check if the record exists
    const { data, error } = await supabase
      .from('app_settings')
      .select('key')
      .eq('key', 'teacher_password')
      .single()
    
    if (error && error.code !== 'PGRST116') {
      throw error
    }
    
    if (data) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('app_settings')
        .update({ value: password })
        .eq('key', 'teacher_password')
      
      if (updateError) throw updateError
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('app_settings')
        .insert({ key: 'teacher_password', value: password })
      
      if (insertError) throw insertError
    }
    
    return true
  } catch (error) {
    console.error('Error setting teacher password:', error)
    throw error
  }
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
// Save a quiz result to the 'results' table (Supabase only)
export async function saveQuizResult(userId, score, totalQuestions, timeSpent) {
  // Insert into results table
  const { data, error } = await supabase.from('results').insert({
    user_id: userId,
    score,
    total_questions: totalQuestions,
    time_spent: timeSpent
  }).select();
  if (error) {
    console.error('[saveQuizResult] Insert error:', error.message);
    throw error;
  } else {
    console.log('[saveQuizResult] Inserted quiz result:', data)
  }

  // Update profile: streak, points, last quiz info
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  let { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (profileError) {
    console.error('[saveQuizResult] Error loading profile:', profileError)
  } else {
    console.log('[saveQuizResult] Loaded profile:', profileData)
  }

  if (!profileData) {
    // Try to get a display name from auth
    let displayName = 'Student';
    try {
      const { data: { user } } = await supabase.auth.getUser();
      displayName = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
    } catch {}
    const { data: createdProfile } = await supabase
      .from('profiles')
      .insert({ id: userId, name: displayName, total_points: 0 })
      .select('current_streak, last_attempt_date, total_points')
      .single();
    profileData = createdProfile || { current_streak: 0, last_attempt_date: null, total_points: 0 };
  }

  if (profileData) {
  let newStreak = profileData.current_streak || 0;
  const lastAttemptDate = profileData.last_attempt_date ? String(profileData.last_attempt_date).split('T')[0] : null;
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  if (lastAttemptDate === yesterday) {
      newStreak += 1;
  } else if (lastAttemptDate === today) {
      newStreak = profileData.current_streak || 0;
    } else if (lastAttemptDate === today && newStreak === 0) {
      newStreak = 1; // First attempt today
    } else {
      // Missed a day or first attempt, reset streak to 1 (today is a new streak)
      newStreak = 1;
    }

    const pointsEarned = score * 1;
    const newTotalPoints = (profileData.total_points || 0) + pointsEarned;

    const { error: profileUpdateError, data: updateData } = await supabase
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
      console.error('[saveQuizResult] Profile update error:', profileUpdateError);
    } else {
      console.log('[saveQuizResult] Updated profile:', updateData)
    }
  }

  return data && data[0];
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
    // Client-side: prefer using the Supabase client (so RLS and session are applied)
    try {
      const { data, error } = await supabase.from('quiz_questions').update(updates).eq('id', questionId).select()
      if (!error && data && data[0]) {
        return data[0]
      }
      // If supabase client returned an error or empty, fall back to trae API
      console.warn('supabase update did not return data, falling back to API', error)
    } catch (supErr) {
      console.warn('Supabase client update failed, will try API fallback:', supErr)
    }

    // Fallback to trae API if supabase client couldn't complete the operation
    try {
      if (!api) {
        // Wait briefly for API init
        await new Promise(resolve => setTimeout(resolve, 500))
        if (!api) throw new Error('API client not initialized')
      }
      const body = JSON.stringify(updates)
      const res = await api.patch(`/quiz_questions?id=eq.${questionId}`, body)
      return res.data[0]
    } catch (error) {
      console.error('Error updating question via API fallback:', error)
      throw error
    }
  }
}

export async function deleteQuizQuestion(questionId) {
  if (typeof window === 'undefined') {
    // Server-side: use Supabase client
    const { error } = await supabase.from('quiz_questions').delete().eq('id', questionId)
    if (error) throw error
    return { success: true }
  } else {
    // Client-side: try supabase client first so RLS/session apply
    try {
      const { error } = await supabase.from('quiz_questions').delete().eq('id', questionId)
      if (!error) {
        return { success: true }
      }
      console.warn('supabase client delete reported error, will attempt API fallback', error)
    } catch (supErr) {
      console.warn('Supabase client delete failed, attempting API fallback:', supErr)
    }

    // Fallback to trae API
    try {
      if (!api) {
        await new Promise(resolve => setTimeout(resolve, 500))
        if (!api) throw new Error('API client not initialized')
      }
      await api.delete(`/quiz_questions?id=eq.${questionId}`)
      return { success: true }
    } catch (error) {
      console.error('Error deleting question via API fallback:', error)
      // propagate error so UI can show failure
      throw error
    }
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
        const lastAttemptDate = profileData.last_attempt_date ? String(profileData.last_attempt_date).split('T')[0] : null;
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Update streak based on last attempt date (compare date-only strings)
        if (lastAttemptDate === yesterday) {
          // Consecutive day, increase streak
          newStreak += 1;
        } else if (lastAttemptDate === today) {
          // Already attempted today, keep streak
          newStreak = profileData.current_streak || 0;
        } else {
          // Missed a day, reset streak to 1 (today is a new streak)
          newStreak = 1;
        }
        
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
      if (error) {
        console.error('Quiz attempt insert error:', error);
        throw error;
      }
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
        const lastAttemptDate = profileData.last_attempt_date ? String(profileData.last_attempt_date).split('T')[0] : null;
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        if (lastAttemptDate === yesterday) {
          newStreak += 1;
        } else if (lastAttemptDate === today) {
          newStreak = profileData.current_streak || 0;
        } else {
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
      if (error) {
        console.error('Quiz attempt insert error:', error);
        throw error;
      }
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

// Leaderboard reset functions
export async function getLeaderboardMeta() {
  try {
    const { data, error } = await supabase.from('leaderboard_meta').select('*').single()
    if (error) {
      // If the table doesn't exist or is empty, create it with initial values
      if (error.code === 'PGRST116') {
        const nextResetDate = calculateNextResetDate()
        await createLeaderboardMeta(nextResetDate)
        return { next_reset: nextResetDate }
      }
      throw error
    }
    return data
  } catch (error) {
    console.error('Error getting leaderboard meta:', error)
    // Return a default value if there's an error
    return { next_reset: calculateNextResetDate() }
  }
}

export async function createLeaderboardMeta(nextResetDate) {
  try {
    const { data, error } = await supabase
      .from('leaderboard_meta')
      .insert({ next_reset: nextResetDate })
      .select()
    if (error) throw error
    return data[0]
  } catch (error) {
    console.error('Error creating leaderboard meta:', error)
    throw error
  }
}

export async function updateLeaderboardMeta(nextResetDate) {
  try {
    const { data, error } = await supabase
      .from('leaderboard_meta')
      .update({ next_reset: nextResetDate })
      .eq('id', 1) // Assuming there's only one row
      .select()
    if (error) throw error
    return data[0]
  } catch (error) {
    console.error('Error updating leaderboard meta:', error)
    throw error
  }
}

export async function resetLeaderboard() {
  try {
    // Reset all users' total_points to 0
    const { error } = await supabase
      .from('profiles')
      .update({ total_points: 0 })
    
    if (error) throw error
    
    // Calculate and set the next reset date
    const nextResetDate = calculateNextResetDate()
    await updateLeaderboardMeta(nextResetDate)
    
    return { success: true, next_reset: nextResetDate }
  } catch (error) {
    console.error('Error resetting leaderboard:', error)
    throw error
  }
}

// Helper function to calculate the next reset date (2 weeks from now, on Monday)
function calculateNextResetDate() {
  const today = new Date()
  const dayOfWeek = today.getUTCDay() // 0 = Sunday, 1 = Monday, ...
  const daysUntilMonday = (dayOfWeek === 0) ? 1 : (dayOfWeek === 1) ? 14 : 8 - dayOfWeek + 7
  
  const nextMonday = new Date(today)
  nextMonday.setUTCDate(today.getUTCDate() + daysUntilMonday)
  nextMonday.setUTCHours(0, 0, 0, 0)
  
  return nextMonday.toISOString()
}

// Save a requested display name into `pending_name` so it doesn't show until approved
export async function updatePendingName(userId, pendingName) {
  try {
    // First, see if a profile exists for this user
    const { data: existing, error: getErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (getErr && !existing) {
      // If the profile doesn't exist, insert a new row with pending_name
      const { data: inserted, error: insertErr } = await supabase
        .from('profiles')
        .insert({ id: userId, pending_name: pendingName })
        .select()
        .single()
      if (insertErr) {
        console.error('[updatePendingName] insert error:', insertErr)
        throw insertErr
      }
      return inserted
    }

    // Profile exists -> update pending_name only
    const { data, error } = await supabase
      .from('profiles')
      .update({ pending_name: pendingName })
      .eq('id', userId)
      .select()
      .single()
    if (error) {
      console.error('[updatePendingName] supabase update error:', error)
      throw error
    }
    return data
  } catch (err) {
    console.error('[updatePendingName] unexpected error:', err)
    throw err
  }
}

// Return profiles which currently have a pending_name value
export async function getPendingProfiles() {
  try {
    // Use Supabase client (client or server) so RLS and session are applied
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .not('pending_name', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[getPendingProfiles] Supabase error:', error)
      throw error
    }
    return data || []
  } catch (err) {
    console.error('[getPendingProfiles] unexpected error:', err)
    throw err
  }
}

// Approve a pending_name: copy pending_name -> name and clear pending_name
export async function approvePendingName(userId) {
  try {
    // Read pending_name first
    const { data: profile, error: getErr } = await supabase
      .from('profiles')
      .select('pending_name')
      .eq('id', userId)
      .single()

    if (getErr) {
      console.error('[approvePendingName] error reading profile:', getErr)
      throw getErr
    }

    const pending = profile?.pending_name || null

    const { data, error } = await supabase
      .from('profiles')
      .update({ name: pending, pending_name: null })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('[approvePendingName] Supabase error:', error)
      throw error
    }
    return data
  } catch (err) {
    console.error('[approvePendingName] unexpected error:', err)
    throw err
  }
}

// Reject a pending_name: clear pending_name only
export async function rejectPendingName(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ pending_name: null })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('[rejectPendingName] Supabase error:', error)
      throw error
    }
    return data
  } catch (err) {
    console.error('[rejectPendingName] unexpected error:', err)
    throw err
  }
}

// Subscribe to pending_name changes (returns subscription/channel)
export function subscribePendingNameChanges(onChange) {
  try {
    const channel = supabase
      .channel('public:profiles:pending-name')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        const newPending = payload?.new?.pending_name
        const oldPending = payload?.old?.pending_name
        if (newPending !== oldPending) {
          try {
            onChange(payload)
          } catch (err) {
            console.error('Error in pending-name change callback', err)
          }
        }
      })
      .subscribe()

    return channel
  } catch (err) {
    console.error('[subscribePendingNameChanges] error:', err)
    throw err
  }
}