"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  FileCheck, 
  MessageSquareWarning, 
  UserX, 
  AlertTriangle, 
  TrendingUp,
  Clock,
  CheckCircle2,
  UploadCloud,
  MessageSquare,
  ArrowRight,
  Loader2
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function FacultyDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsCards, setAnalyticsCards] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const supabase = createClient();
      
      const { count: studentCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');

      const { data: marks } = await supabase.from('marks').select('*').order('created_at', { ascending: false });
      const { data: queries } = await supabase.from('queries').select('*, profiles(name)').order('created_at', { ascending: false });

      if (marks && queries) {
        // Analytics
        const totalStudents = studentCount || 0;
        const resultsPublished = marks.length; // assuming all in table are published
        const pendingQueries = queries.filter(q => q.status === 'pending').length;
        
        let failedStudents = 0;
        let sumMarks = 0;
        let countMarks = 0;
        marks.forEach(m => {
          if (m.total_score < 150) failedStudents++;
          if (m.total_score != null) {
            sumMarks += m.total_score;
            countMarks++;
          }
        });
        
        const avgScore = countMarks > 0 ? (sumMarks / countMarks) : 0;
        const avgPercent = ((avgScore / 300) * 100).toFixed(1);

        const cards = [
          { title: "Total Students", value: totalStudents.toString(), trend: "Active", trendUp: true, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { title: "Results Published", value: resultsPublished.toString(), trend: "Total", trendUp: true, icon: FileCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
          { title: "Pending Queries", value: pendingQueries.toString(), trend: "To Review", trendUp: pendingQueries === 0, icon: MessageSquareWarning, color: "text-amber-600", bg: "bg-amber-50" },
          { title: "Failed Students", value: failedStudents.toString(), trend: "Requires Attention", trendUp: false, icon: UserX, color: "text-red-600", bg: "bg-red-50" },
          { title: "Total Queries", value: queries.length.toString(), trend: "All Time", trendUp: false, icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50" },
          { title: "Average Score", value: `${avgPercent}%`, trend: "Overall", trendUp: true, icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
        ];
        
        setAnalyticsCards(cards);

        // Recent Activities (Mix marks and queries)
        const activities: any[] = [];
        
        marks.slice(0, 3).forEach(m => {
          activities.push({
            id: `mark-${m.id}`,
            title: `Results uploaded for ${m.subject_name}`,
            time: new Date(m.created_at).toLocaleDateString(),
            icon: UploadCloud,
            color: "text-blue-600",
            bg: "bg-blue-100",
            timestamp: new Date(m.created_at).getTime()
          });
        });

        queries.slice(0, 3).forEach(q => {
          activities.push({
            id: `query-${q.id}`,
            title: `${q.profiles?.name || 'Student'} submitted a query`,
            time: new Date(q.created_at).toLocaleDateString(),
            icon: MessageSquare,
            color: "text-slate-600",
            bg: "bg-slate-100",
            timestamp: new Date(q.created_at).getTime()
          });
        });

        activities.sort((a, b) => b.timestamp - a.timestamp);
        setRecentActivities(activities.slice(0, 5));
      }

      setIsLoading(false);
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center animate-in fade-in">
        <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a]">
          <Loader2 className="h-8 w-8 text-slate-900 animate-spin" />
          <p className="font-black text-slate-900 text-lg">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* Top Welcome */}
      <div>
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Overview</h2>
        <p className="text-slate-500 mt-1">Monitor your academic operations, student performance, and pending tasks.</p>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {analyticsCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div 
              key={idx} 
              className="group rounded-xl bg-white p-5 border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0f172a] transition-all duration-200 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a] ${card.bg}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-black border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a] px-2 py-0.5 rounded-lg ${
                    card.trendUp ? 'bg-emerald-300 text-emerald-900' : 'bg-red-300 text-red-900'
                  }`}>
                    {card.trend}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-black text-slate-500 mb-1">{card.title}</p>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{card.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Feed */}
        <div className="lg:col-span-2">
          <div className="rounded-xl bg-white border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] overflow-hidden h-full flex flex-col">
            <div className="px-6 py-4 border-b-[3px] border-slate-900 flex items-center justify-between bg-white shrink-0">
              <h3 className="text-lg font-black text-slate-900">Live Activity Feed</h3>
              <button className="text-sm font-black text-slate-900 bg-white border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a] px-3 py-1.5 rounded-lg hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#0f172a] transition-all flex items-center gap-1">
                View All <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="space-y-6">
                {recentActivities.length === 0 ? (
                  <p className="text-center font-bold text-slate-500 py-8">No recent activities found.</p>
                ) : (
                  recentActivities.map((activity, idx) => {
                    const Icon = activity.icon;
                    return (
                      <div key={activity.id} className="flex gap-4 relative">
                        {/* Timeline connecting line */}
                        {idx !== recentActivities.length - 1 && (
                          <div className="absolute left-[19px] top-10 bottom-[-24px] w-[3px] bg-slate-900"></div>
                        )}
                        
                        <div className={`relative z-10 shrink-0 h-10 w-10 rounded-xl flex items-center justify-center border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a] ${activity.bg}`}>
                          <Icon className={`h-5 w-5 ${activity.color}`} />
                        </div>
                        
                        <div className="pt-1.5 flex-1 bg-white border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] rounded-xl px-4 py-3 mb-2 ml-2 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#0f172a] transition-all">
                          <p className="text-sm font-black text-slate-900">{activity.title}</p>
                          <p className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-1"><Clock className="h-3 w-3" /> {activity.time}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Side Widget (Quick Actions) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-xl bg-slate-900 p-6 text-white relative overflow-hidden shadow-[4px_4px_0_0_#0f172a] border-[3px] border-slate-900">
            <div className="absolute -right-4 -top-4 opacity-10">
              <UploadCloud className="h-32 w-32" />
            </div>
            <h3 className="text-lg font-black mb-2 relative z-10">Upload Results</h3>
            <p className="text-slate-400 text-sm mb-6 relative z-10 font-bold">Drag and drop your latest unit test CSV or Excel files to process them instantly.</p>
            <button className="relative z-10 w-full bg-blue-300 text-blue-900 font-black text-sm py-2.5 rounded-lg border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#0f172a] transition-all flex items-center justify-center gap-2">
              <UploadCloud className="h-5 w-5" />
              Start Upload
            </button>
          </div>

          <div className="rounded-xl bg-white border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] p-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">System Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-600">Student Portal</span>
                <span className="flex items-center gap-2 text-xs font-black text-emerald-900 bg-emerald-300 px-2.5 py-1 rounded-lg border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a]">
                  <div className="h-2 w-2 rounded-full bg-emerald-900 animate-pulse"></div>
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-600">Database API</span>
                <span className="flex items-center gap-2 text-xs font-black text-blue-900 bg-blue-300 px-2.5 py-1 rounded-lg border-[3px] border-slate-900 shadow-[2px_2px_0_0_#0f172a]">
                  <div className="h-2 w-2 rounded-full bg-blue-900"></div>
                  Connected
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
