"use client";

import { useState } from "react";
import { Upload, FileDown, Plus, Trash2, Save, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import Papa from "papaparse";
import Link from "next/link";
import { addStudentsAction } from "@/app/actions/add-students";
import { useRouter } from "next/navigation";

export type StudentInput = {
  id?: string; // local temporary id for rendering
  name: string;
  roll_number: string;
  email: string;
  password?: string;
  department: string;
  year: string;
  semester: string;
  batch: string;
};

export default function AddStudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<StudentInput[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [result, setResult] = useState<{ success: number; failed: number; total: number; errors: any[] } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = results.data.map((row: any) => ({
          id: Math.random().toString(36).substring(7),
          name: row.name || row.Name || "",
          roll_number: row.roll_number || row.Roll_Number || row.RollNumber || "",
          email: row.email || row.Email || "",
          password: row.password || row.Password || "",
          department: row.department || row.Department || "",
          year: row.year || row.Year || "",
          semester: row.semester || row.Semester || "",
          batch: row.batch || row.Batch || ""
        }));
        setStudents(parsed);
      }
    });
    // Reset file input so same file can be uploaded again if needed
    e.target.value = '';
  };

  const handleAddRow = () => {
    setStudents([
      ...students,
      {
        id: Math.random().toString(36).substring(7),
        name: "",
        roll_number: "",
        email: "",
        password: "",
        department: "",
        year: "",
        semester: "",
        batch: ""
      }
    ]);
  };

  const handleRemoveRow = (idToRemove: string) => {
    setStudents(students.filter(s => s.id !== idToRemove));
  };

  const handleChange = (id: string, field: keyof StudentInput, value: string) => {
    setStudents(students.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSubmit = async () => {
    // Basic validation
    const validStudents = students.filter(s => s.name && s.email && s.roll_number);
    if (validStudents.length === 0) {
      alert("Please ensure at least one row has a Name, Email, and Roll Number filled in.");
      return;
    }
    if (validStudents.length !== students.length) {
      const confirmMsg = confirm(`${students.length - validStudents.length} rows are missing required fields (Name/Email/Roll) and will be ignored. Continue?`);
      if (!confirmMsg) return;
    }

    setIsSubmitting(true);
    setResult(null);
    setProgress({ current: 0, total: validStudents.length });

    let successCount = 0;
    let failedCount = 0;
    let errors: any[] = [];

    for (let i = 0; i < validStudents.length; i++) {
      // Artificially slow it down so the user can see the progress
      await new Promise(r => setTimeout(r, 600)); 

      const response = await addStudentsAction([validStudents[i]]);
      
      if (response.success && response.successCount && response.successCount > 0) {
        successCount++;
      } else {
        failedCount++;
        if (response.errors && response.errors.length > 0) {
          errors.push(...response.errors);
        } else {
          errors.push({ email: validStudents[i].email, error: response.error || "Failed" });
        }
      }

      setProgress({ current: i + 1, total: validStudents.length });
    }

    setIsSubmitting(false);
    setProgress(null);
    setResult({
      success: successCount,
      failed: failedCount,
      total: validStudents.length,
      errors
    });
  };

  return (
    <div className="h-full animate-in fade-in slide-in-from-bottom-4 duration-500 w-full pb-20 flex flex-col">
      
      {/* Progress Modal Overlay */}
      {progress && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-lg border-[4px] border-slate-900 shadow-[12px_12px_0_0_#0f172a] overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-500">
            
            {/* Animated Header Pattern */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-emerald-500 border-b-[4px] border-slate-900 flex flex-col items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-600 opacity-80" />
              <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.25) 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
              <div className="absolute inset-0 animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent w-[200%]" />
            </div>

            <div className="relative pt-16 px-8 pb-8 flex flex-col items-center">
              {/* Circular Progress Avatar */}
              <div className="bg-white p-2 rounded-full border-[4px] border-slate-900 shadow-[6px_6px_0_0_#0f172a] relative z-10 mb-8 bg-gradient-to-br from-white to-slate-100">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  {/* SVG Circle Progress */}
                  <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" className="stroke-slate-100 fill-none" strokeWidth="10" />
                    <circle 
                      cx="50" cy="50" r="40" 
                      className="stroke-emerald-500 fill-none transition-all duration-700 ease-out" 
                      strokeWidth="10" 
                      strokeLinecap="round"
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (251.2 * (progress.current / progress.total))}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black text-slate-900">{Math.round((progress.current / progress.total) * 100)}%</span>
                  </div>
                </div>
              </div>

              <h3 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Importing Data...</h3>
              <div className="flex items-center gap-3 mb-8">
                <span className="font-bold text-slate-500 text-lg">Student</span>
                <span className="inline-flex items-center justify-center min-w-[3rem] bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-xl border-[3px] border-slate-900 font-black shadow-[2px_2px_0_0_#0f172a]">
                  {progress.current}
                </span>
                <span className="font-bold text-slate-500 text-lg">of</span>
                <span className="inline-flex items-center justify-center min-w-[3rem] bg-slate-100 text-slate-800 px-3 py-1.5 rounded-xl border-[3px] border-slate-900 font-black shadow-[2px_2px_0_0_#0f172a]">
                  {progress.total}
                </span>
              </div>

              <div className="w-full bg-rose-50 border-[3px] border-slate-900 p-5 rounded-2xl flex flex-col sm:flex-row items-center sm:items-start gap-4 shadow-[4px_4px_0_0_#0f172a] text-center sm:text-left">
                <div className="bg-rose-500 p-3 rounded-xl border-[3px] border-slate-900 animate-pulse shadow-[2px_2px_0_0_#9f1239]">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-slate-900 text-sm uppercase tracking-widest mb-1">Do Not Close Tab</h4>
                  <p className="text-rose-700 font-bold text-sm leading-snug">Interrupting this process may result in partial data imports. Please wait.</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link 
            href="/faculty/dashboard/search"
            className="flex items-center gap-2 mb-2 text-sm font-black text-slate-500 hover:text-slate-900 transition-colors w-max"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Search
          </Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Bulk Add Students</h1>
        </div>
        
        {students.length > 0 && !result && (
          <div className="flex gap-3 w-full sm:w-auto">
             <button 
                onClick={handleAddRow}
                className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-white text-slate-900 px-4 py-3 rounded-xl border-[3px] border-slate-900 font-black shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0f172a] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all"
              >
                <Plus className="h-5 w-5" /> Add Row
              </button>
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-emerald-500 text-white px-6 py-3 rounded-xl border-[3px] border-slate-900 font-black shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0f172a] hover:bg-emerald-600 active:translate-x-0 active:translate-y-0 active:shadow-none transition-all disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                {isSubmitting ? "Saving..." : "Save All"}
              </button>
          </div>
        )}
      </div>

      {result ? (
        <div className="bg-white p-8 rounded-2xl border-[3px] border-slate-900 shadow-[8px_8px_0_0_#0f172a] animate-in zoom-in-95 duration-300 max-w-3xl mx-auto w-full mt-10">
          <div className={`p-6 rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] mb-6 ${result.success > 0 ? 'bg-emerald-100' : 'bg-rose-100'}`}>
            <div className="flex items-center gap-3 mb-2">
              {result.success > 0 ? <CheckCircle2 className="h-8 w-8 text-emerald-600" /> : <AlertCircle className="h-8 w-8 text-rose-600" />}
              <h3 className="text-2xl font-black text-slate-900">Import Complete</h3>
            </div>
            <p className="font-bold text-slate-700 text-lg">
              Successfully created: <span className="text-emerald-700 font-black text-2xl">{result.success}</span> / {result.total}
            </p>
            {result.failed > 0 && (
              <p className="font-bold text-slate-700 text-lg mt-1">
                Failed: <span className="text-rose-700 font-black">{result.failed}</span>
              </p>
            )}
          </div>

          {result.errors.length > 0 && (
            <div className="bg-rose-50 p-6 rounded-xl border-[3px] border-slate-900 max-h-64 overflow-y-auto mb-6 shadow-inner">
              <h4 className="font-black text-slate-900 mb-3 text-lg">Error Log:</h4>
              <ul className="space-y-3">
                {result.errors.map((err, idx) => (
                  <li key={idx} className="text-sm font-bold text-rose-800 bg-white p-3 rounded-lg border-2 border-rose-200 flex flex-col">
                    <span className="font-black text-slate-900 mb-1">{err.email}</span>
                    <span>{err.error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-4">
            <button 
              onClick={() => {
                setResult(null);
                setStudents([]);
              }}
              className="flex-1 bg-white text-slate-900 px-6 py-4 rounded-xl border-[3px] border-slate-900 font-black shadow-[4px_4px_0_0_#0f172a] hover:bg-slate-50 transition-all text-center"
            >
              Upload Another File
            </button>
            <Link 
              href="/faculty/dashboard/search"
              className="flex-1 bg-blue-600 text-white px-6 py-4 rounded-xl border-[3px] border-slate-900 font-black shadow-[4px_4px_0_0_#0f172a] hover:bg-blue-700 transition-all text-center"
            >
              Go to Database
            </Link>
          </div>
        </div>
      ) : students.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-full max-w-2xl">
            <div className="bg-blue-50 p-6 rounded-2xl border-[3px] border-blue-900 flex flex-col sm:flex-row items-center gap-6 mb-8 shadow-[8px_8px_0_0_#1e3a8a]">
              <div className="bg-white p-4 border-[3px] border-blue-900 rounded-xl shadow-[4px_4px_0_0_#1e3a8a]">
                <FileDown className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-center sm:text-left">
                <h4 className="font-black text-xl text-slate-900 mb-1">Download Template</h4>
                <p className="text-sm font-bold text-slate-600 mb-3">Ensure your Excel/CSV matches our expected columns.</p>
                <a href="/sample-students.csv" download className="inline-block bg-blue-600 text-white font-black px-4 py-2 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#0f172a] transition-all text-sm">Download sample-students.csv</a>
              </div>
            </div>

            <div className="relative bg-white border-[4px] border-dashed border-slate-400 hover:border-blue-500 hover:bg-blue-50 transition-colors rounded-3xl p-16 text-center cursor-pointer group">
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="bg-slate-100 group-hover:bg-blue-100 p-6 rounded-full w-max mx-auto mb-6 transition-colors">
                <Upload className="h-12 w-12 text-slate-500 group-hover:text-blue-600 transition-colors" />
              </div>
              <h3 className="font-black text-2xl text-slate-900 mb-2">Drop your CSV file here</h3>
              <p className="font-bold text-slate-500">or click to browse from your computer</p>
              
              <div className="mt-8 flex items-center justify-center gap-4">
                <div className="h-px bg-slate-300 w-16"></div>
                <span className="font-black text-slate-400 uppercase tracking-widest text-sm">OR</span>
                <div className="h-px bg-slate-300 w-16"></div>
              </div>
              <button 
                onClick={handleAddRow}
                className="mt-6 relative z-20 bg-slate-900 text-white px-6 py-3 rounded-xl font-black shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0f172a] transition-all"
              >
                Start from scratch
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-2xl border-[3px] border-slate-900 shadow-[8px_8px_0_0_#0f172a] overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="bg-slate-100 border-b-[3px] border-slate-900">
                <tr>
                  <th className="p-4 font-black text-slate-900 border-r-[3px] border-slate-900 min-w-[200px]">Name *</th>
                  <th className="p-4 font-black text-slate-900 border-r-[3px] border-slate-900 min-w-[220px]">Email *</th>
                  <th className="p-4 font-black text-slate-900 border-r-[3px] border-slate-900 min-w-[160px]">Roll No *</th>
                  <th className="p-4 font-black text-slate-900 border-r-[3px] border-slate-900 w-28">Dept</th>
                  <th className="p-4 font-black text-slate-900 border-r-[3px] border-slate-900 w-24">Year</th>
                  <th className="p-4 font-black text-slate-900 border-r-[3px] border-slate-900 w-28">Sem</th>
                  <th className="p-4 font-black text-slate-900 border-r-[3px] border-slate-900 w-32">Batch</th>
                  <th className="p-4 font-black text-slate-900 w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y-[3px] divide-slate-900">
                {students.map((student, idx) => (
                  <tr key={student.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="p-0 border-r-[3px] border-slate-900">
                      <input 
                        type="text" 
                        value={student.name}
                        onChange={(e) => handleChange(student.id!, "name", e.target.value)}
                        placeholder="Required"
                        className="w-full p-4 bg-transparent outline-none font-bold focus:bg-emerald-50 focus:ring-inset focus:ring-4 focus:ring-emerald-500/20 placeholder-rose-300"
                      />
                    </td>
                    <td className="p-0 border-r-[3px] border-slate-900">
                      <input 
                        type="email" 
                        value={student.email}
                        onChange={(e) => handleChange(student.id!, "email", e.target.value)}
                        placeholder="Required"
                        className="w-full p-4 bg-transparent outline-none font-bold focus:bg-emerald-50 focus:ring-inset focus:ring-4 focus:ring-emerald-500/20 placeholder-rose-300"
                      />
                    </td>
                    <td className="p-0 border-r-[3px] border-slate-900">
                      <input 
                        type="text" 
                        value={student.roll_number}
                        onChange={(e) => handleChange(student.id!, "roll_number", e.target.value)}
                        placeholder="Required"
                        className="w-full p-4 bg-transparent outline-none font-bold focus:bg-emerald-50 focus:ring-inset focus:ring-4 focus:ring-emerald-500/20 placeholder-rose-300"
                      />
                    </td>
                    <td className="p-0 border-r-[3px] border-slate-900">
                      <input 
                        type="text" 
                        value={student.department}
                        onChange={(e) => handleChange(student.id!, "department", e.target.value)}
                        className="w-full p-4 bg-transparent outline-none font-bold focus:bg-emerald-50 focus:ring-inset focus:ring-4 focus:ring-emerald-500/20"
                      />
                    </td>
                    <td className="p-0 border-r-[3px] border-slate-900">
                      <input 
                        type="text" 
                        value={student.year}
                        onChange={(e) => handleChange(student.id!, "year", e.target.value)}
                        className="w-full p-4 bg-transparent outline-none font-bold focus:bg-emerald-50 focus:ring-inset focus:ring-4 focus:ring-emerald-500/20"
                      />
                    </td>
                    <td className="p-0 border-r-[3px] border-slate-900">
                      <input 
                        type="text" 
                        value={student.semester}
                        onChange={(e) => handleChange(student.id!, "semester", e.target.value)}
                        className="w-full p-4 bg-transparent outline-none font-bold focus:bg-emerald-50 focus:ring-inset focus:ring-4 focus:ring-emerald-500/20"
                      />
                    </td>
                    <td className="p-0 border-r-[3px] border-slate-900">
                      <input 
                        type="text" 
                        value={student.batch}
                        onChange={(e) => handleChange(student.id!, "batch", e.target.value)}
                        className="w-full p-4 bg-transparent outline-none font-bold focus:bg-emerald-50 focus:ring-inset focus:ring-4 focus:ring-emerald-500/20"
                      />
                    </td>
                    <td className="p-0 text-center relative">
                      <button 
                        onClick={() => handleRemoveRow(student.id!)}
                        className="mx-auto flex items-center justify-center p-2 text-rose-500 hover:text-white hover:bg-rose-500 rounded-lg transition-colors border-2 border-transparent hover:border-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
