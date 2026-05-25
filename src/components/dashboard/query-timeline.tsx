"use client";

import { X, CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface QueryTimelineProps {
  isOpen: boolean;
  onClose: () => void;
  query: any;
}

export function QueryTimeline({ isOpen, onClose, query }: QueryTimelineProps) {
  if (!isOpen || !query) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border-[3px] border-slate-900 bg-white shadow-[8px_8px_0_0_#0f172a] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b-[3px] border-slate-900 bg-slate-50 p-6">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Query #{query.id}</h2>
            <p className="text-sm font-semibold text-slate-500">{query.type} - {query.subject}</p>
          </div>
          <button 
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-slate-200 hover:border-slate-900 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5 text-slate-700" />
          </button>
        </div>

        {/* Timeline Content */}
        <div className="p-8 overflow-y-auto flex-1">
          <div className="relative border-l-2 border-slate-200 ml-4 space-y-8">
            
            {/* Step 1 */}
            <div className="relative pl-8">
              <div className="absolute -left-[13px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-white">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-bold text-slate-900">Query Submitted</h3>
              <p className="text-sm font-medium text-slate-500">{query.submittedAt}</p>
            </div>

            {/* Step 2 */}
            <div className="relative pl-8">
              <div className="absolute -left-[13px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-white">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-bold text-slate-900">Faculty Viewed</h3>
              <p className="text-sm font-medium text-slate-500">22 May 2026, 10:15 AM</p>
            </div>

            {/* Step 3 */}
            <div className="relative pl-8">
              {query.status === "Under Review" ? (
                <div className="absolute -left-[13px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 ring-4 ring-white animate-pulse">
                  <Clock className="h-4 w-4 text-white" />
                </div>
              ) : (
                <div className="absolute -left-[13px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-white">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
              )}
              <h3 className="font-bold text-slate-900">Under Review</h3>
              {query.status === "Under Review" && <p className="text-sm font-medium text-amber-600 mt-1">Currently being processed by faculty</p>}
            </div>

            {/* Step 4 */}
            <div className={`relative pl-8 ${query.status === "Under Review" ? "opacity-40" : ""}`}>
              <div className={`absolute -left-[13px] top-0 flex h-6 w-6 items-center justify-center rounded-full ${query.status === "Approved" || query.status === "Resolved" ? "bg-emerald-500" : query.status === "Rejected" ? "bg-red-500" : "bg-slate-300"} ring-4 ring-white`}>
                {query.status === "Rejected" ? <AlertCircle className="h-4 w-4 text-white" /> : <CheckCircle2 className="h-4 w-4 text-white" />}
              </div>
              <h3 className="font-bold text-slate-900">Decision Made</h3>
              {query.status !== "Under Review" && (
                <div className="mt-3 rounded-xl border-2 border-slate-200 bg-slate-50 p-4">
                  <span className="text-xs font-bold uppercase text-slate-500 mb-1 block">Faculty Reply</span>
                  <p className="text-sm font-medium text-slate-700">"{query.reply}"</p>
                </div>
              )}
            </div>

            {/* Step 5 */}
            <div className={`relative pl-8 ${query.status !== "Resolved" ? "opacity-40" : ""}`}>
              <div className={`absolute -left-[13px] top-0 flex h-6 w-6 items-center justify-center rounded-full ${query.status === "Resolved" ? "bg-blue-600" : "bg-slate-300"} ring-4 ring-white`}>
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-bold text-slate-900">Marks Updated</h3>
              {query.status === "Resolved" && <p className="text-sm font-medium text-blue-600 mt-1">Check your results page</p>}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
