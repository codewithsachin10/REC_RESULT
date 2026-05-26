"use client";

import { Target } from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts";

export default function StudentAnalyticsCharts({ marksData }: { marksData: any[] }) {
  return (
    <div className="flex flex-col gap-8">
      {/* Main Trend Line Chart */}
      <div className="bg-white rounded-2xl border-[3px] border-slate-900 p-6 shadow-[8px_8px_0_0_#0f172a]">
        <div className="flex items-center gap-2 mb-6">
          <Target className="h-6 w-6 text-indigo-600" />
          <h3 className="text-xl font-extrabold text-slate-900">Overall Score Trends</h3>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={marksData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis 
                dataKey="subject" 
                tick={{ fill: '#64748b', fontWeight: 'bold' }} 
                axisLine={{ stroke: '#0f172a', strokeWidth: 2 }}
              />
              <YAxis 
                domain={[0, 300]} 
                tick={{ fill: '#64748b', fontWeight: 'bold' }}
                axisLine={{ stroke: '#0f172a', strokeWidth: 2 }}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: '3px solid #0f172a', fontWeight: 'bold' }}
                labelStyle={{ color: '#0f172a', marginBottom: '4px' }}
                formatter={(value: any) => [`${value} / 300`, 'Total Score']}
              />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#4f46e5" 
                strokeWidth={4} 
                dot={{ fill: '#4f46e5', stroke: '#0f172a', strokeWidth: 2, r: 6 }} 
                activeDot={{ r: 8, stroke: '#0f172a', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown Bar Chart */}
      <div className="bg-white rounded-2xl border-[3px] border-slate-900 p-6 shadow-[8px_8px_0_0_#0f172a]">
        <div className="flex items-center gap-2 mb-6">
          <Target className="h-6 w-6 text-fuchsia-600" />
          <h3 className="text-xl font-extrabold text-slate-900">Section-wise Breakdown</h3>
        </div>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={marksData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis 
                dataKey="subject" 
                tick={{ fill: '#64748b', fontWeight: 'bold' }} 
                axisLine={{ stroke: '#0f172a', strokeWidth: 2 }}
              />
              <YAxis 
                tick={{ fill: '#64748b', fontWeight: 'bold' }}
                axisLine={{ stroke: '#0f172a', strokeWidth: 2 }}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: '3px solid #0f172a', fontWeight: 'bold' }}
                cursor={{ fill: '#f1f5f9' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }}/>
              <Bar dataKey="coding" name="Coding (50)" stackId="a" fill="#3b82f6" stroke="#0f172a" strokeWidth={2} />
              <Bar dataKey="mcq" name="MCQ (30)" stackId="a" fill="#8b5cf6" stroke="#0f172a" strokeWidth={2} />
              <Bar dataKey="manual" name="Manual Eval (20)" stackId="a" fill="#f59e0b" stroke="#0f172a" strokeWidth={2} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
