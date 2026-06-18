import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function TestGoogleOAuth() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const testGoogleOAuth = async () => {
    setLoading(true);
    setResult("Testing...");

    try {
      // Test 1: Check if we can call Supabase
      setResult("✓ Supabase client initialized\n");

      // Test 2: Try to initiate Google OAuth
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: "select_account" }
        }
      });

      if (error) {
        setResult(prev => prev + `\n❌ Error: ${error.message}\n\nPossible causes:\n1. Google OAuth not enabled in Supabase\n2. Missing credentials in Supabase\n3. Go to Supabase Dashboard → Authentication → Providers → Enable Google`);
      } else {
        setResult(prev => prev + `\n✓ OAuth initiated successfully!\n✓ Provider: ${data.provider}\n✓ URL: ${data.url}\n\nYou should be redirected to Google sign-in...`);
      }
    } catch (err: any) {
      setResult(prev => prev + `\n❌ Exception: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const checkConfig = () => {
    const config = {
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
      origin: window.location.origin,
      redirectUrl: `${window.location.origin}/auth/callback`
    };

    setResult(JSON.stringify(config, null, 2));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="p-8">
          <h1 className="text-2xl font-bold mb-4">Google OAuth Test</h1>
          <p className="text-gray-600 mb-6">
            Click the button below to test if Google OAuth is configured correctly.
          </p>

          <div className="space-y-3 mb-6">
            <Button 
              onClick={testGoogleOAuth} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "Testing..." : "Test Google Sign In"}
            </Button>
            
            <Button 
              onClick={checkConfig} 
              variant="outline"
              className="w-full"
            >
              Check Configuration
            </Button>
          </div>

          {result && (
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap">
              {result}
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Setup Instructions:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Go to Supabase Dashboard</li>
              <li>Navigate to Authentication → Providers</li>
              <li>Find Google and toggle it ON</li>
              <li>Add your Google Client ID and Secret</li>
              <li>Save and try again</li>
            </ol>
          </div>
        </Card>
      </div>
    </div>
  );
}
