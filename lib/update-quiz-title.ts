import { supabase } from './supabaseClient'

export async function updateQuizTitle(newTitle: string): Promise<void> {
  const { error } = await supabase
    .from('quiz_metadata')
    .update({ title: newTitle, updatedAt: new Date().toISOString() })
    .eq('id', 1) // Assuming single metadata row with id=1
  if (error) throw error
}
