"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookOpen, User, ArrowLeft, X, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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

export function AppHeader({
  userRole,
  onRoleChange,
  quizTitle,
  onTitleChange,
  currentStudent,
  onBackToSelection,
  userName,
  isNewUser,
  onNameUpdate,
}: AppHeaderProps) {
  const router = useRouter()
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [password, setPassword] = useState("")
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState("")
  const [rank, setRank] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    const fetchRank = async () => {
      try {
        if (userRole !== "student") return
        const {
          data: { user },
        } = await supabase.auth.getUser()
        const userId = user?.id
        if (!userId) return
        const { data: my } = await supabase
          .from("profiles")
          .select("total_points")
          .eq("id", userId)
          .single()
        const myPoints = my?.total_points ?? 0
        const { count } = await supabase
          .from("profiles")
          .select("id", { head: true, count: "exact" })
          .gt("total_points", myPoints)
        if (typeof count === "number") setRank(count + 1)
      } catch (e) {
        // ignore
      }
    }
    fetchRank()
  }, [userRole])

  const handleSignOut = async () => {
    try {
      const { signOutUser } = await import("@/lib/supabaseClient")
      await signOutUser()
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const verifyPassword = async () => {
    setChecking(true)
    setError("")
    try {
      const { getTeacherPassword } = await import("@/lib/supabaseClient")
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
  <div className="mx-auto px-4 pt-4 pb-[0.9rem] relative w-[85%]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-12 w-12 text-sky-600" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {quizTitle}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {userRole === "student" && userName
                    ? isNewUser
                      ? `Welcome, ${userName}!`
                      : `Welcome back, ${userName}!`
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
                  try {
                    sessionStorage.setItem("openLeaderboard", "1")
                  } catch {}
                  try {
                    const evt = new Event("open-leaderboard")
                    window.dispatchEvent(evt)
                  } catch {}
                  router.push("/")
                }}
                title="View leaderboard and rank"
              >
                {rank ? (
                  <>
                    Leaderboard · Rank <span className="font-semibold text-red-600 text-lg">{rank}</span>
                  </>
                ) : (
                  "Leaderboard"
                )}
              </Button>
            )}

            {/* Menu toggle: clicking the three-lines icon will open a slide-out panel with all header actions (except leaderboard) */}
            <div>
              <button
                className="background transform scale-90"
                onClick={() => setMenuOpen((s) => !s)}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                title={menuOpen ? "Close menu" : "Open menu"}
                type="button"
              >
                <div className={`menu__icon ${menuOpen ? "open" : ""}`} aria-hidden>
                  <span />
                  <span />
                  <span />
                </div>
              </button>
            </div>
          </div>
        </div>
        {/* Centered mode pill (absolutely centered over header row) */}
        <div className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 flex justify-center pointer-events-none">
          <div
            aria-live="polite"
            role="status"
            className={`pointer-events-auto min-w-[140px] text-center px-4 py-1 rounded-full text-sm font-medium border ${userRole === 'teacher' ? 'bg-amber-500 text-white border-amber-600' : 'bg-sky-500 text-white border-sky-600'}`}
          >
            {userRole === "teacher" ? "Teacher Mode" : "Student Mode"}
          </div>
        </div>
      </div>
      {/* Slide-out menu panel */}
      <div
        className={`slide-menu ${menuOpen ? "open" : ""}`}
        role="dialog"
        aria-hidden={!menuOpen}
      >
        {/* Close button (top-right) */}
        <div className="absolute top-3 right-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            title="Close menu"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 flex flex-col gap-3">
          {/* Back (if available) */}
          {userRole === "student" && currentStudent && onBackToSelection && (
            <Button variant="ghost" size="sm" onClick={() => { setMenuOpen(false); onBackToSelection && onBackToSelection(); }}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}

          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <div>
              <div className="text-lg font-semibold">{quizTitle}</div>
              <div className="text-sm text-muted-foreground">{userRole === "student" ? "Student Mode" : "Teacher Mode"}</div>
            </div>
          </div>

          <Badge variant={userRole === "student" ? "default" : "secondary"}>
            {userRole === "student" ? "Student Mode" : "Teacher Mode"}
          </Badge>

          {userRole === "student" ? (
            <Button variant="outline" size="sm" onClick={() => { setMenuOpen(false); setPasswordOpen(true); }}>
              Switch to Teacher
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => { setMenuOpen(false); onRoleChange("student"); }}>
              Switch to Student
            </Button>
          )}

          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center"
              onClick={() => {
                try {
                  // Preferred: use next-themes
                  setTheme(theme === "dark" ? "light" : "dark")
                } catch (e) {
                  // Fallback: toggle the html.dark class directly so UI updates immediately
                  // (useful if next-themes isn't mounted yet)
                  try {
                    // eslint-disable-next-line no-console
                    console.debug('setTheme failed, falling back to toggling html.dark', e)
                    const el = document.documentElement
                    if (el.classList.contains('dark')) el.classList.remove('dark')
                    else el.classList.add('dark')
                  } catch (err) {
                    // eslint-disable-next-line no-console
                    console.error('Fallback theme toggle failed', err)
                  }
                }
              }}
            >
              Appearance: {typeof theme === 'string' ? (theme === 'dark' ? 'Dark' : 'Light') : 'Toggle'}
            </Button>

            <div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setMenuOpen(false)
                  setIsEditProfileOpen(true)
                }}
              >
                <User className="h-4 w-4 mr-2" />
                Edit profile
              </Button>
            </div>
          </div>

          <div>
            <Button variant="destructive" className="w-full" onClick={() => { setMenuOpen(false); handleSignOut(); }}>
              Sign out
            </Button>
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
            <Button variant="outline" onClick={() => setPasswordOpen(false)}>
              Cancel
            </Button>
            <Button onClick={verifyPassword} disabled={checking}>
              {checking ? "Checking..." : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      

      {/* Edit Profile Dialog */}
      <UserProfileEdit
        isOpen={isEditProfileOpen}
        onOpenChange={setIsEditProfileOpen}
        userName={userName || ""}
        onNameUpdate={onNameUpdate || (() => {})}
        onSignOut={handleSignOut}
      />
    </header>
  )
}
