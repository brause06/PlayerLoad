"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Plus } from "lucide-react";

export function AddPlayerSheet({ onPlayerAdded }: { onPlayerAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setOpen(false);
        onPlayerAdded();
      } else {
        console.error("Failed to create player");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Player
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add New Player</SheetTitle>
          <SheetDescription>
            Enter the player's primary details. GPS ID must match your tracking export exactly.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input id="name" name="name" required placeholder="Sergio Parisse" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gps_id">GPS Device ID *</Label>
            <Input id="gps_id" name="gps_id" required placeholder="CAT-12049" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="position">Position *</Label>
              <Input id="position" name="position" required placeholder="Number 8" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input id="age" name="age" type="number" placeholder="24" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input id="weight" name="weight" type="number" step="0.1" placeholder="105" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="top_speed_max">Max Speed (km/h)</Label>
              <Input id="top_speed_max" name="top_speed_max" type="number" step="0.1" placeholder="32.5" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="team">Squad / Team</Label>
            <Input id="team" name="team" placeholder="First Team" />
          </div>
          
          <SheetFooter className="pt-6">
            <SheetClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </SheetClose>
            <Button type="submit" className="bg-indigo-600" disabled={loading}>
              {loading ? "Saving..." : "Save Player"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
