import { useState, useEffect } from "react"
import { supabase, signUpUser, signInUser, resetPassword, addStudent, createProfile } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/card"
import { Github, Mail, Lock, User } from "lucide-react"

export default function LoginForm({ onLogin }: { onLogin?: (user: any) => void }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  const afterAuthSuccess = async (isNewUser = false) => {
    try {
      // Get current user
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData?.session?.user ?? null
      
      if (user) {
        // Create profile for new users
        if (isNewUser && name) {
          try {
            await createProfile(user.id, name)
          } catch (e: any) {
            // Profile might already exist, ignore error
            console.log('Profile creation note:', e.message)
          }
        }
        
        // Store email in localStorage if rememberMe is checked
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email)
        } else {
          localStorage.removeItem('rememberedEmail')
        }

        // Legacy: Ensure a student record exists (best-effort)
        if (name && email) {
          try {
            await addStudent(name, email)
          } catch (_e) {
            // ignore duplicates or RLS errors silently for now
          }
        }
        
        // Notify parent component
        if (onLogin) onLogin(user)
      }
    } catch (e: any) {
      setStatus(`Post-auth error: ${e.message}`)
    }
  }

  const handleSignUp = async () => {
    setLoading(true)
    setStatus("Signing up...")
    
    try {
      await signUpUser(email, password)
      setStatus("To confirm your email, check your inbox.")
      // If confirmation is disabled, session may be active immediately
      await afterAuthSuccess(true) // Pass true to indicate this is a new user
    } catch (e: any) {
      // Handle duplicate email and other common cases
      if (e.message && (e.message.includes('already registered') || e.message.includes('User already registered'))) {
        setStatus('This email is already registered. Please log in instead.')
      } else if (e.message && e.message.includes('Password should be at least')) {
        setStatus('Password is too short.')
      } else {
        setStatus(`Signup error: ${e.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async () => {
    setLoading(true)
    setStatus("Signing in...")
    try {
      await signInUser(email, password)
      setStatus("Signed in successfully")
      await afterAuthSuccess(false) // Pass false to indicate this is an existing user
    } catch (e: any) {
      // Provide a more user-friendly error message
      if (e.message.includes('Invalid login credentials')) {
        setStatus('Invalid email or password. Please try again.')
      } else if (e.message.includes('Email not confirmed')) {
        setStatus('Please confirm your email before logging in.')
      } else {
        setStatus(`Sign in error: ${e.message}`)
      }
    } finally {
      setLoading(false)
    }
  }
  
  // Load remembered email on component mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail')
    if (rememberedEmail) {
      setEmail(rememberedEmail)
      setRememberMe(true)
    }
  }, [])

  return (
    <Card className="max-w-md mx-auto mt-10 shadow-lg border-opacity-50">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          {isSignUp ? "Create an account" : "Welcome back"}
        </CardTitle>
        <CardDescription className="text-center">
          {isSignUp 
            ? "Enter your information to create an account" 
            : "Enter your correct details to sign."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Social login buttons */}
        <div className="space-y-3">
          <button
            type="button"
            className="w-full inline-flex items-center justify-center gap-2 rounded-md border bg-white px-4 py-2 text-sm font-medium text-black shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            onClick={async () => {
              try {
                setLoading(true)
                setStatus("Redirecting to Google...")
                await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: { redirectTo: window.location.origin }
                })
              } catch (e: any) {
                setStatus(`Google sign in error: ${e.message}`)
                setLoading(false)
              }
            }}
            disabled={loading}
          >
            {/* Google "G" logo */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.813 31.91 29.274 35 24 35c-7.18 0-13-5.82-13-13s5.82-13 13-13c3.31 0 6.32 1.235 8.605 3.26l5.657-5.657C34.943 3.053 29.73 1 24 1 11.85 1 2 10.85 2 23s9.85 22 22 22 22-9.85 22-22c0-1.467-.153-2.9-.389-4.283z"/>
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.818C14.485 16.062 18.873 13 24 13c3.31 0 6.32 1.235 8.605 3.26l5.657-5.657C34.943 3.053 29.73 1 24 1 15.317 1 7.9 5.658 6.306 14.691z"/>
              <path fill="#4CAF50" d="M24 45c5.197 0 9.86-1.977 13.403-5.197l-6.188-5.238C29.01 36.484 26.648 37 24 37c-5.245 0-9.698-3.36-11.29-8.032l-6.52 5.02C8.741 40.798 15.78 45 24 45z"/>
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.301 3.91-5.84 7-11.303 7-5.245 0-9.698-3.36-11.29-8.032l-6.52 5.02C8.741 40.798 15.78 45 24 45c12.15 0 22-9.85 22-22 0-1.467-.153-2.9-.389-4.283z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <button
            type="button"
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-primary/20"
            onClick={async () => {
              try {
                setLoading(true)
                setStatus("Redirecting to GitHub...")
                await supabase.auth.signInWithOAuth({
                  provider: 'github',
                  options: { redirectTo: window.location.origin }
                })
              } catch (e: any) {
                setStatus(`GitHub sign in error: ${e.message}`)
                setLoading(false)
              }
            }}
            disabled={loading}
          >
            <Github className="h-4 w-4" />
            <span>Continue with GitHub</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>

        {isSignUp && (
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <div className="flex items-center space-x-2 border rounded-md focus-within:ring-2 focus-within:ring-primary/20">
              <User className="ml-2 h-5 w-5 text-muted-foreground" />
              <Input
                id="name"
                placeholder="Your Name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                required
              />
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="flex items-center space-x-2 border rounded-md focus-within:ring-2 focus-within:ring-primary/20">
            <Mail className="ml-2 h-5 w-5 text-muted-foreground" />
            <Input
              id="email"
              placeholder="abc@gmail.com"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            {!isSignUp && (
              <a 
                href="#" 
                className="text-sm text-primary hover:underline"
                onClick={async (e) => {
                  e.preventDefault()
                  if (!email) {
                    setStatus("Please enter your email address first.")
                    return
                  }
                  try {
                    setLoading(true)
                    setStatus("Sending password reset email...")
                    await resetPassword(email)
                    setStatus("Password reset email sent. Please check your inbox.")
                  } catch (e: any) {
                    setStatus(`Password reset error: ${e.message}`)
                  } finally {
                    setLoading(false)
                  }
                }}
              >
                Forgot password?
              </a>
            )}
          </div>
          <div className="flex items-center space-x-2 border rounded-md focus-within:ring-2 focus-within:ring-primary/20">
            <Lock className="ml-2 h-5 w-5 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder={isSignUp ? "Create a password" : "Enter your password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              required
            />
          </div>
        </div>
        {!isSignUp && (
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="remember" 
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
            />
            <Label 
              htmlFor="remember"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Remember me
            </Label>
          </div>
        )}
        <Button 
          className="w-full" 
          onClick={isSignUp ? handleSignUp : handleSignIn}
          disabled={loading}
        >
          {loading ? "Processing..." : isSignUp ? "Create Account" : "Sign In"}
        </Button>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <div className="text-sm text-center text-muted-foreground min-h-5">
          {status && (
            <div className={`p-2 rounded ${status.includes('error') || status.includes('Invalid') ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
              {status}
            </div>
          )}
        </div>
        <div className="text-sm text-center">
          {isSignUp ? (
            <>
              Already have an account?{" "}
              <a 
                href="#" 
                className="text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault()
                  setIsSignUp(false)
                }}
              >
                Sign in
              </a>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <a 
                href="#" 
                className="text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault()
                  setIsSignUp(true)
                }}
              >
                Sign up
              </a>
            </>
          )}
        </div>
        <div className="text-xs text-center text-muted-foreground">
          Need help? <a href="mailto:support@example.com" className="underline underline-offset-2">Contact support</a>
        </div>
      </CardFooter>
    </Card>
  )
}
