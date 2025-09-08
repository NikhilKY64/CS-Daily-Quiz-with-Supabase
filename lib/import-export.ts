import type { Question, QuestionBank } from "./types"
import { getQuestionBank, getQuizMetadata, addQuestion } from "./question-storage"
import { getClient } from './supabaseClient'

export interface ImportResult {
  success: boolean
  message: string
  importedCount?: number
  errors?: string[]
  solution?: string
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
    // Primary path: use existing helpers
    let questions: any = null
    let metadata: any = null
    try {
      questions = await getQuestionBank()
    } catch (e) {
      console.warn('[exportQuestions] getQuestionBank failed, will fallback to direct fetch:', e)
    }
    try {
      metadata = await getQuizMetadata()
    } catch (e) {
      console.warn('[exportQuestions] getQuizMetadata failed, using safe defaults:', e)
    }

    // Fallback: if questions is null or empty, fetch directly via Supabase client
    let questionsArray: any[] = []
    if (questions) {
      questionsArray = Array.isArray(questions) ? questions : Object.values(questions || {})
    }

    if (!questionsArray || questionsArray.length === 0) {
      // Dynamic import to ensure this runs on client and uses the client supabase instance
      try {
        const { supabase } = await import('./supabaseClient')
        const { data, error } = await supabase.from('quiz_questions').select('*').order('created_at', { ascending: false })
        if (error) throw error
        // Map rows to Question shape
        questionsArray = (data || []).map((q: any) => ({
          id: q.id?.toString?.() || crypto.randomUUID(),
          question: q.question,
          options: q.options,
          correctAnswer: q.correct_answer,
          explanation: q.explanation ?? '',
          category: q.category ?? 'General',
          difficulty: q.difficulty ?? 'Medium',
          createdAt: q.created_at ?? new Date().toISOString(),
          updatedAt: q.updated_at ?? new Date().toISOString(),
        }))
      } catch (fetchErr) {
        console.error('[exportQuestions] direct fetch failed:', fetchErr)
        throw fetchErr
      }
    }

    const questionCount = questionsArray.length
    const safeTitle = (metadata as any)?.title || `question_bank`

    const questionBank: QuestionBank = {
      questions: questionsArray,
      metadata: {
        title: safeTitle,
        description: `Exported question bank with ${questionCount} questions`,
        createdAt: (metadata as any)?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }

    const dataStr = JSON.stringify(questionBank, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })

    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    // Use safeTitle for filename and sanitize
    link.download = `${safeTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_questions.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Export failed:', error)
    throw new Error('Failed to export questions. Please try again.')
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
            message: "Invalid JSON. The file should have the same format as in the sample file.\nFor solution click on solution button.",
            solution: `How to fix your file:\n1. Download the sample question file from the import dialog.\n2. Open both your file and the sample in a text editor.\n3. Copy the sample and your file content, then paste both into an AI tool like ChatGPT.\n4. Ask the AI to reformat your questions to match the sample structure and make the result downloadable as a JSON file.\n5. Download the corrected file and try importing again.`,
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
            message: "Invalid JSON. The file should have the same format as in the sample file.\nFor solution click on solution buttion.",
            solution: `How to fix your file:\n1. Download the sample question file from the import dialog.\n2. Open both your file and the sample in a text editor.\n3. Copy the sample and your file content, then paste both into an AI tool like ChatGPT.\n4. Ask the AI to reformat your questions to match the sample structure and make the result downloadable as a JSON file.\n5. Download the corrected file and try importing again.`,
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
            message: "Invalid JSON. The file should have the same format as in the sample file.\nFor solution click on solution buttion.",
            errors,
            solution: `How to fix your file:\n1. Download the sample question file from the import dialog.\n2. Open both your file and the sample in a text editor.\n3. Copy the sample and your file content, then paste both into an AI tool like ChatGPT.\n4. Ask the AI to reformat your questions to match the sample structure and make the result downloadable as a JSON file.\n5. Download the corrected file and try importing again.`,
          })
          return
        }

        // Import questions
        const existingQuestions = replaceExisting ? {} : await getQuestionBank()
        const existingIds = new Set(Object.keys(existingQuestions))

        if (replaceExisting) {
          try {
            // Use server-side API (service role) to replace questions and clear asked_questions.
            const resp = await fetch('/api/replace-questions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ questions: validQuestions }),
            })
            const body = await resp.json().catch(() => ({}))
            if (!resp.ok) {
              resolve({ success: false, message: 'Server replace failed: ' + (body?.error || resp.statusText) })
              return
            }
            resolve({ success: true, message: `Successfully replaced ${body.inserted || validQuestions.length} questions.`, importedCount: body.inserted || validQuestions.length })
            return
          } catch (err) {
            resolve({ success: false, message: 'Failed to replace questions on server: ' + (err instanceof Error ? err.message : String(err)) })
            return
          }
        }

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

        // Import questions using the working addQuestion function
        let importedCount = 0
        const importErrors: string[] = []
        
        for (const question of questionsToAdd) {
          try {
            // Remove id, createdAt, updatedAt as addQuestion will generate new ones
            const { id, createdAt, updatedAt, ...questionData } = question
            await addQuestion(questionData)
            importedCount++
          } catch (error) {
            console.error(`Failed to import question: ${question.question}`, error)
            importErrors.push(`Question "${question.question}": ${error instanceof Error ? error.message : 'Import failed'}`)
          }
        }

        resolve({
          success: true,
          message: `Successfully imported ${importedCount} questions.${
            importErrors.length > 0 ? ` ${importErrors.length} questions failed to import.` : ""
          }`,
          importedCount: importedCount,
          errors: importErrors.length > 0 ? importErrors : undefined,
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

export async function getQuizTitle() {
  const supabase = getClient();
  // use maybeSingle so we don't error if the table is empty
  const { data, error } = await supabase
    .from('quiz_meta')
    .select('quiz_title')
    .maybeSingle();
  if (error) throw error;
  return data && (data as any).quiz_title ? (data as any).quiz_title : 'Daily Quiz';
}

export async function updateQuizTitle(newTitle: string) {
  const supabase = getClient();
  // Use upsert to create or update the single meta row so the title persists for all users
  const payload = { quiz_id: 1, quiz_title: newTitle }
  const { error } = await supabase
    .from('quiz_meta')
    .upsert(payload, { onConflict: 'quiz_id' })
  if (error) throw error;
}
