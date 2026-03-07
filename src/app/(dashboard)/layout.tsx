import { Sidebar } from "@/components/layout/Sidebar";
import { Menu } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-slate-100 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="md:hidden flex h-16 items-center gap-4 border-b border-neutral-800 bg-[#131313] px-4">
          <button className="p-2 -ml-2 text-slate-400 hover:bg-neutral-800 rounded-md transition-colors">
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-bold text-lg text-white tracking-wide uppercase">LoadTrack</span>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
