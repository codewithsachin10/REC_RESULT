"use client";

import { useState } from "react";
import { 
  Lock, 
  ShieldCheck, 
  LineChart, 
  MessageSquareWarning, 
  BellRing,
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    
    if (!email.endsWith("@rajalakshmi.edu.in")) {
      setStatus("error");
      return;
    }

    const supabase = createClient();
    
    // Attempt login with official Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      const msg = authError?.message || "Invalid credentials";
      console.error("Login failed:", msg);
      setErrorMsg(msg);
      setStatus("error");
      return;
    }

    // After auth succeeds, fetch their profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, roll_number, department, year, role')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile || profile.role !== 'student') {
      console.error("Profile not found or not a student:", profileError);
      setErrorMsg("Profile not found or not a student account.");
      await supabase.auth.signOut();
      setStatus("error");
      return;
    }

    // Check for Two-Factor Authentication via Telegram
    const { data: telegramData } = await supabase
      .from('telegram_users')
      .select('chat_id, two_factor_enabled')
      .eq('student_id', profile.id)
      .single();

    if (telegramData?.two_factor_enabled && telegramData.chat_id) {
      // Send OTP and redirect to verification screen
      const { sendTelegramOTP } = await import('@/app/actions/twoFactorActions');
      const otpResult = await sendTelegramOTP(telegramData.chat_id);
      
      if (otpResult.success) {
        // We still store basic profile data so the verify screen knows who is logging in
        localStorage.setItem('pending_student_id', profile.id);
        router.push("/login/verify");
        return;
      } else {
        // If OTP failed to send, alert user but don't sign them out completely unless strict
        setErrorMsg("Failed to send 2FA code to Telegram. Try again.");
        setStatus("error");
        return;
      }
    }

    // No 2FA required, proceed to normal dashboard login
    localStorage.setItem('student_id', profile.id);
    localStorage.setItem('student_name', profile.name);
    localStorage.setItem('student_roll', profile.roll_number || '');
    localStorage.setItem('student_dept', profile.department || '');
    localStorage.setItem('student_year', profile.year?.toString() || '');
    
    setStatus("success");
    setTimeout(() => {
      router.push("/dashboard");
    }, 1500);
  };

  const handleGoogleLogin = async () => {
    setStatus("loading");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`
      }
    });

    if (error) {
      console.error("Google login failed:", error);
      setErrorMsg(error.message);
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F8FAFC] font-sans overflow-hidden">
      
      {/* Left Side: Branding & Visuals (Neo-Brutalist) */}
      <div className="lg:w-1/2 relative flex flex-col justify-between overflow-hidden bg-blue-300 border-b-[3px] lg:border-b-0 lg:border-r-[3px] border-slate-900 p-8 sm:p-12 lg:p-16">
        
        {/* Top Area */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-900 text-white font-black text-2xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a]">
              R
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">REC Portal</h1>
              <p className="text-xs font-black tracking-wider text-slate-800 uppercase bg-blue-200 inline-block px-2 py-0.5 rounded border-2 border-slate-900 mt-1">Academic Assessment</p>
            </div>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight mb-4 text-slate-900">
            Modern result management <br className="hidden sm:block" />
            <span className="bg-emerald-300 px-2 border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] inline-block mt-2 -rotate-1">
              & issue tracking.
            </span>
          </h2>
          <p className="text-slate-800 text-lg font-bold max-w-md mt-6">
            A premium academic dashboard designed exclusively for REC students and faculty.
          </p>
        </div>

        {/* Center Visuals: Floating Dashboard Mockup */}
        <div className="relative z-10 my-12 flex justify-center">
          <div className="relative w-full max-w-md animate-float">
            {/* Main Mockup Card */}
            <div className="rounded-2xl border-[3px] border-slate-900 bg-white p-6 shadow-[8px_8px_0_0_#0f172a]">
              <div className="flex items-center gap-3 mb-6 border-b-[3px] border-slate-900 pb-4">
                <div className="h-10 w-10 rounded-xl border-2 border-slate-900 bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900">Unit 3 Assessment</h3>
                  <p className="text-xs text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 inline-block mt-1">PASS - Declared</p>
                </div>
              </div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Score</span>
                <span className="text-3xl font-black text-slate-900">84<span className="text-sm text-slate-500">/100</span></span>
              </div>
              <div className="h-4 w-full bg-slate-100 rounded-full border-[3px] border-slate-900 overflow-hidden">
                <div className="h-full bg-emerald-400 w-[84%] border-r-[3px] border-slate-900"></div>
              </div>
            </div>

            {/* Floating Element 1 */}
            <div className="absolute -right-6 -top-6 rounded-xl border-[3px] border-slate-900 bg-amber-200 p-4 shadow-[6px_6px_0_0_#0f172a] flex items-center gap-3 rotate-3 animate-float" style={{ animationDelay: '1s' }}>
              <div className="h-10 w-10 rounded-lg border-2 border-slate-900 bg-amber-50 flex items-center justify-center">
                <MessageSquareWarning className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-900">Query Resolved</p>
                <p className="text-xs font-bold text-slate-700">Marks updated</p>
              </div>
            </div>

            {/* Floating Element 2 */}
            <div className="absolute -left-6 -bottom-6 rounded-xl border-[3px] border-slate-900 bg-indigo-200 p-4 shadow-[6px_6px_0_0_#0f172a] flex items-center gap-3 -rotate-2 animate-float" style={{ animationDelay: '2s' }}>
              <div className="h-10 w-10 rounded-lg border-2 border-slate-900 bg-indigo-50 flex items-center justify-center">
                <BellRing className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-900">Announcement</p>
                <p className="text-xs font-bold text-slate-700">Check dashboard</p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="relative z-10 flex flex-wrap gap-4 mt-auto">
          <div className="flex items-center gap-2 rounded-lg border-[3px] border-slate-900 bg-white px-4 py-2 shadow-[4px_4px_0_0_#0f172a]">
            <LineChart className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-extrabold text-slate-900">Unit-wise Tracking</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border-[3px] border-slate-900 bg-white px-4 py-2 shadow-[4px_4px_0_0_#0f172a]">
            <MessageSquareWarning className="h-5 w-5 text-amber-600" />
            <span className="text-sm font-extrabold text-slate-900">Issue Management</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border-[3px] border-slate-900 bg-white px-4 py-2 shadow-[4px_4px_0_0_#0f172a]">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <span className="text-sm font-extrabold text-slate-900">Secure Access</span>
          </div>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="lg:w-1/2 flex flex-col items-center justify-center p-8 sm:p-12 bg-white relative">
        <div className="w-full max-w-md relative z-10">
          
          <div className="mb-10 text-center">
            <h2 className="text-4xl font-black text-slate-900 mb-2">Welcome Back 👋</h2>
            <p className="text-slate-600 font-bold">Login using your official college email.</p>
          </div>

          {/* Form Card */}
          <div className="rounded-3xl border-[3px] border-slate-900 bg-white p-8 shadow-[8px_8px_0_0_#0f172a]">
            
            {/* Google Login */}
            <button 
              onClick={handleGoogleLogin}
              disabled={status === "loading" || status === "success"}
              className="w-full flex items-center justify-center gap-3 h-14 rounded-xl border-[3px] border-slate-900 bg-slate-50 font-extrabold text-slate-900 shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0f172a] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                <path d="M1 1h22v22H1z" fill="none" />
              </svg>
              Continue with Google
            </button>

            <div className="relative flex items-center py-2 mb-6">
              <div className="flex-grow border-t-[3px] border-slate-900"></div>
              <span className="flex-shrink-0 mx-4 text-sm font-black text-slate-900 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-md border-2 border-slate-900">Or email</span>
              <div className="flex-grow border-t-[3px] border-slate-900"></div>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-900 ml-1">College Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-600" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (status === "error") setStatus("idle");
                    }}
                    placeholder="rollno@rajalakshmi.edu.in"
                    className={`w-full h-14 pl-12 pr-4 rounded-xl border-[3px] font-bold text-slate-900 focus:outline-none transition-colors ${
                      status === "error" ? "border-red-600 bg-red-50 text-red-900" : "border-slate-900 bg-slate-50 focus:bg-white"
                    }`}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-sm font-black text-slate-900">Password</label>
                  <Link href="/forgot-password" className="text-sm font-bold text-blue-700 hover:text-blue-900 underline transition-colors">Forgot Password?</Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-600" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-14 pl-12 pr-12 rounded-xl border-[3px] border-slate-900 bg-slate-50 font-bold text-slate-900 focus:bg-white focus:outline-none transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Validation States */}
              {status === "error" && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-100 text-red-800 border-[3px] border-red-600 shadow-[4px_4px_0_0_#b91c1c] animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="h-6 w-6 shrink-0 text-red-600" />
                  <span className="text-sm font-black">{errorMsg || "Invalid email or password."}</span>
                </div>
              )}

              {status === "success" && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-100 text-emerald-900 border-[3px] border-emerald-600 shadow-[4px_4px_0_0_#059669] animate-in fade-in slide-in-from-top-2">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
                  <div className="flex flex-col">
                    <span className="text-sm font-black">Login successful!</span>
                    <span className="text-xs font-bold text-emerald-700 mt-0.5">Detected: CSBS — 2nd Year</span>
                  </div>
                </div>
              )}

              <button 
                type="submit"
                disabled={status === "loading" || status === "success"}
                className={`w-full h-14 mt-4 rounded-xl font-black text-lg border-[3px] border-slate-900 flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed ${
                  status === "success" 
                    ? "bg-emerald-400 text-slate-900" 
                    : "bg-blue-600 text-white shadow-[6px_6px_0_0_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_0_#0f172a] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none"
                }`}
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Authenticating...
                  </>
                ) : status === "success" ? (
                  <>
                    <CheckCircle2 className="h-6 w-6" />
                    Redirecting...
                  </>
                ) : (
                  "Login to Dashboard"
                )}
              </button>
            </form>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-900 font-extrabold bg-emerald-100 border-[3px] border-slate-900 py-3 px-6 rounded-xl shadow-[4px_4px_0_0_#0f172a] w-max mx-auto">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            Only official REC mail IDs allowed.
          </div>

        </div>

        {/* Tiny Footer */}
        <div className="absolute bottom-6 left-0 right-0 text-center z-10">
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Secure academic portal • REC students</p>
        </div>
      </div>

    </div>
  );
}
