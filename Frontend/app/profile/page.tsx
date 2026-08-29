"use client";

import { AccountNav } from "@/components/account/AccountNav";
import { ProfileForm } from "@/components/account/ProfileForm";

export default function ProfilePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <AccountNav />

      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your name and profile picture.
        </p>
      </div>

      <ProfileForm />
    </main>
  );
}
