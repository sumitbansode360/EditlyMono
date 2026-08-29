"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  CheckCircle2,
  Loader2,
  XCircle,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { activateUser } from "@/lib/api/auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function ActivatePage() {
  const params = useParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const hasActivated = useRef(false);

  const uid = params.uid as string;
  const token = params.token as string;

  useEffect(() => {
    if (hasActivated.current) return;
    hasActivated.current = true;

    const activateAccount = async () => {
      try {
        const response = await activateUser(uid, token);
        setStatus("success");
        toast.success(response.message || "Account activated successfully!");
        
        setTimeout(() => {
          router.push("/");
        }, 3000);
      } catch (error: any) {
        setStatus("error");
        toast.error(error.message);
      }
    };

    activateAccount();
  }, [uid, token, router]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center text-center">
          {status === "loading" && (
            <>
              <Loader2 className="mb-5 h-16 w-16 animate-spin text-primary" />
              <h1 className="text-3xl font-bold">Activating Account</h1>
              <p className="mt-3 text-muted-foreground">
                Please wait while we verify your account.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="mb-5 h-16 w-16 text-green-500" />
              <h1 className="text-3xl font-bold">Account Verified!</h1>
              <p className="mt-3 text-muted-foreground">
                Your account is now active. Redirecting you to login...
              </p>
              <Loader2 className="mt-6 h-6 w-6 animate-spin text-muted-foreground" />
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="mb-5 h-16 w-16 text-destructive" />
              <h1 className="text-3xl font-bold">Activation Failed</h1>
              <p className="mt-3 text-muted-foreground">
                The activation link is invalid or has expired.
              </p>
              <div className="mt-8 w-full space-y-3">
                <Button asChild className="w-full rounded-xl h-12">
                  <Link href="/">Back to Login</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </main>
  );
}