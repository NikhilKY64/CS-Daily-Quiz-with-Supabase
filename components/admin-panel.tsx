"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminPanel(): JSX.Element {
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [viewerIsAdmin, setViewerIsAdmin] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Before loading profiles, confirm current viewer is admin
    ;(async () => {
      try {
        const { getCurrentUser, getProfile } = await import('@/lib/supabaseClient')
        const authUser = await getCurrentUser()
        if (!authUser || !authUser.id) {
          setViewerIsAdmin(false)
          return
        }
        const profile = await getProfile(authUser.id)
        const ok = !!(profile && profile.is_admin)
        setViewerIsAdmin(ok)
        if (ok) await loadProfiles()
      } catch (err) {
        console.error('Failed to check admin status', err)
        setViewerIsAdmin(false)
      }
    })()
  }, [])

  async function loadProfiles() {
    setLoading(true)
    try {
      const client = await import('@/lib/supabaseClient')
      // Load both all profiles (for admin flag management) and pending profiles
      const [list, pending] = await Promise.all([client.getAllProfiles(), client.getPendingProfiles()])
      // Merge pending_name into the main list for display
      const map = new Map((list || []).map((p: any) => [p.id, p]))
      ;(pending || []).forEach((p: any) => {
        const existing = map.get(p.id) || {}
        map.set(p.id, { ...existing, ...p })
      })
      setProfiles(Array.from(map.values()))
    } catch (err) {
      console.error('Failed to load profiles for admin panel', err)
      setProfiles([])
    } finally {
      setLoading(false)
    }
  }

  async function toggleAdmin(id: string, current: boolean) {
    setError(null)
    // optimistic update
    const previous = profiles
    setProfiles((p: any[]) => p.map((x) => (x.id === id ? { ...x, is_admin: !current } : x)))
    try {
      const { updateAdminFlag } = await import('@/lib/supabaseClient')
      const res = await updateAdminFlag(id, !current)
      if (!res) throw new Error('No response from server')
    } catch (err: any) {
      console.error('Failed to toggle admin flag', err)
      setError(err?.message || 'Failed to update admin flag')
      // rollback
      setProfiles(previous)
    }
  }

  async function approve(id: string) {
    setError(null)
    const previous = profiles
    setProfiles((p: any[]) => p.map(x => x.id === id ? { ...x, pending_name: null, name: x.pending_name } : x))
    try {
      const { approvePendingName } = await import('@/lib/supabaseClient')
      await approvePendingName(id)
    } catch (err: any) {
      console.error('Failed to approve pending name', err)
      setError(err?.message || 'Failed to approve')
      setProfiles(previous)
    }
  }

  async function reject(id: string) {
    setError(null)
    const previous = profiles
    setProfiles((p: any[]) => p.map(x => x.id === id ? { ...x, pending_name: null } : x))
    try {
      const { rejectPendingName } = await import('@/lib/supabaseClient')
      await rejectPendingName(id)
    } catch (err: any) {
      console.error('Failed to reject pending name', err)
      setError(err?.message || 'Failed to reject')
      setProfiles(previous)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Admins</CardTitle>
      </CardHeader>
      <CardContent>
        {viewerIsAdmin === null ? (
          <p>Checking permissions...</p>
        ) : viewerIsAdmin === false ? (
          <p className="text-sm text-muted-foreground">You are not authorized to manage admins.</p>
        ) : loading ? (
          <p>Loading...</p>
        ) : (
          <div className="space-y-2">
            {error && <p className="text-sm text-destructive">{error}</p>}
            {profiles.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.name || p.id}</div>
                  <div className="text-sm text-muted-foreground">{p.email || ''}</div>
                  {p.pending_name ? (
                    <div className="text-sm text-foreground">Pending: &quot;{p.pending_name}&quot;</div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {p.pending_name ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => approve(p.id)}>Approve</Button>
                      <Button variant="ghost" size="sm" onClick={() => reject(p.id)}>Reject</Button>
                    </>
                  ) : (
                    <>
                      <label className="text-sm">Admin</label>
                      <input
                        type="checkbox"
                        checked={!!p.is_admin}
                        onChange={() => toggleAdmin(p.id, !!p.is_admin)}
                      />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
