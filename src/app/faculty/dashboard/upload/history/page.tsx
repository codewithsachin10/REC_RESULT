"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Clock, RotateCcw, AlertTriangle, FileText } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { undoUpload } from "@/app/actions/uploadActions";

export default function UploadHistoryPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [undoingId, setUndoingId] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from('upload_logs').select('*').order('created_at', { ascending: false });
    if (data) setLogs(data);
    setIsLoading(false);
  };

  const handleUndo = async (id: string, subject: string, unit: string) => {
    if (!confirm(`Are you sure you want to UNDO the upload for ${subject} ${unit}? This will revert all student scores to their exact state before this upload.`)) {
      return;
    }
    setUndoingId(id);
    try {
      await undoUpload(id);
      alert("Upload successfully undone!");
      fetchLogs();
    } catch (err: any) {
      console.error(err);
      alert("Failed to undo upload: " + err.message);
    }
    setUndoingId(null);
  };

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-8 animate-in fade-in duration-500">
      
      <div className="flex items-center gap-4 border-b-[3px] border-slate-900 pb-6">
        <Link 
          href="/faculty/dashboard/upload"
          className="p-2 border-[3px] border-slate-900 bg-white rounded-lg shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-slate-900"
        >
          <ArrowLeft className="h-5 w-5 font-bold" />
        </Link>
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Upload History</h2>
          <p className="text-slate-500 font-bold mt-1">Review past CSV uploads and undo them if necessary.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border-[3px] border-slate-900 shadow-[8px_8px_0_0_#0f172a] overflow-hidden">
        <div className="bg-amber-100 border-b-[3px] border-slate-900 p-4 flex items-start gap-3">
           <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
           <p className="text-sm font-bold text-amber-900">
             Undoing an upload restores the database to the exact state it was before the file was published. Any marks that were manually edited after the upload will also be overwritten by the undo action. Use with caution.
           </p>
        </div>
        
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center p-8">
               <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center p-12 border-2 border-dashed border-slate-300 rounded-xl">
               <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
               <p className="font-bold text-slate-500 text-lg">No upload history found.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {logs.map(log => (
                 <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border-[3px] border-slate-200 hover:border-slate-900 bg-slate-50 transition-colors">
                    <div>
                       <h3 className="font-black text-xl text-slate-900">{log.subject_name} ({log.subject_code})</h3>
                       <div className="flex items-center gap-3 mt-1">
                          <span className="font-bold text-sm text-blue-600 uppercase bg-blue-100 px-2 py-0.5 rounded-md border-2 border-blue-200">
                            {log.unit_key.replace('_', ' ')}
                          </span>
                          <span className="font-bold text-sm text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                       </div>
                    </div>
                    <button
                       onClick={() => handleUndo(log.id, log.subject_name, log.unit_key)}
                       disabled={undoingId === log.id}
                       className="flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-700 border-2 border-red-200 rounded-lg font-bold hover:bg-red-200 hover:border-red-300 transition-colors disabled:opacity-50"
                    >
                       {undoingId === log.id ? (
                         "Undoing..."
                       ) : (
                         <><RotateCcw className="h-4 w-4" /> Undo Upload</>
                       )}
                    </button>
                 </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
