"use client";

import { useState, useEffect } from "react";
import { BookOpen, FileCode2, ArrowLeft, Edit3, CheckCircle2, UploadCloud, Loader2, X, AlertTriangle, Trash2, Info, Eye, EyeOff, Clock, CheckSquare } from "lucide-react";
import confetti from "canvas-confetti";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { sendTelegramNotification, sendTelegramNotificationsBatch } from "@/app/actions/telegramActions";
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
  email: string;
  score: number;
  pythonBreakdown?: PythonBreakdown;
  status: RowStatus;
  matchStatus: "Auto-Matched" | "Matched" | "Matched with Warnings" | "Conflict Detected" | "Needs Manual Review" | "No Match Found" | "Duplicate Detected";
  confidenceScore: number;
  errors: string[];
  warnings: string[];
  willOverwrite: boolean;
  dbStudentId?: string;
  dbMarkId?: string;
  existingBreakdown?: any; // To preserve other units' breakdown
  previousScore?: number | null; // Keep track of previous score for revisions
  autoFilledFields?: string[]; // Keep track of fields that were auto-filled
}

interface ActiveUpload {
  subjectName: string;
  subjectCode: string;
  subjectShort: string;
  unitKey: "unit_test_1" | "unit_test_2" | "unit_test_3" | "unit_test_4" | "unit_test_5";
  unitLabel: string;
  department?: string;
}

const DEPARTMENTS = [
  { name: "Artificial Intelligence & Data Science", short: "AIDS", code: "AD", color: "bg-rose-100 text-rose-900 border-rose-900" },
  { name: "Artificial Intelligence & Machine Learning", short: "AIML", code: "AM", color: "bg-amber-100 text-amber-900 border-amber-900" },
  { name: "Computer Science and Business Systems", short: "CSBS", code: "CB", color: "bg-emerald-100 text-emerald-900 border-emerald-900" },
  { name: "Computer Science and Design", short: "CSD", code: "CD", color: "bg-teal-100 text-teal-900 border-teal-900" },
  { name: "Computer Science and Engineering", short: "CSE", code: "CS", color: "bg-blue-100 text-blue-900 border-blue-900" },
  { name: "Cyber Security", short: "CSE-CS", code: "CC", color: "bg-slate-200 text-slate-900 border-slate-900" },
  { name: "Electronics and Communication", short: "ECE", code: "EC", color: "bg-violet-100 text-violet-900 border-violet-900" },
  { name: "Electrical and Electronics", short: "EEE", code: "EE", color: "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-900" },
  { name: "Information Technology", short: "IT", code: "IT", color: "bg-indigo-100 text-indigo-900 border-indigo-900" },
];

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

  const [processingStep, setProcessingStep] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadingName, setUploadingName] = useState("");
  const [uploadDuration, setUploadDuration] = useState<number | null>(null);

  // Normalization Helpers
  const normalizeEmail = (e: string): string => {
    if (!e) return "";
    return e.toLowerCase()
      .trim()
      .replace(/\s+/g, '') // remove all whitespace
      .replace(/\.+$/, ''); // remove trailing dots
  };

  const normalizeRollNumber = (r: any): string => {
    if (r === null || r === undefined) return "";
    let roll = String(r).trim();
    // Remove non-numeric characters
    roll = roll.replace(/\D/g, "");
    // If long format -> extract last 9 digits
    if (roll.length > 9) {
      return roll.slice(-9);
    }
    return roll;
  };

  const normalizeName = (n: string): string => {
    if (!n) return "";
    return n.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // remove dots, punctuation, special chars
      .replace(/\s+/g, ' ')        // collapse double spaces to single
      .trim();
  };

  const [validationMaps, setValidationMaps] = useState<{
    profileRollMap: Map<string, any>;
    profileNameMap: Map<string, any[]>;
    profileEmailMap: Map<string, any>;
    marksMap: Map<string, any>;
  } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('disabledUnits');
    if (stored) setDisabledUnits(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (!activeUpload) {
      setValidationMaps(null);
      return;
    }
    const prefetchValidationMaps = async () => {
      const supabase = createClient();
      
      // Fetch ALL students by paginating to avoid 1000-row cap limit
      const allStudents: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'student')
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (error || !data || data.length === 0) {
          hasMore = false;
        } else {
          allStudents.push(...data);
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        }
      }
      
      const { data: marksData } = await supabase
        .from('marks')
        .select('*')
        .eq('subject_name', activeUpload.subjectName);
      
      if (allStudents.length > 0 && marksData) {
        const profileRollMap = new Map();
        const profileEmailMap = new Map();
        const profileNameMap = new Map<string, any[]>();
        
        allStudents.forEach((p: any) => {
          if (p.roll_number) {
            profileRollMap.set(normalizeRollNumber(p.roll_number), p);
          }
          if (p.email) {
            profileEmailMap.set(normalizeEmail(p.email), p);
          }
          if (p.name) {
            const key = normalizeName(p.name);
            const list = profileNameMap.get(key) || [];
            list.push(p);
            profileNameMap.set(key, list);
          }
        });
        const marksMap = new Map(marksData.map((m: any) => [m.student_id, m]));
        setValidationMaps({ profileRollMap, profileNameMap, profileEmailMap, marksMap });
      }
    };
    prefetchValidationMaps();
  }, [activeUpload?.subjectName]);

  useEffect(() => {
    if (!activeUpload) return;
    const fetchUploaded = async () => {
      setIsLoadingUploaded(true);
      const supabase = createClient();
      const { data: marks } = await supabase.from('marks').select('*').eq('subject_name', activeUpload.subjectName);
      let profileQuery = supabase.from('profiles').select('*').eq('role', 'student');
      if (activeUpload.department) {
        profileQuery = profileQuery.eq('department', activeUpload.department);
      }
      const { data: profiles } = await profileQuery;

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
        const logsWithNames = views
          .filter((v: any) => profiles.some((prof: any) => prof.id === v.student_id))
          .map((v: any) => {
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

  const selectDepartment = (deptShort: string) => {
    setActiveUpload(prev => prev ? { ...prev, department: deptShort } : null);
  };

  const processFile = (file: File) => {
    setUploadState("parsing");
    
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    
    if (isExcel) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          if (!data) throw new Error("Could not read file data");
          const workbook = XLSX.read(data, { type: "binary" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          // Convert sheet to 2D string array
          const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
          
          // Map values to string to ensure same type as Papa.parse
          const rawRows = jsonData.map(row => 
            (row as any[]).map(val => val === null || val === undefined ? "" : String(val).trim())
          );
          
          await asyncValidate(rawRows);
        } catch (err: any) {
          console.error(err);
          setUploadState("idle");
          alert("Failed to parse Excel file. Please ensure it's a valid worksheet.");
        }
      };
      reader.onerror = (err) => {
        console.error(err);
        setUploadState("idle");
        alert("Failed to read file.");
      };
      reader.readAsBinaryString(file);
    } else {
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
    }
  };
  const getLevenshteinDistance = (a: string, b: string): number => {
    const tmp = [];
    let i, j;
    for (i = 0; i <= a.length; i++) {
      tmp.push([i]);
    }
    for (j = 1; j <= b.length; j++) {
      tmp[0].push(j);
    }
    for (i = 1; i <= a.length; i++) {
      for (j = 1; j <= b.length; j++) {
        tmp[i][j] = a[i - 1] === b[j - 1] 
          ? tmp[i - 1][j - 1] 
          : Math.min(tmp[i - 1][j] + 1, tmp[i][j - 1] + 1, tmp[i - 1][j - 1] + 1);
      }
    }
    return tmp[a.length][b.length];
  };

  const getNameSimilarity = (name1: string, name2: string): number => {
    const n1 = normalizeName(name1);
    const n2 = normalizeName(name2);
    if (!n1 || !n2) return 0;
    const maxLen = Math.max(n1.length, n2.length);
    if (maxLen === 0) return 100;
    const dist = getLevenshteinDistance(n1, n2);
    return Math.round(((maxLen - dist) / maxLen) * 100);
  };

  const isRollMatch = (roll1: string, roll2: string): boolean => {
    const r1 = normalizeRollNumber(roll1);
    const r2 = normalizeRollNumber(roll2);
    if (!r1 || !r2) return false;
    return r1 === r2 || (r1.length >= 7 && r2.length >= 7 && r1.slice(-7) === r2.slice(-7));
  };

  const parseSafeNumber = (val: any, defaultVal = 0): number => {
    if (val === null || val === undefined || String(val).trim() === "") return defaultVal;
    const num = Number(String(val).trim());
    return isNaN(num) ? defaultVal : num;
  };

  const validateSingleRow = (
    row: {
      roll_number: string;
      name: string;
      email: string;
      score: number;
      pythonBreakdown?: PythonBreakdown;
      willOverwrite: boolean;
      dbStudentId?: string;
      dbMarkId?: string;
      existingBreakdown?: any;
      previousScore?: number | null;
    },
    maps: {
      profileRollMap: Map<string, any>;
      profileNameMap: Map<string, any[]>;
      profileEmailMap: Map<string, any>;
      marksMap: Map<string, any>;
    },
    subjectShort: string,
    department?: string,
    unitKey?: string,
    unitLabel?: string
  ): {
    roll_number: string;
    name: string;
    email: string;
    score: number;
    pythonBreakdown?: PythonBreakdown;
    status: RowStatus;
    matchStatus: "Auto-Matched" | "Matched" | "Matched with Warnings" | "Conflict Detected" | "Needs Manual Review" | "No Match Found" | "Duplicate Detected";
    confidenceScore: number;
    errors: string[];
    warnings: string[];
    willOverwrite: boolean;
    dbStudentId?: string;
    dbMarkId?: string;
    existingBreakdown?: any;
    previousScore?: number | null;
    autoFilledFields?: string[];
  } => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let status: RowStatus = "valid";
    
    // 1. Inputs Normalization
    const rawRoll = row.roll_number || "";
    const rawEmail = row.email || "";
    const rawName = row.name || "";

    const rollClean = normalizeRollNumber(rawRoll);
    const emailClean = normalizeEmail(rawEmail);
    const nameClean = normalizeName(rawName);

    let score = parseSafeNumber(row.score, 0);
    let pythonBreakdown = row.pythonBreakdown;
    let dbStudentId = row.dbStudentId;
    let dbMarkId = row.dbMarkId;
    let existingBreakdown = row.existingBreakdown;
    let previousScore = row.previousScore;

    // Check score boundaries
    if (score < 0 || score > 100) {
      errors.push(`Score out of bounds (0-100): got ${score}`);
    }

    if (subjectShort === "Python" && pythonBreakdown) {
      const mcq = parseSafeNumber(pythonBreakdown.mcq, 0);
      const q1 = parseSafeNumber(pythonBreakdown.q1, 0);
      const q2 = parseSafeNumber(pythonBreakdown.q2, 0);
      const q3 = parseSafeNumber(pythonBreakdown.q3, 0);
      
      const calculatedTotal = mcq + q1 + q2 + q3;
      score = calculatedTotal;
    }

    // 2. MULTI-LAYER STUDENT IDENTITY MATCHING
    let rollCandidate: any = null;
    let emailCandidate: any = null;
    let nameCandidatesList: any[] = [];

    // Layer 1: Roll Match (Primary Identity)
    if (rollClean) {
      // First try exact normalized roll lookup
      rollCandidate = maps.profileRollMap.get(rollClean);
      if (!rollCandidate) {
        // Fallback: search trailing 7 digits within the department batch
        const excel7 = rollClean.slice(-7);
        for (const [dbRollKey, p] of maps.profileRollMap.entries()) {
          if (dbRollKey.slice(-7) === excel7) {
            rollCandidate = p;
            break;
          }
        }
      }
    }

    // Layer 2: Email Match (Secondary Identity)
    if (emailClean) {
      emailCandidate = maps.profileEmailMap.get(emailClean);
    }

    // Layer 3: Name Match (Safe Fallback)
    if (nameClean) {
      // Exact name match first
      nameCandidatesList = maps.profileNameMap.get(nameClean) || [];
      // Fuzzy name match fallback if exact didn't match (Levenshtein similarity >= 85%)
      if (nameCandidatesList.length === 0) {
        for (const [dbNameKey, ps] of maps.profileNameMap.entries()) {
          if (getNameSimilarity(nameClean, dbNameKey) >= 85) {
            nameCandidatesList.push(...ps);
          }
        }
      }
    }

    let profile: any = null;
    let matchStatus: ParsedRow["matchStatus"] = "No Match Found";
    let confidenceScore = 0;

    // 3. CONFLICT & CONTRADICTION RESOLUTION ENGINE
    if (rollCandidate && emailCandidate && rollCandidate.id !== emailCandidate.id) {
      // Direct contradiction between Roll and Email identity!
      matchStatus = "Conflict Detected";
      confidenceScore = 0;
      errors.push("Conflict Detected: Email and Roll refer to different students");
    } else if (rollCandidate) {
      // Case A: Roll Match Found (Confidently matches - Primary Match)
      profile = rollCandidate;
      confidenceScore = 95;
    } else if (emailCandidate) {
      // Case B: Email Match Only (Confidently matches - Secondary Match)
      profile = emailCandidate;
      confidenceScore = 100;
    } else if (nameCandidatesList.length > 0) {
      // Case C: Name Match Only
      if (nameCandidatesList.length === 1) {
        profile = nameCandidatesList[0];
        confidenceScore = 70;
      } else {
        // Ambiguity conflict
        matchStatus = "Conflict Detected";
        confidenceScore = 0;
        errors.push("Conflict Detected: Multiple students match this data");
      }
    }

    // 4. SMART AUTO-FILL ENGINE (Confidence >= 90 required)
    if (profile && matchStatus !== "Conflict Detected") {
      let autoFilledAnything = false;
      const autoFilledFields: string[] = [];
      let finalRoll = rawRoll.trim();
      let finalName = rawName.trim();
      let finalEmail = rawEmail.trim();

      const matchedSource = confidenceScore === 100 ? "Email Match" : confidenceScore === 95 ? "Roll Match" : "Name Match";

      if (confidenceScore >= 90) {
        // High confidence matching -> Auto-fill missing fields!
        if (!rawEmail.trim() && profile.email) {
          finalEmail = profile.email;
          autoFilledAnything = true;
          autoFilledFields.push("email");
          warnings.push(`Auto-filled Email via ${matchedSource}`);
        }
        if (!rawRoll.trim() && profile.roll_number) {
          finalRoll = profile.roll_number;
          autoFilledAnything = true;
          autoFilledFields.push("roll_number");
          warnings.push(`Auto-filled Roll Number via ${matchedSource}`);
        }
        if (!rawName.trim() && profile.name) {
          finalName = profile.name;
          autoFilledAnything = true;
          autoFilledFields.push("name");
          warnings.push(`Auto-filled Name via ${matchedSource}`);
        }

        // Assign status
        matchStatus = autoFilledAnything ? "Matched" : "Auto-Matched";
      } else {
        // Name Match Only (Low confidence fallback)
        matchStatus = "Needs Manual Review";
        errors.push("Needs Manual Review: Low confidence name-only match. Fill in Roll/Email.");
      }

      // 5. DOUBLE VALIDATION PASS (Check mismatch warnings)
      let hasMismatches = false;
      if (rawEmail.trim() && profile.email && normalizeEmail(rawEmail) !== normalizeEmail(profile.email)) {
        warnings.push(`Email mismatch: Excel says "${rawEmail}" but DB says "${profile.email}"`);
        hasMismatches = true;
      }
      if (rawRoll.trim() && profile.roll_number && !isRollMatch(rawRoll, profile.roll_number)) {
        warnings.push(`Roll mismatch: Excel says "${rawRoll}" but DB says "${profile.roll_number}"`);
        hasMismatches = true;
      }
      if (rawName.trim() && profile.name && getNameSimilarity(rawName, profile.name) < 85) {
        warnings.push(`Name mismatch: Excel says "${rawName}" but DB says "${profile.name}"`);
        hasMismatches = true;
      }

      if (hasMismatches && matchStatus !== "Needs Manual Review") {
        matchStatus = "Matched with Warnings";
      }

      // Final values assignments
      row.roll_number = finalRoll;
      row.name = finalName;
      row.email = finalEmail;
      (row as any).autoFilledFields = autoFilledFields;

    } else if (matchStatus !== "Conflict Detected") {
      // Case E: No Match
      matchStatus = "No Match Found";
      confidenceScore = 0;
      errors.push("No Match Found: No student found matching this Email, Roll Number, or Name.");
    }

    // 6. EXTRA DATABASE CHECKS
    if (profile && matchStatus !== "Conflict Detected") {
      // Department verification
      if (department && profile.department) {
        if (profile.department.toUpperCase() !== department.toUpperCase()) {
          errors.push(`Department mismatch: Student is in ${profile.department.toUpperCase()}, but you are uploading in ${department.toUpperCase()}.`);
          matchStatus = "Needs Manual Review";
        }
      }

      dbStudentId = profile.id;
      const markRecord = maps.marksMap.get(profile.id);
      
      if (markRecord) {
        dbMarkId = markRecord.id;
        existingBreakdown = markRecord.breakdown || {};
        previousScore = unitKey ? markRecord[unitKey] : null;

        if (unitKey && unitLabel && markRecord[unitKey] != null) {
          matchStatus = "Duplicate Detected";
          warnings.push(`Marks already exist for ${unitLabel} (${markRecord[unitKey]} marks). Overwrite requires confirmation.`);
        }
      } else {
        dbMarkId = undefined;
        existingBreakdown = undefined;
        previousScore = null;
      }
    } else {
      dbStudentId = undefined;
      dbMarkId = undefined;
      existingBreakdown = undefined;
      previousScore = null;
    }

    if (errors.length > 0) {
      status = "error";
      if (matchStatus !== "Conflict Detected" && matchStatus !== "No Match Found") {
        matchStatus = "Needs Manual Review";
      }
    } else if (warnings.length > 0) {
      status = "warning";
      if (matchStatus === "Auto-Matched") {
        matchStatus = "Matched";
      }
    } else {
      status = "valid";
    }

    return {
      roll_number: row.roll_number,
      name: row.name,
      email: row.email,
      score,
      pythonBreakdown,
      status,
      matchStatus,
      confidenceScore,
      errors,
      warnings,
      willOverwrite: row.willOverwrite,
      dbStudentId,
      dbMarkId,
      existingBreakdown,
      previousScore,
      autoFilledFields: (row as any).autoFilledFields || []
    };
  };

  const updateRowCell = (rowId: string, field: string, value: any) => {
    if (!activeUpload || !validationMaps) return;
    setParsedData(prev => prev.map(r => {
      if (r.id !== rowId) return r;

      const updatedRow = { ...r };
      if (field === "score") {
        updatedRow.score = parseSafeNumber(value, 0);
      } else if (field.startsWith("python_")) {
        const subfield = field.split("_")[1] as keyof PythonBreakdown;
        const currentBreakdown = r.pythonBreakdown || { mcq: 0, q1: 0, q2: 0, q3: 0 };
        updatedRow.pythonBreakdown = {
          ...currentBreakdown,
          [subfield]: parseSafeNumber(value, 0)
        };
      }

      const validated = validateSingleRow(
        updatedRow,
        validationMaps,
        activeUpload.subjectShort,
        activeUpload.department,
        activeUpload.unitKey,
        activeUpload.unitLabel
      );
      
      return {
        ...r,
        ...validated
      };
    }));
  };

  const asyncValidate = async (rawRows: string[][]) => {
    if (!activeUpload) return;
    
    // Step 1: Normalizing Roll Numbers
    setProcessingStep("normalize_roll");
    setProcessingProgress(10);
    await new Promise(r => setTimeout(r, 300));
    
    // Step 2: Cleaning Emails
    setProcessingStep("clean_emails");
    setProcessingProgress(20);
    await new Promise(r => setTimeout(r, 300));

    // Step 3: Standardizing Names
    setProcessingStep("standardize_names");
    setProcessingProgress(30);
    await new Promise(r => setTimeout(r, 300));

    // Step 4: Matching by Roll (DB Fetch & Match)
    setProcessingStep("match_roll");
    setProcessingProgress(40);
    
    const supabase = createClient();
    let maps = validationMaps;
    if (!maps) {
      // Fetch ALL students recursively to avoid 1000-row cap limit
      const allStudents: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'student')
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (error || !data || data.length === 0) {
          hasMore = false;
        } else {
          allStudents.push(...data);
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        }
      }

      const { data: marks } = await supabase
        .from('marks')
        .select('*')
        .eq('subject_name', activeUpload.subjectName);

      const profileRollMap = new Map();
      const profileEmailMap = new Map();
      const profileNameMap = new Map<string, any[]>();
      
      (allStudents || []).forEach((p: any) => {
        if (p.roll_number) {
          profileRollMap.set(normalizeRollNumber(p.roll_number), p);
        }
        if (p.email) {
          profileEmailMap.set(normalizeEmail(p.email), p);
        }
        if (p.name) {
          const key = normalizeName(p.name);
          const list = profileNameMap.get(key) || [];
          list.push(p);
          profileNameMap.set(key, list);
        }
      });
      const marksMap = new Map((marks || []).map((m: any) => [m.student_id, m]));
      maps = { profileRollMap, profileNameMap, profileEmailMap, marksMap };
      setValidationMaps(maps);
    }
    await new Promise(r => setTimeout(r, 300));

    // Step 5: Matching by Email
    setProcessingStep("match_email");
    setProcessingProgress(50);
    await new Promise(r => setTimeout(r, 300));

    // Step 6: Matching by Name
    setProcessingStep("match_name");
    setProcessingProgress(60);
    await new Promise(r => setTimeout(r, 300));

    // Step 7: Detecting Conflicts
    setProcessingStep("detect_conflicts");
    setProcessingProgress(70);
    await new Promise(r => setTimeout(r, 300));

    // Step 8: Validating Matches (Pass 2)
    setProcessingStep("validate_matches_pass2");
    setProcessingProgress(80);
    await new Promise(r => setTimeout(r, 300));

    // Step 9: Auto-filling Missing Fields
    setProcessingStep("autofill_fields");
    setProcessingProgress(90);
    await new Promise(r => setTimeout(r, 300));

    // Step 10: Finalizing Results
    setProcessingStep("finalize_results");
    setProcessingProgress(100);
    await new Promise(r => setTimeout(r, 400));

    let dataRows = rawRows;
    let hasHeader = false;
    let headerMap: Record<string, number> = {};

    if (rawRows.length > 0) {
      const firstRow = rawRows[0].map(c => String(c).trim().toLowerCase());
      hasHeader = firstRow.some(c => c.includes('roll') || c.includes('reg') || c.includes('name') || c.includes('score') || c.includes('mark') || c.includes('q1') || c.includes('email') || c.includes('percentage'));
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
    };

    const validatedRows: ParsedRow[] = [];
    const seenRolls = new Set<string>();
    const seenEmails = new Set<string>();
    const seenStudentIds = new Set<string>();

    for (let index = 0; index < dataRows.length; index++) {
      const rowArr = dataRows[index];
      const isRowEmpty = rowArr.every(cell => !cell || String(cell).trim() === "");
      if (isRowEmpty) continue;

      let roll = "";
      let name = "";
      let email = "";
      let scoreRaw: string | undefined = undefined;
      let mcqRaw: string | undefined = undefined;
      let q1Raw: string | undefined = undefined;
      let q2Raw: string | undefined = undefined;
      let q3Raw: string | undefined = undefined;

      if (hasHeader) {
         roll = getValByHeader(rowArr, ['roll', 'register', 'reg', 'registration number']) || "";
         name = getValByHeader(rowArr, ['name']) || "";
         email = getValByHeader(rowArr, ['email', 'mailid']) || "";
         scoreRaw = getValByHeader(rowArr, ['total student score', 'total', 'score', 'mark', 'total percentage', 'max score']);
         mcqRaw = getValByHeader(rowArr, ['mcq student score', 'mcq', 'mcqs']);
         q1Raw = getValByHeader(rowArr, ['cod - 1 student score', 'cod - 1', 'q1', 'coding question 1', 'coding 1']);
         q2Raw = getValByHeader(rowArr, ['cod - 2 student score', 'cod - 2', 'q2', 'coding question 2', 'coding 2']);
         q3Raw = getValByHeader(rowArr, ['cod - 3 student score', 'cod - 3', 'q3', 'coding question 3', 'coding 3']);
      } else {
         const rollIndex = rowArr.findIndex(c => String(c).replace(/\D/g, '').length >= 6);
         if (rollIndex !== -1) roll = rowArr[rollIndex];
         
         const nameIndex = rowArr.findIndex((c, i) => i !== rollIndex && !String(c).includes('@') && !/\d/.test(String(c)) && String(c).trim().length > 2);
         if (nameIndex !== -1) name = rowArr[nameIndex];
         
         const emailIndex = rowArr.findIndex(c => String(c).includes('@'));
         if (emailIndex !== -1) email = rowArr[emailIndex];

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
      email = String(email).trim().toLowerCase();
      let score = parseSafeNumber(scoreRaw, 0);

      let pythonBreakdown: PythonBreakdown | undefined = undefined;
      
      if (activeUpload.subjectShort === "Python") {
        const mcq = parseSafeNumber(mcqRaw, 0);
        const q1 = parseSafeNumber(q1Raw, 0);
        const q2 = parseSafeNumber(q2Raw, 0);
        const q3 = parseSafeNumber(q3Raw, 0);
        pythonBreakdown = { mcq, q1, q2, q3 };
        
        const calculatedTotal = mcq + q1 + q2 + q3;
        
        if (scoreRaw === undefined || scoreRaw === "" || isNaN(Number(scoreRaw))) {
           score = calculatedTotal;
         }
      }

      const isScoreEmpty = scoreRaw === undefined || scoreRaw === "";

      const rawRow = {
        roll_number: roll,
        name: name,
        email: email,
        score: score,
        pythonBreakdown,
        willOverwrite: false
      };

      const validated = validateSingleRow(
        rawRow,
        maps,
        activeUpload.subjectShort,
        activeUpload.department,
        activeUpload.unitKey,
        activeUpload.unitLabel
      );

      if (isScoreEmpty) {
        validated.errors.push("Missing Score/Total Marks");
        validated.status = "error";
        if (validated.matchStatus !== "No Match Found" && validated.matchStatus !== "Conflict Detected") {
          validated.matchStatus = "Needs Manual Review";
        }
      }

      // Check duplicates within the file
      const rollKey = normalizeRollNumber(validated.roll_number);
      const emailKey = normalizeEmail(validated.email);
      const studentIdKey = validated.dbStudentId;

      if ((rollKey && seenRolls.has(rollKey)) || (emailKey && seenEmails.has(emailKey)) || (studentIdKey && seenStudentIds.has(studentIdKey))) {
        validated.matchStatus = "Duplicate Detected";
        validated.status = "warning";
        validated.warnings.push("Duplicate record in this upload file.");
      }

      if (rollKey) seenRolls.add(rollKey);
      if (emailKey) seenEmails.add(emailKey);
      if (studentIdKey) seenStudentIds.add(studentIdKey);

      validatedRows.push({
        id: `row-${index}-${Date.now()}`,
        ...validated
      });
    }

    setParsedData(validatedRows);
    setUploadState("preview");
    setProcessingStep(null);
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
    if (file && (
      file.name.endsWith(".csv") || 
      file.name.endsWith(".xlsx") || 
      file.name.endsWith(".xls") || 
      file.type === "text/csv" || 
      file.type === "application/vnd.ms-excel" || 
      file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )) {
      processFile(file);
    } else {
      setUploadState("idle");
      alert("Supported formats: CSV and Excel (.xlsx, .xls) files only.");
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
    setUploadTotal(rowsToProcess.length);
    setUploadProgress(0);
    setUploadingName("");
    setUploadDuration(0);
    setShowModal(false);

    let visualTicker: NodeJS.Timeout | undefined;
    let timerInterval: NodeJS.Timeout | undefined;
    
    try {
      // 1. Create the Upload Log for undo history
      const uploadId = await createUploadLog(activeUpload.subjectCode, activeUpload.subjectName, activeUpload.unitKey);
      
      const startTime = Date.now();
      timerInterval = setInterval(() => {
        setUploadDuration((Date.now() - startTime) / 1000);
      }, 50);

      let displayedProgress = 0;
      let targetProgress = 0;
      
      // Smooth dynamic visual ticker that runs without delaying network/db writes
      visualTicker = setInterval(() => {
        if (displayedProgress < targetProgress) {
          // Increment faster for larger datasets to keep the visual process extremely punchy
          const increment = rowsToProcess.length > 1000 ? 5 : rowsToProcess.length > 500 ? 2 : 1;
          displayedProgress = Math.min(displayedProgress + increment, targetProgress);
          setUploadProgress(displayedProgress);
          const student = rowsToProcess[displayedProgress - 1];
          if (student) {
            setUploadingName(student.name || student.roll_number || "Unknown Student");
          }
        }
      }, 5);

      const notificationsToBatch: { studentId: string; score: number }[] = [];
      
      // Chunk size optimized to 100 (safe for Next.js Server Action payload sizes)
      const CHUNK_SIZE = 100;
      for (let i = 0; i < rowsToProcess.length; i += CHUNK_SIZE) {
        const chunk = rowsToProcess.slice(i, i + CHUNK_SIZE);
        
        // Push target progress immediately so the ticker knows it can start counting up
        targetProgress = Math.min(i + CHUNK_SIZE, rowsToProcess.length);
        
        // Publish this chunk to database via Server Action (optimized with parallel updates)
        await publishMarksChunk(uploadId, activeUpload.subjectCode, activeUpload.subjectName, activeUpload.unitKey, chunk);
        
        chunk.forEach(row => {
          if (row.dbStudentId) {
            notificationsToBatch.push({
              studentId: row.dbStudentId,
              score: row.score
            });
          }
        });
      }

      // Wait for visual ticker to complete so user has a gorgeous complete progress experience
      while (displayedProgress < rowsToProcess.length) {
        await new Promise(r => setTimeout(r, 10));
      }

      // Clean up intervals
      clearInterval(visualTicker);
      clearInterval(timerInterval);
      
      // Save exact final duration
      const finalDuration = (Date.now() - startTime) / 1000;
      setUploadDuration(finalDuration);

      // Call single server-side batched notifications in background (non-blocking for client)
      if (notificationsToBatch.length > 0) {
        sendTelegramNotificationsBatch(notificationsToBatch, activeUpload.subjectName, activeUpload.unitLabel).catch(console.error);
      }

      setUploadState("success");
      // Throw multiple waves of confetti for the ultimate celebratory experience!
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#4f46e5', '#ec4899', '#f97316', '#10b981']
      });
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#3b82f6', '#10b981', '#f59e0b']
        });
      }, 300);
      setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 }
        });
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 }
        });
      }, 600);
    } catch (err: any) {
      if (visualTicker) clearInterval(visualTicker);
      if (timerInterval) clearInterval(timerInterval);
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
    if (activeUpload?.department) {
      setActiveUpload(prev => prev ? { ...prev, department: undefined } : null);
    } else {
      setActiveUpload(null);
      resetUpload();
    }
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subject.units.map((unit) => {
                  const key = `${subject.code}-${unit.key}`;
                  const isActive = !disabledUnits.includes(key);
                  return (
                    <div 
                      key={unit.key}
                      onClick={() => startUpload(subject.name, subject.code, subject.short, unit.key, unit.label)}
                      className={`cursor-pointer border-[3px] border-slate-900 p-5 rounded-2xl shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[8px_8px_0_0_#0f172a] transition-all flex flex-col justify-between gap-4 group min-h-[140px] ${isActive ? "bg-white hover:bg-slate-50" : "bg-slate-100 opacity-80 hover:bg-white"}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`h-14 w-14 shrink-0 border-[3px] border-slate-900 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform ${isActive ? "bg-blue-100 text-blue-900" : "bg-slate-300 text-slate-600"}`}>
                          <span className="font-black text-2xl">{unit.label.split(" ")[1]}</span>
                        </div>
                        <div className="text-left flex-1">
                          <span className={`font-black text-xl block ${isActive ? "text-slate-900" : "text-slate-600"}`}>{unit.label}</span>
                          {unitTopics[key] ? (
                            <p className="text-xs font-bold text-slate-500 mt-1 line-clamp-2">
                              {unitTopics[key]}
                            </p>
                          ) : (
                            <p className="text-xs font-bold text-slate-400 mt-1 italic">
                              No topics added
                            </p>
                          )}
                        </div>
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

  if (!activeUpload.department) {
    return (
      <div className="max-w-7xl mx-auto pb-12 space-y-8 animate-in slide-in-from-right-4 duration-300">
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
            </h2>
            <p className="text-slate-500 font-bold mt-1">Select the department you are uploading results for.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {DEPARTMENTS.map((dept) => (
            <div 
              key={dept.short}
              onClick={() => selectDepartment(dept.short)}
              className={`cursor-pointer border-[3px] border-slate-900 p-6 rounded-2xl shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[8px_8px_0_0_#0f172a] transition-all flex flex-col justify-between gap-4 group bg-white hover:bg-slate-50`}
            >
              <div className="flex flex-col gap-2 text-left">
                <div className={`w-fit px-3 py-1 font-black text-sm border-[2px] border-slate-900 rounded-lg shadow-[2px_2px_0_0_#0f172a] ${dept.color}`}>
                  {dept.short}
                </div>
                <span className="font-black text-xl text-slate-900 mt-2 leading-tight">{dept.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-6 animate-in slide-in-from-right-4 duration-300 relative">
      
      {/* Full-Screen Processing Modal */}
      {processingStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full border-[4px] border-slate-900 shadow-[12px_12px_0_0_rgba(15,23,42,1)] flex flex-col animate-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-slate-900 mb-6 text-center">Processing Student Data...</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {[
                { id: "normalize_roll", label: "Normalizing Roll Numbers" },
                { id: "clean_emails", label: "Cleaning Emails" },
                { id: "standardize_names", label: "Standardizing Names" },
                { id: "match_roll", label: "Matching by Roll" },
                { id: "match_email", label: "Matching by Email" },
                { id: "match_name", label: "Matching by Name" },
                { id: "detect_conflicts", label: "Detecting Conflicts" },
                { id: "validate_matches_pass2", label: "Validating Matches (Pass 2)" },
                { id: "autofill_fields", label: "Auto-filling Missing Fields" },
                { id: "finalize_results", label: "Finalizing Results" }
              ].map((step) => {
                const stepOrder = [
                  "normalize_roll", "clean_emails", "standardize_names", "match_roll", "match_email",
                  "match_name", "detect_conflicts", "validate_matches_pass2", "autofill_fields", "finalize_results"
                ];
                const currentIdx = stepOrder.indexOf(processingStep);
                const stepIdx = stepOrder.indexOf(step.id);
                
                const isPast = stepIdx < currentIdx;
                const isCurrent = step.id === processingStep;
                
                return (
                  <div key={step.id} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full border-[3px] border-slate-900 flex items-center justify-center shrink-0 transition-colors ${isPast ? 'bg-emerald-400 text-slate-900' : isCurrent ? 'bg-amber-300 text-slate-900' : 'bg-slate-100 text-slate-400'}`}>
                      {isPast ? <CheckSquare className="w-4 h-4" /> : isCurrent ? <Loader2 className="w-4 h-4 animate-spin" /> : <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />}
                    </div>
                    <span className={`font-bold text-sm ${isPast ? 'text-slate-900' : isCurrent ? 'text-blue-700' : 'text-slate-400'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            
            <div className="w-full h-5 bg-slate-100 rounded-full border-[3px] border-slate-900 overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-300 ease-out border-r-[3px] border-slate-900"
                style={{ width: `${processingProgress}%` }}
              />
            </div>
            <p className="text-center font-black text-slate-900 mt-4 text-lg">{processingProgress}% Complete</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 flex-wrap">
        <button 
          onClick={cancelUploadFlow}
          className="p-2 border-[3px] border-slate-900 bg-white rounded-lg shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-slate-900 shrink-0"
        >
          <ArrowLeft className="h-5 w-5 font-bold" />
        </button>
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-4 flex-wrap">
            <span>{activeUpload.subjectShort || activeUpload.subjectName} <span className="text-blue-600">—</span> {activeUpload.unitLabel} <span className="text-emerald-600">—</span> {activeUpload.department}</span>
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
              className="px-6 py-2.5 text-sm font-black text-white bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500 bg-[length:200%_auto] hover:bg-right border-[3px] border-slate-900 rounded-xl shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0f172a] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-500"
            >
              <CheckCircle2 className="h-5 w-5" />
              Review & Publish ({readyToPublishCount} ready)
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
              accept=".csv,.xlsx,.xls"
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
            <p className="text-slate-500 font-bold mb-6">Supported formats: CSV and Excel (.xlsx, .xls)</p>
            
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
          <p className="text-slate-500 font-bold mt-2 mb-8">Writing records securely to the database.</p>
          
          <div className="w-full max-w-md bg-slate-100 h-6 border-[3px] border-slate-900 rounded-full overflow-hidden shadow-inner relative">
            <div 
              className="bg-blue-600 h-full border-r-[3px] border-slate-900 transition-all duration-75 ease-linear" 
              style={{ width: `${Math.max(5, (uploadProgress / Math.max(1, uploadTotal)) * 100)}%` }}
            ></div>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-black mix-blend-difference text-white">
              {uploadProgress} / {uploadTotal}
            </div>
          </div>
          <div className="mt-4 flex flex-col items-center h-12">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Currently Uploading</span>
            <span className="text-lg font-black text-slate-900">{uploadingName || "..."}</span>
          </div>

          <div className="mt-2 flex items-center gap-2 px-4 py-1.5 bg-blue-50 border-[3px] border-blue-200 rounded-xl text-blue-900 font-black text-xs">
            <Clock className="h-3.5 w-3.5 animate-[spin_4s_linear_infinite]" />
            <span>Time Elapsed: {uploadDuration !== null ? `${uploadDuration.toFixed(1)}s` : "0.0s"}</span>
          </div>
          
          <div className="mt-6 bg-amber-50 border-[3px] border-amber-200 rounded-xl p-3 text-xs font-bold text-amber-900">
            <AlertTriangle className="h-4 w-4 inline-block mr-1" />
            Please do not navigate away or refresh the page.
          </div>
        </div>
      )}

      {uploadState === "success" && (
        <div className="border-[3px] border-slate-900 bg-emerald-300 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-[4px_4px_0_0_#0f172a]">
          <div className="h-20 w-20 bg-emerald-500 text-emerald-900 border-[3px] border-slate-900 rounded-full flex items-center justify-center mb-6 shadow-[2px_2px_0_0_#0f172a]">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
          <h3 className="text-3xl font-black text-slate-900 mb-2">Upload Successful!</h3>
          <p className="text-emerald-900 font-bold mb-4 text-lg">
            Successfully saved {activeUpload.unitLabel} scores for {readyToPublishCount} students.
          </p>

          {uploadDuration !== null && (
            <div className="mb-8 flex items-center gap-2 px-4 py-2 bg-emerald-400 border-[3px] border-slate-900 rounded-xl text-slate-900 font-black text-sm shadow-[2px_2px_0_0_#0f172a]">
              <Clock className="h-4 w-4" />
              <span>Results published in {uploadDuration.toFixed(2)} seconds!</span>
            </div>
          )}

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-violet-100 p-5 rounded-2xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] text-slate-900 flex flex-col justify-between">
              <span className="text-xs font-black text-violet-900 uppercase tracking-wider">Total Processed</span>
              <span className="text-3xl font-black mt-2">{parsedData.length} Students</span>
            </div>
            <div className="bg-emerald-100 p-5 rounded-2xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] text-slate-900 flex flex-col justify-between">
              <span className="text-xs font-black text-emerald-950 uppercase tracking-wider">Auto-Matched / Auto-Filled</span>
              <span className="text-3xl font-black mt-2">
                {parsedData.filter(r => r.matchStatus === "Auto-Matched" || r.matchStatus === "Matched").length}
              </span>
            </div>
            <div className="bg-amber-100 p-5 rounded-2xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] text-slate-900 flex flex-col justify-between">
              <span className="text-xs font-black text-amber-950 uppercase tracking-wider">Caution & Duplicates</span>
              <span className="text-3xl font-black mt-2">
                {parsedData.filter(r => r.matchStatus === "Matched with Warnings" || r.matchStatus === "Duplicate Detected" || r.matchStatus === "Needs Manual Review").length}
              </span>
            </div>
            <div className={`${errorCount > 0 ? 'bg-rose-100 border-rose-900' : 'bg-slate-50 border-slate-900'} p-5 rounded-2xl border-[3px] shadow-[4px_4px_0_0_#0f172a] text-slate-900 flex flex-col justify-between`}>
              <div>
                <span className={`text-xs font-black uppercase tracking-wider ${errorCount > 0 ? 'text-rose-900' : 'text-slate-500'}`}>Errors & Conflicts</span>
                <span className={`text-3xl font-black block mt-2 ${errorCount > 0 ? 'text-rose-900' : 'text-slate-900'}`}>{errorCount}</span>
              </div>
              {errorCount > 0 && (
                <button onClick={removeAllErrors} className="mt-3 text-xs font-black bg-white border-[2.5px] border-rose-900 text-rose-900 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors w-fit">
                  Remove All Errors
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
                    <th className="px-6 py-4 font-black text-slate-900">Name</th>
                    <th className="px-6 py-4 font-black text-slate-900">Email</th>
                    {isPython && (
                       <>
                         <th className="px-2 py-3 font-black text-slate-900 w-20">MCQ</th>
                         <th className="px-2 py-3 font-black text-slate-900 w-20">Q1</th>
                         <th className="px-2 py-3 font-black text-slate-900 w-20">Q2</th>
                         <th className="px-2 py-3 font-black text-slate-900 w-20">Q3</th>
                       </>
                    )}
                    <th className="px-4 py-3 font-black text-slate-900 w-24">{isPython ? "Total" : "Score"}</th>
                    <th className="px-4 py-3 font-black text-slate-900">Analysis Status</th>
                    <th className="px-4 py-3 font-black text-slate-900 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y-[3px] divide-slate-900">
                  {parsedData.map((row) => (
                    <tr key={row.id} className={`hover:bg-slate-50 transition-colors ${row.status === 'error' ? 'bg-red-100/50' : row.status === 'warning' ? 'bg-amber-100/50' : ''}`}>
                      <td className="px-6 py-4 font-mono font-black text-slate-900">
                        {row.autoFilledFields?.includes("roll_number") ? (
                          <div className="bg-amber-50 border-2 border-dashed border-amber-500 text-amber-950 px-2 py-1 rounded-lg flex items-center justify-between gap-1.5" title="Auto-filled from database">
                            <span>{row.roll_number || '-'}</span>
                            <span className="text-[10px] font-black bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-md uppercase tracking-wider scale-90">Auto</span>
                          </div>
                        ) : row.warnings.some(w => w.includes("Roll mismatch")) ? (
                          <div className="bg-rose-50 border-2 border-dashed border-rose-500 text-rose-950 px-2 py-1 rounded-lg flex items-center justify-between gap-1.5" title={row.warnings.find(w => w.includes("Roll mismatch"))}>
                            <span>{row.roll_number || '-'}</span>
                            <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                          </div>
                        ) : (
                          row.roll_number || '-'
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {row.autoFilledFields?.includes("name") ? (
                          <div className="bg-amber-50 border-2 border-dashed border-amber-500 text-amber-950 px-2 py-1 rounded-lg flex items-center justify-between gap-1.5" title="Auto-filled from database">
                            <span>{row.name || '-'}</span>
                            <span className="text-[10px] font-black bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-md uppercase tracking-wider scale-90">Auto</span>
                          </div>
                        ) : row.warnings.some(w => w.includes("Name mismatch")) ? (
                          <div className="bg-rose-50 border-2 border-dashed border-rose-500 text-rose-950 px-2 py-1 rounded-lg flex items-center justify-between gap-1.5" title={row.warnings.find(w => w.includes("Name mismatch"))}>
                            <span>{row.name || '-'}</span>
                            <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                          </div>
                        ) : (
                          row.name || '-'
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 max-w-[180px] truncate" title={row.email}>
                        {row.autoFilledFields?.includes("email") ? (
                          <div className="bg-amber-50 border-2 border-dashed border-amber-500 text-amber-950 px-2 py-1 rounded-lg flex items-center justify-between gap-1.5 truncate" title="Auto-filled from database">
                            <span className="truncate">{row.email || '-'}</span>
                            <span className="text-[10px] font-black bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-md uppercase tracking-wider scale-90 shrink-0">Auto</span>
                          </div>
                        ) : row.warnings.some(w => w.includes("Email mismatch")) ? (
                          <div className="bg-rose-50 border-2 border-dashed border-rose-500 text-rose-950 px-2 py-1 rounded-lg flex items-center justify-between gap-1.5 truncate" title={row.warnings.find(w => w.includes("Email mismatch"))}>
                            <span className="truncate">{row.email || '-'}</span>
                            <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                          </div>
                        ) : (
                          row.email || '-'
                        )}
                      </td>
                      {isPython && (
                         <>
                           <td className="px-2 py-2">
                             <input
                               type="number"
                               value={row.pythonBreakdown?.mcq ?? ""}
                               onChange={(e) => updateRowCell(row.id, "python_mcq", e.target.value)}
                               placeholder="0"
                               min="0"
                               className="w-16 bg-slate-50/50 border-2 border-transparent hover:border-slate-300 focus:border-slate-900 focus:bg-white hover:bg-slate-100/50 px-2 py-1.5 rounded-lg transition-all font-black text-slate-900 outline-none text-center"
                             />
                           </td>
                           <td className="px-2 py-2">
                             <input
                               type="number"
                               value={row.pythonBreakdown?.q1 ?? ""}
                               onChange={(e) => updateRowCell(row.id, "python_q1", e.target.value)}
                               placeholder="0"
                               min="0"
                               className="w-16 bg-slate-50/50 border-2 border-transparent hover:border-slate-300 focus:border-slate-900 focus:bg-white hover:bg-slate-100/50 px-2 py-1.5 rounded-lg transition-all font-black text-slate-900 outline-none text-center"
                             />
                           </td>
                           <td className="px-2 py-2">
                             <input
                               type="number"
                               value={row.pythonBreakdown?.q2 ?? ""}
                               onChange={(e) => updateRowCell(row.id, "python_q2", e.target.value)}
                               placeholder="0"
                               min="0"
                               className="w-16 bg-slate-50/50 border-2 border-transparent hover:border-slate-300 focus:border-slate-900 focus:bg-white hover:bg-slate-100/50 px-2 py-1.5 rounded-lg transition-all font-black text-slate-900 outline-none text-center"
                             />
                           </td>
                           <td className="px-2 py-2">
                             <input
                               type="number"
                               value={row.pythonBreakdown?.q3 ?? ""}
                               onChange={(e) => updateRowCell(row.id, "python_q3", e.target.value)}
                               placeholder="0"
                               min="0"
                               className="w-16 bg-slate-50/50 border-2 border-transparent hover:border-slate-300 focus:border-slate-900 focus:bg-white hover:bg-slate-100/50 px-2 py-1.5 rounded-lg transition-all font-black text-slate-900 outline-none text-center"
                             />
                           </td>
                         </>
                      )}
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={row.score ?? ""}
                          onChange={(e) => updateRowCell(row.id, "score", e.target.value)}
                          placeholder="0"
                          min="0"
                          max="100"
                          disabled={isPython}
                          className={`w-20 bg-slate-50/50 border-2 border-transparent hover:border-slate-300 focus:border-slate-900 focus:bg-white hover:bg-slate-100/50 px-2 py-1.5 rounded-lg transition-all font-black text-slate-900 outline-none text-center ${isPython ? "opacity-75 cursor-not-allowed select-none bg-slate-100" : ""}`}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-lg border-2 w-fit ${
                            row.matchStatus === "Auto-Matched" ? "bg-emerald-100 text-emerald-800 border-emerald-900" :
                            row.matchStatus === "Matched" ? "bg-cyan-100 text-cyan-800 border-cyan-900 animate-[pulse_2s_infinite]" :
                            row.matchStatus === "Matched with Warnings" ? "bg-amber-100 text-amber-800 border-amber-900" :
                            row.matchStatus === "Duplicate Detected" ? "bg-orange-100 text-orange-800 border-orange-900" :
                            row.matchStatus === "Conflict Detected" ? "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-900" :
                            row.matchStatus === "No Match Found" ? "bg-red-100 text-red-800 border-red-900" :
                            "bg-rose-100 text-rose-800 border-rose-900" // Needs Manual Review
                          }`}>
                            {row.matchStatus === "Auto-Matched" && <CheckSquare className="h-3.5 w-3.5" />}
                            {row.matchStatus === "Matched" && <CheckCircle2 className="h-3.5 w-3.5" />}
                            {row.matchStatus === "Matched with Warnings" && <AlertTriangle className="h-3.5 w-3.5" />}
                            {row.matchStatus === "Duplicate Detected" && <AlertTriangle className="h-3.5 w-3.5" />}
                            {row.matchStatus === "Conflict Detected" && <X className="h-3.5 w-3.5" />}
                            {row.matchStatus === "No Match Found" && <X className="h-3.5 w-3.5" />}
                            {row.matchStatus === "Needs Manual Review" && <Info className="h-3.5 w-3.5" />}
                            {row.matchStatus} ({row.confidenceScore}%)
                          </span>

                          {row.errors.map((err, i) => (
                            <span key={i} className="flex items-start gap-1 text-xs font-black text-red-950 bg-red-100 border-2 border-red-950 w-fit px-2 py-0.5 rounded-md mt-0.5">
                              <X className="h-3 w-3 mt-0.5 shrink-0" /> {err}
                            </span>
                          ))}
                          {row.warnings.map((warn, i) => (
                            <span key={i} className="flex items-start gap-1 text-xs font-black text-amber-950 bg-amber-100 border-2 border-amber-950 w-fit px-2 py-0.5 rounded-md mt-0.5">
                              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> {warn}
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
                className="px-6 py-2.5 text-sm font-black text-white bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500 bg-[length:200%_auto] hover:bg-right border-[3px] border-slate-900 rounded-xl shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0f172a] transition-all duration-500 flex items-center gap-2"
              >
                <CheckCircle2 className="h-5 w-5" />
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
