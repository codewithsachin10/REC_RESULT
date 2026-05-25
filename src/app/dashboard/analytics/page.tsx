"use client";

import { useState, useEffect } from "react";
import { Loader2, TrendingUp, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import dynamic from 'next/dynamic';

const StudentAnalyticsCharts = dynamic(
  () => import('@/components/charts/student-analytics-charts'),
  { ssr: false, loading: () => <div className="h-80 flex items-center justify-center font-bold text-slate-500">Loading charts...</div> }
);

export default function AnalyticsPage() {
  const [marksData, setMarksData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMarks = async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const student_id = userData.user?.id;
      
      if (!student_id) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('marks')
        .select('subject_name, total_score, unit_test_1, unit_test_2, unit_test_3')
        .eq('student_id', student_id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error fetching marks:", error);
      } else if (data) {
        // Format data for the charts
        const formattedData = data.map((item) => ({
          subject: item.subject_name.substring(0, 8) + '...', // abbreviate long names
          fullSubject: item.subject_name,
          total: Number(item.total_score) || 0,
          coding: Number(item.unit_test_1) || 0,
          mcq: Number(item.unit_test_2) || 0,
          manual: Number(item.unit_test_3) || 0,
        }));
        setMarksData(formattedData);
      }
      setIsLoading(false);
    };

    fetchMarks();
  }, []);

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex flex-col gap-2 mb-8">
        <h2 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-blue-600" />
          Performance Analytics
        </h2>
        <p className="text-base font-medium text-slate-500">Track your academic progress across different subjects.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
        </div>
      ) : marksData.length === 0 ? (
        <div className="p-12 text-center border-[3px] border-slate-900 bg-white rounded-2xl shadow-[6px_6px_0_0_#0f172a]">
          <p className="text-xl font-bold text-slate-600">No data available for analytics yet.</p>
        </div>
      ) : (
        <StudentAnalyticsCharts marksData={marksData} />
      )}
    </div>
  );
}
