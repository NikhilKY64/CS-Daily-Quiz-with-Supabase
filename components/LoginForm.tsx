import { useState, useEffect } from "react"
import { supabase, signUpUser, signInUser, signInWithGitHub, resetPassword, addStudent, createProfile } from "@/lib/supabaseClient"
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

  // Check if email exists in Supabase Auth
  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      // We'll attempt to sign in with an invalid password to check if the email exists
      // Supabase will return a specific error for invalid credentials vs non-existent user
      const { error } = await supabase.auth.signInWithPassword({ 
        email, 
        password: 'checkingIfEmailExists' 
      })
      
      // If error message contains 'Invalid login credentials', the email exists
      // If it contains 'Email not confirmed', the email exists but isn't confirmed
      return Boolean(error?.message?.includes('Invalid login credentials')) ||
             error?.message?.includes('Email not confirmed')
    } catch (e) {
      console.error('Error checking email existence:', e)
      return false
    }
  }

  const handleSignUp = async () => {
    setLoading(true)
    setStatus("Signing up...")
    
    try {
      // First check if email already exists
      const emailExists = await checkEmailExists(email)
      
      if (emailExists) {
        setStatus("This email is already registered. Please log in instead.")
        setLoading(false)
        return
      }
      
      // If email doesn't exist, proceed with signup
      await signUpUser(email, password)
      setStatus("To confirm your email, check your inbox.")
      // If confirmation is disabled, session may be active immediately
      await afterAuthSuccess(true) // Pass true to indicate this is a new user
    } catch (e: any) {
      setStatus(`Signup error: ${e.message}`)
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
      <CardContent className="space-y-4">
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
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        <div className="flex justify-center">
           <Button 
             variant="outline" 
             className="w-full" 
             type="button"
             onClick={async () => {
               try {
                 setLoading(true);
                 setStatus("Redirecting to GitHub...");
                 await signInWithGitHub();
                 // Note: No need to call afterAuthSuccess here as the page will redirect to GitHub
               } catch (e: any) {
                 setStatus(`GitHub sign in error: ${e.message}`);
                 setLoading(false);
               }
             }}
             disabled={loading}
           >
             <Github className="mr-2 h-4 w-4" /> Continue with GitHub
           </Button>
         </div>
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
      </CardFooter>
    </Card>
  )
}
