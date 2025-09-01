"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
// Remove duplicate import since it's already imported below
// Create a new file at @/lib/profile.ts with this function:
// export async function updateProfile(userId: string, updates: { name: string }) {
//   const { error } = await supabase
//     .from('profiles')
//     .update(updates)
//     .eq('id', userId)
//   if (error) throw error
// }
import { supabase } from "@/lib/supabaseClient"

async function updateProfile(userId: string, updates: { name: string }) {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
  if (error) throw error
}
import { Pencil } from "lucide-react"

interface UserProfileEditProps {
  userId: string
  userName: string
  onNameUpdate: (newName: string) => void
}

export function UserProfileEdit({ userId, userName, onNameUpdate }: UserProfileEditProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState(userName)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  
  const [actualUserId, setActualUserId] = useState<string>(userId)

  useEffect(() => {
    // If userId is 'current', get the current user's ID from Supabase
    const getCurrentUserId = async () => {
      if (userId === 'current') {
        try {
          const { data } = await supabase.auth.getUser()
          if (data?.user?.id) {
            setActualUserId(data.user.id)
          }
        } catch (error) {
          console.error('Error getting current user:', error)
        }
      }
    }
    
    getCurrentUserId()
  }, [userId])
  
  // Reset states when dialog opens/closes
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
      await updateProfile(actualUserId, { name })
      onNameUpdate(name)
      setSuccess(true)
      
      // Close dialog after a short delay to show success message
      setTimeout(() => {
        setIsOpen(false)
      }, 1500)
    } catch (err: any) {
      setError(err.message || "Failed to update profile")
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full hover:bg-muted">
          <Pencil className="h-3.5 w-3.5 text-primary" />
          <span className="sr-only">Edit profile</span>
        </Button>
      </DialogTrigger>
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
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
            {success ? "Close" : "Cancel"}
          </Button>
          <Button onClick={handleSave} disabled={isLoading || success} className={success ? "bg-green-500" : ""}>
            {isLoading ? "Saving..." : success ? "Saved!" : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}