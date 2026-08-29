"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { updateProfile } from "@/lib/api/auth";
import { useUser } from "@/context/UserContext";
import { profileSchema, ProfileSchemaType } from "@/schemas/account.schema";

function getInitials(firstName: string, lastName: string, email: string): string {
  const fromName = `${firstName} ${lastName}`
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return fromName || email.slice(0, 2).toUpperCase();
}

export function ProfileForm() {
  const { user, updateUser } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileSchemaType>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
    },
  });

  if (!user) return null;

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (data: ProfileSchemaType) => {
    try {
      const updated = await updateProfile({
        first_name: data.first_name,
        last_name: data.last_name,
        profile_pic: avatarFile,
      });
      updateUser(updated);
      setAvatarFile(null);
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    }
  };

  const hasChanges = isDirty || avatarFile !== null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative">
          <Avatar className="h-20 w-20">
            <AvatarImage src={avatarPreview ?? user.profile_pic ?? undefined} alt={user.email} />
            <AvatarFallback className="bg-muted text-lg font-semibold">
              {getInitials(user.first_name, user.last_name, user.email)}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent"
            aria-label="Change profile picture"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarPick}
          />
        </div>
        <div>
          <p className="text-sm font-medium">Profile picture</p>
          <p className="text-xs text-muted-foreground">JPG or PNG, up to a few MB.</p>
        </div>
      </div>

      {/* Name */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>First name</Label>
          <Input className="h-11 rounded-xl" {...register("first_name")} />
          {errors.first_name && (
            <p className="text-sm text-red-500">{errors.first_name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Last name</Label>
          <Input className="h-11 rounded-xl" {...register("last_name")} />
          {errors.last_name && (
            <p className="text-sm text-red-500">{errors.last_name.message}</p>
          )}
        </div>
      </div>

      {/* Email — read-only for now */}
      <div className="space-y-2">
        <Label>Email address</Label>
        <Input className="h-11 rounded-xl bg-muted/40" value={user.email} disabled readOnly />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting || !hasChanges}
        className="h-11 rounded-xl font-semibold hover:cursor-pointer"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Save changes"
        )}
      </Button>
    </form>
  );
}
