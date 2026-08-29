import React from "react";
import { FileText } from "lucide-react";

function AuthHeroSection() {
  return (
    <>
      {/* Main gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/30 to-background" />

      {/* Large blurred glow */}
      <div className="absolute left-[-120px] top-[-120px] h-[320px] w-[320px] rounded-full bg-primary/5 blur-3xl" />

      <div className="absolute bottom-[-150px] right-[-100px] h-[300px] w-[300px] rounded-full bg-primary/5 blur-3xl" />

      {/* Decorative circles */}
      <div className="absolute left-1/2 top-1/2 h-[650px] w-[650px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/40" />

      <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/30" />

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `
          linear-gradient(to right, currentColor 1px, transparent 1px),
          linear-gradient(to bottom, currentColor 1px, transparent 1px)
        `,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full w-full flex-col justify-between p-14">
        {/* Top Content */}
        <div className="max-w-lg">
          {/* Logo */}
          <div className="mb-14 flex h-16 w-16 items-center justify-center rounded-3xl border bg-background/80 shadow-sm backdrop-blur">
            <FileText className="h-8 w-8" />
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="text-6xl font-bold leading-[1] tracking-tight text-foreground">
              Create.
            </h1>

            <h1 className="text-6xl font-bold leading-[1] tracking-tight text-foreground">
              Edit.
            </h1>

            <h1 className="text-6xl font-bold leading-[1] tracking-tight text-foreground">
              Collaborate.
            </h1>
          </div>

          {/* Divider */}
          <div className="mt-10 h-px w-20 bg-border" />

          {/* Description */}
          <p className="mt-8 max-w-md text-base leading-8 text-muted-foreground">
            A realtime collaborative document editor built for teams to write,
            organize and manage documents together with speed and simplicity.
          </p>

          {/* Feature pills */}
          <div className="mt-10 flex flex-wrap gap-3">
            <div className="rounded-full border bg-background/70 px-4 py-2 text-sm text-muted-foreground backdrop-blur">
              Realtime Sync
            </div>

            <div className="rounded-full border bg-background/70 px-4 py-2 text-sm text-muted-foreground backdrop-blur">
              Team Collaboration
            </div>

            <div className="rounded-full border bg-background/70 px-4 py-2 text-sm text-muted-foreground backdrop-blur">
              Secure Storage
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="relative pt-10">
          {/* Horizontal line */}
          <div className="absolute left-0 top-1/2 h-px w-full bg-border/60" />

          {/* Bottom label */}
          <div className="relative inline-flex items-center gap-3 bg-muted/20 pr-6 text-xs font-semibold tracking-[0.3em] text-muted-foreground uppercase backdrop-blur">
            <div className="h-2 w-2 rounded-full bg-primary/60" />
            Collaborative Document Platform
          </div>
        </div>
      </div>
    </>
  );
}

export default AuthHeroSection;
