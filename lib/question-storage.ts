import { supabase, getQuizQuestions, createQuizQuestion, updateQuizQuestion, deleteQuizQuestion } from './supabaseClient'
import { Question, QuestionBank } from './types'

// Get all questions from Supabase
export async function getQuestionBank(): Promise<QuestionBank> {
  try {
    const questions = await getQuizQuestions()
    const questionBank: QuestionBank = {} as QuestionBank
    
    // Use map instead of forEach for better functional programming style
    questions.map((q: any) => {
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
  try {
    const newQuestion = await createQuizQuestion({
      question: question.question,
      options: question.options,
      correct_answer: question.correctAnswer,
      explanation: question.explanation,
      category: question.category,
      difficulty: question.difficulty
    })
    
    return {
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
  } catch (error) {
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
    
    const updatedQuestion = await updateQuizQuestion(parseInt(questionId), updateData)
    
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
    await deleteQuizQuestion(parseInt(questionId))
  } catch (error) {
    console.error('Error deleting question:', error)
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
    return []
  }
}

// Get questions by difficulty
export async function getQuestionsByDifficulty(difficulty: string): Promise<Question[]> {
  try {
    const questionBank = await getQuestionBank()
    return Object.values(questionBank).filter(q => q.difficulty === difficulty)
  } catch (error) {
    console.error('Error getting questions by difficulty:', error)
    return []
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
    
    // Shuffle and return requested count
    const shuffled = questions.sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
  } catch (error) {
    console.error('Error getting random questions:', error)
    return []
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
