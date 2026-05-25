"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  Filter, 
  Download,
  GraduationCap,
  ChevronRight,
  User,
  ArrowLeft,
  Loader2,
  CheckSquare,
  Square,
  Edit2,
  Save,
  X,
  Phone,
  CalendarDays,
  UserCircle,
  Plus
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toPng } from "html-to-image";
import Link from "next/link";

interface StudentResult {
  id: string;
  roll: string;
  name: string;
  department: string;
  year: string;
  semester: string;
  batch: string;
  faculty_advisor: string;
  phone: string;
  dob: string;
  recentMarks: {
    subject: string;
    unit_test_1: number;
    unit_test_2: number;
    unit_test_3: number;
    unit_test_4: number;
    unit_test_5: number;
    total: number;
    maxUnitMarks: number;
    maxTotalMarks: number;
    status: string;
    breakdown: any;
  }[];
}

export default function StudentSearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDept, setFilterDept] = useState("All");
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Bulk Actions
  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set());

  // Edit Mode
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    department: "",
    year: "",
    semester: "",
    batch: "",
    faculty_advisor: "",
    phone: "",
    dob: ""
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
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
      
      const profilesData = allProfiles;

      const { data: marksData, error: marksError } = await supabase
        .from('marks')
        .select('*');

      const formattedStudents: StudentResult[] = (profilesData || []).map((profile: any) => {
        const studentMarks = (marksData || []).filter((m: any) => m.student_id === profile.id);
        
        return {
          id: profile.id,
          roll: profile.roll_number || 'N/A',
          name: profile.name || 'Unknown',
          department: profile.department || 'N/A',
          year: profile.year || 'N/A',
          semester: profile.semester || 'N/A',
          batch: profile.batch || 'N/A',
          faculty_advisor: profile.faculty_advisor || 'N/A',
          phone: profile.phone || 'N/A',
          dob: profile.dob || 'N/A',
          recentMarks: studentMarks.map((m: any) => {
            const subjectName = m.subject_name || 'Unknown Subject';
            const isPython = subjectName.toLowerCase().includes('python');
            const maxUnitMarks = isPython ? 50 : 100;
            const maxTotalMarks = maxUnitMarks * 5; // 5 units
            return {
              subject: subjectName,
              unit_test_1: m.unit_test_1 || 0,
              unit_test_2: m.unit_test_2 || 0,
              unit_test_3: m.unit_test_3 || 0,
              unit_test_4: m.unit_test_4 || 0,
              unit_test_5: m.unit_test_5 || 0,
              total: m.total_score || 0,
              maxUnitMarks,
              maxTotalMarks,
              status: (m.total_score || 0) >= (maxTotalMarks / 2) ? "Pass" : "Fail",
              breakdown: m.breakdown || {}
            };
          })
        };
      });

      setStudents(formattedStudents);
    } catch (err) {
      console.error("Crash during fetchData mapping:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDownload = async () => {
    if (!selectedStudent || isDownloading) return;
    setIsDownloading(true);
    
    try {
      const element = document.getElementById("report-card-capture");
      if (!element) throw new Error("Card element not found");

      // html-to-image handles modern CSS like OKLCH, LAB, and complex flex/grid layouts better
      const imgData = await toPng(element, { 
        cacheBust: true,
        pixelRatio: 2, // for high resolution
        backgroundColor: '#ffffff'
      });

      const a = document.createElement("a");
      a.href = imgData;
      a.download = `${selectedStudent.roll}_Report_Card.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to generate report card image", err);
      alert("Failed to download image. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const toggleBulkSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedForBulk);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedForBulk(newSet);
  };

  const handleBulkDownload = () => {
    const selected = students.filter(s => selectedForBulk.has(s.id));
    if (selected.length === 0) return;

    let combinedContent = "BULK REPORT CARD EXPORT\n=======================\n\n";
    selected.forEach(student => {
      combinedContent += `Student: ${student.name} (${student.roll})\nDept: ${student.department} | Batch: ${student.batch}\nMarks:\n`;
      if (student.recentMarks.length === 0) combinedContent += "  - No marks recorded\n";
      student.recentMarks.forEach(m => {
        combinedContent += `  - ${m.subject}: ${m.total}/${m.maxTotalMarks} (${m.status})\n`;
      });
      combinedContent += "\n-----------------------\n\n";
    });

    const blob = new Blob([combinedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bulk_Export_${selected.length}_Students.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Clear selection
    setSelectedForBulk(new Set());
  };

  const handleEditToggle = () => {
    if (!isEditing && selectedStudent) {
      setEditForm({
        department: selectedStudent.department === 'N/A' ? '' : selectedStudent.department,
        year: selectedStudent.year === 'N/A' ? '' : selectedStudent.year,
        semester: selectedStudent.semester === 'N/A' ? '' : selectedStudent.semester,
        batch: selectedStudent.batch === 'N/A' ? '' : selectedStudent.batch,
        faculty_advisor: selectedStudent.faculty_advisor === 'N/A' ? '' : selectedStudent.faculty_advisor,
        phone: selectedStudent.phone === 'N/A' ? '' : selectedStudent.phone,
        dob: selectedStudent.dob === 'N/A' ? '' : selectedStudent.dob
      });
    }
    setIsEditing(!isEditing);
  };

  const handleSaveStudent = async () => {
    if (!selectedStudent) return;
    setIsSaving(true);
    
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update(editForm)
      .eq('id', selectedStudent.id);

    if (error) {
      alert("Error saving student data: " + error.message);
    } else {
      // Update local state to reflect changes instantly without full refetch
      const updatedStudent = {
        ...selectedStudent,
        ...editForm
      };
      setSelectedStudent(updatedStudent);
      setStudents(students.map(s => s.id === updatedStudent.id ? updatedStudent : s));
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (s.roll && s.roll.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDept = filterDept === "All" || s.department === filterDept;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="h-full animate-in fade-in slide-in-from-bottom-4 duration-500 w-full pb-20">
      
      {/* -------------------- SEARCH LIST VIEW -------------------- */}
      {!selectedStudent && (
        <div className="animate-in fade-in slide-in-from-left-4 duration-300 relative">
          
          {/* Header & Search */}
          <div className="mb-8">
            <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <select 
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="w-full sm:w-64 bg-white border-[3px] border-slate-900 rounded-xl px-4 py-2.5 text-slate-900 font-bold focus:outline-none focus:shadow-[4px_4px_0_0_#0f172a] transition-all shadow-[2px_2px_0_0_#0f172a]"
              >
                <option value="All">All Departments</option>
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
              
              {selectedForBulk.size > 0 && (
                <button 
                  onClick={() => setSelectedForBulk(new Set(filteredStudents.map(s => s.id)))}
                  className="text-sm font-bold text-blue-600 underline"
                >
                  Select All
                </button>
              )}
            </div>

            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-900 font-black" />
                <input 
                  type="text" 
                  placeholder="Enter Student Name or Roll Number..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-14 pr-4 py-4 rounded-xl border-[3px] border-slate-900 bg-white text-lg font-black focus:outline-none focus:shadow-[6px_6px_0_0_#0f172a] transition-all shadow-[4px_4px_0_0_#0f172a]"
                />
              </div>
              
              <Link 
                href="/faculty/dashboard/add-students"
                className="hidden sm:flex items-center gap-2 bg-emerald-500 text-white px-6 py-4 rounded-xl border-[3px] border-slate-900 font-black shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0f172a] hover:bg-emerald-600 active:translate-x-0 active:translate-y-0 active:shadow-none transition-all whitespace-nowrap"
              >
                <Plus className="h-6 w-6" />
                Add Student
              </Link>
              
              {/* Mobile Add Button */}
              <Link 
                href="/faculty/dashboard/add-students"
                className="sm:hidden flex items-center justify-center bg-emerald-500 text-white w-16 rounded-xl border-[3px] border-slate-900 font-black shadow-[4px_4px_0_0_#0f172a] hover:bg-emerald-600 transition-all"
              >
                <Plus className="h-6 w-6" />
              </Link>
            </div>
          </div>

          {/* Results List */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {isLoading ? (
               <div className="p-12 text-center bg-white border-[3px] border-slate-900 rounded-xl shadow-[4px_4px_0_0_#0f172a] col-span-full">
                 <Loader2 className="h-12 w-12 mx-auto text-blue-600 mb-4 animate-spin" />
                 <h3 className="text-xl font-black text-slate-900">Loading Students...</h3>
               </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-12 text-center bg-white border-[3px] border-slate-900 rounded-xl shadow-[4px_4px_0_0_#0f172a] col-span-full">
                <User className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                <h3 className="text-xl font-black text-slate-900">No Students Found</h3>
                <p className="text-sm font-bold text-slate-500 mt-2">Try adjusting your search query.</p>
              </div>
            ) : (
              filteredStudents.map((student) => {
                const isSelected = selectedForBulk.has(student.id);
                return (
                  <div 
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className={`flex items-center justify-between p-4 rounded-xl border-[3px] border-slate-900 cursor-pointer transition-all bg-white hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0f172a] ${isSelected ? 'shadow-[6px_6px_0_0_#0f172a] bg-blue-50 border-blue-900' : 'shadow-[4px_4px_0_0_#0f172a]'}`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Bulk Checkbox */}
                      <button 
                        onClick={(e) => toggleBulkSelection(student.id, e)}
                        className={`p-1 rounded-md transition-colors ${isSelected ? 'text-blue-600' : 'text-slate-300 hover:text-slate-500'}`}
                      >
                        {isSelected ? <CheckSquare className="h-6 w-6" /> : <Square className="h-6 w-6" />}
                      </button>

                      <div className="h-12 w-12 shrink-0 rounded-xl border-2 border-slate-900 bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-[2px_2px_0_0_#0f172a]">
                        {student.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-black text-slate-900 truncate">{student.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold text-slate-700 bg-slate-50 border-2 border-slate-900 px-1.5 py-0.5 rounded shadow-[2px_2px_0_0_#0f172a]">{student.roll}</span>
                          <span className="text-xs font-bold text-slate-500 truncate">{student.department} • {student.year}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-900 font-black shrink-0" />
                  </div>
                )
              })
            )}
          </div>

          {/* Floating Bulk Action Bar */}
          {selectedForBulk.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-4 rounded-2xl shadow-[8px_8px_0_0_#0f172a] border-[3px] border-slate-900 flex items-center justify-between gap-6 z-50 animate-in slide-in-from-bottom-10 w-11/12 max-w-lg">
              <span className="font-black text-lg">{selectedForBulk.size} Selected</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setSelectedForBulk(new Set())}
                  className="bg-transparent text-blue-100 hover:text-white px-3 py-2 font-bold text-sm underline"
                >
                  Clear
                </button>
                <button 
                  onClick={handleBulkDownload} 
                  className="flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-xl border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#0f172a] transition-all font-black text-sm active:translate-x-0 active:translate-y-0 active:shadow-none"
                >
                  <Download className="h-4 w-4" /> Export ALL
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* -------------------- DETAILED FULL VIEW -------------------- */}
      {selectedStudent && (
        <div className="animate-in fade-in slide-in-from-right-8 duration-300">
          
          {/* Back Button */}
          <button 
            onClick={() => {
              setSelectedStudent(null);
              setIsEditing(false);
            }}
            className="flex items-center gap-2 mb-6 px-4 py-2 bg-white border-[3px] border-slate-900 rounded-lg font-black text-slate-900 shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#0f172a] transition-all w-max"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Search
          </button>

          <div id="report-card-capture" className="bg-white rounded-2xl border-[3px] border-slate-900 shadow-[12px_12px_0_0_#0f172a] overflow-hidden">
            {/* Header */}
            <div className="p-8 border-b-[3px] border-slate-900 bg-blue-50 relative overflow-hidden">
              <GraduationCap className="absolute -right-8 -top-8 h-48 w-48 text-blue-200 opacity-50 rotate-12" />
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h3 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mb-4">{selectedStudent.name}</h3>
                  <div className="flex flex-wrap gap-3">
                    <span className="text-base font-black text-slate-900 bg-white border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a] px-3 py-1 rounded">{selectedStudent.roll}</span>
                  </div>
                </div>
                
                <div className="bg-white border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] p-5 rounded-xl text-center min-w-[160px]">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Total Score</p>
                  <p className="text-4xl font-black text-blue-600">
                    {selectedStudent.recentMarks.reduce((sum, mark) => sum + mark.total, 0)}<span className="text-xl text-slate-400">/{selectedStudent.recentMarks.reduce((sum, mark) => sum + mark.maxTotalMarks, 0)}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Editable Profile Data Section */}
            <div className="p-8 bg-slate-50 border-b-[3px] border-slate-900">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-black text-slate-900 uppercase tracking-widest border-l-4 border-slate-900 pl-3">Student Profile Data</h4>
                {!isEditing ? (
                  <button 
                    onClick={handleEditToggle}
                    className="flex items-center gap-1.5 text-sm font-black text-slate-900 bg-amber-300 px-4 py-2 rounded-lg border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a] hover:bg-amber-400 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"
                  >
                    <Edit2 className="h-4 w-4" /> Edit Profile
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleEditToggle}
                      className="flex items-center gap-1 text-sm font-black text-slate-600 bg-white px-3 py-2 rounded-lg border-[3px] border-slate-300 hover:bg-slate-100 transition-all"
                    >
                      <X className="h-4 w-4" /> Cancel
                    </button>
                    <button 
                      onClick={handleSaveStudent}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 text-sm font-black text-white bg-emerald-600 px-4 py-2 rounded-lg border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a] hover:bg-emerald-700 active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 
                      Save Changes
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Department */}
                <div className={`p-4 rounded-xl shadow-[2px_2px_0_0_#0f172a] ${isEditing ? 'bg-amber-50 border-amber-400 border-[3px]' : 'bg-white border-[3px] border-slate-900'}`}>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Department</p>
                  {isEditing ? (
                    <input type="text" value={editForm.department} onChange={(e) => setEditForm({...editForm, department: e.target.value})} className="w-full bg-white border-2 border-slate-300 rounded px-2 py-1 text-sm font-bold outline-none focus:border-amber-500" />
                  ) : <p className="text-lg font-black text-slate-900">{selectedStudent.department}</p>}
                </div>
                
                {/* Year */}
                <div className={`p-4 rounded-xl shadow-[2px_2px_0_0_#0f172a] ${isEditing ? 'bg-amber-50 border-amber-400 border-[3px]' : 'bg-white border-[3px] border-slate-900'}`}>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Year</p>
                  {isEditing ? (
                    <input type="text" value={editForm.year} onChange={(e) => setEditForm({...editForm, year: e.target.value})} className="w-full bg-white border-2 border-slate-300 rounded px-2 py-1 text-sm font-bold outline-none focus:border-amber-500" />
                  ) : <p className="text-lg font-black text-slate-900">{selectedStudent.year}</p>}
                </div>

                {/* Semester */}
                <div className={`p-4 rounded-xl shadow-[2px_2px_0_0_#0f172a] ${isEditing ? 'bg-amber-50 border-amber-400 border-[3px]' : 'bg-white border-[3px] border-slate-900'}`}>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Semester</p>
                  {isEditing ? (
                    <input type="text" value={editForm.semester} onChange={(e) => setEditForm({...editForm, semester: e.target.value})} className="w-full bg-white border-2 border-slate-300 rounded px-2 py-1 text-sm font-bold outline-none focus:border-amber-500" />
                  ) : <p className="text-lg font-black text-slate-900">{selectedStudent.semester}</p>}
                </div>

                {/* Batch */}
                <div className={`p-4 rounded-xl shadow-[2px_2px_0_0_#0f172a] ${isEditing ? 'bg-amber-50 border-amber-400 border-[3px]' : 'bg-white border-[3px] border-slate-900'}`}>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Batch</p>
                  {isEditing ? (
                    <input type="text" value={editForm.batch} onChange={(e) => setEditForm({...editForm, batch: e.target.value})} className="w-full bg-white border-2 border-slate-300 rounded px-2 py-1 text-sm font-bold outline-none focus:border-amber-500" />
                  ) : <p className="text-lg font-black text-slate-900">{selectedStudent.batch}</p>}
                </div>

                {/* Faculty Advisor */}
                <div className={`p-4 rounded-xl shadow-[2px_2px_0_0_#0f172a] ${isEditing ? 'bg-amber-50 border-amber-400 border-[3px]' : 'bg-white border-[3px] border-slate-900'}`}>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1"><UserCircle className="h-3 w-3" /> Faculty Advisor</p>
                  {isEditing ? (
                    <input type="text" value={editForm.faculty_advisor} onChange={(e) => setEditForm({...editForm, faculty_advisor: e.target.value})} className="w-full bg-white border-2 border-slate-300 rounded px-2 py-1 text-sm font-bold outline-none focus:border-amber-500" />
                  ) : <p className="text-lg font-black text-slate-900">{selectedStudent.faculty_advisor}</p>}
                </div>

                {/* Phone */}
                <div className={`p-4 rounded-xl shadow-[2px_2px_0_0_#0f172a] ${isEditing ? 'bg-amber-50 border-amber-400 border-[3px]' : 'bg-emerald-50 border-[3px] border-slate-900'}`}>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</p>
                  {isEditing ? (
                    <input type="text" value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} className="w-full bg-white border-2 border-slate-300 rounded px-2 py-1 text-sm font-bold outline-none focus:border-amber-500" />
                  ) : <p className="text-lg font-black text-slate-900">{selectedStudent.phone}</p>}
                </div>

                {/* DOB */}
                <div className={`p-4 rounded-xl shadow-[2px_2px_0_0_#0f172a] ${isEditing ? 'bg-amber-50 border-amber-400 border-[3px]' : 'bg-emerald-50 border-[3px] border-slate-900'}`}>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Date of Birth</p>
                  {isEditing ? (
                    <input type="date" value={editForm.dob} onChange={(e) => setEditForm({...editForm, dob: e.target.value})} className="w-full bg-white border-2 border-slate-300 rounded px-2 py-1 text-sm font-bold outline-none focus:border-amber-500" />
                  ) : <p className="text-lg font-black text-slate-900">{selectedStudent.dob}</p>}
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="px-8 py-4 border-b-[3px] border-slate-900 bg-white flex justify-end">
              <button 
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg border-[3px] border-slate-900 font-black shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#0f172a] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isDownloading ? (
                  <div className="h-5 w-5 rounded-full border-[3px] border-white border-t-transparent animate-spin" />
                ) : (
                  <Download className="h-5 w-5" />
                )}
                {isDownloading ? "Downloading..." : "Download Report Card"}
              </button>
            </div>

            {/* Marks Breakdown */}
            <div className="p-8 bg-white">
              <h4 className="text-lg font-black text-slate-900 uppercase tracking-widest mb-6 border-l-4 border-slate-900 pl-3">Recent Unit Assessments</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedStudent.recentMarks.length === 0 && (
                  <p className="text-slate-500 font-bold col-span-2">No marks uploaded yet.</p>
                )}
                {selectedStudent.recentMarks.map((mark, idx) => (
                  <div key={idx} className="rounded-xl border-[3px] border-slate-900 bg-white shadow-[6px_6px_0_0_#0f172a] overflow-hidden">
                    
                    {/* Subject Header */}
                    <div className="px-6 py-4 border-b-[3px] border-slate-900 bg-slate-50 flex items-center justify-between">
                      <h5 className="text-xl font-black text-slate-900">{mark.subject}</h5>
                      <span className={`px-4 py-1.5 rounded-lg border-[3px] border-slate-900 font-black text-sm shadow-[2px_2px_0_0_#0f172a] ${mark.status === 'Pass' ? 'bg-emerald-300 text-slate-900' : 'bg-red-300 text-slate-900'}`}>
                        {mark.status}
                      </span>
                    </div>

                    {/* Marks Grid */}
                    <div className="p-6 grid grid-cols-2 lg:grid-cols-6 gap-4">
                      {[1, 2, 3, 4, 5].map(unitNum => {
                        const unitKey = `unit_test_${unitNum}` as keyof typeof mark;
                        const unitBreakdown = mark.breakdown?.[unitKey];
                        const markVal = mark[unitKey as keyof typeof mark] as number;
                        
                        return (
                          <div key={unitNum} className="bg-slate-50 rounded-lg p-3 border-2 border-slate-900 text-center relative group">
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Unit {unitNum}</p>
                            <p className="text-xl font-black text-slate-900">{markVal}<span className="text-xs text-slate-400">/{mark.maxUnitMarks}</span></p>
                            
                            {/* Detailed Breakdown */}
                            {unitBreakdown && Object.keys(unitBreakdown).length > 0 && (
                              <div className="mt-2 pt-2 border-t-2 border-slate-200 text-left space-y-1">
                                {Object.entries(unitBreakdown).map(([k, v]) => (
                                  <div key={k} className="flex justify-between text-[10px] font-bold text-slate-600">
                                    <span className="uppercase truncate pr-1">{k}:</span>
                                    <span>{v as React.ReactNode}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <div className="bg-blue-50 rounded-lg p-3 border-2 border-blue-900 shadow-[2px_2px_0_0_#1e3a8a] text-center flex flex-col justify-center">
                        <p className="text-xs font-black text-blue-900 uppercase tracking-widest mb-1">Total</p>
                        <p className="text-xl font-black text-blue-900">{mark.total}<span className="text-xs text-blue-400">/{mark.maxTotalMarks}</span></p>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
