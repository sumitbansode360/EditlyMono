"use client";

import { Eye } from "lucide-react";

export default function ReadOnlyBanner() {
  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex-shrink-0">
      <Eye className="w-3.5 h-3.5" />
      <span>You have view-only access to this document.</span>
    </div>
  );
}
