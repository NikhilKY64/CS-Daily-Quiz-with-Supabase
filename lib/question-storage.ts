import { supabase, getQuizQuestions, createQuizQuestion, updateQuizQuestion, deleteQuizQuestion, getAskedQuestionIdsForUser } from './supabaseClient'
import { Question, QuestionBank } from './types'

// Get all questions from Supabase
export async function getQuestionBank(): Promise<QuestionBank> {
  try {
    const questions = await getQuizQuestions()
    const questionBank: QuestionBank = {} as QuestionBank
    
    // Use forEach instead of map since we're not returning anything
    questions.forEach((q: any) => {
      const question = {
        id: q.id.toString(),
        question: q.question,
        options: q.options,
        correctAnswer: q.correct_answer,
        explanation: q.explanation ?? '', // Use nullish coalescing
        category: q.category ?? 'General',
        difficulty: q.difficulty ?? 'Medium',
        createdAt: q.created_at ?? new Date().toISOString(),
        updatedAt: q.updated_at ?? new Date().toISOString()
      } as Question
      (questionBank as unknown as { [key: string]: Question })[question.id] = question
    })
    
    return questionBank
  } catch (error) {
    console.error('Error getting question bank:', error)
    throw error // Throw error instead of returning empty object
  }
}
// Save question bank to Supabase (not used directly, questions are saved individually)
export async function saveQuestionBank(questionBank: QuestionBank): Promise<void> {
  try {
    // This function is kept for compatibility but questions should be saved individually
    console.log('saveQuestionBank called - use addQuestion/updateQuestion instead')
  } catch (error) {
    console.error('Error saving question bank:', error)
  }
}

// Get quiz metadata (categories, difficulties, etc.)
export async function getQuizMetadata(): Promise<{
  categories: string[]
  difficulties: string[]
  totalQuestions: number
}> {
  try {
    const questions = await getQuizQuestions()
    
    const categories = [...new Set(questions.map((q: { category: string }) => q.category).filter(Boolean))]
    const difficulties = [...new Set(questions.map((q: { difficulty: string }) => q.difficulty).filter(Boolean))]
    
    return {
      categories: (categories as string[]).length > 0 ? categories as string[] : ['General'],
      difficulties: (difficulties as string[]).length > 0 ? difficulties as string[] : ['Easy', 'Medium', 'Hard'],
      totalQuestions: questions.length
    }
  } catch (error) {
    console.error('Error getting quiz metadata:', error)
    return {
      categories: ['General'],
      difficulties: ['Easy', 'Medium', 'Hard'],
      totalQuestions: 0
    }
  }
}

// Add a new question to Supabase
export async function addQuestion(question: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>): Promise<Question> {
  console.log('=== ADD QUESTION CALLED ===')
  console.log('Question data received:', question)
  console.log('Question type:', typeof question)
  console.log('Question keys:', Object.keys(question))
  
  try {
    console.log('Calling createQuizQuestion...')
    const newQuestion = await createQuizQuestion({
      question: question.question,
      options: question.options,
      correct_answer: question.correctAnswer,
      explanation: question.explanation,
      category: question.category,
      difficulty: question.difficulty
    })
    console.log('createQuizQuestion result:', newQuestion)
    
    const result = {
      id: newQuestion.id.toString(),
      question: newQuestion.question,
      options: newQuestion.options,
      correctAnswer: newQuestion.correct_answer,
      explanation: newQuestion.explanation || '',
      category: newQuestion.category || 'General',
      difficulty: newQuestion.difficulty || 'Medium',
      createdAt: newQuestion.created_at || new Date().toISOString(),
      updatedAt: newQuestion.updated_at || new Date().toISOString()
    }
    console.log('Returning question result:', result)
    return result
  } catch (error) {
    console.error('Error in addQuestion:', error)
    console.error('Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
      name: (error as Error).name
    })
    console.error('Error adding question:', error)
    throw error
  }
}

// Update an existing question in Supabase
export async function updateQuestion(questionId: string, updates: Partial<Omit<Question, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Question> {
  try {
    const updateData: any = {}
    
    if (updates.question !== undefined) updateData.question = updates.question
    if (updates.options !== undefined) updateData.options = updates.options
    if (updates.correctAnswer !== undefined) updateData.correct_answer = updates.correctAnswer
    if (updates.explanation !== undefined) updateData.explanation = updates.explanation
    if (updates.category !== undefined) updateData.category = updates.category
    if (updates.difficulty !== undefined) updateData.difficulty = updates.difficulty
    
    console.log('Updating question with ID:', questionId, 'and data:', updateData)
    
  const updatedQuestion = await updateQuizQuestion(questionId, updateData)
    
    if (!updatedQuestion) {
      console.error('No question returned from updateQuizQuestion')
      throw new Error('Failed to update question')
    }
    
    console.log('Question updated successfully:', updatedQuestion)
    
    return {
      id: updatedQuestion.id.toString(),
      question: updatedQuestion.question,
      options: updatedQuestion.options,
      correctAnswer: updatedQuestion.correct_answer,
      explanation: updatedQuestion.explanation || '',
      category: updatedQuestion.category || 'General',
      difficulty: updatedQuestion.difficulty || 'Medium',
      createdAt: updatedQuestion.created_at || new Date().toISOString(),
      updatedAt: updatedQuestion.updated_at || new Date().toISOString()
    }
  } catch (error) {
    console.error('Error updating question:', error)
    throw error
  }
}

// Delete a question from Supabase
export async function deleteQuestion(questionId: string): Promise<void> {
  try {
    console.log('Deleting question with ID:', questionId)
  const result = await deleteQuizQuestion(questionId)
    console.log('Delete question result:', result)

    if (!result || result.success !== true) {
      console.error('Failed to delete question', result)
      throw new Error('Failed to delete question')
    }

    console.log('Question deleted successfully')
  } catch (error) {
    console.error('Error deleting question:', error)
    // Re-throw the error so the UI can surface failures and retry if needed
    throw error
  }
}

// Get questions by category
export async function getQuestionsByCategory(category: string): Promise<Question[]> {
  try {
    const questionBank = await getQuestionBank()
    return Object.values(questionBank).filter(q => q.category === category)
  } catch (error) {
    console.error('Error getting questions by category:', error)
    throw error // Throw error instead of returning empty array
  }
}

// Get questions by difficulty
export async function getQuestionsByDifficulty(difficulty: string): Promise<Question[]> {
  try {
    const questionBank = await getQuestionBank()
    return Object.values(questionBank).filter(q => q.difficulty === difficulty)
  } catch (error) {
    console.error('Error getting questions by difficulty:', error)
    throw error // Throw error instead of returning empty array
  }
}

// Get random questions for quiz
export async function getRandomQuestions(count: number, category?: string, difficulty?: string): Promise<Question[]> {
  try {
    const questionBank = await getQuestionBank()
    let questions = Object.values(questionBank)
    
    // Filter by category if specified
    if (category && category !== 'All') {
      questions = questions.filter(q => q.category === category)
    }
    
    // Filter by difficulty if specified
    if (difficulty && difficulty !== 'All') {
      questions = questions.filter(q => q.difficulty === difficulty)
    }
    
    // Fisher-Yates shuffle algorithm for better randomization
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
    
    return questions.slice(0, count)
  } catch (error) {
    console.error('Error getting random questions:', error)
    throw error // Throw error instead of returning empty array
  }
}

// Get random questions for a user, excluding questions they've already seen
export async function getRandomQuestionsForUser(userId: string | null, count: number, category?: string, difficulty?: string): Promise<Question[]> {
  try {
    const questionBank = await getQuestionBank()
    let questions = Object.values(questionBank)

    // Exclude already asked questions if userId provided
    if (userId) {
      try {
        const askedIds = await getAskedQuestionIdsForUser(userId)
        if (askedIds && askedIds.length > 0) {
          questions = questions.filter(q => !askedIds.includes(q.id))
        }
      } catch (e) {
        console.error('Error fetching asked ids for user in getRandomQuestionsForUser:', e)
      }
    }

    // Filter by category if specified
    if (category && category !== 'All') {
      questions = questions.filter(q => q.category === category)
    }

    // Filter by difficulty if specified
    if (difficulty && difficulty !== 'All') {
      questions = questions.filter(q => q.difficulty === difficulty)
    }

    // Fisher-Yates shuffle
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }

    return questions.slice(0, count)
  } catch (error) {
    console.error('Error getting random questions for user:', error)
    throw error
  }
}

// Get or create a canonical daily quiz for a given date. This returns the
// same set of questions for all students for that date.
export async function getOrCreateDailyQuiz(quizDate: string, count: number, category?: string, difficulty?: string): Promise<Question[]> {
  try {
    // Try to load existing daily quiz
    const resp = await supabase.from('daily_quizzes').select('question_ids').eq('quiz_date', quizDate).single()
    if (resp && resp.data && resp.data.question_ids) {
      const ids: string[] = resp.data.question_ids
      const questionBank = await getQuestionBank()
      const questions = ids.map(id => (questionBank as any)[id]).filter(Boolean)
      return questions
    }

    // Create a new daily quiz for the date
    const questionBank = await getQuestionBank()
    let questions = Object.values(questionBank)

    // Filter by category/difficulty if specified
    if (category && category !== 'All') questions = questions.filter(q => q.category === category)
    if (difficulty && difficulty !== 'All') questions = questions.filter(q => q.difficulty === difficulty)

    // Shuffle
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }

    const selected = questions.slice(0, count)
    const ids = selected.map(q => q.id)

    // Persist daily quiz (capture response and log errors so failures aren't silent)
    const { data: insertData, error: insertError } = await supabase
      .from('daily_quizzes')
      .insert({ quiz_date: quizDate, question_ids: ids })
      .select()

    if (insertError) {
      console.error('daily_quizzes insert error:', insertError)
    } else {
      console.log('daily quiz created:', insertData)
    }

    return selected
  } catch (error) {
    console.error('Error getting or creating daily quiz:', error)
    throw error
  }
}

// Initialize default questions if none exist
export async function initializeDefaultQuestions(): Promise<void> {
  try {
    const metadata = await getQuizMetadata()
    
    if (metadata.totalQuestions === 0) {
      // Add some default questions
      const defaultQuestions = [
        {
          question: "What is the capital of France?",
          options: ["London", "Berlin", "Paris", "Madrid"],
          correctAnswer: 2,
          explanation: "Paris is the capital and largest city of France.",
          category: "Geography",
          difficulty: "Easy"
        },
        {
          question: "Which planet is known as the Red Planet?",
          options: ["Venus", "Mars", "Jupiter", "Saturn"],
          correctAnswer: 1,
          explanation: "Mars is called the Red Planet due to its reddish appearance.",
          category: "Science",
          difficulty: "Easy"
        },
        {
          question: "What is 15 × 8?",
          options: ["120", "125", "115", "130"],
          correctAnswer: 0,
          explanation: "15 × 8 = 120",
          category: "Mathematics",
          difficulty: "Medium"
        }
      ]
      
      for (const question of defaultQuestions) {
        await addQuestion({
          ...question,
          difficulty: question.difficulty.toLowerCase() as "easy" | "medium" | "hard"
        })
      }
      
      console.log('Default questions initialized')
    }
  } catch (error) {
    console.error('Error initializing default questions:', error)
  }
}
