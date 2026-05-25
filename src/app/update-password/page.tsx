"use client";

import { useState, useEffect } from "react";
import { Lock, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Quick check to see if user has an active session
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Not authenticated, redirect to login
        router.replace("/login");
      }
    };
    checkSession();
  }, [router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      setStatus("error");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      setStatus("error");
      return;
    }

    const supabase = createClient();
    
    // Update the password using the established session
    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      console.error("Update error:", error);
      setErrorMsg(error.message);
      setStatus("error");
    } else {
      setStatus("success");
      // Sign out fully so they can log back in securely
      await supabase.auth.signOut();
      setTimeout(() => {
        router.push("/login?message=Password_Updated");
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] font-sans p-4 sm:p-8">
      
      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] mb-6">
            <Lock className="h-8 w-8 text-amber-700" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Set New Password</h2>
          <p className="text-slate-500 font-bold">Please enter your new password below.</p>
        </div>

        <div className="rounded-3xl border-[3px] border-slate-900 bg-white p-8 shadow-[8px_8px_0_0_#0f172a]">
          
          {status === "success" ? (
            <div className="text-center animate-in fade-in zoom-in-95">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 border-[3px] border-emerald-600 mb-6">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Password Updated!</h3>
              <p className="text-slate-600 font-bold mb-6">
                Your password has been changed successfully. You will be redirected to the login page momentarily.
              </p>
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-6">
              
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-900 ml-1 uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-600" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (status === "error") setStatus("idle");
                    }}
                    placeholder="••••••••"
                    className="w-full h-14 pl-12 pr-12 rounded-xl border-[3px] border-slate-900 bg-slate-50 font-bold text-slate-900 focus:bg-white focus:outline-none focus:shadow-[4px_4px_0_0_#0f172a] transition-all"
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

              <div className="space-y-2">
                <label className="text-sm font-black text-slate-900 ml-1 uppercase tracking-wider">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-600" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (status === "error") setStatus("idle");
                    }}
                    placeholder="••••••••"
                    className="w-full h-14 pl-12 pr-12 rounded-xl border-[3px] border-slate-900 bg-slate-50 font-bold text-slate-900 focus:bg-white focus:outline-none focus:shadow-[4px_4px_0_0_#0f172a] transition-all"
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
                disabled={status === "loading" || password === "" || confirmPassword === ""}
                className="w-full h-14 rounded-xl font-black text-lg border-[3px] border-slate-900 flex items-center justify-center gap-2 transition-all bg-emerald-500 text-slate-900 shadow-[6px_6px_0_0_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_0_#0f172a] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
