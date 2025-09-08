import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
}

const supabase = createClient(SUPABASE_URL || '', SERVICE_ROLE || '')

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const questions = Array.isArray(body?.questions) ? body.questions : null
    if (!questions) return NextResponse.json({ error: 'Invalid payload, expected { questions: [...] }' }, { status: 400 })

    // Delete existing questions and asked_questions using service role (bypass RLS)
    const { error: delQErr } = await supabase.from('quiz_questions').delete().not('id', 'is', null)
    if (delQErr) {
      console.error('Failed to delete quiz_questions:', delQErr)
      return NextResponse.json({ error: delQErr.message || String(delQErr) }, { status: 500 })
    }

    const { error: delAskedErr } = await supabase.from('asked_questions').delete().not('id', 'is', null)
    if (delAskedErr) {
      console.error('Failed to delete asked_questions:', delAskedErr)
      return NextResponse.json({ error: delAskedErr.message || String(delAskedErr) }, { status: 500 })
    }

    // Prepare rows for insert
    const rows = questions.map((q: any) => ({
      id: q.id || undefined,
      question: q.question,
      options: q.options,
      correct_answer: q.correctAnswer ?? q.correct_answer,
      explanation: q.explanation ?? null,
      category: q.category ?? null,
      difficulty: q.difficulty ?? null,
      created_at: q.createdAt || new Date().toISOString(),
      updated_at: q.updatedAt || new Date().toISOString(),
    }))

    const { error: insertErr, data: inserted } = await supabase.from('quiz_questions').insert(rows)
    if (insertErr) {
      console.error('Failed to insert new quiz_questions:', insertErr)
      return NextResponse.json({ error: insertErr.message || String(insertErr) }, { status: 500 })
    }

    const insertedArr = Array.isArray(inserted) ? (inserted as any[]) : []
    return NextResponse.json({ success: true, inserted: insertedArr.length })
  } catch (err) {
    console.error('Unexpected error in replace-questions API:', err)
    return NextResponse.json({ error: (err as any)?.message || String(err) }, { status: 500 })
  }
}
