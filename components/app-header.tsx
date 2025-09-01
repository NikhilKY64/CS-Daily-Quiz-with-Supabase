"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookOpen, User, ArrowLeft, LogOut } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "@/components/theme-toggle"
import type { StudentProgress } from "@/lib/student-storage"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import { UserProfileEdit } from "@/components/user-profile-edit"

interface AppHeaderProps {
  userRole: "student" | "teacher"
  onRoleChange: (role: "student" | "teacher") => void
  quizTitle: string
  onTitleChange: (title: string) => void
  currentStudent?: StudentProgress | null
  onBackToSelection?: () => void
  userName?: string
  isNewUser?: boolean
  onNameUpdate?: (newName: string) => void
}

export function AppHeader({ userRole, onRoleChange, quizTitle, onTitleChange, currentStudent, onBackToSelection, userName, isNewUser, onNameUpdate }: AppHeaderProps) {
  const router = useRouter()
  
  const handleSignOut = async () => {
    try {
      // Use signOutUser function from supabaseClient.js instead of direct call
      // This will handle the error properly
      const { signOutUser } = await import('@/lib/supabaseClient')
      await signOutUser()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }
  
  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {userRole === "student" && currentStudent && onBackToSelection && (
              <Button variant="ghost" size="sm" onClick={onBackToSelection}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            <div className="flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{quizTitle}</h1>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  {userRole === "student" && userName
                    ? (
                        <>
                          {isNewUser ? `Welcome, ${userName}!` : `Welcome back, ${userName}!`}
                          {onNameUpdate && (
                            <UserProfileEdit 
                              userId="current" 
                              userName={userName} 
                              onNameUpdate={onNameUpdate} 
                            />
                          )}
                        </>
                      )
                    : "Daily Learning Challenge"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Badge variant={userRole === "student" ? "default" : "secondary"}>
              {userRole === "student" ? "Student Mode" : "Teacher Mode"}
            </Badge>

            <ThemeToggle />
            
            <Button variant="outline" size="icon" onClick={handleSignOut} title="Sign Out">
              <LogOut className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onRoleChange("student")}>Switch to Student</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onRoleChange("teacher")}>Switch to Teacher</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
