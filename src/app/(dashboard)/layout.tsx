import { Sidebar, SidebarContent } from "@/components/layout/Sidebar";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NotificationBell } from "@/components/layout/NotificationBell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-slate-100 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="md:hidden flex h-16 items-center border-b border-neutral-800 bg-[#131313] px-4 shrink-0 justify-between">
           <div className="flex items-center gap-3">
             <Sheet>
               <SheetTrigger asChild>
                 <button className="p-2 -ml-2 text-slate-400 hover:bg-neutral-800 rounded-md transition-colors">
                   <Menu className="h-6 w-6" />
                 </button>
               </SheetTrigger>
               <SheetContent side="left" className="p-0 w-64 border-r border-neutral-800 bg-[#131313] text-slate-300">
                 <SidebarContent />
               </SheetContent>
             </Sheet>
             <span className="font-bold text-lg text-white tracking-wide uppercase italic">LoadTrack</span>
           </div>
           
           <NotificationBell />
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
