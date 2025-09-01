export interface Question {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
  category?: string
  difficulty?: "easy" | "medium" | "hard"
  createdAt: string
  updatedAt: string
}

export interface QuestionBank {
  questions: Question[]
  metadata: {
    title: string
    description?: string
    createdAt: string
    updatedAt: string
  }
}
