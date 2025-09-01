"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Upload, Download, FileText, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { importQuestions, exportQuestions, generateSampleQuestions, type ImportResult } from "@/lib/import-export"

interface ImportExportDialogProps {
  isOpen: boolean
  onClose: () => void
  mode: "import" | "export"
  onImportComplete: () => void
}

export function ImportExportDialog({ isOpen, onClose, mode, onImportComplete }: ImportExportDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [replaceExisting, setReplaceExisting] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleClose = () => {
    setSelectedFile(null)
    setReplaceExisting(false)
    setResult(null)
    setIsProcessing(false)
    onClose()
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type === "application/json" || file.name.endsWith(".json")) {
        setSelectedFile(file)
        setResult(null)
      } else {
        setResult({
          success: false,
          message: "Please select a JSON file.",
        })
      }
    }
  }

  const handleImport = async () => {
    if (!selectedFile) return

    setIsProcessing(true)
    try {
      const importResult = await importQuestions(selectedFile, replaceExisting)
      setResult(importResult)

      if (importResult.success) {
        onImportComplete()
        // Auto-close after successful import
        setTimeout(() => {
          handleClose()
        }, 2000)
      }
    } catch (error) {
      setResult({
        success: false,
        message: "An unexpected error occurred during import.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleExport = async () => {
    setIsProcessing(true)
    try {
      await exportQuestions()
      setResult({
        success: true,
        message: "Questions exported successfully!",
      })
      // Auto-close after successful export
      setTimeout(() => {
        handleClose()
      }, 1500)
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Export failed.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownloadSample = () => {
    try {
      const sampleData = generateSampleQuestions()
      const dataStr = JSON.stringify(sampleData, null, 2)
      const dataBlob = new Blob([dataStr], { type: "application/json" })

      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = "sample_questions.json"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      setResult({
        success: false,
        message: "Failed to download sample file.",
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "import" ? (
              <>
                <Upload className="h-5 w-5" />
                Import Questions
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Export Questions
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === "import"
              ? "Upload a JSON file containing questions to add to your question bank."
              : "Download your current question bank as a JSON file to share or backup."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {mode === "import" ? (
            <>
              {/* File Selection */}
              <div className="space-y-2">
                <Label htmlFor="file-upload">Select JSON File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                  </p>
                )}
              </div>

              {/* Import Options */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="replace-existing"
                  checked={replaceExisting}
                  onCheckedChange={(checked) => setReplaceExisting(checked as boolean)}
                />
                <Label htmlFor="replace-existing" className="text-sm">
                  Replace all existing questions
                </Label>
              </div>

              {/* Sample File Download */}
              <div className="border rounded-lg p-3 bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Need a sample file?</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDownloadSample}>
                    Download Sample
                  </Button>
                </div>
              </div>

              {/* Import Button */}
              <Button onClick={handleImport} disabled={!selectedFile || isProcessing} className="w-full">
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Questions
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              {/* Export Description */}
              <div className="text-sm text-muted-foreground space-y-2">
                <p>This will download a JSON file containing all your questions.</p>
                <p>You can share this file with other teachers or use it as a backup.</p>
              </div>

              {/* Export Button */}
              <Button onClick={handleExport} disabled={isProcessing} className="w-full">
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export Questions
                  </>
                )}
              </Button>
            </>
          )}

          {/* Result Message */}
          {result && (
            <Alert
              className={result.success ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950" : ""}
            >
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
                <AlertDescription className={result.success ? "text-green-800 dark:text-green-200" : ""}>
                  {result.message}
                </AlertDescription>
              </div>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  <p>Errors encountered:</p>
                  <ul className="list-disc list-inside">
                    {result.errors.slice(0, 3).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {result.errors.length > 3 && <li>...and {result.errors.length - 3} more</li>}
                  </ul>
                </div>
              )}
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
