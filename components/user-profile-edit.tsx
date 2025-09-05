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
import { supabase } from "@/lib/supabaseClient"

async function updateProfile(userId: string, updates: { name: string }) {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
  if (error) throw error
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
      onNameUpdate(name)
      setSuccess(true)

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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your display name. This will be visible to other users.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="name" className="text-right text-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
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
              Profile updated successfully!
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