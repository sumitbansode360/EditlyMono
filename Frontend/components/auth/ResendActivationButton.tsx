"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const INITIAL_SECONDS = 30;
const SENT_FLASH_MS = 2500;

type Props = {
  onResend: () => Promise<void>;
  onLimitExceeded?: () => void;
  exhausted: boolean; // from parent
  setExhausted: (value: boolean) => void;
};

export function ResendActivationButton({
  onResend,
  onLimitExceeded,
  exhausted,
  setExhausted,
}: Props) {
  const [countdown, setCountdown] = useState(INITIAL_SECONDS);
  const [loading, setLoading] = useState(false);
  const [justSent, setJustSent] = useState(false);

  useEffect(() => {
    if (countdown <= 0 || exhausted) return;
    const timer = setInterval(() => setCountdown((p) => p - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown, exhausted]);

  const handleResend = async () => {
    try {
      setLoading(true);
      await onResend();

      setJustSent(true);
      setCountdown(INITIAL_SECONDS);
      setTimeout(() => setJustSent(false), SENT_FLASH_MS);
    } catch (error: any) {
      // detect 429 from error object
      const status = error?.status ?? error?.response?.status;
      const message = error?.message?.toLowerCase() || "";
      const is429 =
        status === 429 || message.includes("limit") || message.includes("429");

      if (is429) {
        setExhausted(true); // update parent state
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Exhausted UI (controlled by parent state) ──────────────────────────
  if (exhausted) {
    return (
      <div className="space-y-3 text-center">
        <span className="flex items-center justify-center gap-1.5 text-sm font-medium text-destructive">
          <AlertCircle className="size-4" />
          Daily email limit reached
        </span>
        <p className="text-xs text-muted-foreground leading-relaxed">
          You've used all activation emails for today. Try again tomorrow, or
          update your information to receive a new link immediately.
        </p>
        {onLimitExceeded && (
          <button
            type="button"
            onClick={onLimitExceeded}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline cursor-pointer"
          >
            Update your information →
          </button>
        )}
      </div>
    );
  }

  // ── Normal states ────────────────────────────────────────────────────────
  return (
    <div className="space-y-2 text-center">
      <p className="text-sm text-muted-foreground">Didn't receive the email?</p>

      {loading ? (
        <span className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          Sending…
        </span>
      ) : justSent ? (
        <span className="flex items-center justify-center gap-1.5 text-sm font-medium text-green-600">
          <CheckCircle2 className="size-4" />
          Email sent — check your inbox
        </span>
      ) : countdown > 0 ? (
        <p className="text-sm text-muted-foreground">
          Resend in{" "}
          <span className="inline-block min-w-[2.5rem] rounded-md border bg-muted/30 px-2 py-0.5 font-mono text-sm font-medium text-foreground tabular-nums">
            {countdown}s
          </span>
        </p>
      ) : (
        <button
          type="button"
          onClick={handleResend}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline cursor-pointer"
        >
          Resend activation email
        </button>
      )}

      <p className="text-xs text-muted-foreground">
        Check your spam or junk folder if you don't see it.
      </p>
    </div>
  );
}
