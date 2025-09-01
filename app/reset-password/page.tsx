'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';
import { Lock } from 'lucide-react';

function ResetPasswordContent() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract the hash fragment from the URL which contains the access token
  useEffect(() => {
    // The hash fragment is available in the URL after Supabase redirects back
    const handleHashFragment = async () => {
      const hashFragment = window.location.hash;
      if (hashFragment) {
        try {
          // The hash contains the access token and other info
          // Supabase client will automatically handle this
          const { data, error } = await supabase.auth.refreshSession();
          
          if (error) {
            setStatus(`Error: ${error.message}`);
          } else if (data) {
            setStatus('Ready to set new password');
          }
        } catch (e) {
          console.error('Error processing hash fragment:', e);
          setStatus('Error processing authentication data');
        }
      }
    };

    handleHashFragment();
  }, []);

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      setStatus('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setStatus('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setStatus('Updating password...');

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        setStatus(`Error: ${error.message}`);
      } else {
        setStatus('Password updated successfully!');
        // Redirect to home page after 2 seconds
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-md mx-auto shadow-lg border-opacity-50">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Reset Your Password</CardTitle>
          <CardDescription className="text-center">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="flex items-center space-x-2 border rounded-md focus-within:ring-2 focus-within:ring-primary/20">
              <Lock className="ml-2 h-5 w-5 text-muted-foreground" />
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <div className="flex items-center space-x-2 border rounded-md focus-within:ring-2 focus-within:ring-primary/20">
              <Lock className="ml-2 h-5 w-5 text-muted-foreground" />
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                required
              />
            </div>
          </div>
          <Button 
            className="w-full" 
            onClick={handleResetPassword}
            disabled={loading}
          >
            {loading ? "Processing..." : "Reset Password"}
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground min-h-5">
            {status && (
              <div className={`p-2 rounded ${status.includes('Error') ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                {status}
              </div>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}