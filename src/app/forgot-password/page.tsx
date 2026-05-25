"use client";

import { useState } from "react";
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const supabase = createClient();
    
    // We send the user an email with a reset link.
    // That link will point to /auth/callback which will exchange the code for a session
    // and redirect them to /update-password.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });

    if (error) {
      console.error("Reset error:", error);
      setErrorMsg(error.message);
      setStatus("error");
    } else {
      setStatus("success");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] font-sans p-4 sm:p-8 relative">
      
      {/* Back Button */}
      <div className="absolute top-6 left-6 sm:top-12 sm:left-12 z-20">
        <Link 
          href="/login" 
          className="flex items-center gap-2 font-black text-slate-900 bg-white border-[3px] border-slate-900 px-4 py-2 rounded-xl shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0f172a] transition-all"
        >
          <ArrowLeft className="w-5 h-5" /> Back to Login
        </Link>
      </div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] mb-6">
            <Mail className="h-8 w-8 text-blue-700" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Forgot Password?</h2>
          <p className="text-slate-500 font-bold">No worries. Enter your official email and we'll send you a reset link.</p>
        </div>

        <div className="rounded-3xl border-[3px] border-slate-900 bg-white p-8 shadow-[8px_8px_0_0_#0f172a]">
          
          {status === "success" ? (
            <div className="text-center animate-in fade-in zoom-in-95">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 border-[3px] border-emerald-600 mb-6">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Check your inbox</h3>
              <p className="text-slate-600 font-bold mb-6">
                We sent a secure password reset link to <br/><span className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md inline-block mt-1 border-2 border-slate-200">{email}</span>
              </p>
              <Link 
                href="/login"
                className="w-full h-14 rounded-xl font-black text-lg border-[3px] border-slate-900 flex items-center justify-center gap-2 transition-all bg-white text-slate-900 shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                Return to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-6">
              
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-900 ml-1 uppercase tracking-wider">College Email</label>
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
                    className="w-full h-14 pl-12 pr-4 rounded-xl border-[3px] border-slate-900 bg-slate-50 font-bold text-slate-900 focus:bg-white focus:outline-none focus:shadow-[4px_4px_0_0_#0f172a] transition-all"
                    required
                  />
                </div>
              </div>

              {status === "error" && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-100 text-red-800 border-[3px] border-red-600 shadow-[4px_4px_0_0_#b91c1c] animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="h-6 w-6 shrink-0 text-red-600" />
                  <span className="text-sm font-black">{errorMsg}</span>
                </div>
              )}

              <button 
                type="submit"
                disabled={status === "loading"}
                className="w-full h-14 rounded-xl font-black text-lg border-[3px] border-slate-900 flex items-center justify-center gap-2 transition-all bg-blue-600 text-white shadow-[6px_6px_0_0_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_0_#0f172a] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Sending Link...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
