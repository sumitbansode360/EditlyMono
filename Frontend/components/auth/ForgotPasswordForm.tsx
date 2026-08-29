"use client";

import Link from "next/link";

import { ArrowLeft, FileText, Loader2 } from "lucide-react";

import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import {
  forgotPasswordSchema,
  ForgotPasswordSchemaType,
} from "@/schemas/auth.schema";

import { forgotPassword } from "@/lib/api/auth";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordSchemaType>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: ForgotPasswordSchemaType) => {
    try {
      const response = await forgotPassword(data.email);

      toast.success(response.message);
    } catch (error: any) {
      toast.error(error.message ?? "Failed to send reset link");
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* BACK */}
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      {/* ICON */}
      <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border bg-muted">
        <FileText className="h-6 w-6" />
      </div>

      {/* TITLE */}
      <h1 className="text-4xl font-bold tracking-tight">Reset your password</h1>

      <p className="mt-3 text-muted-foreground">
        Enter the email associated with your account and we'll send you a secure
        password reset link.
      </p>

      {/* FORM */}
      <form onSubmit={handleSubmit(onSubmit)} className="mt-10 space-y-6">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-[0.2em]">
            Email Address
          </Label>

          <Input
            type="email"
            placeholder="name@company.com"
            className="h-12 rounded-xl"
            {...register("email")}
          />

          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full rounded-xl text-sm font-semibold tracking-wide hover:cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending link...
            </>
          ) : (
            "Send password reset link"
          )}
        </Button>

        <div className="pt-2 text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link
            href="/"
            className="font-semibold text-foreground transition-opacity hover:opacity-70"
          >
            Back to sign in
          </Link>
        </div>
      </form>
    </div>
  );
}
