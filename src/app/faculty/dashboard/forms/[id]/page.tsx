"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Download, Search, Inbox } from "lucide-react";
import Link from "next/link";
import Papa from "papaparse";

export default function FormLogsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [form, setForm] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Fetch Form Definition
      const { data: formData, error: formError } = await supabase
        .from('custom_forms')
        .select('*')
        .eq('id', resolvedParams.id)
        .single();
        
      if (formError || !formData) {
        console.error("Error fetching form:", formError);
        setLoading(false);
        return;
      }
      setForm(formData);

      // Fetch Submissions
      const { data: subData, error: subError } = await supabase
        .from('form_submissions')
        .select('*')
        .eq('form_id', resolvedParams.id)
        .order('created_at', { ascending: false });

      if (!subError && subData) {
        setSubmissions(subData);
      }
      
      setLoading(false);
    };

    fetchData();
  }, [resolvedParams.id]);

  const exportToCSV = () => {
    if (!form || submissions.length === 0) return;

    // Build header row from fields
    const headers = form.fields.map((f: any) => f.label);
    headers.unshift("Submission Date"); // Add date column

    // Build data rows
    const dataRows = submissions.map(sub => {
      const rowData = [new Date(sub.created_at).toLocaleString()];
      form.fields.forEach((f: any) => {
        rowData.push(sub.data[f.id] || "");
      });
      return rowData;
    });

    const csvContent = Papa.unparse([headers, ...dataRows]);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${form.title.replace(/\s+/g, '_')}_logs.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter submissions by simply checking if any data value string matches search
  const filteredSubmissions = submissions.filter(sub => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return Object.values(sub.data).some((val: any) => 
      String(val).toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-[4px] border-slate-900 border-t-transparent"></div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="p-8 text-center bg-rose-50 border-[3px] border-rose-900 rounded-2xl text-rose-900 font-bold max-w-xl mx-auto mt-12">
        <p className="text-xl font-black mb-2">Form Not Found</p>
        <p>The form you are looking for might have been deleted or the ID is incorrect.</p>
        <Link href="/faculty/dashboard/forms" className="inline-block mt-4 px-6 py-2 bg-rose-900 text-white rounded-lg hover:bg-rose-800 transition-colors">
          Go Back
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/faculty/dashboard/forms"
            className="p-2 border-[3px] border-slate-900 bg-white rounded-lg shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-slate-900 shrink-0"
          >
            <ArrowLeft className="h-5 w-5 font-bold" />
          </Link>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{form.title} Logs</h2>
            <p className="text-slate-500 font-bold mt-1">Viewing all submitted data for this form.</p>
          </div>
        </div>
        
        <button 
          onClick={exportToCSV}
          disabled={submissions.length === 0}
          className="px-6 py-3 bg-emerald-600 text-white font-black rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0f172a] transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
        >
          <Download className="h-5 w-5" /> Export to CSV
        </button>
      </div>

      <div className="bg-white border-[3px] border-slate-900 p-6 rounded-2xl shadow-[4px_4px_0_0_#0f172a]">
        <div className="flex justify-between items-center mb-6">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search logs..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-[3px] border-slate-900 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <div className="text-sm font-black text-slate-500 bg-slate-100 px-4 py-2 rounded-lg border-2 border-slate-200">
            Total Logs: {filteredSubmissions.length}
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="border-[3px] border-dashed border-slate-300 rounded-2xl p-16 text-center text-slate-500 font-bold bg-slate-50 flex flex-col items-center">
            <Inbox className="h-12 w-12 mb-4 text-slate-400" />
            <p className="text-lg">No one has submitted this form yet.</p>
            <p className="text-sm font-normal mt-2">Share the public link to start collecting data.</p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="text-center py-12 text-slate-500 font-bold">
            No submissions match your search query.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border-[3px] border-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 border-b-[3px] border-slate-900">
                <tr>
                  <th className="px-6 py-4 font-black text-slate-900 whitespace-nowrap">Date Submitted</th>
                  {form.fields.map((f: any) => (
                    <th key={f.id} className="px-6 py-4 font-black text-slate-900 whitespace-nowrap">
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y-[3px] divide-slate-900">
                {filteredSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-500 whitespace-nowrap">
                      {new Date(sub.created_at).toLocaleDateString()} at {new Date(sub.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </td>
                    {form.fields.map((f: any) => (
                      <td key={`${sub.id}-${f.id}`} className="px-6 py-4 font-bold text-slate-900 max-w-xs truncate">
                        {sub.data[f.id] || "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
