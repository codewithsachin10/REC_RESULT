"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  MessageSquareWarning,
  AlertTriangle,
  X,
  Image as ImageIcon,
  Loader2
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type QueryStatus = "pending" | "resolved" | "rejected";
type IssueType = string;

interface Query {
  id: string;
  studentName: string;
  rollNo: string;
  issueType: IssueType;
  status: QueryStatus;
  date: string;
  description: string;
  screenshotUrl?: string;
  dbId: string;
}

export default function QueryManagementPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<QueryStatus | "All">("All");
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionState, setActionState] = useState<"idle" | "approving" | "rejecting">("idle");
  
  const [queries, setQueries] = useState<Query[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchQueries();
  }, []);

  const fetchQueries = async () => {
    const supabase = createClient();
    // Using a simpler query and doing join in code, or try to use Supabase join
    const { data: queriesData, error: queriesErr } = await supabase
      .from('queries')
      .select('*, profiles(*)');

    if (queriesErr) {
      console.error("Error fetching queries:", queriesErr);
      setIsLoading(false);
      return;
    }

    const formattedQueries: Query[] = (queriesData || []).map((q: any) => ({
      dbId: q.id,
      id: `QRY-${q.id.split('-')[0].toUpperCase()}`,
      studentName: q.profiles?.name || 'Unknown Student',
      rollNo: q.profiles?.roll_number || 'N/A',
      issueType: q.issue_type || 'Other',
      status: q.status || 'pending',
      date: new Date(q.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      description: q.description || '',
      screenshotUrl: null // Add if you add this column in DB
    }));

    // Sort by date descending
    formattedQueries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setQueries(formattedQueries);
    setIsLoading(false);
  };

  // Filter Logic
  const filteredQueries = queries.filter(query => {
    const matchesSearch = 
      query.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
      query.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      query.rollNo.includes(searchQuery);
    
    const matchesStatus = filterStatus === "All" || query.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const pendingCount = queries.filter(q => q.status === 'pending').length;

  const getStatusStyle = (status: QueryStatus) => {
    switch (status) {
      case "pending": return "bg-amber-300 text-amber-900";
      case "resolved": return "bg-emerald-300 text-emerald-900";
      case "rejected": return "bg-red-300 text-red-900";
      default: return "bg-slate-200 text-slate-900";
    }
  };

  const getStatusIcon = (status: QueryStatus) => {
    switch (status) {
      case "pending": return <Clock className="h-3.5 w-3.5" />;
      case "resolved": return <CheckCircle2 className="h-3.5 w-3.5" />;
      case "rejected": return <XCircle className="h-3.5 w-3.5" />;
      default: return null;
    }
  };

  const handleAction = async (action: "approve" | "reject") => {
    if (!selectedQuery) return;
    
    setActionState(action === "approve" ? "approving" : "rejecting");
    const supabase = createClient();
    
    const newStatus = action === "approve" ? "resolved" : "rejected";
    
    const { error } = await supabase
      .from('queries')
      .update({ status: newStatus })
      .eq('id', selectedQuery.dbId);

    if (error) {
      console.error("Error updating query:", error);
      alert("Failed to update query. Please try again.");
      setActionState("idle");
      return;
    }
    
    // Refresh local state
    setQueries(prev => prev.map(q => 
      q.dbId === selectedQuery.dbId ? { ...q, status: newStatus } : q
    ));
    
    setActionState("idle");
    setSelectedQuery(null);
    setRejectionReason("");
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Query Management</h2>
          <p className="text-slate-500 mt-1">Review, approve, or reject technical issues reported by students.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-amber-300 text-amber-900 text-xs font-black px-3 py-1 rounded-lg border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a]">
            {pendingCount} Pending
          </span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by ID, Name, or Roll No..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border-[3px] border-slate-900 rounded-lg focus:outline-none focus:shadow-[2px_2px_0_0_#0f172a] transition-all font-bold text-slate-900"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-5 w-5 text-slate-400" />
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as QueryStatus | "All")}
            className="w-full sm:w-auto border-[3px] border-slate-900 rounded-lg px-3 py-2 focus:outline-none focus:shadow-[2px_2px_0_0_#0f172a] text-slate-900 font-bold capitalize"
          >
            <option value="All">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Enterprise Table */}
      <div className="bg-white border-[3px] border-slate-900 rounded-xl shadow-[4px_4px_0_0_#0f172a] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b-[3px] border-slate-900">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-600">Query ID</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Student Info</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Issue Type</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Date</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Status</th>
                <th className="px-6 py-4 font-semibold text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-900 font-bold">
                    <Loader2 className="h-8 w-8 mx-auto animate-spin mb-3" />
                    Loading queries...
                  </td>
                </tr>
              ) : filteredQueries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 font-bold">
                    No queries found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredQueries.map((query) => (
                  <tr key={query.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-mono font-medium text-slate-900">{query.id}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{query.studentName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{query.rollNo}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border-[3px] border-slate-900 text-slate-900 font-black text-xs shadow-[2px_2px_0_0_#0f172a]">
                        {query.issueType === "Marks Totalling" && <AlertTriangle className="h-3 w-3" />}
                        {query.issueType === "Absentee Mistake" && <MessageSquareWarning className="h-3 w-3" />}
                        {query.issueType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{query.date}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black border-[3px] shadow-[2px_2px_0_0_#0f172a] border-slate-900 capitalize ${getStatusStyle(query.status)}`}>
                        {getStatusIcon(query.status)}
                        {query.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedQuery(query)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-black text-slate-900 bg-white border-[3px] border-slate-900 rounded-lg shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#0f172a] transition-all"
                      >
                        <Eye className="h-4 w-4" />
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Detail Modal */}
      {selectedQuery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in p-4 sm:p-0">
          <div className="bg-white rounded-2xl border-[3px] border-slate-900 shadow-[8px_8px_0_0_#0f172a] w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b-[3px] border-slate-900 bg-slate-50 shrink-0">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-slate-900">{selectedQuery.id}</h3>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-black border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a] capitalize ${getStatusStyle(selectedQuery.status)}`}>
                    {selectedQuery.status}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">Submitted on {selectedQuery.date}</p>
              </div>
              <button 
                onClick={() => setSelectedQuery(null)}
                className="p-2 border-[3px] border-transparent hover:border-slate-900 bg-white hover:shadow-[2px_2px_0_0_#0f172a] text-slate-900 rounded-lg transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* Student Info Card */}
              <div className="bg-slate-50 border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Student</p>
                  <p className="font-bold text-slate-900 text-lg">{selectedQuery.studentName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Roll Number</p>
                  <p className="font-mono font-bold text-slate-900 text-lg">{selectedQuery.rollNo}</p>
                </div>
              </div>

              {/* Issue Description */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Issue Description: <span className="text-slate-900 font-bold bg-slate-200 px-2 py-0.5 rounded-md ml-1">{selectedQuery.issueType}</span></p>
                <div className="bg-white border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] rounded-xl p-4 text-slate-900 font-bold leading-relaxed text-sm">
                  {selectedQuery.description}
                </div>
              </div>

              {/* Proof / Screenshot */}
              {selectedQuery.screenshotUrl ? (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <ImageIcon className="h-4 w-4" /> Attached Proof
                  </p>
                  <div className="rounded-xl overflow-hidden border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] bg-slate-100 group relative">
                    <Image 
                      src={selectedQuery.screenshotUrl} 
                      alt="Student Proof" 
                      width={800}
                      height={300}
                      className="w-full h-auto object-cover max-h-[300px]"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors flex items-center justify-center">
                      <a href={selectedQuery.screenshotUrl} target="_blank" rel="noreferrer" className="opacity-0 group-hover:opacity-100 bg-white border-[3px] border-slate-900 text-slate-900 px-4 py-2 rounded-lg font-black shadow-[4px_4px_0_0_#0f172a] transition-all transform translate-y-2 group-hover:translate-y-0 text-sm">
                        View Full Image
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Attached Proof</p>
                  <div className="bg-slate-50 border-[3px] border-slate-900 border-dashed rounded-xl p-4 text-center text-sm font-bold text-slate-500">
                    No screenshot attached by the student.
                  </div>
                </div>
              )}

              {/* Faculty Action Area (Only show if pending) */}
              {selectedQuery.status === "pending" && (
                <div className="pt-4 border-t-[3px] border-slate-900">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Resolution Note (Optional)</p>
                  <textarea 
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="E.g., Granted retest. Wait for further instructions..."
                    className="w-full border-[3px] border-slate-900 rounded-xl p-3 text-sm focus:outline-none focus:shadow-[4px_4px_0_0_#0f172a] min-h-[80px] font-bold text-slate-900"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t-[3px] border-slate-900 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setSelectedQuery(null)}
                className="px-4 py-2.5 text-sm font-black text-slate-900 bg-white border-[3px] border-slate-900 rounded-lg shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#0f172a] transition-all"
              >
                Close
              </button>
              
              {selectedQuery.status === "pending" && (
                <>
                  <button 
                    onClick={() => handleAction("reject")}
                    disabled={actionState !== "idle"}
                    className="px-4 py-2.5 text-sm font-black text-red-900 bg-red-300 border-[3px] border-slate-900 rounded-lg shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#0f172a] transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {actionState === "rejecting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    {actionState === "rejecting" ? "Rejecting..." : "Reject Issue"}
                  </button>
                  <button 
                    onClick={() => handleAction("approve")}
                    disabled={actionState !== "idle"}
                    className="px-4 py-2.5 text-sm font-black text-emerald-900 bg-emerald-300 border-[3px] border-slate-900 rounded-lg shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#0f172a] transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {actionState === "approving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {actionState === "approving" ? "Approving..." : "Approve & Resolve"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
