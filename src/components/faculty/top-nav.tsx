"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import { Search, Bell, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { FacultySidebar } from "./sidebar";

const getPageTitle = (pathname: string) => {
  if (pathname === "/faculty/dashboard") return "Dashboard Overview";
  if (pathname === "/faculty/dashboard/upload") return "Result Upload";
  if (pathname === "/faculty/dashboard/queries") return "Query Management";
  if (pathname === "/faculty/dashboard/announcements") return "Announcements";
  if (pathname === "/faculty/dashboard/analytics") return "Analytics & Insights";
  if (pathname === "/faculty/dashboard/retest") return "Retest Management";
  if (pathname === "/faculty/dashboard/search") return "Student Results";
  if (pathname === "/faculty/dashboard/settings") return "Settings";
  if (pathname === "/faculty/dashboard/telegram") return "Telegram Bot";
  return "Faculty Portal";
};

export function FacultyTopNav() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when pathname changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <div className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b-[3px] border-slate-900 bg-white px-4 sm:px-6">
        
        {/* Left side: Mobile Menu + Title */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 text-slate-900 border-[3px] border-transparent hover:border-slate-900 rounded-xl transition-all hover:shadow-[4px_4px_0_0_#0f172a]"
          >
            <Menu className="h-6 w-6 font-black" />
          </button>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight block truncate max-w-[150px] sm:max-w-none">{title}</h1>
        </div>

        {/* Center: Global Search Bar */}
        <div className="hidden lg:flex flex-1 max-w-xl mx-8">
          <div className="relative w-full group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            </div>
            <input
              type="text"
              className="block w-full pl-11 pr-4 py-2.5 bg-slate-50 border-[3px] border-slate-900 rounded-xl text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:bg-white focus:shadow-[4px_4px_0_0_#0f172a] transition-all"
              placeholder="Search students, queries..."
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-xs font-black text-slate-400 bg-slate-200 px-2 py-1 rounded-md border-2 border-slate-300">⌘K</span>
            </div>
          </div>
        </div>

        {/* Right side: Actions */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          {/* Notifications */}
          <button className="relative p-2 sm:p-2.5 bg-white text-slate-900 border-[3px] border-slate-900 rounded-xl transition-all shadow-[2px_2px_0_0_#0f172a] sm:shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[-2px] hover:translate-y-[-2px]">
            <Bell className="h-5 w-5 font-black" />
            <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-blue-600 border-2 border-slate-900 animate-pulse"></span>
          </button>

          {/* Mini Profile */}
          <div className="hidden sm:flex items-center gap-3 bg-white border-[3px] border-slate-900 px-3 py-1.5 rounded-xl shadow-[4px_4px_0_0_#0f172a] cursor-pointer hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
            <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center overflow-hidden border-2 border-slate-900">
              <Image src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix" width={32} height={32} alt="Profile" className="h-full w-full object-cover invert" unoptimized />
            </div>
            <div className="text-sm">
              <p className="font-black text-slate-900 leading-none">Dr. Felix</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">CS Department</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] flex lg:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Sidebar Container */}
          <div className="relative flex w-60 max-w-[80%] flex-col animate-in slide-in-from-left duration-300">
            <div className="absolute -right-12 top-4">
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-900 border-[3px] border-slate-900 shadow-[4px_4px_0_0_#0f172a]"
              >
                <X className="h-6 w-6 font-black" />
              </button>
            </div>
            <div className="h-full w-full">
              <FacultySidebar />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
