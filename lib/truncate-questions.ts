import { supabase } from './supabaseClient'
// Truncate all questions from the quiz_questions table
export async function truncateQuizQuestions() {
  // Supabase does not support TRUNCATE via REST, so we delete all rows
  const { error } = await supabase.from('quiz_questions').delete().not('id', 'is', null)
  if (error) throw error
  return { success: true }
}
