"use client";

import AuthHeroSection from "@/components/auth/AuthHeroSection";
import { EmailSent } from "@/components/auth/EmailSent";
import { SignupForm } from "@/components/auth/SignupForm";
import { PendingUser, SignupStep } from "@/types/auth";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function SignupPage() {
  const [pendingUser, setPendingUser] = useState<PendingUser | null>(null);
  const [currentStep, setCurrentStep] = useState<SignupStep>("signup");
  const searchParams = useSearchParams();
  const prefillEmail = searchParams.get("email");


  // Restore from sessionStorage on mount
  useEffect(() => {
    const storedUser = sessionStorage.getItem("signup_pending_user");
    const storedStep = sessionStorage.getItem("signup_step");
    if (storedUser && storedStep) {
      setPendingUser(JSON.parse(storedUser));
      setCurrentStep(storedStep as SignupStep);
    }
  }, []);

  // Persist to sessionStorage whenever state changes
  useEffect(() => {
    if (pendingUser && currentStep === "verify") {
      sessionStorage.setItem(
        "signup_pending_user",
        JSON.stringify(pendingUser),
      );
      sessionStorage.setItem("signup_step", currentStep);
    } else {
      // Clear storage when not in verify step (e.g., back to edit or signup)
      sessionStorage.removeItem("signup_pending_user");
      sessionStorage.removeItem("signup_step");
    }
  }, [pendingUser, currentStep]);
  return (
    <main className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* LEFT SIDE */}
        <section className="relative hidden overflow-hidden border-r bg-muted/20 lg:flex">
          <AuthHeroSection />
        </section>

        {/* RIGHT SIDE */}
        <section className="flex items-center justify-center px-6 py-10">
          {currentStep === "signup" && (
            <SignupForm
              mode="signup"
              setPendingUser={setPendingUser}
              setCurrentStep={setCurrentStep}
              prefillEmail={prefillEmail ?? ""}
            />
          )}

          {currentStep === "edit" && (
            <SignupForm
              mode="edit"
              pendingUser={pendingUser}
              setPendingUser={setPendingUser}
              setCurrentStep={setCurrentStep}
              prefillEmail={prefillEmail ?? ""}
            />
          )}

          {currentStep === "verify" && pendingUser && (
            <EmailSent
              pendingUser={pendingUser}
              onBack={() => setCurrentStep("edit")}
            />
          )}
        </section>
      </div>
    </main>
  );
}
