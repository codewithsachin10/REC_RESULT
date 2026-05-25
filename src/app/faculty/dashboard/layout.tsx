import { FacultySidebar } from "@/components/faculty/sidebar";
import { FacultyTopNav } from "@/components/faculty/top-nav";

export default function FacultyDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans selection:bg-blue-100">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0">
        <FacultySidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <FacultyTopNav />
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
