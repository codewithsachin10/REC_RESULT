"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2, ArrowLeft } from "lucide-react";
import { verifyTelegramOTP } from "@/app/actions/twoFactorActions";
import { createClient } from "@/lib/supabase/client";

export default function Verify2FAPage() {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Basic check to see if they came from login
    const pendingId = localStorage.getItem("pending_student_id");
    if (!pendingId) {
      router.replace("/login");
    }
  }, [router]);

  const handleChange = (index: number, value: string) => {
    if (!/^[0-9]*$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value !== "" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && code[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }

    setLoading(true);
    setError("");

    const result = await verifyTelegramOTP(fullCode);
    
    if (result.success) {
      // Complete login process
      const supabase = createClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", localStorage.getItem("pending_student_id"))
        .single();
        
      if (profile) {
        localStorage.setItem('student_id', profile.id);
        localStorage.setItem('student_name', profile.name);
        localStorage.setItem('student_roll', profile.roll_number || '');
        localStorage.setItem('student_dept', profile.department || '');
        localStorage.setItem('student_year', profile.year?.toString() || '');
        localStorage.removeItem("pending_student_id");
        router.push("/dashboard");
      }
    } else {
      setError(result.error || "Verification failed");
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
    setLoading(false);
  };

  const goBack = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    localStorage.removeItem("pending_student_id");
    router.push("/login");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] font-sans p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border-[3px] border-slate-900 shadow-[8px_8px_0_0_#0f172a] p-8 overflow-hidden relative">
        <button 
          onClick={goBack}
          className="absolute top-6 left-6 text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center text-center mt-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center border-[3px] border-blue-900 shadow-[4px_4px_0_0_#1e3a8a] mb-6">
            <ShieldCheck className="w-8 h-8 text-blue-700" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Two-Step Verification</h2>
          <p className="text-sm font-bold text-slate-500 mb-8 max-w-xs">
            We've sent a 6-digit verification code to your connected Telegram account.
          </p>

          <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
            <div className="flex gap-2 sm:gap-3 justify-center w-full mb-6">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-black text-slate-900 bg-slate-50 border-[3px] border-slate-300 rounded-xl focus:border-blue-600 focus:ring-0 outline-none shadow-[2px_2px_0_0_#94a3b8] transition-all"
                />
              ))}
            </div>

            {error && (
              <p className="text-red-600 font-bold text-sm mb-6 bg-red-100 px-4 py-2 rounded-lg border-2 border-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || code.join("").length !== 6}
              className="w-full py-4 bg-blue-600 text-white font-black rounded-xl border-[3px] border-blue-900 shadow-[4px_4px_0_0_#1e3a8a] hover:bg-blue-700 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Verify Identity"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
