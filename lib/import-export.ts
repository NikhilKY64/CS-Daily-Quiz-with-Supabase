import type { Question, QuestionBank } from "./types"
import { getQuestionBank, saveQuestionBank, getQuizMetadata } from "./question-storage"

export interface ImportResult {
  success: boolean
  message: string
  importedCount?: number
  errors?: string[]
}

export function validateQuestion(question: any): question is Question {
  return (
    typeof question === "object" &&
    question !== null &&
    typeof question.id === "string" &&
    typeof question.question === "string" &&
    Array.isArray(question.options) &&
    question.options.length >= 2 &&
    question.options.every((opt: any) => typeof opt === "string") &&
    typeof question.correctAnswer === "number" &&
    question.correctAnswer >= 0 &&
    question.correctAnswer < question.options.length &&
    typeof question.createdAt === "string" &&
    typeof question.updatedAt === "string"
  )
}

export function validateQuestionBank(data: any): data is QuestionBank {
  return (
    typeof data === "object" &&
    data !== null &&
    Array.isArray(data.questions) &&
    data.questions.every(validateQuestion) &&
    typeof data.metadata === "object" &&
    data.metadata !== null &&
    typeof data.metadata.title === "string" &&
    typeof data.metadata.createdAt === "string" &&
    typeof data.metadata.updatedAt === "string"
  )
}

export async function exportQuestions(): Promise<void> {
  try {
    const questions = await getQuestionBank()
    const metadata = await getQuizMetadata()

    const questionBank: QuestionBank = {
      questions: Object.values(questions),
      metadata: {
        title: metadata.title,
        description: `Exported question bank with ${Object.keys(questions).length} questions`,
        createdAt: metadata.createdAt,
        updatedAt: new Date().toISOString(),
      },
    }

    const dataStr = JSON.stringify(questionBank, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })

    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${metadata.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_questions.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error("Export failed:", error)
    throw new Error("Failed to export questions. Please try again.")
  }
}

export function importQuestions(file: File, replaceExisting = false): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string
        if (!content) {
          resolve({
            success: false,
            message: "File is empty or could not be read.",
          })
          return
        }

        let data: any
        try {
          data = JSON.parse(content)
        } catch (parseError) {
          resolve({
            success: false,
            message: "Invalid JSON format. Please check your file.",
          })
          return
        }

        // Handle both full question bank format and simple questions array
        let questionsToImport: Question[]
        if (validateQuestionBank(data)) {
          questionsToImport = data.questions
        } else if (Array.isArray(data)) {
          // Simple array of questions
          questionsToImport = data
        } else {
          resolve({
            success: false,
            message: "Invalid file format. Expected question bank or questions array.",
          })
          return
        }

        // Validate each question
        const errors: string[] = []
        const validQuestions: Question[] = []

        questionsToImport.forEach((question, index) => {
          if (validateQuestion(question)) {
            validQuestions.push(question)
          } else {
            errors.push(`Question ${index + 1}: Invalid format or missing required fields`)
          }
        })

        if (validQuestions.length === 0) {
          resolve({
            success: false,
            message: "No valid questions found in the file.",
            errors,
          })
          return
        }

        // Import questions
        const existingQuestions = replaceExisting ? {} : await getQuestionBank()
        const existingIds = new Set(Object.keys(existingQuestions))

        // Filter out duplicates and update IDs if necessary
        const questionsToAdd = validQuestions.map((question) => {
          if (existingIds.has(question.id)) {
            // Generate new ID for duplicate
            return {
              ...question,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          }
          return question
        })

        // Convert to question bank format
        const questionBankToSave: QuestionBank = {}
        questionsToAdd.forEach(q => {
          questionBankToSave[q.id] = q
        })
        
        // Add to existing questions if not replacing
        if (!replaceExisting) {
          Object.assign(questionBankToSave, existingQuestions)
        }
        
        await saveQuestionBank(questionBankToSave)

        resolve({
          success: true,
          message: `Successfully imported ${questionsToAdd.length} questions.${
            errors.length > 0 ? ` ${errors.length} questions were skipped due to errors.` : ""
          }`,
          importedCount: questionsToAdd.length,
          errors: errors.length > 0 ? errors : undefined,
        })
      } catch (error) {
        console.error("Import error:", error)
        resolve({
          success: false,
          message: "An unexpected error occurred while importing questions.",
        })
      }
    }

    reader.onerror = () => {
      resolve({
        success: false,
        message: "Failed to read the file. Please try again.",
      })
    }

    reader.readAsText(file)
  })
}

export function generateSampleQuestions(): QuestionBank {
  const sampleQuestions: Question[] = [
    {
      id: crypto.randomUUID(),
      question: "What does HTML stand for?",
      options: [
        "Hyper Text Markup Language",
        "High Tech Modern Language",
        "Home Tool Markup Language",
        "Hyperlink and Text Markup Language",
      ],
      correctAnswer: 0,
      explanation:
        "HTML stands for Hyper Text Markup Language, which is the standard markup language for creating web pages.",
      category: "Web Development",
      difficulty: "easy",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      question: "Which of the following is NOT a JavaScript data type?",
      options: ["String", "Boolean", "Float", "Undefined"],
      correctAnswer: 2,
      explanation:
        "JavaScript doesn't have a specific 'Float' data type. Numbers in JavaScript are all stored as double-precision floating-point numbers.",
      category: "JavaScript",
      difficulty: "medium",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      question: "What is the time complexity of binary search?",
      options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
      correctAnswer: 1,
      explanation:
        "Binary search has O(log n) time complexity because it eliminates half of the remaining elements in each step.",
      category: "Algorithms",
      difficulty: "medium",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      question: "Which CSS property is used to change the text color?",
      options: ["font-color", "text-color", "color", "foreground-color"],
      correctAnswer: 2,
      explanation: "The 'color' property in CSS is used to set the color of text content.",
      category: "CSS",
      difficulty: "easy",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      question: "What does SQL stand for?",
      options: [
        "Structured Query Language",
        "Simple Query Language",
        "Standard Query Language",
        "Sequential Query Language",
      ],
      correctAnswer: 0,
      explanation: "SQL stands for Structured Query Language, used for managing and manipulating relational databases.",
      category: "Database",
      difficulty: "easy",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]

  return {
    questions: sampleQuestions,
    metadata: {
      title: "Sample Computer Science Questions",
      description:
        "A collection of sample questions covering web development, programming, and computer science fundamentals.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }
}
