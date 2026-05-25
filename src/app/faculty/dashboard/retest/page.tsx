"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MoreHorizontal,
  Loader2
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type RetestStatus = "Scheduled" | "Completed" | "Pending Approval";

interface RetestRecord {
  id: string;
  studentName: string;
  rollNo: string;
  unit: string;
  originalScore: number;
  status: RetestStatus;
  date: string;
  reason: string;
}

export default function RetestManagementPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<RetestStatus | "All">("All");
  const [retests, setRetests] = useState<RetestRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Scheduling Modal State
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [scheduleDateStr, setScheduleDateStr] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchRetests = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('retests')
        .select(`
          id,
          unit_label,
          original_score,
          status,
          scheduled_date,
          reason,
          profiles (
            name,
            roll_number
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formatted: RetestRecord[] = data.map((r: any) => ({
          id: r.id,
          studentName: r.profiles?.name || "Unknown",
          rollNo: r.profiles?.roll_number || "N/A",
          unit: r.unit_label,
          originalScore: r.original_score,
          status: r.status as RetestStatus,
          date: r.scheduled_date || "TBD",
          reason: r.reason
        }));
        setRetests(formatted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRetests();
  }, []);

  const handleApproveSchedule = async () => {
    if (!schedulingId || !scheduleDateStr.trim()) return;
    setIsUpdating(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('retests')
        .update({ status: 'Scheduled', scheduled_date: scheduleDateStr })
        .eq('id', schedulingId);
      
      if (error) throw error;
      await fetchRetests();
      setSchedulingId(null);
      setScheduleDateStr("");
    } catch (err) {
      console.error(err);
      alert("Failed to schedule retest.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject this application? It will be deleted.")) return;
    try {
      const supabase = createClient();
      await supabase.from('retests').delete().eq('id', id);
      await fetchRetests();
    } catch (err) {
      console.error(err);
    }
  };

  // Filter Logic
  const filteredRetests = retests.filter(record => {
    const matchesSearch = 
      record.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.rollNo.includes(searchQuery) ||
      record.unit.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === "All" || record.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const getStatusStyle = (status: RetestStatus) => {
    switch (status) {
      case "Pending Approval": return "bg-amber-300 text-amber-900 border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a]";
      case "Completed": return "bg-emerald-300 text-emerald-900 border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a]";
      case "Scheduled": return "bg-blue-300 text-blue-900 border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a]";
    }
  };

  const getStatusIcon = (status: RetestStatus) => {
    switch (status) {
      case "Pending Approval": return <AlertCircle className="h-3.5 w-3.5" />;
      case "Completed": return <CheckCircle2 className="h-3.5 w-3.5" />;
      case "Scheduled": return <Clock className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Retest Management</h2>
          <p className="text-slate-500 mt-1">Track and manage students who have been granted a unit test retake.</p>
        </div>
        <button className="bg-slate-900 text-white px-4 py-2 rounded-lg font-black border-[3px] border-slate-900 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#0f172a] transition-all">
          Schedule New Retest
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by Name, Roll No, or Unit..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border-[3px] border-slate-900 rounded-lg focus:outline-none focus:shadow-[4px_4px_0_0_#0f172a] transition-all font-bold text-slate-900"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-5 w-5 text-slate-400" />
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as RetestStatus | "All")}
            className="w-full sm:w-auto border-[3px] border-slate-900 rounded-lg px-3 py-2 focus:outline-none focus:shadow-[4px_4px_0_0_#0f172a] text-slate-900 font-bold transition-all"
          >
            <option value="All">All Statuses</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Enterprise Table */}
      <div className="bg-white border-[3px] border-slate-900 rounded-xl shadow-[4px_4px_0_0_#0f172a] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b-[3px] border-slate-900">
              <tr>
                <th className="px-6 py-4 font-black text-slate-900">Student Info</th>
                <th className="px-6 py-4 font-black text-slate-900">Test Unit</th>
                <th className="px-6 py-4 font-black text-slate-900">Original Score</th>
                <th className="px-6 py-4 font-black text-slate-900">Reason</th>
                <th className="px-6 py-4 font-black text-slate-900">Status & Date</th>
                <th className="px-6 py-4 font-black text-slate-900 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-[3px] divide-slate-900">
              {filteredRetests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No retests found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredRetests.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-100 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-black text-slate-900">{record.studentName}</p>
                      <p className="text-xs text-slate-600 font-bold mt-0.5">{record.rollNo}</p>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">{record.unit}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <span className="bg-white text-slate-900 px-2 py-1 rounded-lg font-black border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a]">
                        {record.originalScore} / 300
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <span className="line-clamp-1 font-bold text-slate-900">{record.reason}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5 items-start">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${getStatusStyle(record.status)}`}>
                          {getStatusIcon(record.status)}
                          {record.status}
                        </span>
                        <span className="text-xs font-bold text-slate-600 ml-1">{record.date}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {record.status === "Pending Approval" && (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => setSchedulingId(record.id)}
                            className="px-3 py-1 bg-blue-600 text-white font-black rounded-lg border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all text-xs"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleReject(record.id)}
                            className="px-3 py-1 bg-white text-red-600 font-black rounded-lg border-[3px] border-slate-900 hover:bg-red-50 transition-colors text-xs"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scheduling Modal */}
      {schedulingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border-[3px] border-slate-900 bg-white p-6 shadow-[8px_8px_0_0_#0f172a]">
            <h3 className="text-xl font-extrabold text-slate-900 mb-2">Schedule Retest</h3>
            <p className="text-sm font-medium text-slate-500 mb-4">Enter the date and time for this retest. The student will be notified.</p>
            <input 
              type="text"
              placeholder="e.g. Oct 28, 2023 at 10:00 AM"
              value={scheduleDateStr}
              onChange={(e) => setScheduleDateStr(e.target.value)}
              className="w-full p-3 mb-4 border-2 border-slate-900 rounded-lg focus:outline-none focus:shadow-[4px_4px_0_0_#0f172a] transition-all font-bold text-slate-900"
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => { setSchedulingId(null); setScheduleDateStr(""); }}
                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleApproveSchedule}
                disabled={!scheduleDateStr.trim() || isUpdating}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg font-black border-[3px] border-slate-900 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#0f172a] transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Schedule
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
