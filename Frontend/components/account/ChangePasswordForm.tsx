"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordStrength } from "@/components/auth/PasswordStrength";

import { changePassword } from "@/lib/api/auth";
import {
  changePasswordSchema,
  ChangePasswordSchemaType,
} from "@/schemas/account.schema";

export function ChangePasswordForm() {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordSchemaType>({
    resolver: zodResolver(changePasswordSchema),
  });

  const newPassword = watch("new_password", "");

  const onSubmit = async (data: ChangePasswordSchemaType) => {
    try {
      const response = await changePassword(data);
      toast.success(response.message ?? "Password updated");
      reset();
    } catch (error: any) {
      // Field-level errors from the backend (weak password, mismatch) map
      // onto the form; anything else (wrong current password) shows as a
      // toast since there's no single field it belongs to.
      if (error.new_password) {
        setError("new_password", { message: error.new_password });
      } else if (error.confirm_password) {
        setError("confirm_password", { message: error.confirm_password });
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to change password");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-5">
      <div className="space-y-2">
        <Label>Current password</Label>
        <PasswordInput
          placeholder="Enter your current password"
          register={register("current_password")}
        />
        {errors.current_password && (
          <p className="text-sm text-red-500">{errors.current_password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>New password</Label>
        <PasswordInput
          placeholder="Enter a new password"
          register={register("new_password")}
        />
        {errors.new_password && (
          <p className="text-sm text-red-500">{errors.new_password.message}</p>
        )}
      </div>

      <PasswordStrength password={newPassword} />

      <div className="space-y-2">
        <Label>Confirm new password</Label>
        <PasswordInput
          placeholder="Confirm your new password"
          register={register("confirm_password")}
        />
        {errors.confirm_password && (
          <p className="text-sm text-red-500">{errors.confirm_password.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-11 rounded-xl font-semibold hover:cursor-pointer"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Updating…
          </>
        ) : (
          "Update password"
        )}
      </Button>
    </form>
  );
}
