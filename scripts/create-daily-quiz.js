#!/usr/bin/env node
// scripts/create-daily-quiz.js
// Creates a canonical daily quiz for today (if missing) using the Supabase service role key.

const { createClient } = require('@supabase/supabase-js')

async function main() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  // Determine available_at based on DAILY_QUIZ_HOUR (UTC hour 0-23); default 0
  const hour = Number(process.env.DAILY_QUIZ_HOUR ?? '0')
  const pad = (n) => String(n).padStart(2, '0')
  const available_at = new Date(`${today}T${pad(Math.max(0, Math.min(23, hour)))}:00:00Z`).toISOString()

  try {
    // Check if a quiz already exists for today
    const { data: existing, error: selErr } = await supabase
      .from('daily_quizzes')
      .select('id, question_ids')
      .eq('quiz_date', today)
      .limit(1)
      .single()

    if (selErr && selErr.code !== 'PGRST116') {
      console.error('Error checking existing daily quiz:', selErr)
      process.exit(1)
    }

    if (existing) {
      console.log('Daily quiz already exists for', today)
      console.log('quiz id:', existing.id)
      return
    }

    // Load question ids
    const { data: qrows, error: qErr } = await supabase.from('quiz_questions').select('id')
    if (qErr) {
      console.error('Error loading quiz_questions:', qErr)
      process.exit(1)
    }

    if (!qrows || qrows.length < 5) {
      console.error('Not enough questions in quiz_questions to create daily quiz. Found:', (qrows || []).length)
      process.exit(1)
    }

    // Shuffle and pick 5
    const ids = qrows.map(r => r.id.toString())
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[ids[i], ids[j]] = [ids[j], ids[i]]
    }
    const selected = ids.slice(0, 5)

    // Insert canonical daily quiz with availability timestamp
    const { data: insertData, error: insertErr } = await supabase
      .from('daily_quizzes')
      .insert({ quiz_date: today, question_ids: selected, available_at })
      .select()

    if (insertErr) {
      console.error('Failed to insert daily_quizzes:', insertErr)
      process.exit(1)
    }

    console.log('Daily quiz created for', today)
    console.log(insertData)
  } catch (err) {
    console.error('Unexpected error creating daily quiz:', err)
    process.exit(1)
  }
}

main()
