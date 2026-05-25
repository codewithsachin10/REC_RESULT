"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquareWarning, Clock, CheckCircle2, Loader2, FileText, ChevronRight } from "lucide-react";
import { QueryModal } from "@/components/dashboard/query-modal";
import { QueryTimeline } from "@/components/dashboard/query-timeline";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function QueriesPage() {
  const [activeTab, setActiveTab] = useState<"queries" | "fillouts">("queries");
  
  // Queries State
  const [isQueryModalOpen, setIsQueryModalOpen] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState<any | null>(null);
  const [queries, setQueries] = useState<any[]>([]);
  const [isLoadingQueries, setIsLoadingQueries] = useState(true);

  // Forms State
  const [forms, setForms] = useState<any[]>([]);
  const [isLoadingForms, setIsLoadingForms] = useState(true);

  const supabase = createClient();

  const fetchQueries = useCallback(async () => {
    setIsLoadingQueries(true);
    const { data: userData } = await supabase.auth.getUser();
    const student_id = userData.user?.id;

    if (!student_id) {
      setIsLoadingQueries(false);
      return;
    }

    const { data, error } = await supabase
      .from('queries')
      .select('*')
      .eq('student_id', student_id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formatted = data.map((q: any) => ({
        id: q.id.substring(0, 8).toUpperCase(),
        subject: "General",
        type: q.issue_type,
        submittedAt: new Date(q.created_at).toLocaleString(),
        status: q.status === 'pending' ? 'Under Review' : q.status === 'resolved' ? 'Resolved' : 'Rejected',
        reply: q.status === 'resolved' ? 'Issue resolved by faculty.' : q.status === 'rejected' ? 'Request was rejected.' : 'We are reviewing your issue.'
      }));
      setQueries(formatted);
    }
    setIsLoadingQueries(false);
  }, []);

  const fetchForms = useCallback(async () => {
    setIsLoadingForms(true);
    const { data, error } = await supabase
      .from('custom_forms')
      .select('*')
      .eq('is_active', true)
      .eq('visible_to_students', true)
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setForms(data);
    }
    setIsLoadingForms(false);
  }, []);

  useEffect(() => {
    fetchQueries();
    fetchForms();
  }, [fetchQueries, fetchForms]);

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-12 animate-in fade-in duration-500">
      
      {/* Tabs */}
      <div className="flex items-center gap-4 border-b-[3px] border-slate-900 pb-4">
        <button
          onClick={() => setActiveTab("queries")}
          className={cn(
            "px-6 py-3 font-black rounded-xl border-[3px] border-slate-900 transition-all flex items-center gap-2 text-sm sm:text-base",
            activeTab === "queries"
              ? "bg-slate-900 text-white shadow-[4px_4px_0_0_#0f172a] translate-x-[-2px] translate-y-[-2px]"
              : "bg-white text-slate-900 hover:bg-slate-50"
          )}
        >
          <MessageSquareWarning className="h-5 w-5" />
          Technical Queries
        </button>
        <button
          onClick={() => setActiveTab("fillouts")}
          className={cn(
            "px-6 py-3 font-black rounded-xl border-[3px] border-slate-900 transition-all flex items-center gap-2 text-sm sm:text-base",
            activeTab === "fillouts"
              ? "bg-blue-600 text-white shadow-[4px_4px_0_0_#0f172a] translate-x-[-2px] translate-y-[-2px]"
              : "bg-white text-slate-900 hover:bg-blue-50"
          )}
        >
          <FileText className="h-5 w-5" />
          Fill Outs
        </button>
      </div>

      {activeTab === "queries" ? (
        <section className="bg-white rounded-2xl border-[3px] border-slate-900 shadow-[6px_6px_0_0_#0f172a] overflow-hidden flex flex-col min-h-[60vh] animate-in fade-in zoom-in-95 duration-300">
          <div className="border-b-[3px] border-slate-900 p-6 sm:p-8 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900">Technical Queries</h2>
              <p className="text-base font-medium text-slate-500 mt-2">Track and manage your issue reports and support tickets.</p>
            </div>
            <button 
              onClick={() => setIsQueryModalOpen(true)}
              className="flex items-center justify-center gap-2 text-base font-bold text-white bg-slate-900 px-6 py-3 rounded-xl border-[3px] border-slate-900 hover:bg-slate-800 transition-colors shadow-[4px_4px_0_0_#cbd5e1] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#cbd5e1] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
            >
              Raise New Query
            </button>
          </div>
          
          <div className="p-6 sm:p-8 flex-1 bg-slate-50/50">
            {isLoadingQueries ? (
              <div className="flex justify-center p-12">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
              </div>
            ) : queries.length === 0 ? (
              <div className="text-center p-12 border-2 border-dashed border-slate-300 rounded-xl">
                <p className="font-bold text-slate-500">No queries raised yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {queries.map((query) => (
                  <div 
                    key={query.id}
                    onClick={() => setSelectedQuery(query)}
                    className="group cursor-pointer rounded-2xl border-[3px] border-slate-900 bg-white p-6 shadow-[6px_6px_0_0_#0f172a] hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#0f172a] active:translate-y-0 active:shadow-[4px_4px_0_0_#0f172a] transition-all flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-black text-slate-900 bg-slate-100 px-3 py-1.5 rounded border-2 border-slate-200">
                        {query.id}
                      </span>
                      <div className={`flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-lg border-[3px] ${
                        query.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 
                        query.status === 'Under Review' ? 'bg-amber-100 text-amber-700 border-amber-300 animate-pulse' :
                        'bg-slate-100 text-slate-700 border-slate-300'
                      }`}>
                        {query.status === 'Resolved' ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                        {query.status}
                      </div>
                    </div>
                    
                    <h3 className="font-extrabold text-2xl text-slate-900 mb-2">{query.type}</h3>
                    <p className="text-base font-semibold text-slate-500 mb-6">{query.subject}</p>
                    
                    <div className="mt-auto pt-5 border-t-[3px] border-slate-100 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-400 flex items-center gap-2">
                        <Clock className="h-4 w-4" /> {query.submittedAt}
                      </span>
                      <span className="text-sm font-black text-blue-600 group-hover:underline">View Timeline &rarr;</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="bg-white rounded-2xl border-[3px] border-slate-900 shadow-[6px_6px_0_0_#0f172a] overflow-hidden flex flex-col min-h-[60vh] animate-in fade-in zoom-in-95 duration-300">
          <div className="border-b-[3px] border-slate-900 p-6 sm:p-8 bg-blue-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900">Fill Outs</h2>
              <p className="text-base font-medium text-slate-500 mt-2">Department forms and surveys that require your response.</p>
            </div>
          </div>
          
          <div className="p-6 sm:p-8 flex-1 bg-slate-50/50">
            {isLoadingForms ? (
              <div className="flex justify-center p-12">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
              </div>
            ) : forms.length === 0 ? (
              <div className="text-center p-12 border-[3px] border-dashed border-slate-300 rounded-2xl bg-white">
                <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border-[3px] border-slate-900">
                  <FileText className="h-8 w-8 text-slate-400" />
                </div>
                <p className="font-black text-slate-900 text-xl">No pending forms to fill out.</p>
                <p className="text-slate-500 mt-2 font-bold">You're all caught up!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {forms.map((form) => (
                  <Link 
                    key={form.id}
                    href={`/forms/${form.id}`}
                    target="_blank"
                    className="group flex flex-col rounded-2xl border-[3px] border-slate-900 bg-white p-6 shadow-[4px_4px_0_0_#0f172a] hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#0f172a] transition-all"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="bg-blue-100 p-3 rounded-xl border-[3px] border-slate-900 shrink-0">
                        <FileText className="h-6 w-6 text-blue-700" />
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-3 py-1.5 rounded-lg border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a] whitespace-nowrap">
                        Action Required
                      </span>
                    </div>
                    
                    <h3 className="font-extrabold text-2xl text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {form.title}
                    </h3>
                    <p className="text-base font-semibold text-slate-500 mb-6 line-clamp-2 flex-1">
                      {form.description || "No description provided."}
                    </p>
                    
                    <div className="mt-auto pt-5 border-t-[3px] border-slate-100 flex items-center justify-between group-hover:border-slate-900 transition-colors">
                      <span className="text-sm font-bold text-slate-500">
                        {new Date(form.created_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1 text-sm font-black text-blue-600 group-hover:text-slate-900">
                        Fill Form <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Modals */}
      <QueryModal 
        isOpen={isQueryModalOpen} 
        onClose={() => setIsQueryModalOpen(false)} 
        onSuccess={fetchQueries}
      />
      
      <QueryTimeline 
        isOpen={!!selectedQuery} 
        onClose={() => setSelectedQuery(null)} 
        query={selectedQuery} 
      />

    </div>
  );
}
