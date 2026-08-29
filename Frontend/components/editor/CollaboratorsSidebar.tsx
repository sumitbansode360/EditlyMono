"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";

import OnlineUsersPanel from "./OnlineUsersPanel";
import { OnlineUser } from "@/types/collaboration";

interface Props {
    users: OnlineUser[];
    connected: boolean;
}

function getInitials(name: string): string {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("");
}

export default function CollaboratorsSidebar({ users, connected }: Props) {
    const [isDesktopOpen, setIsDesktopOpen] = useState(true);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const previewUsers = users.slice(0, 3);
    const overflowCount = Math.max(users.length - previewUsers.length, 0);

    return (
        <>
            {/* ── Mobile / small tablet: floating trigger + slide-over drawer ── */}
            <div className="md:hidden">
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsMobileOpen(true)}
                    className="fixed bottom-4 right-4 z-30 h-11 gap-2 rounded-full pl-3 pr-4 shadow-lg"
                >
                    <Users className="h-4 w-4" />
                    <span className="text-xs font-medium">{users.length}</span>
                    <span
                        className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-muted-foreground/50"
                            }`}
                        aria-hidden
                    />
                </Button>

                <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                    <SheetContent side="right" className="w-72 p-0 sm:w-80">
                        {/* Visually hidden — OnlineUsersPanel renders its own visible
                "Online now" header. This just satisfies the a11y
                requirement that a Sheet has a title. */}
                        <SheetHeader className="sr-only">
                            <SheetTitle>Online collaborators</SheetTitle>
                        </SheetHeader>
                        {/* pt-10 clears shadcn's default close (X) button, which sits
                absolutely positioned at ~top-4 right-4. Without this, the
                panel's own header — "Online now" on the left, the Live/Wifi
                badge pinned to the right edge via justify-between — lands
                directly under it, since the sr-only header above takes up
                zero visual space. */}
                        <div className="pt-10 h-full">
                            <OnlineUsersPanel users={users} connected={connected} />
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            {/* ── Tablet / desktop: inline panel, collapsible to a thin rail ── */}
            <aside
                className={`hidden md:flex flex-shrink-0 flex-col border-l border-border bg-background transition-[width] duration-200 ${isDesktopOpen ? "w-64 lg:w-72" : "w-14"
                    }`}
            >
                {isDesktopOpen ? (
                    <>
                        <div className="flex items-center justify-end border-b border-border px-2 py-1.5">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setIsDesktopOpen(false)}
                                aria-label="Collapse online users panel"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="min-h-0 flex-1">
                            <OnlineUsersPanel users={users} connected={connected} />
                        </div>
                    </>
                ) : (
                    <button
                        type="button"
                        onClick={() => setIsDesktopOpen(true)}
                        aria-label={`Expand online users panel (${users.length} online)`}
                        className="flex h-full flex-col items-center gap-3 py-3 transition-colors hover:bg-accent/50"
                    >
                        <ChevronLeft className="h-4 w-4 text-muted-foreground" />

                        <div className="flex flex-col items-center gap-1.5">
                            {previewUsers.map((u) => (
                                <Avatar key={u.id} className="h-7 w-7">
                                    <AvatarImage src={u.profile_pic ?? undefined} alt={u.name} />
                                    <AvatarFallback
                                        className="text-[10px] font-semibold text-white"
                                        style={{ backgroundColor: u.color }}
                                    >
                                        {getInitials(u.name)}
                                    </AvatarFallback>
                                </Avatar>
                            ))}
                            {overflowCount > 0 && (
                                <span className="text-[10px] text-muted-foreground">
                                    +{overflowCount}
                                </span>
                            )}
                        </div>

                        <span
                            className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-muted-foreground/40"
                                }`}
                            aria-hidden
                        />
                    </button>
                )}
            </aside>
        </>
    );
}