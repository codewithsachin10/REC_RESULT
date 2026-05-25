"use client";

import { useState, useEffect } from "react";
import { BookOpen, FileCode2, ArrowLeft, Edit3, CheckCircle2, UploadCloud, Loader2, X, AlertTriangle, Trash2, Info, Eye, EyeOff, Clock } from "lucide-react";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/client";
import { sendTelegramNotification } from "@/app/actions/telegramActions";
import { createUploadLog, publishMarksChunk } from "@/app/actions/uploadActions";

type UploadState = "idle" | "dragging" | "parsing" | "preview" | "uploading" | "success";
type RowStatus = "valid" | "warning" | "error";

interface PythonBreakdown {
  mcq: number;
  q1: number;
  q2: number;
  q3: number;
}

interface ParsedRow {
  id: string; // unique string for rendering keys
  roll_number: string;
  name: string;
  score: number;
  pythonBreakdown?: PythonBreakdown;
  status: RowStatus;
  errors: string[];
  warnings: string[];
  willOverwrite: boolean;
  dbStudentId?: string;
  dbMarkId?: string;
  existingBreakdown?: any; // To preserve other units' breakdown
}

interface ActiveUpload {
  subjectName: string;
  subjectCode: string;
  subjectShort: string;
  unitKey: "unit_test_1" | "unit_test_2" | "unit_test_3" | "unit_test_4" | "unit_test_5";
  unitLabel: string;
}

const SUBJECTS = [
  {
    name: "Data Structures and Algorithms",
    code: "CS301",
    short: "DSA",
    icon: BookOpen,
    color: "bg-blue-100 text-blue-900 border-blue-900",
    units: [
      { label: "Unit 1", key: "unit_test_1" },
      { label: "Unit 2", key: "unit_test_2" },
      { label: "Unit 3", key: "unit_test_3" },
      { label: "Unit 4", key: "unit_test_4" },
      { label: "Unit 5", key: "unit_test_5" },
    ]
  },
  {
    name: "Python Programming",
    code: "CS302",
    short: "Python",
    icon: FileCode2,
    color: "bg-emerald-100 text-emerald-900 border-emerald-900",
    units: [
      { label: "Unit 1", key: "unit_test_1" },
      { label: "Unit 2", key: "unit_test_2" },
      { label: "Unit 3", key: "unit_test_3" },
      { label: "Unit 4", key: "unit_test_4" },
      { label: "Unit 5", key: "unit_test_5" },
    ]
  }
];

export default function ResultUploadPage() {
  const [activeUpload, setActiveUpload] = useState<ActiveUpload | null>(null);
  
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [showModal, setShowModal] = useState(false);

  // New States
  const [disabledUnits, setDisabledUnits] = useState<string[]>([]);
  const [uploadedStudents, setUploadedStudents] = useState<any[]>([]);
  const [isLoadingUploaded, setIsLoadingUploaded] = useState(false);
  
  const [unitTopics, setUnitTopics] = useState<Record<string, string>>({});
  const [editingTopicsFor, setEditingTopicsFor] = useState<{subjectCode: string, unitKey: string, currentText: string} | null>(null);

  const [viewLogs, setViewLogs] = useState<any[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('disabledUnits');
    if (stored) setDisabledUnits(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (!activeUpload) return;
    const fetchUploaded = async () => {
      setIsLoadingUploaded(true);
      const supabase = createClient();
      const { data: marks } = await supabase.from('marks').select('*').eq('subject_name', activeUpload.subjectName);
      const { data: profiles } = await supabase.from('profiles').select('*').eq('role', 'student');

      if (marks && profiles) {
        const published: any[] = [];
        marks.forEach((m: any) => {
          const score = m[activeUpload.unitKey];
          if (score !== null && score !== undefined) {
             const p = profiles.find((prof: any) => prof.id === m.student_id);
             if (p) {
               published.push({
                 id: m.id,
                 roll_number: p.roll_number,
                 name: p.name,
                 score: score,
                 breakdown: m.breakdown?.[activeUpload.unitKey] || null
               });
             }
          }
        });
        // Sort by roll number, handling null safely
        published.sort((a, b) => String(a.roll_number || "").localeCompare(String(b.roll_number || "")));
        setUploadedStudents(published);
      }

      // Fetch view logs for this subject + unit
      const { data: views } = await supabase
        .from('mark_views')
        .select('student_id, viewed_at')
        .eq('subject_code', activeUpload.subjectCode)
        .eq('unit_key', activeUpload.unitKey);
      
      if (views && profiles) {
        const logsWithNames = views.map((v: any) => {
          const p = profiles.find((prof: any) => prof.id === v.student_id);
          return {
            student_id: v.student_id,
            name: p?.name || 'Unknown',
            roll_number: p?.roll_number || 'N/A',
            viewed_at: v.viewed_at,
          };
        }).sort((a: any, b: any) => new Date(b.viewed_at).getTime() - new Date(a.viewed_at).getTime());
        setViewLogs(logsWithNames);
      } else {
        setViewLogs([]);
      }

      setIsLoadingUploaded(false);
    };
    fetchUploaded();
  }, [activeUpload, uploadState]);

  const toggleUnitStatus = (subjectCode: string, unitKey: string) => {
    const key = `${subjectCode}-${unitKey}`;
    setDisabledUnits(prev => {
      const newArr = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      localStorage.setItem('disabledUnits', JSON.stringify(newArr));
      return newArr;
    });
  };

  useEffect(() => {
    const fetchTopics = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from('unit_topics').select('*');
      if (!error && data) {
        const topicsMap: Record<string, string> = {};
        data.forEach((row: any) => {
          topicsMap[row.id] = row.topics;
        });
        setUnitTopics(topicsMap);
      }
    };
    fetchTopics();
  }, []);

  const saveTopics = async () => {
    if (!editingTopicsFor) return;
    const key = `${editingTopicsFor.subjectCode}-${editingTopicsFor.unitKey}`;
    const newTopics = editingTopicsFor.currentText;
    
    // Optimistic update
    setUnitTopics(prev => ({ ...prev, [key]: newTopics }));
    setEditingTopicsFor(null);
    
    const supabase = createClient();
    await supabase.from('unit_topics').upsert({
      id: key,
      topics: newTopics
    });
  };

  const startUpload = (subjectName: string, subjectCode: string, subjectShort: string, unitKey: string, unitLabel: string) => {
    setActiveUpload({
      subjectName,
      subjectCode,
      subjectShort,
      unitKey: unitKey as any,
      unitLabel
    });
    resetUpload();
  };

  const processFile = (file: File) => {
    setUploadState("parsing");
    
    // Switch to header: false so we can heuristically parse headerless CSVs too!
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: async (results) => {
        await asyncValidate(results.data as string[][]);
      },
      error: (error) => {
        console.error(error);
        setUploadState("idle");
        alert("Failed to parse file. Please ensure it's a valid CSV.");
      }
    });
  };

  const calculateSimilarity = (s1: string, s2: string) => {
    const words1 = s1.toLowerCase().split(/\s+/);
    const words2 = s2.toLowerCase().split(/\s+/);
    return words1.some(w => words2.includes(w)) || s1.toLowerCase().includes(s2.toLowerCase()) || s2.toLowerCase().includes(s1.toLowerCase());
  }

  const asyncValidate = async (rawRows: string[][]) => {
    if (!activeUpload) return;
    
    // Artificial delay for UX
    await new Promise(r => setTimeout(r, 1500));
    
    const supabase = createClient();
    
    const { data: profiles } = await supabase.from('profiles').select('*').eq('role', 'student');
    const { data: marks } = await supabase.from('marks').select('*').eq('subject_name', activeUpload.subjectName);

    const profileRollMap = new Map((profiles || []).map((p: any) => [p.roll_number, p]));
    const profileNameMap = new Map();
    (profiles || []).forEach((p: any) => {
      if (p.name) {
        const key = p.name.toLowerCase().trim();
        const existing = profileNameMap.get(key);
        if (!existing || (!existing.roll_number && p.roll_number)) {
          profileNameMap.set(key, p);
        }
      }
    });
    const marksMap = new Map((marks || []).map((m: any) => [m.student_id, m]));

    // HEURISTIC PARSING LOGIC
    let dataRows = rawRows;
    let hasHeader = false;
    let headerMap: Record<string, number> = {};

    if (rawRows.length > 0) {
      const firstRow = rawRows[0].map(c => String(c).trim().toLowerCase());
      hasHeader = firstRow.some(c => c.includes('roll') || c.includes('reg') || c.includes('name') || c.includes('score') || c.includes('mark') || c.includes('q1'));
      if (hasHeader) {
         dataRows = rawRows.slice(1);
         firstRow.forEach((col, idx) => { headerMap[col] = idx; });
      }
    }

    const getValByHeader = (row: string[], possibleHeaders: string[]) => {
       for (const h of possibleHeaders) {
          const exactMatchKey = Object.keys(headerMap).find(k => k === h.toLowerCase());
          if (exactMatchKey) return row[headerMap[exactMatchKey]];
          const includesMatchKey = Object.keys(headerMap).find(k => k.includes(h.toLowerCase()));
          if (includesMatchKey) return row[headerMap[includesMatchKey]];
       }
       return undefined;
    }

    const validatedRows: ParsedRow[] = [];

    for (let index = 0; index < dataRows.length; index++) {
      // Yield to the event loop every 50 rows to keep the UI responsive!
      if (index > 0 && index % 50 === 0) await new Promise(r => setTimeout(r, 0));

      const rowArr = dataRows[index];
      let roll = "";
      let name = "";
      let scoreRaw: string | undefined = undefined;
      let mcqRaw: string | undefined = undefined;
      let q1Raw: string | undefined = undefined;
      let q2Raw: string | undefined = undefined;
      let q3Raw: string | undefined = undefined;

      if (hasHeader) {
         roll = getValByHeader(rowArr, ['roll', 'register', 'reg']) || "";
         name = getValByHeader(rowArr, ['name']) || "";
         scoreRaw = getValByHeader(rowArr, ['total', 'score', 'mark']);
         mcqRaw = getValByHeader(rowArr, ['mcq']);
         q1Raw = getValByHeader(rowArr, ['q1', 'coding 1']);
         q2Raw = getValByHeader(rowArr, ['q2', 'coding 2']);
         q3Raw = getValByHeader(rowArr, ['q3', 'coding 3']);
      } else {
         // Super smart heuristic parsing for headerless CSVs
         const rollIndex = rowArr.findIndex(c => String(c).replace(/\D/g, '').length >= 6);
         if (rollIndex !== -1) roll = rowArr[rollIndex];
         
         const nameIndex = rowArr.findIndex((c, i) => i !== rollIndex && !String(c).includes('@') && !/\d/.test(String(c)) && String(c).trim().length > 2);
         if (nameIndex !== -1) name = rowArr[nameIndex];

         const numericValues = rowArr
            .map((c, i) => ({ val: Number(String(c).trim()), idx: i, raw: String(c).trim() }))
            .filter(x => !isNaN(x.val) && x.raw !== "" && x.idx !== rollIndex);
         
         if (activeUpload.subjectShort === "Python") {
            if (numericValues.length >= 5) {
               const last5 = numericValues.slice(-5);
               scoreRaw = String(last5[0].val);
               mcqRaw = String(last5[1].val);
               q1Raw = String(last5[2].val);
               q2Raw = String(last5[3].val);
               q3Raw = String(last5[4].val);
            } else if (numericValues.length > 0) {
               scoreRaw = String(numericValues[0].val);
            }
         } else {
            if (numericValues.length > 0) scoreRaw = String(numericValues[0].val);
         }
      }

      roll = String(roll).trim().toUpperCase();
      name = String(name).trim();
      let score = Number(scoreRaw);

      let pythonBreakdown: PythonBreakdown | undefined = undefined;
      let breakdownSumError = false;
      let calculatedTotal = 0;
      
      if (activeUpload.subjectShort === "Python") {
        const mcq = Number(mcqRaw || 0);
        const q1 = Number(q1Raw || 0);
        const q2 = Number(q2Raw || 0);
        const q3 = Number(q3Raw || 0);
        pythonBreakdown = { mcq, q1, q2, q3 };
        
        calculatedTotal = mcq + q1 + q2 + q3;
        
        if (scoreRaw === undefined || scoreRaw === "" || isNaN(score)) {
           score = calculatedTotal;
           scoreRaw = String(score);
        } else if (score !== calculatedTotal && calculatedTotal > 0) {
           breakdownSumError = true;
        }
      }

      const row: ParsedRow = {
        id: `row-${index}-${Date.now()}`,
        roll_number: roll,
        name: name,
        score: isNaN(score) ? 0 : score,
        pythonBreakdown,
        status: "valid",
        errors: [],
        warnings: [],
        willOverwrite: false
      };

      if (scoreRaw === undefined || scoreRaw === "") row.errors.push("Missing Score/Total Marks");
      else if (isNaN(score)) row.errors.push(`Invalid Score Format: "${scoreRaw}"`);
      else if (score < 0 || score > 100) row.errors.push(`Score out of bounds (0-100): got ${score}`);

      if (breakdownSumError) {
         row.errors.push(`Marks mismatch: CSV Total is ${score}, but MCQ+Q1+Q2+Q3 sum is ${calculatedTotal}`);
      }

      let profile = null;
      if (!roll) {
        if (!name) {
          row.errors.push("Missing both Roll Number and Name");
        } else {
          const match = profileNameMap.get(name.toLowerCase());
          if (match) {
            row.roll_number = match.roll_number;
            profile = match;
            if (match.roll_number) {
              row.warnings.push(`Auto-filled Roll Number (${match.roll_number}) via Name match`);
            } else {
              row.warnings.push(`Matched by name, but Roll Number is missing in database. Results will still be saved.`);
            }
          } else {
            row.errors.push(`Name "${name}" not found in DB & missing Roll Number`);
          }
        }
      } else {
        profile = profileRollMap.get(roll);
        if (!profile) {
          row.errors.push(`Roll Number "${roll}" not found in Student DB`);
        } else if (name) {
          if (!calculateSimilarity(profile.name, name)) {
            row.warnings.push(`Name mismatch: CSV says "${name}" but DB says "${profile.name}"`);
          }
        }
      }

      if (profile) {
        row.dbStudentId = profile.id;
        const markRecord = marksMap.get(profile.id);
        if (markRecord) {
          row.dbMarkId = markRecord.id;
          row.existingBreakdown = markRecord.breakdown || {};
          if (markRecord[activeUpload.unitKey] != null) {
            row.warnings.push(`Marks already exist for ${activeUpload.unitLabel} (${markRecord[activeUpload.unitKey]}). Require manual Overwrite approval.`);
          }
        }
      }

      if (row.errors.length > 0) row.status = "error";
      else if (row.warnings.length > 0) row.status = "warning";

      validatedRows.push(row);
    }

    setParsedData(validatedRows);
    setUploadState("preview");
  };

  const removeRow = (id: string) => {
    setParsedData(prev => prev.filter(r => r.id !== id));
  };

  const removeAllErrors = () => {
    setParsedData(prev => prev.filter(r => r.status !== "error"));
  };

  const toggleOverwrite = (id: string) => {
    setParsedData(prev => prev.map(r => r.id === id ? { ...r, willOverwrite: !r.willOverwrite } : r));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setUploadState("dragging");
  };

  const handleDragLeave = () => {
    setUploadState("idle");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.type === "text/csv" || file.name.endsWith(".csv") || file.type === "application/vnd.ms-excel")) {
      processFile(file);
    } else {
      setUploadState("idle");
      alert("Only CSV files are supported currently.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handlePublish = async () => {
    if (!activeUpload) return;
    
    const rowsToProcess = parsedData.filter(r => {
      if (r.status === "error") return false;
      if (r.status === "warning") {
        const hasDuplicateWarning = r.warnings.some(w => w.includes("Marks already exist"));
        if (hasDuplicateWarning && !r.willOverwrite) return false;
      }
      return true;
    });

    if (rowsToProcess.length === 0) {
      alert("No valid rows to process.");
      setShowModal(false);
      return;
    }

    setUploadState("uploading");
    setShowModal(false);
    
    try {
      // 1. Create the Upload Log for undo history
      const uploadId = await createUploadLog(activeUpload.subjectCode, activeUpload.subjectName, activeUpload.unitKey);
      
      // 2. Chunk rows to prevent hitting 1MB Server Action limits
      const CHUNK_SIZE = 100;
      for (let i = 0; i < rowsToProcess.length; i += CHUNK_SIZE) {
        const chunk = rowsToProcess.slice(i, i + CHUNK_SIZE);
        
        // Publish this chunk to database via Server Action
        await publishMarksChunk(uploadId, activeUpload.subjectCode, activeUpload.subjectName, activeUpload.unitKey, chunk);
        
        // Notify students via Telegram (non-blocking, batched)
        chunk.forEach((row, idx) => {
          if (!row.dbStudentId) return;
          // Stagger telegram messages to avoid API rate limits
          setTimeout(() => {
            sendTelegramNotification(
              row.dbStudentId as string,
              `<b>📊 Result Published</b>\nYour result for <i>${activeUpload.subjectName} - ${activeUpload.unitLabel}</i> is now available.\n\nScore: <b>${row.score}</b>`
            ).catch(console.error);
          }, idx * 100); 
        });
        
        // Yield between chunks
        await new Promise(r => setTimeout(r, 0));
      }

      setUploadState("success");
    } catch (err: any) {
      console.error(err);
      alert("An error occurred while publishing results: " + err.message);
      setUploadState("preview");
    }
  };

  const resetUpload = () => {
    setUploadState("idle");
    setParsedData([]);
  };

  const cancelUploadFlow = () => {
    setActiveUpload(null);
    resetUpload();
  };

  const validCount = parsedData.filter(r => r.status === "valid").length;
  const errorCount = parsedData.filter(r => r.status === "error").length;
  const warningCount = parsedData.filter(r => r.status === "warning").length;
  const readyToPublishCount = parsedData.filter(r => {
    if (r.status === "error") return false;
    if (r.status === "warning") {
      const hasDuplicateWarning = r.warnings.some(w => w.includes("Marks already exist"));
      if (hasDuplicateWarning && !r.willOverwrite) return false;
    }
    return true;
  }).length;

  if (!activeUpload) {
    return (
      <div className="max-w-7xl mx-auto pb-12 space-y-12 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Select Assessment</h2>
            <p className="text-slate-500 font-bold mt-1">Choose a subject and unit to upload CSV results.</p>
          </div>
          <a href="/faculty/dashboard/upload/history" className="flex items-center gap-2 px-5 py-3 bg-blue-100 text-blue-900 border-[3px] border-slate-900 rounded-xl shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0f172a] transition-all font-bold">
            Upload History & Undo
          </a>
        </div>

        {SUBJECTS.map((subject) => {
          const Icon = subject.icon;
          return (
            <div key={subject.code} className="space-y-6">
              <div className="flex items-center gap-3 border-b-[3px] border-slate-900 pb-4">
                <div className={`p-3 border-[3px] shadow-[2px_2px_0_0_#0f172a] rounded-xl ${subject.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">{subject.name}</h3>
                  <p className="text-sm font-bold text-slate-500">{subject.code}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {subject.units.map((unit) => {
                  const key = `${subject.code}-${unit.key}`;
                  const isActive = !disabledUnits.includes(key);
                  return (
                    <div 
                      key={unit.key}
                      onClick={() => startUpload(subject.name, subject.code, subject.short, unit.key, unit.label)}
                      className={`cursor-pointer border-[3px] border-slate-900 p-8 pt-10 rounded-2xl shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[8px_8px_0_0_#0f172a] transition-all text-center flex flex-col items-center justify-between gap-6 group min-h-[220px] ${isActive ? "bg-white hover:bg-slate-50" : "bg-slate-100 opacity-80 hover:bg-white"}`}
                    >
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className={`h-16 w-16 border-[3px] border-slate-900 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ${isActive ? "bg-slate-100 text-slate-900" : "bg-slate-300 text-slate-600"}`}>
                          <span className="font-black text-2xl">{unit.label.split(" ")[1]}</span>
                        </div>
                        <span className={`font-black text-xl ${isActive ? "text-slate-900" : "text-slate-600"}`}>{unit.label}</span>
                        {unitTopics[key] && (
                          <p className="text-xs font-bold text-slate-500 mt-2 line-clamp-2 px-2">
                            {unitTopics[key]}
                          </p>
                        )}
                      </div>
                      <div className="w-full flex gap-2 mt-auto">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleUnitStatus(subject.code, unit.key); }}
                          className={`w-full text-xs font-black px-4 py-2 rounded-xl border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all ${
                            isActive 
                              ? "bg-emerald-300 text-emerald-900 hover:shadow-[4px_4px_0_0_#0f172a]" 
                              : "bg-slate-300 text-slate-700 hover:shadow-[4px_4px_0_0_#0f172a]"
                          }`}
                        >
                          {isActive ? "STATUS: ACTIVE" : "STATUS: DISABLED"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        })}
      </div>
    );
  }

  const isPython = activeUpload.subjectShort === "Python";

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-6 animate-in slide-in-from-right-4 duration-300">
      
      <div className="flex items-center gap-4 flex-wrap">
        <button 
          onClick={cancelUploadFlow}
          className="p-2 border-[3px] border-slate-900 bg-white rounded-lg shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-slate-900 shrink-0"
        >
          <ArrowLeft className="h-5 w-5 font-bold" />
        </button>
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-4 flex-wrap">
            <span>{activeUpload.subjectShort || activeUpload.subjectName} <span className="text-blue-600">—</span> {activeUpload.unitLabel}</span>
            <button
              onClick={() => {
                const key = `${activeUpload.subjectCode}-${activeUpload.unitKey}`;
                setEditingTopicsFor({ subjectCode: activeUpload.subjectCode, unitKey: activeUpload.unitKey, currentText: unitTopics[key] || "" }); 
              }}
              className="text-sm font-black px-3 py-1.5 rounded-lg border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#0f172a] transition-all bg-amber-300 text-slate-900 flex items-center gap-2"
            >
              <Edit3 className="h-4 w-4" /> Edit Topics
            </button>
          </h2>
          <p className="text-slate-500 font-bold mt-1">Upload CSV scores for this specific unit assessment.</p>
        </div>
        
        {uploadState === "preview" && (
          <div className="ml-auto flex gap-3 flex-wrap">
            <button 
              onClick={resetUpload}
              className="px-4 py-2 text-sm font-black text-slate-900 bg-white border-[3px] border-slate-900 rounded-lg shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#0f172a] transition-all"
            >
              Start Over
            </button>
            <button 
              onClick={() => setShowModal(true)}
              disabled={readyToPublishCount === 0}
              className="px-4 py-2 text-sm font-black text-white bg-blue-600 border-[3px] border-slate-900 rounded-lg shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#0f172a] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
            >
              <CheckCircle2 className="h-4 w-4" />
              Review ({readyToPublishCount} ready)
            </button>
          </div>
        )}
      </div>

      {(uploadState === "idle" || uploadState === "dragging") && (
        <div className="space-y-8">
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-[3px] border-dashed rounded-2xl p-16 flex flex-col items-center justify-center text-center transition-all duration-200 shadow-[4px_4px_0_0_#0f172a] ${
              uploadState === "dragging" 
                ? "border-blue-500 bg-blue-50" 
                : "border-slate-900 bg-white hover:bg-slate-50"
            }`}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            <div className={`h-20 w-20 rounded-full border-[3px] flex items-center justify-center mb-6 transition-colors ${
              uploadState === "dragging"
                ? "bg-blue-100 border-blue-500 text-blue-600"
                : "bg-blue-50 border-slate-900 text-slate-900"
            }`}>
              <UploadCloud className={`h-10 w-10 ${uploadState === "dragging" ? "animate-bounce" : ""}`} />
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 mb-2">
              {uploadState === "dragging" ? "Drop file to upload" : "Drag and drop your file here"}
            </h3>
            <p className="text-slate-500 font-bold mb-6">Supported formats: .csv only.</p>
            
            <div className={`border-2 rounded-lg p-3 text-sm font-bold text-left w-full max-w-sm mb-6 ${isPython ? 'bg-emerald-50 border-emerald-900 text-emerald-900' : 'bg-blue-50 border-blue-900 text-blue-900'}`}>
              <span className="font-black">{activeUpload.subjectShort} Format:</span> Roll Number, Total Marks{isPython ? ", MCQ Marks, Coding Q1, Coding Q2, Coding Q3." : "."}
            </div>
            
            <button className="bg-slate-900 text-white font-black px-8 py-3 rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0f172a] transition-all pointer-events-none">
              Browse Files
            </button>
          </div>
          
          {/* View Logs Section */}
          <div className="bg-white border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4 border-b-[3px] border-slate-900 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-violet-200 border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a] flex items-center justify-center">
                  <Eye className="h-5 w-5 text-violet-900" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">View Logs</h3>
                  <p className="text-xs font-bold text-slate-500">Students who opened their results</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-violet-100 border-[3px] border-slate-900 px-4 py-2 rounded-xl shadow-[2px_2px_0_0_#0f172a]">
                  <Eye className="h-4 w-4 text-violet-900" />
                  <span className="font-black text-violet-900 text-lg">{viewLogs.length}</span>
                  <span className="font-bold text-violet-700 text-sm">/ {uploadedStudents.length}</span>
                </div>
                {viewLogs.length > 0 && (
                  <button
                    onClick={() => setShowLogs(!showLogs)}
                    className="px-4 py-2 text-sm font-black border-[3px] border-slate-900 rounded-xl shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#0f172a] transition-all bg-white text-slate-900"
                  >
                    {showLogs ? 'Hide Details' : 'View Details'}
                  </button>
                )}
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="w-full bg-slate-100 h-4 border-[3px] border-slate-900 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="bg-violet-400 h-full transition-all duration-500 ease-out"
                  style={{ width: `${uploadedStudents.length > 0 ? (viewLogs.length / uploadedStudents.length) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs font-bold text-slate-500 mt-2">
                {uploadedStudents.length > 0 
                  ? `${((viewLogs.length / uploadedStudents.length) * 100).toFixed(1)}% of students have viewed their marks`
                  : 'No marks uploaded yet'}
              </p>
            </div>

            {/* Not Viewed List */}
            {showLogs && (
              <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                {/* Viewed */}
                <div>
                  <h4 className="text-sm font-black text-emerald-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Eye className="h-4 w-4" /> Viewed ({viewLogs.length})
                  </h4>
                  {viewLogs.length === 0 ? (
                    <p className="text-sm font-bold text-slate-400 italic pl-6">No one has viewed yet.</p>
                  ) : (
                    <div className="overflow-x-auto border-[3px] border-slate-900 rounded-xl max-h-[250px] overflow-y-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-emerald-50 border-b-[3px] border-slate-900 sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-3 font-black text-slate-900">Roll Number</th>
                            <th className="px-4 py-3 font-black text-slate-900">Name</th>
                            <th className="px-4 py-3 font-black text-slate-900">Viewed At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-slate-200">
                          {viewLogs.map((log: any, idx: number) => (
                            <tr key={idx} className="hover:bg-emerald-50/50 transition-colors">
                              <td className="px-4 py-3 font-mono font-black text-slate-900">{log.roll_number}</td>
                              <td className="px-4 py-3 font-bold text-slate-700">{log.name}</td>
                              <td className="px-4 py-3 font-bold text-slate-500 flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                {new Date(log.viewed_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                
                {/* Not Viewed */}
                {(() => {
                  const viewedIds = new Set(viewLogs.map((l: any) => l.student_id));
                  const notViewed = uploadedStudents.filter((s: any) => !viewedIds.has(s.id?.split?.('-')?.[0]) && !viewedIds.has(s.student_id));
                  // We need to match by checking profiles. Let's use roll_number matching instead.
                  const viewedRolls = new Set(viewLogs.map((l: any) => l.roll_number));
                  const notViewedByRoll = uploadedStudents.filter((s: any) => !viewedRolls.has(s.roll_number));
                  
                  return (
                    <div>
                      <h4 className="text-sm font-black text-red-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <EyeOff className="h-4 w-4" /> Not Viewed ({notViewedByRoll.length})
                      </h4>
                      {notViewedByRoll.length === 0 ? (
                        <p className="text-sm font-bold text-emerald-600 pl-6">🎉 Everyone has viewed their marks!</p>
                      ) : (
                        <div className="overflow-x-auto border-[3px] border-slate-900 rounded-xl max-h-[250px] overflow-y-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-red-50 border-b-[3px] border-slate-900 sticky top-0 z-10">
                              <tr>
                                <th className="px-4 py-3 font-black text-slate-900">Roll Number</th>
                                <th className="px-4 py-3 font-black text-slate-900">Name</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-slate-200">
                              {notViewedByRoll.map((s: any, idx: number) => (
                                <tr key={idx} className="hover:bg-red-50/50 transition-colors">
                                  <td className="px-4 py-3 font-mono font-black text-slate-900">{s.roll_number}</td>
                                  <td className="px-4 py-3 font-bold text-slate-700">{s.name}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Uploaded Students List */}
          <div className="bg-white border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] rounded-2xl p-6">
            <h3 className="text-xl font-black text-slate-900 mb-4 border-b-[3px] border-slate-900 pb-2">
              Already Uploaded ({uploadedStudents.length})
            </h3>
            {isLoadingUploaded ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>
            ) : uploadedStudents.length === 0 ? (
              <div className="text-slate-500 font-bold text-center py-8 border-[3px] border-dashed border-slate-300 rounded-xl bg-slate-50">
                No students uploaded for {activeUpload.unitLabel} yet.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[400px] border-[3px] border-slate-900 rounded-xl overflow-y-auto">
                <table className="w-full text-left text-sm relative">
                  <thead className="bg-slate-100 border-b-[3px] border-slate-900 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 font-black text-slate-900">Roll Number</th>
                      <th className="px-6 py-4 font-black text-slate-900">Name</th>
                      {isPython && (
                        <>
                          <th className="px-6 py-4 font-black text-slate-900">MCQ</th>
                          <th className="px-6 py-4 font-black text-slate-900">Q1</th>
                          <th className="px-6 py-4 font-black text-slate-900">Q2</th>
                          <th className="px-6 py-4 font-black text-slate-900">Q3</th>
                        </>
                      )}
                      <th className="px-6 py-4 font-black text-slate-900">Total Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-[3px] divide-slate-900">
                    {uploadedStudents.map((s, idx) => (
                      <tr key={s.id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono font-black text-slate-900">{s.roll_number}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">{s.name}</td>
                        {isPython && (
                          <>
                            <td className="px-6 py-4 font-black text-slate-900">{s.breakdown?.mcq ?? '-'}</td>
                            <td className="px-6 py-4 font-black text-slate-900">{s.breakdown?.q1 ?? '-'}</td>
                            <td className="px-6 py-4 font-black text-slate-900">{s.breakdown?.q2 ?? '-'}</td>
                            <td className="px-6 py-4 font-black text-slate-900">{s.breakdown?.q3 ?? '-'}</td>
                          </>
                        )}
                        <td className="px-6 py-4 font-black text-slate-900">{s.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {uploadState === "parsing" && (
        <div className="border-[3px] border-slate-900 bg-white rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-[4px_4px_0_0_#0f172a]">
          <Loader2 className="h-16 w-16 text-slate-900 animate-spin mb-6" />
          <h3 className="text-2xl font-black text-slate-900">Deep Analyzing CSV...</h3>
          <p className="text-slate-500 font-bold mt-2">Running strict data verification against the Student DB.</p>
          <div className="w-full max-w-md bg-slate-100 h-4 border-[3px] border-slate-900 rounded-full mt-8 overflow-hidden shadow-inner">
            <div className="bg-blue-600 h-full border-r-[3px] border-slate-900 animate-[pulse_1s_ease-in-out_infinite]" style={{ width: '80%' }}></div>
          </div>
        </div>
      )}

      {uploadState === "uploading" && (
        <div className="border-[3px] border-slate-900 bg-white rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-[4px_4px_0_0_#0f172a]">
          <Loader2 className="h-16 w-16 text-blue-600 animate-spin mb-6" />
          <h3 className="text-2xl font-black text-slate-900">Publishing Results...</h3>
          <p className="text-slate-500 font-bold mt-2">Writing records securely to the database.</p>
          <div className="w-full max-w-md bg-slate-100 h-4 border-[3px] border-slate-900 rounded-full mt-8 overflow-hidden shadow-inner">
            <div className="bg-blue-600 h-full border-r-[3px] border-slate-900 animate-[pulse_1s_ease-in-out_infinite]" style={{ width: '60%' }}></div>
          </div>
        </div>
      )}

      {uploadState === "success" && (
        <div className="border-[3px] border-slate-900 bg-emerald-300 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-[4px_4px_0_0_#0f172a]">
          <div className="h-20 w-20 bg-emerald-500 text-emerald-900 border-[3px] border-slate-900 rounded-full flex items-center justify-center mb-6 shadow-[2px_2px_0_0_#0f172a]">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
          <h3 className="text-3xl font-black text-slate-900 mb-2">Upload Successful!</h3>
          <p className="text-emerald-900 font-bold mb-8 text-lg">
            Successfully saved {activeUpload.unitLabel} scores for {readyToPublishCount} students.
          </p>
          <div className="flex gap-4">
            <button 
              onClick={resetUpload}
              className="bg-white border-[3px] border-slate-900 text-slate-900 font-black px-6 py-2.5 rounded-lg shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#0f172a] transition-all"
            >
              Upload Another File
            </button>
            <button 
              onClick={cancelUploadFlow}
              className="bg-slate-900 border-[3px] border-slate-900 text-white font-black px-6 py-2.5 rounded-lg shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#0f172a] transition-all"
            >
              Return to Grid
            </button>
          </div>
        </div>
      )}

      {uploadState === "preview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a]">
              <p className="text-xs font-black text-slate-500 uppercase">Total Rows</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{parsedData.length}</p>
            </div>
            <div className="bg-emerald-300 p-4 rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a]">
              <p className="text-xs font-black text-emerald-900 uppercase">Ready / Valid</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{readyToPublishCount}</p>
            </div>
            <div className={`${warningCount > 0 ? 'bg-amber-300' : 'bg-white'} border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] p-4 rounded-xl`}>
              <p className={`text-xs font-black uppercase ${warningCount > 0 ? 'text-amber-900' : 'text-slate-500'}`}>Conflicts / Warnings</p>
              <p className={`text-2xl font-black mt-1 ${warningCount > 0 ? 'text-amber-900' : 'text-slate-900'}`}>{warningCount}</p>
            </div>
            <div className={`${errorCount > 0 ? 'bg-red-300' : 'bg-white'} border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] p-4 rounded-xl flex flex-col justify-between`}>
              <div>
                <p className={`text-xs font-black uppercase ${errorCount > 0 ? 'text-red-900' : 'text-slate-500'}`}>Critical Errors</p>
                <p className={`text-2xl font-black mt-1 ${errorCount > 0 ? 'text-red-900' : 'text-slate-900'}`}>{errorCount}</p>
              </div>
              {errorCount > 0 && (
                <button onClick={removeAllErrors} className="mt-2 text-xs font-black bg-white border-2 border-red-900 text-red-900 px-2 py-1 rounded-lg hover:bg-red-50 w-fit">
                  Remove All
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] overflow-hidden">
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left text-sm relative">
                <thead className="bg-slate-100 border-b-[3px] border-slate-900 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 font-black text-slate-900">Roll Number</th>
                    <th className="px-6 py-4 font-black text-slate-900">Name (CSV)</th>
                    {isPython && (
                       <>
                         <th className="px-4 py-4 font-black text-slate-900">MCQ</th>
                         <th className="px-4 py-4 font-black text-slate-900">Q1</th>
                         <th className="px-4 py-4 font-black text-slate-900">Q2</th>
                         <th className="px-4 py-4 font-black text-slate-900">Q3</th>
                       </>
                    )}
                    <th className="px-6 py-4 font-black text-slate-900">{isPython ? "Total" : "Score"}</th>
                    <th className="px-6 py-4 font-black text-slate-900">Analysis Status</th>
                    <th className="px-6 py-4 font-black text-slate-900 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y-[3px] divide-slate-900">
                  {parsedData.map((row) => (
                    <tr key={row.id} className={`hover:bg-slate-50 transition-colors ${row.status === 'error' ? 'bg-red-100/50' : row.status === 'warning' ? 'bg-amber-100/50' : ''}`}>
                      <td className="px-6 py-4 font-mono font-black text-slate-900">{row.roll_number}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{row.name || '-'}</td>
                      {isPython && (
                         <>
                           <td className="px-4 py-4 font-bold text-slate-900">{row.pythonBreakdown?.mcq}</td>
                           <td className="px-4 py-4 font-bold text-slate-900">{row.pythonBreakdown?.q1}</td>
                           <td className="px-4 py-4 font-bold text-slate-900">{row.pythonBreakdown?.q2}</td>
                           <td className="px-4 py-4 font-bold text-slate-900">{row.pythonBreakdown?.q3}</td>
                         </>
                      )}
                      <td className="px-6 py-4 font-black text-slate-900">{row.score}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {row.status === "valid" && (
                            <span className="flex items-center gap-1 text-xs font-black text-emerald-800 bg-emerald-200 w-fit px-2 py-1 rounded-md border-2 border-emerald-900">
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Ready to Insert
                            </span>
                          )}
                          {row.errors.map((err, i) => (
                            <span key={i} className="flex items-start gap-1 text-xs font-black text-red-900 bg-red-300 w-fit px-2 py-1 rounded-md border-2 border-red-900">
                              <X className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {err}
                            </span>
                          ))}
                          {row.warnings.map((warn, i) => (
                            <span key={i} className="flex items-start gap-1 text-xs font-black text-amber-900 bg-amber-300 w-fit px-2 py-1 rounded-md border-2 border-amber-900">
                              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {warn}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {row.status === 'error' && (
                          <button onClick={() => removeRow(row.id)} className="p-2 border-[3px] border-slate-900 bg-white text-red-600 rounded-lg shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all" title="Remove Row">
                            <Trash2 className="h-4 w-4 font-bold" />
                          </button>
                        )}
                        {row.status === 'warning' && row.warnings.some(w => w.includes("Overwrite")) && (
                          <button 
                            onClick={() => toggleOverwrite(row.id)} 
                            className={`px-3 py-1.5 text-xs font-black border-[3px] border-slate-900 rounded-lg shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all ${
                              row.willOverwrite ? "bg-slate-900 text-white" : "bg-white text-slate-900"
                            }`}
                          >
                            {row.willOverwrite ? "Will Overwrite" : "Skip Overwrite"}
                          </button>
                        )}
                        {row.status === 'warning' && !row.warnings.some(w => w.includes("Overwrite")) && (
                           <span className="text-xs font-bold text-slate-400">Handled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {parsedData.length === 0 && (
                     <tr>
                        <td colSpan={isPython ? 9 : 5} className="text-center py-8 font-bold text-slate-500">No rows to display.</td>
                     </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in p-4 sm:p-0">
          <div className="bg-white rounded-2xl border-[3px] border-slate-900 shadow-[8px_8px_0_0_#0f172a] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b-[3px] border-slate-900 bg-blue-300">
              <h3 className="text-2xl font-black text-slate-900">Confirm Publishing</h3>
              <p className="text-sm font-bold text-blue-900 mt-1">You are about to save marks to the live database.</p>
            </div>
            
            <div className="p-6 space-y-4 font-bold text-slate-900">
              <div className="flex items-center justify-between py-2 border-b-2 border-slate-200">
                <span className="text-sm">Subject</span>
                <span className="font-black">{activeUpload.subjectShort || activeUpload.subjectName}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b-2 border-slate-200">
                <span className="text-sm">Assessment</span>
                <span className="font-black">{activeUpload.unitLabel}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b-2 border-slate-200">
                <span className="text-sm">Total Records to Save</span>
                <span className="font-black text-blue-600">{readyToPublishCount}</span>
              </div>
              
              {parsedData.some(r => r.status === 'warning' && !r.willOverwrite && r.warnings.some(w=>w.includes('Overwrite'))) && (
                 <div className="bg-slate-100 border-[3px] border-slate-900 rounded-xl p-3 text-xs font-bold text-slate-600 mt-2">
                    <AlertTriangle className="h-4 w-4 inline-block mr-1 text-slate-500" />
                    Some rows with existing marks were skipped because you didn't toggle Overwrite.
                 </div>
              )}

              <div className="bg-amber-300 border-[3px] border-slate-900 rounded-xl p-4 mt-6 flex items-start gap-3 shadow-[2px_2px_0_0_#0f172a]">
                <Info className="h-6 w-6 text-amber-900 shrink-0" />
                <p className="text-sm text-amber-900 font-black">This action will immediately update the database and become visible to students.</p>
              </div>
            </div>

            <div className="p-4 border-t-[3px] border-slate-900 bg-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 text-sm font-black text-slate-900 bg-white border-[3px] border-slate-900 rounded-lg shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#0f172a] transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handlePublish}
                className="px-4 py-2.5 text-sm font-black text-white bg-slate-900 border-[3px] border-slate-900 rounded-lg shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#0f172a] transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirm Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Topics Edit Modal */}
      {editingTopicsFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in p-4 sm:p-0">
          <div className="bg-white rounded-2xl border-[3px] border-slate-900 shadow-[8px_8px_0_0_#0f172a] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b-[3px] border-slate-900 bg-amber-300 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-slate-900">Edit Topics</h3>
                <p className="text-sm font-bold text-amber-900 mt-1">{editingTopicsFor.subjectCode} • {editingTopicsFor.unitKey}</p>
              </div>
              <button 
                onClick={() => setEditingTopicsFor(null)}
                className="p-2 bg-white border-[3px] border-slate-900 rounded-lg shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
              >
                <X className="h-5 w-5 font-black text-slate-900" />
              </button>
            </div>
            
            <div className="p-6">
              <label className="block text-sm font-black text-slate-900 mb-2 uppercase">Topics Covered</label>
              <textarea 
                value={editingTopicsFor.currentText}
                onChange={(e) => setEditingTopicsFor({ ...editingTopicsFor, currentText: e.target.value })}
                placeholder="e.g. Arrays, Linked Lists, Stacks, Queues"
                className="w-full border-[3px] border-slate-900 rounded-xl p-3 font-bold text-slate-900 min-h-[120px] focus:outline-none focus:shadow-[4px_4px_0_0_#0f172a] transition-shadow resize-none"
              />
            </div>
            
            <div className="p-4 border-t-[3px] border-slate-900 bg-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setEditingTopicsFor(null)}
                className="px-6 py-2.5 font-bold text-slate-900 bg-white border-[3px] border-slate-900 rounded-lg shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={saveTopics}
                className="px-6 py-2.5 font-black text-white bg-slate-900 border-[3px] border-slate-900 rounded-lg shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all flex items-center gap-2"
              >
                Save Topics
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
