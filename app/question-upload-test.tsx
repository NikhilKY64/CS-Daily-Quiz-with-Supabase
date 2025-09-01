"use client"

import { useState } from 'react'
import { QuestionForm } from '@/components/question-form'
import { UploadMonitor, useUploadMonitor } from '@/components/upload-monitor'
import { addQuestion } from '@/lib/question-storage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, TestTube } from 'lucide-react'

export default function QuestionUploadTestPage() {
  const [showForm, setShowForm] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{
    isUploading: boolean
    success: boolean | null
    message: string
  }>({
    isUploading: false,
    success: null,
    message: ""
  })

  const handleSaveQuestion = async (questionData: any) => {
    setUploadStatus({
      isUploading: true,
      success: null,
      message: "Uploading question to Supabase..."
    })

    try {
      const savedQuestion = await addQuestion(questionData)
      setUploadStatus({
        isUploading: false,
        success: true,
        message: `✅ Question uploaded successfully! ID: ${savedQuestion.id}`
      })
      
      // Clear the form after successful upload
      setTimeout(() => {
        setShowForm(false)
        setUploadStatus({
          isUploading: false,
          success: null,
          message: ""
        })
      }, 2000)
    } catch (error: any) {
      setUploadStatus({
        isUploading: false,
        success: false,
        message: `❌ Upload failed: ${error.message}`
      })
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setUploadStatus({
      isUploading: false,
      success: null,
      message: ""
    })
  }

  return (
    <main className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Question Upload Test</h1>
          <p className="text-muted-foreground">
            Test and monitor question uploads to Supabase
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Test Question
        </Button>
      </div>

      {/* Upload Status Display */}
      {uploadStatus.message && (
        <Card className={`border-2 ${
          uploadStatus.success === true ? 'border-green-200 bg-green-50' :
          uploadStatus.success === false ? 'border-red-200 bg-red-50' :
          'border-blue-200 bg-blue-50'
        }`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              {uploadStatus.success === true ? (
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              ) : uploadStatus.success === false ? (
                <div className="h-2 w-2 bg-red-500 rounded-full" />
              ) : (
                <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
              )}
              <span className="font-medium">{uploadStatus.message}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Question Form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Upload Test Question
              </CardTitle>
            </CardHeader>
            <CardContent>
              {showForm ? (
                <QuestionForm
                  onSave={handleSaveQuestion}
                  onCancel={handleCancel}
                  showUploadStatus={true}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Click "Add Test Question" to create a new question and test the upload process.
                  </p>
                  <Button onClick={() => setShowForm(true)}>
                    Start Upload Test
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upload Monitor */}
        <div>
          <UploadMonitor />
        </div>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Test Question Uploads</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">1. Create a Question</h4>
              <p className="text-sm text-muted-foreground">
                Click "Add Test Question" and fill out the form with sample data.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">2. Monitor Upload</h4>
              <p className="text-sm text-muted-foreground">
                Watch the upload status and monitor panel for real-time feedback.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">3. Verify in Database</h4>
              <p className="text-sm text-muted-foreground">
                Check the "Recent Questions" section to see your uploaded question.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">4. Test Verification</h4>
              <p className="text-sm text-muted-foreground">
                Use the "Verify" button to confirm the question exists in Supabase.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
