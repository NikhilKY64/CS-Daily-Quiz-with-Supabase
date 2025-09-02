"use client"

import { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookOpen, User, ArrowLeft, LogOut } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
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
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [password, setPassword] = useState("")
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState("")
  const [rank, setRank] = useState<number | null>(null)

  // Fetch rank (student mode)
  useEffect(() => {
    const fetchRank = async () => {
      try {
        if (userRole !== 'student') return
        const { data: { user } } = await supabase.auth.getUser()
        const userId = user?.id
        if (!userId) return
        const { data: my } = await supabase.from('profiles').select('total_points').eq('id', userId).single()
        const myPoints = my?.total_points ?? 0
        const { count } = await supabase.from('profiles').select('id', { head: true, count: 'exact' }).gt('total_points', myPoints)
        if (typeof count === 'number') setRank(count + 1)
      } catch (e) {
        // ignore
      }
    }
    fetchRank()
  }, [userRole])
  
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
  
  const handleSwitchToTeacher = async () => {
    setPasswordOpen(true)
    setPassword("")
    setError("")
  }

  const verifyPassword = async () => {
    setChecking(true)
    setError("")
    try {
      const { getTeacherPassword } = await import('@/lib/supabaseClient')
      const stored = await getTeacherPassword()
      if (password && stored && password === stored) {
        onRoleChange("teacher")
        setPasswordOpen(false)
      } else {
        setError("Invalid password")
      }
    } catch (e: any) {
      setError(e.message || "Failed to verify password")
    } finally {
      setChecking(false)
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
            {userRole === "student" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  try { sessionStorage.setItem('openLeaderboard', '1') } catch {}
                  try {
                    // Try to signal any dashboard listener to open leaderboard
                    const evt = new Event('open-leaderboard')
                    window.dispatchEvent(evt)
                  } catch {}
                  router.push('/')
                }}
                title="View leaderboard and rank"
              >
                {rank ? `Leaderboard · Rank #${rank}` : 'Leaderboard'}
              </Button>
            )}

            <Badge variant={userRole === "student" ? "default" : "secondary"}>
              {userRole === "student" ? "Student Mode" : "Teacher Mode"}
            </Badge>

            {userRole === "student" ? (
              <Button variant="outline" size="sm" onClick={() => setPasswordOpen(true)}>
                Switch to Teacher
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => onRoleChange("student")}> 
                Switch to Student
              </Button>
            )}

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
                <DropdownMenuItem onSelect={() => onRoleChange("student")}>Switch to Student</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setPasswordOpen(true)}>Switch to Teacher</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      {/* Teacher password dialog */}
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Teacher Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordOpen(false)}>Cancel</Button>
            <Button onClick={verifyPassword} disabled={checking}>{checking ? 'Checking...' : 'Continue'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  )
}
