"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

const TABS = [
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: KeyRound },
];

export function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="mb-8 flex items-center justify-between">
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground hover:cursor-pointer"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </Button>

      <div className="flex items-center gap-1 rounded-full border bg-muted/30 p-1">
        {TABS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={[
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
