"use client";

import { X, CheckCircle2, FileCode2, Info, Loader2 } from "lucide-react";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

import { sendTelegramNotification } from "@/app/actions/telegramActions";

interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}

export function ResultModal({ isOpen, onClose, data }: ResultModalProps) {
  const [isApplyingRetest, setIsApplyingRetest] = useState(false);
  const [retestReason, setRetestReason] = useState("");
  const [isSubmittingRetest, setIsSubmittingRetest] = useState(false);

  // Log that the student viewed their mark (client-side)
  useEffect(() => {
    if (!isOpen || !data) return;
    const trackView = async () => {
      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user && data.mark_id && data.subjectCode && data.unitKey) {
          // Check if already logged
          const { data: existing } = await supabase
            .from('mark_views')
            .select('id')
            .eq('student_id', userData.user.id)
            .eq('subject_code', data.subjectCode)
            .eq('unit_key', data.unitKey)
            .maybeSingle();
          
          if (!existing) {
            await supabase.from('mark_views').insert({
              mark_id: data.mark_id,
              student_id: userData.user.id,
              subject_code: data.subjectCode,
              unit_key: data.unitKey,
            });
          }
        }
      } catch (e) {
        // Silently fail — this is a background analytics feature
        console.error('Failed to log mark view:', e);
      }
    };
    trackView();
  }, [isOpen, data]);

  if (!isOpen || !data) return null;

  const submitRetest = async () => {
    setIsSubmittingRetest(true);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not logged in");

      const { error } = await supabase.from('retests').insert({
        student_id: userData.user.id,
        mark_id: data.mark_id,
        unit_key: data.unitKey,
        unit_label: data.unit,
        subject_code: data.subjectCode,
        subject_name: data.subject,
        original_score: data.score,
        reason: retestReason,
        status: 'Pending Approval'
      });

      if (error) throw error;
      
      // Send Telegram notification
      sendTelegramNotification(
        userData.user.id,
        `<b>📝 Retest Application Submitted</b>\nYour application for <i>${data.subject} - ${data.unit}</i> has been submitted to your faculty for approval.\n\nReason: ${retestReason}`
      );
      
      alert("Retest application submitted successfully!");
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Failed to submit retest application. Have you run the SQL to create the table?");
    } finally {
      setIsSubmittingRetest(false);
    }
  };

  const isPython = data.subject.toLowerCase().includes("python");

  let codingScore = 0;
  let mcqScore = 0;

  if (isPython) {
    codingScore = (Number(data.breakdown?.q1) || 0) + (Number(data.breakdown?.q2) || 0) + (Number(data.breakdown?.q3) || 0);
    mcqScore = Number(data.breakdown?.mcq) || 0;
  }

  const chartData = isPython ? [
    { name: 'Coding', value: codingScore, color: '#3b82f6' },
    { name: 'MCQ', value: mcqScore, color: '#8b5cf6' }
  ] : [
    { name: 'Score', value: Number(data.score) || 0, color: '#3b82f6' },
    { name: 'Lost', value: Math.max(0, Number(data.total) - (Number(data.score) || 0)), color: '#e2e8f0' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl rounded-2xl border-[3px] border-slate-900 bg-white shadow-[8px_8px_0_0_#0f172a] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b-[3px] border-slate-900 bg-slate-50 p-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg border-2 border-slate-900 bg-blue-50 flex items-center justify-center shrink-0">
              <FileCode2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">{data.subject}</h2>
              <p className="text-sm font-semibold text-slate-500">{data.unit}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-slate-200 hover:border-slate-900 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5 text-slate-700" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex flex-col md:flex-row items-start justify-between mb-8 gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Total Score</h3>
              <div className="text-4xl font-black text-slate-900">{data.score} <span className="text-xl text-slate-400">/ {data.total}</span></div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border-[3px] border-emerald-900 bg-emerald-100 px-4 py-2 shadow-[4px_4px_0_0_#064e3b]">
              <CheckCircle2 className="h-6 w-6 text-emerald-700" />
              <span className="text-sm font-black text-emerald-900 uppercase">PUBLISHED</span>
            </div>
          </div>

          <h3 className="text-lg font-extrabold text-slate-900 mb-4">Detailed Breakdown</h3>
          
          <div className="flex flex-col md:flex-row gap-8 mb-8 items-center bg-slate-50 border-[3px] border-slate-900 rounded-2xl p-6 shadow-[6px_6px_0_0_#0f172a]">
            {/* Chart Side */}
            <div className="w-full md:w-1/2 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="#0f172a"
                    strokeWidth={2}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: '3px solid #0f172a', fontWeight: 'bold' }}
                    itemStyle={{ color: '#0f172a' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* List Side */}
            <div className="w-full md:w-1/2 space-y-3">
              {isPython ? (
                <>
                  <div className="flex flex-col bg-white border-2 border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between p-3 border-b-2 border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="font-bold text-slate-700">Coding</span>
                      </div>
                      <span className="font-black text-slate-900">{codingScore} <span className="text-slate-400 text-sm">/ 45</span></span>
                    </div>
                    <div className="bg-slate-50 px-3 py-2 flex flex-col gap-1.5 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-500 pl-5 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-slate-300"></span> Question 1</span>
                        <span className="font-black text-slate-700">{Number(data.breakdown?.q1) || 0} <span className="text-slate-400">/ 15</span></span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-500 pl-5 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-slate-300"></span> Question 2</span>
                        <span className="font-black text-slate-700">{Number(data.breakdown?.q2) || 0} <span className="text-slate-400">/ 15</span></span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-500 pl-5 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-slate-300"></span> Question 3</span>
                        <span className="font-black text-slate-700">{Number(data.breakdown?.q3) || 0} <span className="text-slate-400">/ 15</span></span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl border-2 border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-violet-500"></div>
                      <span className="font-bold text-slate-700">MCQ</span>
                    </div>
                    <span className="font-black text-slate-900">{mcqScore} <span className="text-slate-400 text-sm">/ 5</span></span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-xl border-2 border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="font-bold text-slate-700">Total Score</span>
                  </div>
                  <span className="font-black text-slate-900">{data.score} <span className="text-slate-400">/ 100</span></span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border-[3px] border-blue-200 bg-blue-50/50 p-5 mt-6">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-5 w-5 text-blue-600" />
              <h3 className="font-bold text-slate-900">Faculty Remarks</h3>
            </div>
            <p className="text-sm font-medium text-slate-700 italic">
              "{data.remarks || "No remarks provided yet."}"
            </p>
          </div>

          {/* Retest Section */}
          <div className="mt-6 border-t-[3px] border-slate-900 pt-6">
            {data.retest ? (
              <div className="rounded-xl border-[3px] border-slate-900 bg-slate-50 p-5 shadow-[4px_4px_0_0_#0f172a]">
                <h3 className="font-extrabold text-slate-900 mb-2">Retest Application</h3>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a] ${
                    data.retest.status === 'Pending Approval' ? 'bg-amber-300 text-amber-900' :
                    data.retest.status === 'Scheduled' ? 'bg-blue-300 text-blue-900' :
                    data.retest.status === 'Completed' ? 'bg-emerald-300 text-emerald-900' :
                    'bg-slate-300 text-slate-900'
                  }`}>
                    {data.retest.status}
                  </span>
                  {data.retest.scheduled_date && (
                    <span className="text-sm font-bold text-slate-700">Date: {data.retest.scheduled_date}</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-500">Reason: {data.retest.reason}</p>
              </div>
            ) : (
              <div className="rounded-xl border-[3px] border-slate-900 bg-white p-5 shadow-[4px_4px_0_0_#0f172a]">
                {!isApplyingRetest ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="font-extrabold text-slate-900">Need a Retest?</h3>
                      <p className="text-sm font-medium text-slate-500">If you faced technical issues or had medical leave, apply here.</p>
                    </div>
                    <button 
                      onClick={() => setIsApplyingRetest(true)}
                      className="whitespace-nowrap px-4 py-2 bg-slate-900 text-white rounded-lg font-black border-2 border-transparent hover:bg-slate-800 transition-colors"
                    >
                      Apply for Retest
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="font-extrabold text-slate-900">Submit Retest Application</h3>
                    <textarea 
                      value={retestReason}
                      onChange={(e) => setRetestReason(e.target.value)}
                      placeholder="Explain the reason for your retest request (e.g., Portal crashed, Medical leave)..."
                      className="w-full h-24 p-3 border-2 border-slate-900 rounded-lg focus:outline-none focus:shadow-[4px_4px_0_0_#0f172a] transition-all font-medium text-slate-900 text-sm"
                    />
                    <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => { setIsApplyingRetest(false); setRetestReason(""); }}
                        className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={submitRetest}
                        disabled={!retestReason.trim() || isSubmittingRetest}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-black border-2 border-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                      >
                        {isSubmittingRetest && <Loader2 className="h-4 w-4 animate-spin" />}
                        Submit Request
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
