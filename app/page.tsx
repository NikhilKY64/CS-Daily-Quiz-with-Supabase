"use client"

import { useEffect, useState } from "react"
import { AppHeader } from "@/components/app-header"
import { StudentDashboard } from "@/components/student-dashboard"
import { TeacherDashboard } from "@/components/teacher-dashboard"
import type { StudentProgress } from "@/lib/student-storage"
import LoginForm from "@/components/LoginForm"
import { supabase } from "@/lib/supabaseClient"
import { getProfile } from "@/lib/supabaseClient"

type UserRole = "student" | "teacher"

export default function HomePage() {
  const [userRole, setUserRole] = useState<UserRole>("student")
  const [quizTitle, setQuizTitle] = useState("CS Daily MCQ Quiz")
  const [user, setUser] = useState<any>(null)
  const [userName, setUserName] = useState<string>("") 
  const [isNewUser, setIsNewUser] = useState<boolean>(false)

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUser(user)
          // Get user profile
          const profile = await getProfile(user.id)
          if (profile) {
            setUserName(profile.name)
            
            // Check if user is new (created today)
            if (profile.created_at) {
              const createdDate = new Date(profile.created_at).toDateString()
              const today = new Date().toDateString()
              setIsNewUser(createdDate === today)
            }
          }
        }
      } catch (error) {
        console.error('Error initializing user:', error)
      }
    }
    init()
    
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      
      if (currentUser) {
        // Get user profile on auth state change
        try {
          const profile = await getProfile(currentUser.id)
          if (profile) {
            setUserName(profile.name)
            
            // Check if user is new
            if (profile.created_at) {
              const createdDate = new Date(profile.created_at).toDateString()
              const today = new Date().toDateString()
              setIsNewUser(createdDate === today)
            }
          }
        } catch (error) {
          console.error('Error getting user profile:', error)
        }
      }
    })
    
    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="container mx-auto px-4 py-8">
          <LoginForm onLogin={(u) => setUser(u)} />
        </main>
      </div>
    )
  }

  // Get greeting message
  const greeting = isNewUser ? `Welcome, ${userName}!` : `Welcome back, ${userName}!`

  // Handle username update
  const handleNameUpdate = (newName: string) => {
    setUserName(newName)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader
        userRole={userRole}
        onRoleChange={setUserRole}
        quizTitle={quizTitle}
        onTitleChange={setQuizTitle}
        userName={userName}
        isNewUser={isNewUser}
        onNameUpdate={handleNameUpdate}
      />

      <main className="container mx-auto px-4 py-8 bg-background">
        {userRole === "student" ? (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-foreground">{greeting}</h2>
              <p className="text-muted-foreground">Ready for today's challenge?</p>
            </div>
            <StudentDashboard quizTitle={quizTitle} />
          </div>
        ) : (
          <TeacherDashboard quizTitle={quizTitle} onTitleChange={setQuizTitle} />
        )}
      </main>
    </div>
  )
}
