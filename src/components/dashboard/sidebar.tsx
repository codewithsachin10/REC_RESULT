"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  LayoutDashboard, 
  FileCheck2, 
  TrendingUp, 
  MessageSquareWarning, 
  BellRing, 
  UserCircle, 
  Settings,
  LogOut,
  LifeBuoy
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Results", href: "/dashboard/results", icon: FileCheck2 },
  { name: "Performance", href: "/dashboard/performance", icon: TrendingUp },
  { name: "Queries", href: "/dashboard/queries", icon: MessageSquareWarning },
  { name: "Announcements", href: "/dashboard/announcements", icon: BellRing },
  { name: "Profile", href: "/dashboard/profile", icon: UserCircle },
  { name: "Support", href: "/dashboard/support", icon: LifeBuoy },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    localStorage.clear();
    router.push("/login");
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r-[3px] border-slate-900 bg-slate-900 text-white flex flex-col transition-transform sm:translate-x-0 hidden sm:flex">
      <div className="flex h-16 items-center gap-3 border-b-[3px] border-slate-800 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-900 font-bold text-lg shadow-[2px_2px_0_0_#3b82f6]">
          R
        </div>
        <span className="font-extrabold text-xl tracking-tight">REC Portal</span>
      </div>

      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 font-semibold transition-all duration-200 group",
                isActive 
                  ? "bg-blue-600 text-white shadow-[2px_2px_0_0_#1e40af] border-2 border-[#1e40af]" 
                  : "text-slate-300 hover:bg-slate-800 hover:text-white border-2 border-transparent"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t-[3px] border-slate-800 p-4">
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-slate-800 p-3 border-2 border-slate-700">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-900">
            SG
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold text-white truncate">Sachin G</span>
            <span className="text-xs font-medium text-slate-400 truncate">211620104032</span>
          </div>
        </div>
        <button 
          onClick={handleLogout} 
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 font-semibold text-slate-300 hover:bg-red-500/10 hover:text-red-500 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}
