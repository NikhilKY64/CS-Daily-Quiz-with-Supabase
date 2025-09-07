"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
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
  const [pendingReplaceConfirm, setPendingReplaceConfirm] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errorList, setErrorList] = useState<string[] | null>(null)
  const [selectedFileText, setSelectedFileText] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [solutionOpen, setSolutionOpen] = useState(false)

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
  // show popup dialog for invalid file type
  setErrorMessage("Please select a JSON file.")
  setErrorList(null)
  setErrorDialogOpen(true)
      }
    }
  }

  const handleImport = async () => {
    if (!selectedFile) return

    setIsProcessing(true)
    try {
      const importResult = await importQuestions(selectedFile, replaceExisting)
      setResult(importResult)

      if (!importResult.success) {
        // show popup with failure reason(s)
        setErrorMessage(importResult.message)
        setErrorList(importResult.errors || null)
        setErrorDialogOpen(true)
        return
      }

      // success path
      onImportComplete()
      // Auto-close after successful import
      setTimeout(() => {
        handleClose()
      }, 2000)
    } catch (error) {
      setErrorMessage("An unexpected error occurred during import.")
      setErrorList(null)
      setErrorDialogOpen(true)
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
  setErrorMessage(error instanceof Error ? error.message : "Export failed.")
  setErrorList(null)
  setErrorDialogOpen(true)
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

  // ChatGPT solution prompt template and copy handler
  const solutionPrompt = `I have two JSON files. First is my file that may be malformed or in a different structure, and second is a sample_questions.json showing the required structure. Please transform the first JSON so its shape and keys match the sample exactly, keeping all content values where possible. Return only the corrected JSON array/object (no explanation). If any fields are ambiguous, keep them as text and preserve answers. Example instruction: "Please reformat my file to match the sample_questions.json structure and return valid JSON ready for import."`;

  const copySolutionPrompt = async () => {
    try {
      await navigator.clipboard.writeText(solutionPrompt)
      // small feedback could be added later
    } catch (e) {
      // ignore clipboard failures silently
    }
  }

  // read selected file contents for the solution popup
  useEffect(() => {
    if (!selectedFile) {
      setSelectedFileText(null)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setSelectedFileText(typeof reader.result === "string" ? reader.result : String(reader.result))
    }
    reader.readAsText(selectedFile)
  }, [selectedFile])

  // reset solution panel when error dialog opens
  useEffect(() => {
    if (!errorDialogOpen) setSolutionOpen(false)
  }, [errorDialogOpen])

  const copyCombined = async (includePrompt = false) => {
    try {
      const sampleText = JSON.stringify(generateSampleQuestions(), null, 2)
      const userText = selectedFileText || ""
      const combined = `--- YOUR FILE ---\n${userText}\n\n--- SAMPLE FILE ---\n${sampleText}`
      const toCopy = includePrompt ? `${solutionPrompt}\n\n${combined}` : combined
      await navigator.clipboard.writeText(toCopy)
    } catch (e) {
      // ignore
    }
  }

  // Render the error message but highlight only the solution hint in green
  const renderErrorMessage = () => {
    if (!errorMessage) return null
    const needle = "For solution click on solution buttion."
    if (errorMessage.includes(needle)) {
      const parts = errorMessage.split(needle)
      return (
        <>
          {parts[0]}
          <span className="text-green-600 dark:text-green-300">{needle}</span>
          {parts.slice(1).join(needle)}
        </>
      )
    }
    return errorMessage
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
              <div className="flex items-center">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="replace-existing"
                    checked={replaceExisting}
                    onCheckedChange={(checked) => {
                      // If user is attempting to enable replace, show inline confirmation to the right
                      if (checked === true) {
                        setPendingReplaceConfirm(true)
                      } else {
                        setReplaceExisting(false)
                        setPendingReplaceConfirm(false)
                      }
                    }}
                  />
                  <Label htmlFor="replace-existing" className="text-sm">
                    Replace all existing questions
                  </Label>
                </div>

                {/* Inline right-side confirmation controls when enabling replace */}
                {pendingReplaceConfirm && (
                  <div className="ml-4 flex items-center gap-2">
                    <span className="text-sm text-destructive">This will delete existing questions.</span>
                    <Button size="sm" variant="outline" onClick={() => {
                      setPendingReplaceConfirm(false)
                      setReplaceExisting(false)
                    }}>
                      Cancel
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => {
                      setReplaceExisting(true)
                      setPendingReplaceConfirm(false)
                    }}>
                      Confirm
                    </Button>
                  </div>
                )}
              </div>

              {/* destructive inline alert removed; confirmation handled inline to the right */}

              {/* inline confirmation handled to the right of the checkbox */}

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

                {/* Solution moved into the error popup (shown on import failures) */}

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

          {/* Success result shown inline; errors open the error dialog */}
          {result?.success && (
            <Alert className={result.success ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950" : ""}>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className={"text-green-800 dark:text-green-200"}>
                  {result.message}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Error popup dialog */}
          <Dialog open={errorDialogOpen} onOpenChange={(open) => setErrorDialogOpen(open)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Import Error
                </DialogTitle>
                <DialogDescription>{renderErrorMessage()}</DialogDescription>
              </DialogHeader>

              {errorList && errorList.length > 0 && (
                <div className="mt-2 text-sm text-muted-foreground">
                  <p className="font-medium">Errors encountered:</p>
                  <ul className="list-disc list-inside mt-1">
                    {errorList.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Old-style error popup with optional solution toggle (brief message is shown above) */}

              {solutionOpen && (
                <div className="mt-3 rounded-md border bg-muted/20 p-3 text-sm">
                  <p className="font-medium mb-2">How to fix :- </p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Download the sample file using "Download Sample".</li>
                    <li>Give your json file and the sample file to AI (likeChatGPT).</li>
                    <li>Tell AI to Reformat your file to match format of sample file.</li>
                    <li>Ask to make it downloadable.</li>
                    <li>Import the corrected file.</li>
                  </ol>
                </div>
              )}

              <div className="mt-4 flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setSolutionOpen((s) => !s)}>
                  {solutionOpen ? "Hide Solution" : "Solution"}
                </Button>
                <Button onClick={() => setErrorDialogOpen(false)}>Close</Button>
              </div>
            </DialogContent>
          </Dialog>

          
        </div>
      </DialogContent>
    </Dialog>
  )
}
