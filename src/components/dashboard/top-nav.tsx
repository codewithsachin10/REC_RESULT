"use client";

import { Search, Bell, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

export function TopNav() {
  const pathname = usePathname();
  const [studentName, setStudentName] = useState("Student");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      setStudentName(localStorage.getItem('student_name') || "Student");
    }
  }, []);

  // Close mobile menu when pathname changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);
  
  const navLinks = [
    { name: "Results", href: "/dashboard" },
    { name: "Queries", href: "/dashboard/queries" },
    { name: "Profile", href: "/dashboard/profile" },
    { name: "Support", href: "/dashboard/support" },
    { name: "Analytics", href: "/dashboard/analytics", lgOnly: true },
  ];

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b-[3px] border-slate-900 bg-white px-4 sm:px-6 shadow-sm">
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Mobile Menu Button */}
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="sm:hidden p-2 text-slate-900 border-[3px] border-transparent hover:border-slate-900 rounded-xl transition-all"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6 font-black" /> : <Menu className="h-6 w-6 font-black" />}
        </button>

        <div className="flex items-center gap-2">
          <Image src="/rec-logo.png" alt="Rajalakshmi Engineering College" width={160} height={40} className="h-10 w-auto object-contain hidden sm:block" priority />
          <Image src="/rec-logo.png" alt="REC" width={40} height={40} className="h-8 w-auto object-contain sm:hidden" priority />
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden sm:flex items-center gap-2 pl-2 sm:pl-6 sm:border-l-2 border-slate-200">
          {navLinks.map((link) => (
            <Link 
              key={link.name}
              href={link.href}
              className={cn(
                "px-4 py-2 rounded-lg font-bold text-sm transition-colors",
                link.lgOnly && "hidden lg:block",
                pathname === link.href 
                  ? "bg-slate-900 text-white" 
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              {link.name}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border-2 border-slate-200 hover:border-slate-900 hover:bg-slate-50 transition-colors">
          <Bell className="h-5 w-5 text-slate-700" />
          <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 ring-2 ring-white"></span>
        </button>

        <div className="flex items-center gap-3 sm:pl-4 sm:border-l-2 border-slate-200">
          <div className="hidden sm:flex flex-col items-end">
            <span className="font-bold text-sm text-slate-900">
              {studentName}
            </span>
            <span className="text-xs font-medium text-slate-500">Student</span>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-slate-900 bg-blue-100 font-bold text-blue-900 shadow-[2px_2px_0_0_#0f172a]">
            {studentName.charAt(0)}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {isMobileMenuOpen && (
        <div className="absolute top-16 left-0 right-0 bg-white border-b-[3px] border-slate-900 shadow-xl sm:hidden flex flex-col p-4 gap-2 animate-in slide-in-from-top-2">
          {navLinks.map((link) => (
            <Link 
              key={link.name}
              href={link.href}
              className={cn(
                "px-4 py-3 rounded-lg font-bold text-base transition-colors border-[2px]",
                pathname === link.href 
                  ? "bg-slate-900 text-white border-slate-900" 
                  : "bg-slate-50 text-slate-600 border-transparent hover:border-slate-300"
              )}
            >
              {link.name}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
