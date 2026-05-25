"use client";

import { useState, useEffect } from "react";
import { 
  FileCode2, 
  MessageSquareWarning, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Megaphone,
  Sparkles,
  X
} from "lucide-react";
import { ResultModal } from "@/components/dashboard/result-modal";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function DashboardPage() {
  const [selectedResult, setSelectedResult] = useState<any | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showProfileWarning, setShowProfileWarning] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  useEffect(() => {
    if (userProfile) {
      setShowWelcome(true);
      const timer = setTimeout(() => setShowWelcome(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [userProfile]);

  useEffect(() => {
    if (userProfile && !sessionStorage.getItem('hasDismissedProfileWarning')) {
      const missing = [];
      if (!userProfile.roll_number) missing.push('Roll Number');
      if (!userProfile.department) missing.push('Department');
      if (!userProfile.year) missing.push('Year');
      if (!userProfile.semester) missing.push('Semester');
      if (!userProfile.section) missing.push('Section');
      if (!userProfile.batch) missing.push('Batch');
      if (!userProfile.telegram_chat_id) missing.push('Telegram Connection');
      
      if (missing.length > 0) {
        setMissingFields(missing);
        setShowProfileWarning(true);
      }
    }
  }, [userProfile]);

  useEffect(() => {
    const fetchResults = async () => {
      setIsLoading(true);
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const student_id = userData.user?.id;
      
      if (!student_id) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('marks')
        .select('*')
        .eq('student_id', student_id);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', student_id)
        .single();
        
      const { data: telegramData } = await supabase
        .from('telegram_users')
        .select('chat_id')
        .eq('student_id', student_id)
        .single();
        
      if (profileData) {
        setUserProfile({
          ...profileData,
          telegram_chat_id: telegramData?.chat_id || null
        });
      }

      const { data: retestsData } = await supabase
        .from('retests')
        .select('*')
        .eq('student_id', student_id);

      const { data: topicsData } = await supabase.from('unit_topics').select('*');
      const topicsMap: Record<string, string> = {};
      if (topicsData) {
        topicsData.forEach((row: any) => {
          topicsMap[row.id] = row.topics;
        });
      }

      if (error) {
        console.error("Error fetching marks:", error);
      } else if (data) {
        const formatted: any[] = [];
        data.forEach((m: any) => {
          // Determine the highest unit that has a non-zero score or a breakdown
          let maxDeclaredUnit = 0;
          for (let i = 5; i >= 1; i--) {
            const unitKey = `unit_test_${i}`;
            const score = m[unitKey];
            const hasBreakdown = m.breakdown && m.breakdown[unitKey] && Object.keys(m.breakdown[unitKey]).length > 0;
            
            if (score > 0 || hasBreakdown) {
              maxDeclaredUnit = i;
              break;
            }
          }

          // Only display units up to the max declared unit
          for (let i = 1; i <= maxDeclaredUnit; i++) {
            const unitKey = `unit_test_${i}`;
            const isPython = m.subject_name.toLowerCase().includes("python");
            const subjectCode = isPython ? "CS302" : "CS301";
            const topicKey = `${subjectCode}-${unitKey}`;

            const retest = (retestsData || []).find((r: any) => r.mark_id === m.id && r.unit_key === unitKey);

            formatted.push({
              id: `${m.id}-u${i}`,
              mark_id: m.id,
              subjectCode,
              subject: m.subject_name,
              unit: `Unit ${i}`,
              unitKey,
              score: m[unitKey] || 0,
              total: isPython ? 50 : 100,
              status: m.status ? m.status.toUpperCase() : "PUBLISHED",
              breakdown: m.breakdown?.[unitKey] || {},
              remarks: "Results published by faculty.",
              topics: topicsMap[topicKey] || "",
              retest: retest || null
            });
          }
        });
        setResults(formatted);
      }

      // Fetch latest announcements for marquee
      const { data: annData } = await supabase
        .from('announcements')
        .select('title')
        .order('created_at', { ascending: false })
        .limit(3);
        
      if (annData && annData.length > 0) {
        setAnnouncements(annData.map(a => a.title));
      }

      setIsLoading(false);
    };

    fetchResults();
  }, []);

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-12 relative">
      
      {/* Welcome Toast Notification */}
      {showWelcome && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:bottom-6 sm:right-6 z-50 animate-slide-up">
          <div className="bg-white border-[3px] border-slate-900 rounded-2xl p-4 pr-10 sm:pr-12 shadow-[4px_4px_0_0_#0f172a] sm:shadow-[6px_6px_0_0_#0f172a] relative">
            <button 
              onClick={() => setShowWelcome(false)}
              className="absolute top-2 right-2 sm:top-3 sm:right-3 text-slate-400 hover:text-slate-900 transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 border-[3px] border-slate-900 rounded-full flex items-center justify-center shrink-0">
                <span className="text-lg sm:text-xl">👋</span>
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base sm:text-lg leading-tight">
                  Welcome back, {userProfile?.name?.split(' ')[0] || 'Student'}!
                </h3>
                <p className="text-xs sm:text-sm font-bold text-slate-500 mt-0.5">
                  Ready to check your latest results?
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Warning Modal */}
      {showProfileWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white border-[3px] border-slate-900 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-[6px_6px_0_0_#0f172a] sm:shadow-[8px_8px_0_0_#0f172a] relative animate-in zoom-in-95 duration-300 mx-auto">
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-rose-100 border-[3px] border-slate-900 rounded-full flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-lg sm:text-xl leading-tight">Action Required</h3>
                <p className="text-xs sm:text-sm font-bold text-slate-500">Your profile is incomplete</p>
              </div>
            </div>
            
            <p className="text-sm sm:text-base text-slate-700 font-medium mb-4">
              Please complete your profile to get the most out of the portal. You are missing:
            </p>
            
            <ul className="space-y-2 mb-6">
              {missingFields.map(field => (
                <li key={field} className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></div>
                  {field}
                </li>
              ))}
            </ul>
            
            <div className="flex flex-col gap-3">
              <Link 
                href="/dashboard/profile"
                onClick={() => sessionStorage.setItem('hasDismissedProfileWarning', 'true')}
                className="flex items-center justify-center w-full py-3 sm:py-3.5 bg-amber-400 hover:bg-amber-500 text-slate-900 font-black rounded-xl border-[3px] border-slate-900 transition-all hover:translate-y-[2px] hover:shadow-none shadow-[4px_4px_0_0_#0f172a] text-sm sm:text-base"
              >
                Go to Profile Settings
              </Link>
              <button 
                onClick={() => {
                  sessionStorage.setItem('hasDismissedProfileWarning', 'true');
                  setShowProfileWarning(false);
                }}
                className="flex items-center justify-center w-full py-2.5 sm:py-3 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-xl border-[3px] border-slate-200 transition-colors text-sm sm:text-base"
              >
                Remind me later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Announcements Marquee */}
      {announcements.length > 0 && (
        <div className="relative bg-white border-[3px] border-slate-900 rounded-2xl shadow-[6px_6px_0_0_#0f172a] overflow-hidden flex items-center h-14 group transition-transform hover:-translate-y-1">
          {/* Diagonal striped background overlay */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }}></div>
          
          {/* Label Badge */}
          <div className="relative z-10 flex items-center justify-center gap-2 bg-amber-400 border-r-[3px] border-slate-900 h-full px-4 sm:px-6 shadow-[4px_0_0_0_rgba(15,23,42,0.1)] shrink-0">
            <Megaphone className="w-5 h-5 text-slate-900 animate-pulse drop-shadow-sm" fill="currentColor" />
            <span className="font-black text-slate-900 uppercase tracking-widest text-sm hidden sm:inline-block">
              Updates
            </span>
          </div>

          {/* Marquee Content */}
          <div className="flex-1 overflow-hidden relative h-full flex items-center bg-amber-50">
            {/* Gradient Mask for fading edges */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-amber-50 to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-amber-50 to-transparent z-10 pointer-events-none"></div>
            
            <div className="flex whitespace-nowrap group-hover:[&>div]:[animation-play-state:paused]">
              {/* First Block */}
              <div className="animate-marquee flex items-center shrink-0">
                {announcements.map((ann, idx) => (
                  <span key={idx} className="mx-8 inline-flex items-center gap-2 font-bold text-sm text-slate-800">
                    <span className="text-amber-500 text-lg">✦</span> 
                    {ann}
                  </span>
                ))}
              </div>
              {/* Duplicate Block for Seamless Looping */}
              <div className="animate-marquee flex items-center shrink-0" aria-hidden="true">
                {announcements.map((ann, idx) => (
                  <span key={`dup-${idx}`} className="mx-8 inline-flex items-center gap-2 font-bold text-sm text-slate-800">
                    <span className="text-amber-500 text-lg">✦</span> 
                    {ann}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Result Header */}
      <div className="flex flex-col gap-2 mb-2">
        <h2 className="text-3xl font-extrabold text-slate-900">Your Results</h2>
        <p className="text-base font-medium text-slate-500">Track your academic progress. Click on any card to view detailed breakdown.</p>
      </div>
      
      {/* Cards Grid */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <div className="p-12 text-center border-[3px] border-slate-900 bg-white rounded-2xl shadow-[6px_6px_0_0_#0f172a]">
          <p className="text-xl font-bold text-slate-600">No results published yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {results.map((result) => (
            <div 
              key={result.id}
              className="group rounded-2xl border-[3px] border-slate-900 bg-white p-5 sm:p-6 shadow-[4px_4px_0_0_#0f172a] sm:shadow-[6px_6px_0_0_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#0f172a] sm:hover:shadow-[8px_8px_0_0_#0f172a] transition-all flex flex-col h-full"
            >
              <div className="flex items-start justify-between mb-5 sm:mb-6">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl border-[3px] border-slate-900 bg-blue-50 flex items-center justify-center shrink-0">
                  <FileCode2 className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
                </div>
                <div className={`flex items-center justify-center rounded-lg border-2 px-2.5 py-1 sm:px-3 shrink-0 ${
                  result.status === 'PENDING' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-blue-200 bg-blue-50 text-blue-700'
                }`}>
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {result.status === 'PENDING' ? 'Processing ⏳' : 'Declared 📢'}
                  </span>
                </div>
              </div>
              
              <div className="mb-6 flex-grow flex flex-col">
                <h3 className="font-extrabold text-xl text-slate-900 leading-tight mb-1">{result.subject}</h3>
                <span className="text-sm font-bold text-slate-500 block mb-5">{result.unit}</span>
                
                {userProfile && (
                  <div className="flex items-center gap-2 mb-5 text-sm font-bold border-[3px] border-slate-900 px-3 py-1.5 rounded-lg bg-blue-50 text-slate-700 w-max">
                    <span className="text-slate-900">{userProfile.name}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-blue-700">{userProfile.roll_number}</span>
                  </div>
                )}

                <div className="mt-auto">
                  {result.topics ? (
                    <p className="text-xs font-bold text-slate-600 line-clamp-2 border-l-[3px] border-blue-600 bg-blue-50/50 p-2 rounded-r-lg">
                      <span className="text-slate-900 uppercase">Topics:</span> {result.topics}
                    </p>
                  ) : (
                     <p className="text-xs font-bold text-slate-400 italic bg-slate-50 p-2 rounded-lg border-l-[3px] border-slate-200">
                       No topics listed for this assessment.
                     </p>
                  )}
                </div>
              </div>
              
              <div className="mt-auto pt-4 border-t-[3px] border-slate-100 flex justify-end">
                <button 
                  onClick={() => setSelectedResult(result)}
                  className="flex items-center justify-center gap-2 text-sm font-bold text-white bg-blue-700 px-6 py-2.5 rounded-xl border-[3px] border-slate-900 hover:bg-blue-800 transition-colors shadow-[4px_4px_0_0_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  View Result
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <ResultModal 
        isOpen={!!selectedResult} 
        onClose={() => setSelectedResult(null)} 
        data={selectedResult} 
      />

    </div>
  );
}
