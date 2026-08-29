"use client";

import { useState } from "react";

import { FileText, Loader2 } from "lucide-react";

import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import {
  resetPasswordSchema,
  ResetPasswordSchemaType,
} from "@/schemas/auth.schema";

import { PasswordInput } from "./PasswordInput";
import { PasswordStrength } from "./PasswordStrength";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { resetPassword } from "@/lib/api/auth";

import { toast } from "sonner";

type Props = {
  uid: string;
  token: string;
};

export function ResetPasswordForm({ uid, token }: Props) {
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordSchemaType>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onChange",
  });

  const password = watch("password", "");

  const confirmPassword = watch("confirm_password", "");

  const onSubmit = async (data: ResetPasswordSchemaType) => {
    try {
      const response = await resetPassword(uid, token, {
        new_password: data.password,
        confirm_password: data.confirm_password,
      });

      toast.success(response.message);

      setSuccess(true);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border bg-muted mx-auto">
          <FileText className="h-6 w-6" />
        </div>

        <h1 className="text-4xl font-bold tracking-tight">Password updated</h1>

        <p className="mt-3 text-muted-foreground">
          Your password has been successfully reset.
        </p>

        <Button
          className="mt-8 w-full h-12 rounded-xl hover:cursor-pointer"
          onClick={() => (window.location.href = "/")}
        >
          Go to login
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border bg-muted">
        <FileText className="h-6 w-6" />
      </div>

      <h1 className="text-4xl font-bold tracking-tight">Reset password</h1>

      <p className="mt-3 text-muted-foreground">
        Create a new secure password for your account.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label>Password</Label>

          <PasswordInput
            placeholder="Enter your new password"
            register={register("password")}
          />

          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>

        <PasswordStrength password={password} />

        <div className="space-y-2">
          <Label>Confirm Password</Label>

          <PasswordInput
            placeholder="Confirm your password"
            register={register("confirm_password")}
          />

          {confirmPassword && errors.confirm_password && (
            <p className="text-sm text-red-500">
              {errors.confirm_password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full rounded-xl hover:cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resetting password...
            </>
          ) : (
            "Reset password"
          )}
        </Button>
      </form>
    </div>
  );
}
