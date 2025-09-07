"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { supabase, updatePendingName } from "@/lib/supabaseClient"

async function updateProfile(userId: string, updates: { name: string }) {
  // Save as pending_name so it doesn't appear until approved
  return updatePendingName(userId, updates.name)
}

interface UserProfileEditProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  userName: string
  onNameUpdate: (newName: string) => void
  onSignOut: () => void;
}

export function UserProfileEdit({
  isOpen,
  onOpenChange,
  userName,
  onNameUpdate,
  onSignOut,
}: UserProfileEditProps) {
  const [name, setName] = useState(userName)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setName(userName)
      setError(null)
      setSuccess(false)
    }
  }, [isOpen, userName])

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name cannot be empty")
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const { data } = await supabase.auth.getUser()
      if (!data?.user?.id) {
        throw new Error("User not found")
      }

      await updateProfile(data.user.id, { name })
      // Do not update the visible name here; the pending change requires approval.

      setSuccess(true)
      setPendingMessage('Your new name has been sent for approval. It will be visible after a teacher approves it.')

      setTimeout(() => {
        onOpenChange(false)
      }, 1500)
    } catch (err: any) {
      setError(err.message || "Failed to update profile")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/* Increase max width so input can be longer like before */}
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Request a change to your display name — the new name will be shown after a teacher or admin approves it.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Responsive layout: stack label above input on small screens, align in 4 cols on sm+ */}
          <div className="grid gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
            <label htmlFor="name" className="text-sm font-medium sm:text-right">
              Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="sm:col-span-3 w-full"
              placeholder="Enter your name"
              disabled={isLoading || success}
            />
          </div>
          {error && (
            <div className="text-sm text-red-500 col-span-4 text-center">
              {error}
            </div>
          )}
          {success && (
            <div className="text-sm text-green-500 col-span-4 text-center">
              Profile update request submitted.
            </div>
          )}
          {pendingMessage && (
            <div className="text-sm text-blue-600 col-span-4 text-center">
              {pendingMessage}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || success} className={success ? "bg-green-500" : ""}>
            {isLoading ? "Saving..." : success ? "Saved!" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}