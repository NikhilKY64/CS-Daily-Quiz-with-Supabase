"use client"

import { useEffect, useState } from 'react'
import { supabase, signOutUser, saveQuizResult, getQuizResults, testSupabaseConnection } from '@/lib/supabaseClient.mjs'
import LoginForm from '@/components/LoginForm'
import { UploadMonitor } from '@/components/upload-monitor'

async function saveNameToProfile(userId: string, name: string) {
  // Save the user's name to the 'profiles' table in Supabase
  if (!name) return
  await supabase.from('profiles').upsert({ id: userId, name })
}

export default function SupabaseDemoPage() {
  const [user, setUser] = useState<any>(null)
  const [status, setStatus] = useState("")
  const [results, setResults] = useState([])
  const [connectionStatus, setConnectionStatus] = useState("")

  useEffect(() => {
    // Test Supabase connection on component mount
    testSupabaseConnection().then(result => {
      setConnectionStatus(result.success ? "✅ Connected" : `❌ Connection failed: ${result.error}`)
    })

    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null))
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        // Profile is now managed directly through Supabase
        // No need to use localStorage for user_name
      }
    })
    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    setStatus('Signing out...')
    try {
      await signOutUser()
      setStatus('Signed out')
    } catch (e: any) {
      setStatus(`Sign out error: ${e.message}`)
    }
  }

  const handleSaveResult = async () => {
    if (!user) {
      setStatus('Please sign in first')
      return
    }
    setStatus('Saving result...')
    try {
      await saveQuizResult(user.id, 4, 5)
      setStatus('Saved quiz result 4/5')
    } catch (e: any) {
      setStatus(`Save error: ${e.message}`)
    }
  }

  const handleLoadResults = async () => {
    if (!user) {
      setStatus('Please sign in first')
      return
    }
    setStatus('Loading results...')
    try {
      const data = await getQuizResults(user.id)
      setResults(data || [])
      setStatus('Loaded results')
    } catch (e: any) {
      setStatus(`Load error: ${e.message}`)
    }
  }

  if (!user) {
    return (
      <main className="container mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold">Supabase Demo Login</h1>
        <LoginForm onLogin={setUser} />
      </main>
    )
  }

  return (
    <main className="container mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Supabase Demo</h1>
      <div className="p-3 bg-gray-100 rounded">
        <strong>Connection Status:</strong> {connectionStatus}
      </div>
      <button className="border px-3 py-1 mb-4" onClick={handleSignOut}>Sign Out</button>
      <div className="flex gap-2">
        <button className="border px-3 py-1" onClick={handleSaveResult}>Save 4/5</button>
        <button className="border px-3 py-1" onClick={handleLoadResults}>Load Results</button>
      </div>
      <pre className="whitespace-pre-wrap text-sm opacity-80">{status}</pre>
      <div>
        <h2 className="font-semibold">Current User</h2>
        <pre className="bg-muted/50 p-2 rounded text-xs">{JSON.stringify(user, null, 2)}</pre>
      </div>
      <div>
        <h2 className="font-semibold">Quiz Results</h2>
        <ul className="list-disc pl-6">
          {results?.map((r: any) => (
            <li key={r.id}>
              Score: {r.score}/{r.total} — {new Date(r.created_at).toLocaleString()}
            </li>
          ))}
        </ul>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Question Upload Monitor</h2>
        <UploadMonitor />
      </div>
    </main>
  )
}