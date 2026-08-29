"use client";

import { useState } from "react"; // add useState
import { ArrowLeft, MailCheck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { resendActivation } from "@/lib/api/auth";
import { PendingUser } from "@/types/auth";
import { ResendActivationButton } from "./ResendActivationButton";

type Props = {
  pendingUser: PendingUser;
  onBack: () => void;
};

export function EmailSent({ pendingUser, onBack }: Props) {
  // lifted exhausted state
  const [exhausted, setExhausted] = useState(false);

  const resendEmail = async () => {
    try {
      const res = await resendActivation(pendingUser.email);
      toast.success(res.message ?? "Activation email sent successfully");
    } catch (error: any) {
      const status = error?.response?.status ?? error?.status;
      // only toast non‑429 errors; 429 is handled by the button
      if (status !== 429) {
        toast.error(error.message ?? "Unable to resend email");
      }
      throw error;
    }
  };

  return (
    <Card className="w-full max-w-md rounded-3xl border p-8 shadow-sm">
      <div className="flex flex-col items-center gap-0 text-center">
        {/* Icon */}
        <div className="mb-6 flex size-16 items-center justify-center rounded-full border bg-green-500/10">
          <MailCheck className="size-8 text-green-600" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-semibold tracking-tight">
          Check your inbox
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We've sent an activation link to your email address.
        </p>

        {/* Email pill */}
        <div className="mt-5 w-full rounded-xl border bg-muted/20 px-4 py-3 text-center">
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Sent to
          </p>
          <p className="mt-1 font-mono text-sm font-semibold break-all">
            {pendingUser.email}
          </p>
        </div>

        {/* Next step */}
        <div className="mt-3 flex w-full items-start gap-3 rounded-xl border bg-muted/20 p-4 text-left">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium">Next step</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Open the email and click the activation link to verify your
              account and access your workspace.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="my-6 w-full border-t" />

        {/* Resend */}
        <div className="w-full">
          <ResendActivationButton
            onResend={resendEmail}
            onLimitExceeded={() => {
              setExhausted(false); // reset exhausted when user goes back
              onBack();
            }}
            exhausted={exhausted}
            setExhausted={setExhausted}
          />
        </div>

        {/* Back */}
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 text-muted-foreground hover:cursor-pointer"
          onClick={() => {
            setExhausted(false); // reset exhausted when going back
            onBack();
          }}
        >
          <ArrowLeft className="mr-1.5 size-3.5" />
          Want to update your information?
        </Button>
      </div>
    </Card>
  );
}
