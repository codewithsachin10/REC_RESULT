"use client";

import { useState, useEffect } from "react";
import { Loader2, TrendingUp, Target, Users, BookOpen, Activity, MousePointerClick } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import dynamic from 'next/dynamic';

const FacultyAnalyticsCharts = dynamic(
  () => import('@/components/charts/faculty-analytics-charts'),
  { ssr: false, loading: () => <div className="h-80 flex items-center justify-center font-bold text-slate-500">Loading charts...</div> }
);

export default function FacultyAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "sections">("overview");
  const [isLoading, setIsLoading] = useState(true);
  
  // Real-time metrics
  const [liveUsers, setLiveUsers] = useState<number>(0);
  const [dailyVisits, setDailyVisits] = useState<number>(0);

  // Dynamic Data States
  const [trendData, setTrendData] = useState<any[]>([]);
  const [passFailData, setPassFailData] = useState<any[]>([]);
  const [sectionData, setSectionData] = useState<any[]>([]);
  const [kpis, setKpis] = useState({
    overallAverage: "0%",
    passRate: "0%",
    totalGraded: 0,
    activeTests: "0 Units"
  });

  useEffect(() => {
    const supabase = createClient();
    
    // Listen to global presence events from PresenceTracker
    const handlePresenceUpdate = (e: any) => {
      setLiveUsers(e.detail.count);
    };
    
    window.addEventListener('presence-update', handlePresenceUpdate);

    // Fetch Daily Visits
    const fetchVisits = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { count, error } = await supabase
        .from('daily_visits')
        .select('*', { count: 'exact', head: true })
        .eq('visit_date', today);
        
      if (!error && count !== null) {
        setDailyVisits(count);
      }
    };
    
    fetchVisits();

    return () => {
      window.removeEventListener('presence-update', handlePresenceUpdate);
    };
  }, []);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const supabase = createClient();

      const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('id, section, department')
        .eq('role', 'student');

      const { data: marks, error: marksErr } = await supabase
        .from('marks')
        .select('student_id, total_score, unit_test_1, unit_test_2, unit_test_3');

      if (profileErr || marksErr) {
        console.error("Error fetching data", { profileErr, marksErr });
        setIsLoading(false);
        return;
      }

      if (marks && profiles) {
        // 1. Calculate Pass/Fail
        let passed = 0;
        let failed = 0;
        let totalScoreSum = 0;
        let validScoresCount = 0;

        marks.forEach((m: any) => {
          // A student passes if total score is >= 150 (assuming max 300)
          if (m.total_score >= 150) passed++;
          else failed++;

          if (m.total_score != null) {
            totalScoreSum += m.total_score;
            validScoresCount++;
          }
        });

        // For Pass Rate
        const total = passed + failed;
        const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) + "%" : "0%";
        
        // Convert overall sum out of 300 to a percentage
        const averageTotal = validScoresCount > 0 ? (totalScoreSum / validScoresCount) : 0;
        const averagePercent = ((averageTotal / 300) * 100).toFixed(1) + "%";

        setPassFailData([
          { name: "Passed", value: passed, color: "#10b981" },
          { name: "Failed", value: failed, color: "#ef4444" }
        ]);

        setKpis({
          overallAverage: averagePercent,
          passRate: passRate,
          totalGraded: total,
          activeTests: "3 Units"
        });

        // 2. Trend Data (Averaging unit_test_1, 2, 3)
        let sumU1 = 0, sumU2 = 0, sumU3 = 0;
        let maxU1 = 0, maxU2 = 0, maxU3 = 0;
        let countU1 = 0, countU2 = 0, countU3 = 0;

        marks.forEach((m: any) => {
          if (m.unit_test_1 != null) { sumU1 += m.unit_test_1; countU1++; maxU1 = Math.max(maxU1, m.unit_test_1); }
          if (m.unit_test_2 != null) { sumU2 += m.unit_test_2; countU2++; maxU2 = Math.max(maxU2, m.unit_test_2); }
          if (m.unit_test_3 != null) { sumU3 += m.unit_test_3; countU3++; maxU3 = Math.max(maxU3, m.unit_test_3); }
        });

        setTrendData([
          { unit: "Unit 1", avgMarks: countU1 ? (sumU1/countU1).toFixed(1) : 0, highest: maxU1 },
          { unit: "Unit 2", avgMarks: countU2 ? (sumU2/countU2).toFixed(1) : 0, highest: maxU2 },
          { unit: "Unit 3", avgMarks: countU3 ? (sumU3/countU3).toFixed(1) : 0, highest: maxU3 },
        ]);

        // 3. Section Data
        const sectionMap: Record<string, { totalStudents: number; passed: number; sumTotal: number; countTotal: number }> = {};
        
        marks.forEach((m: any) => {
          const studentProfile = profiles.find((p: any) => p.id === m.student_id);
          const section = studentProfile?.section ? `${studentProfile.department}-${studentProfile.section}` : 'Unknown';
          
          if (!sectionMap[section]) {
            sectionMap[section] = { totalStudents: 0, passed: 0, sumTotal: 0, countTotal: 0 };
          }
          
          sectionMap[section].totalStudents++;
          if (m.total_score >= 150) sectionMap[section].passed++;
          if (m.total_score != null) {
            sectionMap[section].sumTotal += m.total_score;
            sectionMap[section].countTotal++;
          }
        });

        const sectionChartData = Object.keys(sectionMap).map(sec => {
          const s = sectionMap[sec];
          const avgTotal = s.countTotal > 0 ? (s.sumTotal / s.countTotal) : 0;
          const avgPercent = (avgTotal / 300) * 100;
          const passPcnt = s.totalStudents > 0 ? (s.passed / s.totalStudents) * 100 : 0;
          
          return {
            section: sec,
            avg: Number(avgPercent.toFixed(1)),
            passRate: Number(passPcnt.toFixed(1))
          };
        });

        setSectionData(sectionChartData);
      }
      
      setIsLoading(false);
    };

    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center animate-in fade-in">
        <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a]">
          <Loader2 className="h-8 w-8 text-slate-900 animate-spin" />
          <p className="font-black text-slate-900 text-lg">Crunching numbers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Performance Analytics</h2>
        <p className="text-slate-500 mt-1">Deep dive into student metrics, unit test averages, and section-wise comparisons.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        {/* New Realtime Card */}
        <div className="bg-white p-5 rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0f172a] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="h-10 w-10 rounded-lg bg-red-100 text-red-600 border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a] flex items-center justify-center">
              <Activity className="h-5 w-5" />
            </div>
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-slate-900"></span>
            </span>
          </div>
          <div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Live Users</p>
            <p className="text-2xl font-black text-slate-900">{liveUsers}</p>
          </div>
        </div>

        {/* New Daily Visits Card */}
        <div className="bg-white p-5 rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0f172a] transition-all flex flex-col justify-between">
          <div className="h-10 w-10 rounded-lg bg-orange-200 text-orange-800 border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a] flex items-center justify-center mb-2">
            <MousePointerClick className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Visits Today</p>
            <p className="text-2xl font-black text-slate-900">{dailyVisits}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0f172a] transition-all flex flex-col justify-between">
          <div className="h-10 w-10 rounded-lg bg-indigo-300 text-indigo-900 border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a] flex items-center justify-center mb-2">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Overall Avg</p>
            <p className="text-2xl font-black text-slate-900">{kpis.overallAverage}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0f172a] transition-all flex flex-col justify-between">
          <div className="h-10 w-10 rounded-lg bg-emerald-300 text-emerald-900 border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a] flex items-center justify-center mb-2">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Pass Rate</p>
            <p className="text-2xl font-black text-slate-900">{kpis.passRate}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0f172a] transition-all flex flex-col justify-between">
          <div className="h-10 w-10 rounded-lg bg-blue-300 text-blue-900 border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a] flex items-center justify-center mb-2">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Total Graded</p>
            <p className="text-2xl font-black text-slate-900">{kpis.totalGraded}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0f172a] transition-all flex flex-col justify-between">
          <div className="h-10 w-10 rounded-lg bg-purple-300 text-purple-900 border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a] flex items-center justify-center mb-2">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Active Tests</p>
            <p className="text-2xl font-black text-slate-900">{kpis.activeTests}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b-[3px] border-slate-200">
        <button 
          onClick={() => setActiveTab("overview")}
          className={`pb-3 px-1 text-sm font-black border-b-[3px] transition-colors ${activeTab === 'overview' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
        >
          General Overview
        </button>
        <button 
          onClick={() => setActiveTab("sections")}
          className={`pb-3 px-1 text-sm font-black border-b-[3px] transition-colors ${activeTab === 'sections' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
        >
          Section Analysis
        </button>
      </div>

      <FacultyAnalyticsCharts 
        trendData={trendData} 
        passFailData={passFailData} 
        sectionData={sectionData} 
        kpis={kpis} 
        activeTab={activeTab} 
      />

    </div>
  );
}
