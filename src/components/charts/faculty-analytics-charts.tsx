"use client";

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

export default function FacultyAnalyticsCharts({ trendData, passFailData, sectionData, kpis, activeTab }: { trendData: any[], passFailData: any[], sectionData: any[], kpis: any, activeTab: string }) {
  if (activeTab === "overview") {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a]">
          <h3 className="text-lg font-black text-slate-900 mb-6">Class Average Trend</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="unit" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{stroke: '#e2e8f0', strokeWidth: 2}}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" name="Average Marks" dataKey="avgMarks" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                <Line type="monotone" name="Highest Score" dataKey="highest" stroke="#10b981" strokeWidth={3} dot={{r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff'}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pass/Fail Pie Chart */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] flex flex-col">
          <h3 className="text-lg font-black text-slate-900 mb-2">Overall Pass Rate</h3>
          <p className="text-sm font-bold text-slate-500 mb-6">Distribution across all unit tests.</p>
          <div className="flex-1 min-h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={passFailData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {passFailData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-4">
              <span className="text-3xl font-black text-slate-900">{kpis.passRate}</span>
              <span className="text-xs font-semibold text-slate-500">Passed</span>
            </div>
          </div>
          
          {/* Custom Legend */}
          <div className="flex justify-center gap-6 mt-4">
            {passFailData.map((item: any) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full border-[2px] border-slate-900 shadow-[1px_1px_0_0_#0f172a]" style={{ backgroundColor: item.color }}></div>
                <span className="text-xs font-black text-slate-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a] animate-in fade-in zoom-in-95 duration-300">
      <h3 className="text-lg font-black text-slate-900 mb-6">Section Performance Comparison</h3>
      {sectionData.length === 0 ? (
        <div className="text-center py-12 text-slate-500 font-bold">No section data available</div>
      ) : (
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sectionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="section" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
              <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} domain={[0, 100]} />
              <RechartsTooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{fill: '#f8fafc'}}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar yAxisId="left" name="Average Marks (%)" dataKey="avg" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              <Bar yAxisId="right" name="Pass Rate (%)" dataKey="passRate" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
