"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  UploadCloud, 
  Users, 
  MessageSquareWarning, 
  RefreshCcw, 
  LogOut,
  ChevronRight,
  Megaphone,
  TrendingUp,
  Settings,
  Database,
  ClipboardList,
  Send
} from "lucide-react";

const MENU_ITEMS = [
  { name: "Dashboard", href: "/faculty/dashboard", icon: LayoutDashboard },
  { name: "Result Upload", href: "/faculty/dashboard/upload", icon: UploadCloud },
  { name: "Student Results", href: "/faculty/dashboard/results", icon: Users },
  { name: "Query Management", href: "/faculty/dashboard/queries", icon: MessageSquareWarning },
  { name: "Announcements", href: "/faculty/dashboard/announcements", icon: Megaphone },
  { name: "Analytics", href: "/faculty/dashboard/analytics", icon: TrendingUp },
  { name: "Retest Management", href: "/faculty/dashboard/retest", icon: RefreshCcw },
  { name: "Student Database", href: "/faculty/dashboard/search", icon: Database },
  { name: "Settings", href: "/faculty/dashboard/settings", icon: Settings },
  { name: "Form Builder", href: "/faculty/dashboard/forms", icon: ClipboardList },
  { name: "Telegram Bot", href: "/faculty/dashboard/telegram", icon: Send },
];

export function FacultySidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-60 flex-col bg-slate-900 text-white transition-all duration-300 shrink-0 border-r-[3px] border-slate-900 shadow-[4px_0_15px_rgba(0,0,0,0.1)]">
      {/* Top Branding */}
      <div className="flex h-20 shrink-0 items-center gap-3 px-6 border-b-[3px] border-slate-800 bg-slate-900">
        <Image src="/rec-logo.png" width={40} height={40} alt="REC Logo" className="h-10 w-auto bg-white rounded-md p-1 border-[2px] border-slate-400" priority />
        <div>
          <span className="text-xl font-black text-white tracking-tight">REC Admin</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 custom-scrollbar">
        {MENU_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold transition-all border-[2px] ${
                isActive 
                  ? "bg-blue-600 text-white border-blue-500 shadow-[4px_4px_0_0_#1e293b] translate-x-[-2px] translate-y-[-2px]" 
                  : "bg-transparent border-transparent text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-slate-400 group-hover:text-blue-400 transition-colors"}`} />
                {item.name}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bottom Profile */}
      <div className="p-4 border-t-[3px] border-slate-800 bg-slate-900 space-y-3">
        <div className="flex items-center justify-between rounded-xl p-2 border-[2px] border-transparent hover:border-slate-700 hover:bg-slate-800 cursor-pointer transition-all">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center overflow-hidden">
              <Image src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix" width={40} height={40} alt="Profile" className="h-full w-full object-cover invert opacity-90" unoptimized />
            </div>
            <div>
              <p className="text-sm font-black text-white leading-tight">Dr. Felix</p>
              <p className="text-xs font-bold text-slate-400">CS Department</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400 font-bold" />
        </div>
        
        <Link 
          href="/faculty/login"
          className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-white bg-slate-800 border-[2px] border-slate-700 hover:bg-red-600 hover:border-red-500 hover:shadow-[4px_4px_0_0_#1e293b] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
        >
          <LogOut className="h-4 w-4 font-bold" />
          Logout
        </Link>
      </div>
    </div>
  );
}
