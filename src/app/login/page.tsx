"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, ArrowRight, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("from") || "/dashboard";

  const [email, setEmail] = useState("admin@loadtrack.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl,
      });

      if (res?.error) {
        setError("Invalid email or password");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Visual Identity Section */}
      <div className="hidden lg:flex flex-col relative bg-slate-900 border-r border-slate-800 text-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-900/50 via-slate-900 to-black pointer-events-none" />
          <svg className="absolute w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)" />
          </svg>
          <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-indigo-600 rounded-full blur-[128px] opacity-20" />
          <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-emerald-600 rounded-full blur-[128px] opacity-20" />
        </div>
        
        <div className="relative z-10 p-12 flex flex-col h-full justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600/30 ring-1 ring-indigo-500/50 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.5)]">
               <Activity className="h-6 w-6 text-indigo-400" />
            </div>
            <span className="text-xl font-bold tracking-tight">LoadTrack Rugby</span>
          </div>
          
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter leading-tight">
              Smarter workload.<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-300">
                Better performance.
              </span>
            </h1>
            <p className="text-lg text-slate-300 max-w-md leading-relaxed">
              Automate your GPS data processing, identify injury risks instantly, and optimize training cycles natively.
            </p>
            <div className="flex items-center gap-4 pt-4">
              <div className="flex -space-x-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden`}>
                    <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=Staff${i}&backgroundColor=transparent`} alt="avatar" />
                  </div>
                ))}
              </div>
              <p className="text-sm font-medium text-slate-400">Trusted by top-tier coaching teams</p>
            </div>
          </div>
        </div>
      </div>

      {/* Login Form Section */}
      <div className="flex items-center justify-center p-8 bg-white relative">
        <div className="absolute top-8 left-8 lg:hidden flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
            <Activity className="h-5 w-5 text-indigo-600" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">LoadTrack</span>
        </div>

        <div className="w-full max-w-[420px] space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back</h2>
            <p className="text-slate-500 text-sm">Enter your credentials to access your dashboard</p>
          </div>

          <div className="space-y-6">
            <Button
              variant="outline"
              type="button"
              className="w-full relative h-12 flex items-center justify-center gap-2 overflow-hidden bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-medium transition-all group"
              onClick={() => {
                setGoogleLoading(true);
                signIn("google", { callbackUrl });
              }}
              disabled={loading || googleLoading}
            >
              {googleLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-slate-900" />
              ) : (
                <>
                  <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-medium">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg text-sm text-center font-medium animate-in fade-in zoom-in duration-300">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-medium">Email address</Label>
                <div className="relative group/input">
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@example.com" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 shadow-sm transition-all border-slate-200 group-focus-within/input:ring-indigo-500 group-focus-within/input:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                  <a href="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                    Forgot password?
                  </a>
                </div>
                <div className="relative group/input">
                  <Input 
                    id="password" 
                    type="password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 shadow-sm transition-all border-slate-200 group-focus-within/input:ring-indigo-500 group-focus-within/input:border-indigo-500"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] transition-all hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] flex items-center justify-center gap-2 group" 
                disabled={loading || googleLoading}
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white" />
                ) : (
                  <>
                    Sign in to your account
                    <ArrowRight className="h-4 w-4 opacity-70 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </div>
          
          <div className="pt-6 border-t border-slate-100 flex flex-col items-center">
            <p className="text-xs text-slate-500 mb-3 text-center">Development Environment Setup Tools</p>
            <Button 
              type="button" 
              variant="secondary" 
              size="sm"
              className="text-xs font-medium px-4 py-2 border border-slate-200 shadow-sm"
              onClick={() => {
                fetch('/api/seed').then(() => alert('Test admin seeded! Click "Sign in" mapped to admin@loadtrack.com.'));
              }}
            >
              Seed Admin Data
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
