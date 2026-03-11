"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Search, Filter, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";

export function ReadinessFilters({ positions }: { positions: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all") {
        params.delete(name);
      } else {
        params.set(name, value);
      }
      return params.toString();
    },
    [searchParams]
  );

  const handleFilterChange = (name: string, value: string) => {
    router.push(`?${createQueryString(name, value)}`, { scroll: false });
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6 items-end">
      <div className="flex-1 w-full space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Search Player</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Name..." 
            className="pl-9 bg-[#111] border-neutral-800 focus:ring-indigo-500/50"
            defaultValue={searchParams.get("search") || ""}
            onChange={(e) => {
              // Debounce search if possible or just handle it here
              const val = e.target.value;
              const timer = setTimeout(() => handleFilterChange("search", val), 500);
              return () => clearTimeout(timer);
            }}
          />
        </div>
      </div>

      <div className="w-full md:w-48 space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Position</label>
        <Select 
          value={searchParams.get("position") || "all"} 
          onValueChange={(val) => handleFilterChange("position", val)}
        >
          <SelectTrigger className="bg-[#111] border-neutral-800 text-slate-300">
            <SelectValue placeholder="All Positions" />
          </SelectTrigger>
          <SelectContent className="bg-[#131313] border-neutral-800 text-slate-300">
            <SelectItem value="all">All Positions</SelectItem>
            {positions.map(pos => (
              <SelectItem key={pos} value={pos}>{pos}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full md:w-48 space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Status</label>
        <Select 
          value={searchParams.get("status") || "all"} 
          onValueChange={(val) => handleFilterChange("status", val)}
        >
          <SelectTrigger className="bg-[#111] border-neutral-800 text-slate-300">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent className="bg-[#131313] border-neutral-800 text-slate-300">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="GREEN">Green (Optimal)</SelectItem>
            <SelectItem value="MODIFIED">Modified</SelectItem>
            <SelectItem value="OUT">Out / Monitor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-full md:w-48 space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Sort By</label>
        <Select 
          value={searchParams.get("sort") || "name-asc"} 
          onValueChange={(val) => handleFilterChange("sort", val)}
        >
          <SelectTrigger className="bg-[#111] border-neutral-800 text-slate-300">
            <SelectValue placeholder="Name (A-Z)" />
          </SelectTrigger>
          <SelectContent className="bg-[#131313] border-neutral-800 text-slate-300">
            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="readiness-desc">Readiness (High-Low)</SelectItem>
            <SelectItem value="readiness-asc">Readiness (Low-High)</SelectItem>
            <SelectItem value="acwr-desc">ACWR (High-Low)</SelectItem>
            <SelectItem value="wellness-desc">Wellness (High-Low)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
