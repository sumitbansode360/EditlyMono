"use client";

import { AccountNav } from "@/components/account/AccountNav";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <AccountNav />

      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account security.
        </p>
      </div>

      <section>
        <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Password
        </h2>
        <ChangePasswordForm />
      </section>
    </main>
  );
}
