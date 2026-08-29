"use client";

import {
  LayoutGrid,
  List,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  view: "grid" | "list";
  onChange: (view: "grid" | "list") => void;
};

export function DocumentViewToggle({
  view,
  onChange,
}: Props) {
  return (
    <div className="flex items-center rounded-lg border bg-background p-1">
      <Button
        variant={view === "grid" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onChange("grid")}
        className="h-8 rounded-md px-3"
      >
        <LayoutGrid className="mr-2 h-4 w-4" />
        Grid
      </Button>

      <Button
        variant={view === "list" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onChange("list")}
        className="h-8 rounded-md px-3"
      >
        <List className="mr-2 h-4 w-4" />
        List
      </Button>
    </div>
  );
}