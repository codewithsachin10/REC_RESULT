"use client";

import { useState, useEffect } from "react";
import { Search, Filter, Download, Eye, Edit2, Loader2, User, BookOpen, X, Code } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface StudentResult {
  id: string; // unique combo of student and mark id
  studentId: string;
  name: string;
  rollNo: string;
  dept: string;
  section: string;
  subjectName: string;
  unit1: number;
  unit2: number;
  unit3: number;
  unit4: number;
  unit5: number;
  total: number;
  breakdown?: any;
}

export default function StudentResultsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDept, setFilterDept] = useState("All");
  const [filterSubject, setFilterSubject] = useState("All");
  
  const [results, setResults] = useState<StudentResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingResult, setEditingResult] = useState<StudentResult | null>(null);
  const [editForm, setEditForm] = useState({ u1: 0, u2: 0, u3: 0, u4: 0, u5: 0 });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      const supabase = createClient();
      
      let allProfiles: any[] = [];
      let page = 0;
      const limit = 1000;
      let hasMoreProfiles = true;

      while (hasMoreProfiles) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'student')
          .range(page * limit, (page + 1) * limit - 1);

        if (error) {
          console.error("Error fetching profiles:", error);
          setIsLoading(false);
          return;
        }

        if (data && data.length > 0) {
          allProfiles = [...allProfiles, ...data];
          if (data.length < limit) {
            hasMoreProfiles = false;
          } else {
            page++;
          }
        } else {
          hasMoreProfiles = false;
        }
      }
      
      const profiles = allProfiles;

      const { data: marks, error: marksErr } = await supabase
        .from('marks')
        .select('*');

      if (marksErr) {
        console.error("Error fetching marks:", marksErr);
      }

      const combinedResults: StudentResult[] = [];

      (marks || []).forEach((m: any) => {
        const p = profiles.find((prof: any) => prof.id === m.student_id);
        if (p) {
          combinedResults.push({
            id: m.id,
            studentId: p.id,
            name: p.name,
            rollNo: p.roll_number || 'N/A',
            dept: p.department || 'N/A',
            section: p.section || 'N/A',
            subjectName: m.subject_name || 'Unknown Subject',
            unit1: m.unit_test_1 || 0,
            unit2: m.unit_test_2 || 0,
            unit3: m.unit_test_3 || 0,
            unit4: m.unit_test_4 || 0,
            unit5: m.unit_test_5 || 0,
            total: m.total_score || 0,
            breakdown: m.breakdown || null
          });
        }
      });

      setResults(combinedResults);
      setIsLoading(false);
    };

    fetchResults();
  }, []);

  const filteredResults = results.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      student.rollNo.includes(searchQuery);
    const matchesDept = filterDept === "All" || student.dept === filterDept;
    
    let matchesSubject = filterSubject === "All";
    if (filterSubject === "DSA" && student.subjectName.includes("Data Structures")) matchesSubject = true;
    if (filterSubject === "Python" && student.subjectName.includes("Python")) matchesSubject = true;

    return matchesSearch && matchesDept && matchesSubject;
  });

  const openDetails = (student: StudentResult) => {
    setSelectedStudent(student);
    setShowDetailsModal(true);
  };

  const closeDetails = () => {
    setShowDetailsModal(false);
    setSelectedStudent(null);
  };

  const openEdit = (student: StudentResult) => {
    setEditingResult(student);
    setEditForm({ 
      u1: student.unit1, 
      u2: student.unit2, 
      u3: student.unit3, 
      u4: student.unit4, 
      u5: student.unit5 
    });
    setShowEditModal(true);
  };

  const closeEdit = () => {
    setShowEditModal(false);
    setEditingResult(null);
  };

  const handleSaveEdit = async () => {
    if (!editingResult) return;
    setIsSaving(true);
    const supabase = createClient();
    const newTotal = Number(editForm.u1) + Number(editForm.u2) + Number(editForm.u3) + Number(editForm.u4) + Number(editForm.u5);
    
    const { error } = await supabase.from('marks').update({
      unit_test_1: Number(editForm.u1),
      unit_test_2: Number(editForm.u2),
      unit_test_3: Number(editForm.u3),
      unit_test_4: Number(editForm.u4),
      unit_test_5: Number(editForm.u5)
    }).eq('id', editingResult.id);

    if (!error) {
      setResults(prev => prev.map(r => r.id === editingResult.id ? {
        ...r,
        unit1: Number(editForm.u1),
        unit2: Number(editForm.u2),
        unit3: Number(editForm.u3),
        unit4: Number(editForm.u4),
        unit5: Number(editForm.u5),
        total: newTotal
      } : r));
      closeEdit();
    } else {
      console.error("Failed to update marks", error);
      alert("Failed to save updates.");
    }
    setIsSaving(false);
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-6 animate-in fade-in duration-500 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Student Lab Results</h2>
          <p className="text-slate-500 font-bold mt-1">Manage and view detailed academic performance across 5 units.</p>
        </div>
        <button className="bg-emerald-300 text-emerald-900 px-4 py-2 rounded-lg font-black border-[3px] border-slate-900 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#0f172a] transition-all flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export CSV
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-900 font-bold" />
          <input 
            type="text" 
            placeholder="Search by Name or Roll No..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border-[3px] border-slate-900 rounded-lg focus:outline-none focus:shadow-[4px_4px_0_0_#0f172a] transition-all font-bold text-slate-900"
          />
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-slate-900" />
            <select 
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="w-full sm:w-auto border-[3px] border-slate-900 rounded-lg px-3 py-2 focus:outline-none focus:shadow-[4px_4px_0_0_#0f172a] text-slate-900 font-bold transition-all"
            >
              <option value="All">All Subjects</option>
              <option value="DSA">DSA</option>
              <option value="Python">Python</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-slate-900" />
            <select 
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="w-full sm:w-auto border-[3px] border-slate-900 rounded-lg px-3 py-2 focus:outline-none focus:shadow-[4px_4px_0_0_#0f172a] text-slate-900 font-bold transition-all"
            >
              <option value="All">All Depts</option>
              <option value="AIDS">AIDS</option>
              <option value="AIML">AIML</option>
              <option value="CSBS">CSBS</option>
              <option value="CSD">CSD</option>
              <option value="CSE">CSE</option>
              <option value="CSE-CS">CSE-CS</option>
              <option value="ECE">ECE</option>
              <option value="EEE">EEE</option>
              <option value="IT">IT</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white border-[3px] border-slate-900 rounded-xl shadow-[4px_4px_0_0_#0f172a] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-100 border-b-[3px] border-slate-900">
              <tr>
                <th className="px-6 py-4 font-black text-slate-900">Student Info</th>
                <th className="px-6 py-4 font-black text-slate-900">Subject</th>
                <th className="px-4 py-4 font-black text-slate-900 text-center">U1</th>
                <th className="px-4 py-4 font-black text-slate-900 text-center">U2</th>
                <th className="px-4 py-4 font-black text-slate-900 text-center">U3</th>
                <th className="px-4 py-4 font-black text-slate-900 text-center">U4</th>
                <th className="px-4 py-4 font-black text-slate-900 text-center">U5</th>
                <th className="px-6 py-4 font-black text-slate-900 text-center">Total Score</th>
                <th className="px-6 py-4 font-black text-slate-900 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-[3px] divide-slate-900">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-900 font-bold">
                    <Loader2 className="h-8 w-8 mx-auto animate-spin mb-3" />
                    Loading results...
                  </td>
                </tr>
              ) : filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-900 font-bold">
                    <User className="h-8 w-8 mx-auto text-slate-400 mb-3" />
                    No results found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredResults.map((result) => {
                  const isPython = result.subjectName.toLowerCase().includes('python');
                  const maxTotal = isPython ? 250 : 500; // max possible score based on 5 units
                  const percentage = result.total > 0 ? ((result.total / maxTotal) * 100).toFixed(1) : "0.0";
                  
                  return (
                    <tr key={result.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-black text-slate-900">{result.name}</p>
                        <p className="text-xs text-slate-600 font-bold mt-0.5">{result.rollNo} • {result.dept}-{result.section}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-200 text-slate-900 px-2 py-1 rounded-md text-xs font-black border-2 border-slate-900">
                          {result.subjectName.includes("Data") ? "DSA" : result.subjectName.includes("Python") ? "Python" : result.subjectName}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-slate-900">{result.unit1}</td>
                      <td className="px-4 py-4 text-center font-bold text-slate-900">{result.unit2}</td>
                      <td className="px-4 py-4 text-center font-bold text-slate-900">{result.unit3}</td>
                      <td className="px-4 py-4 text-center font-bold text-slate-900">{result.unit4}</td>
                      <td className="px-4 py-4 text-center font-bold text-slate-900">{result.unit5}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-black text-slate-900">{result.total} <span className="text-slate-400 text-xs font-bold">/ {maxTotal}</span></span>
                          <span className="text-[10px] font-bold text-slate-500 mt-0.5">{percentage}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openDetails(result)}
                            className="p-2 text-slate-900 bg-blue-300 border-[3px] border-slate-900 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[2px_2px_0_0_#0f172a] rounded-lg transition-all" 
                            title="View Details"
                          >
                            <Eye className="h-4 w-4 font-bold" />
                          </button>
                          <button 
                            onClick={() => openEdit(result)}
                            className="p-2 text-slate-900 bg-amber-300 border-[3px] border-slate-900 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[2px_2px_0_0_#0f172a] rounded-lg transition-all" 
                            title="Edit Results"
                          >
                            <Edit2 className="h-4 w-4 font-bold" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in p-4 sm:p-0">
          <div className="bg-white rounded-2xl border-[3px] border-slate-900 shadow-[8px_8px_0_0_#0f172a] w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b-[3px] border-slate-900 bg-indigo-300 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-2xl font-black text-slate-900">{selectedStudent.name}</h3>
                <p className="text-sm font-bold text-indigo-900 mt-1">{selectedStudent.rollNo} • {selectedStudent.subjectName}</p>
              </div>
              <button 
                onClick={closeDetails}
                className="p-2 bg-white border-[3px] border-slate-900 rounded-lg shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
              >
                <X className="h-5 w-5 font-black text-slate-900" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map(u => {
                  const unitVal = (selectedStudent as any)[`unit${u}`];
                  return (
                    <div key={u} className="bg-slate-50 border-[3px] border-slate-900 p-4 rounded-xl shadow-[4px_4px_0_0_#0f172a] text-center">
                      <p className="text-xs font-black text-slate-500 uppercase">Unit {u}</p>
                      <p className="text-2xl font-black text-slate-900 mt-1">{unitVal}</p>
                    </div>
                  )
                })}
              </div>

              {/* Breakdown Details if available (mostly Python) */}
              {selectedStudent.breakdown && Object.keys(selectedStudent.breakdown).length > 0 ? (
                <div className="space-y-4">
                  <h4 className="text-xl font-black text-slate-900 border-b-2 border-slate-200 pb-2 flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Detailed Question Breakdown
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    {["unit_test_1", "unit_test_2", "unit_test_3", "unit_test_4", "unit_test_5"].map((unitKey, idx) => {
                      const breakdown = selectedStudent.breakdown[unitKey];
                      if (!breakdown) return null;
                      
                      return (
                        <div key={unitKey} className="bg-white border-[3px] border-slate-900 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[2px_2px_0_0_#0f172a]">
                          <div className="font-black text-slate-900 text-lg whitespace-nowrap">
                            Unit {idx + 1}
                          </div>
                          <div className="grid grid-cols-4 gap-2 w-full sm:w-auto">
                            <div className="bg-emerald-100 border-2 border-emerald-900 rounded-lg p-2 text-center">
                              <p className="text-[10px] font-black uppercase text-emerald-900">MCQ</p>
                              <p className="font-black text-slate-900">{breakdown.mcq}</p>
                            </div>
                            <div className="bg-blue-100 border-2 border-blue-900 rounded-lg p-2 text-center">
                              <p className="text-[10px] font-black uppercase text-blue-900">Q1</p>
                              <p className="font-black text-slate-900">{breakdown.q1}</p>
                            </div>
                            <div className="bg-purple-100 border-2 border-purple-900 rounded-lg p-2 text-center">
                              <p className="text-[10px] font-black uppercase text-purple-900">Q2</p>
                              <p className="font-black text-slate-900">{breakdown.q2}</p>
                            </div>
                            <div className="bg-amber-100 border-2 border-amber-900 rounded-lg p-2 text-center">
                              <p className="text-[10px] font-black uppercase text-amber-900">Q3</p>
                              <p className="font-black text-slate-900">{breakdown.q3}</p>
                            </div>
                          </div>
                          <div className="bg-slate-900 text-white border-2 border-slate-900 rounded-lg p-2 text-center sm:min-w-[80px]">
                            <p className="text-[10px] font-bold uppercase text-slate-300">Total</p>
                            <p className="font-black">{breakdown.mcq + breakdown.q1 + breakdown.q2 + breakdown.q3}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-100 border-[3px] border-slate-900 rounded-xl p-6 text-center text-slate-500 font-bold shadow-[2px_2px_0_0_#0f172a]">
                  No detailed breakdown available for this subject.
                </div>
              )}
            </div>
            
            <div className="p-4 border-t-[3px] border-slate-900 bg-slate-100 shrink-0 text-right">
              <button 
                onClick={closeDetails}
                className="px-6 py-2.5 font-black text-white bg-slate-900 border-[3px] border-slate-900 rounded-lg shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0f172a] transition-all"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in p-4 sm:p-0">
          <div className="bg-white rounded-2xl border-[3px] border-slate-900 shadow-[8px_8px_0_0_#0f172a] w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b-[3px] border-slate-900 bg-amber-300 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-slate-900">Edit Marks</h3>
                <p className="text-sm font-bold text-amber-900 mt-1">{editingResult.name} • {editingResult.subjectName}</p>
              </div>
              <button 
                onClick={closeEdit}
                className="p-2 bg-white border-[3px] border-slate-900 rounded-lg shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
              >
                <X className="h-5 w-5 font-black text-slate-900" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map(u => {
                const isPython = editingResult.subjectName.toLowerCase().includes('python');
                const maxUnitMarks = isPython ? 50 : 100;
                return (
                  <div key={u} className="flex items-center justify-between bg-slate-50 border-[3px] border-slate-900 p-3 rounded-xl shadow-[2px_2px_0_0_#0f172a]">
                    <p className="font-black text-slate-900">Unit {u}</p>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        min="0"
                        max={maxUnitMarks}
                        value={(editForm as any)[`u${u}`]}
                        onChange={(e) => setEditForm({ ...editForm, [`u${u}`]: e.target.value })}
                        className="w-20 border-[3px] border-slate-900 rounded-lg px-2 py-1 text-center font-black focus:outline-none focus:shadow-[2px_2px_0_0_#0f172a]"
                      />
                      <span className="text-slate-400 font-bold text-xs">/ {maxUnitMarks}</span>
                    </div>
                  </div>
                )
              })}
            </div>
            
            <div className="p-4 border-t-[3px] border-slate-900 bg-slate-100 flex justify-end gap-3">
              <button 
                onClick={closeEdit}
                className="px-6 py-2.5 font-bold text-slate-900 bg-white border-[3px] border-slate-900 rounded-lg shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#0f172a] transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-6 py-2.5 font-black text-white bg-slate-900 border-[3px] border-slate-900 rounded-lg shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0f172a] transition-all flex items-center gap-2 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
