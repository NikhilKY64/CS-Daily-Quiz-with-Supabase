"use client"

import { useEffect, useState } from 'react'
import { getQuestionCount, getRecentQuestions, verifyQuestionUpload } from '@/lib/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, CheckCircle, XCircle, Clock, Database } from 'lucide-react'

interface UploadMonitorProps {
  onUploadComplete?: (questionId: string) => void
}

export function UploadMonitor({ onUploadComplete }: UploadMonitorProps) {
  const [questionCount, setQuestionCount] = useState(0)
  const [recentQuestions, setRecentQuestions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const refreshData = async () => {
    setIsLoading(true)
    try {
      const [count, recent] = await Promise.all([
        getQuestionCount(),
        getRecentQuestions(10)
      ])
      setQuestionCount(count)
      setRecentQuestions(recent)
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Error refreshing upload data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const verifyUpload = async (questionId: string) => {
    try {
      const question = await verifyQuestionUpload(questionId)
      if (question) {
        console.log('✅ Question verified in Supabase:', question)
        onUploadComplete?.(questionId)
        return true
      } else {
        console.log('❌ Question not found in Supabase')
        return false
      }
    } catch (error) {
      console.error('Error verifying upload:', error)
      return false
    }
  }

  useEffect(() => {
    refreshData()
    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshData, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getStatusIcon = (question: any) => {
    const now = new Date()
    const created = new Date(question.created_at)
    const diffMinutes = (now.getTime() - created.getTime()) / (1000 * 60)
    
    if (diffMinutes < 1) {
      return <Clock className="h-4 w-4 text-blue-500" />
    } else if (diffMinutes < 5) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    } else {
      return <Database className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Upload Monitor</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold">{questionCount}</p>
              <p className="text-xs text-muted-foreground">Total Questions</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{recentQuestions.length}</p>
              <p className="text-xs text-muted-foreground">Recent Uploads</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent Questions</CardTitle>
          <CardDescription>
            Latest questions uploaded to Supabase
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentQuestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No questions found</p>
          ) : (
            <div className="space-y-3">
              {recentQuestions.map((question) => (
                <div
                  key={question.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(question)}
                    <div>
                      <p className="text-sm font-medium line-clamp-1">
                        {question.question}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {question.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {question.difficulty}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(question.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => verifyUpload(question.id)}
                  >
                    Verify
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Upload Status</CardTitle>
          <CardDescription>
            Real-time monitoring of question uploads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Questions successfully uploaded</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm">Recently uploaded (within 1 minute)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-gray-500" />
              <span className="text-sm">Stored in database</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Hook for monitoring uploads
export function useUploadMonitor() {
  const [uploadStatus, setUploadStatus] = useState<{
    isUploading: boolean
    lastUpload: string | null
    uploadCount: number
  }>({
    isUploading: false,
    lastUpload: null,
    uploadCount: 0
  })

  const startUpload = () => {
    setUploadStatus(prev => ({ ...prev, isUploading: true }))
  }

  const completeUpload = (questionId: string) => {
    setUploadStatus(prev => ({
      isUploading: false,
      lastUpload: questionId,
      uploadCount: prev.uploadCount + 1
    }))
  }

  const failUpload = (error: string) => {
    setUploadStatus(prev => ({ ...prev, isUploading: false }))
    console.error('Upload failed:', error)
  }

  return {
    uploadStatus,
    startUpload,
    completeUpload,
    failUpload
  }
}
