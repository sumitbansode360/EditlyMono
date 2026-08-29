import Link from "next/link";

import { FileText, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import { signupSchema, SignupSchemaType } from "@/schemas/auth.schema";

import { signupUser, updatePendingUser } from "@/lib/api/auth";

import { PasswordInput } from "./PasswordInput";
import { PasswordStrength } from "./PasswordStrength";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";
import { SignupType } from "@/types/auth";
import { toast } from "sonner";

export function SignupForm({
  mode,
  pendingUser,
  setPendingUser,
  setCurrentStep,
  prefillEmail,
}: SignupType) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupSchemaType>({
    resolver: zodResolver(signupSchema),
    mode: "onChange",
    defaultValues: {
      email: pendingUser?.email ?? prefillEmail ?? "",
      first_name: pendingUser?.first_name ?? "",
      last_name: pendingUser?.last_name ?? "",
    },
  });

  const password = watch("password", "");
  const confirmPassword = watch("confirm_password", "");

  const onSubmit = async (data: SignupSchemaType) => {
    const payload = {
      username: data.email,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      password: data.password,
    };
    try {
      if (mode === "signup") {
        const response = await signupUser(payload);
        setPendingUser(response.user);
        toast.success(response.message);
        setCurrentStep?.("verify");
      } else {
        // update information
        if (!pendingUser) {
          return;
        }
        const response = await updatePendingUser(pendingUser.id, payload);
        setPendingUser(response.user);
        toast.success(response.message || "Information updated successfully");
        setCurrentStep?.("verify");
      }
    } catch (error: any) {
      const status = error?.response?.status ?? error?.status;
      const message = error?.response?.data?.message ?? error?.message;

      if (status === 429) {
        toast.error(
          message || "Daily email limit reached. Please try again tomorrow.",
        );
      } else if (error.email) {
        toast.error(error.email);
      } else {
        toast.error(message);
      }
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* ICON */}
      <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border bg-muted">
        <FileText className="h-6 w-6" />
      </div>

      {/* TITLE */}
      <h1 className="text-4xl font-bold tracking-tight">
        {mode === "signup" ? "Create account" : "Update your information"}
      </h1>

      <p className="mt-3 text-muted-foreground">
        Create your workspace and start collaborating in realtime.
      </p>

      {/* FORM */}
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-3">
        {/* EMAIL */}
        <div className="space-y-2">
          <Label>Email Address</Label>

          <Input
            type="email"
            placeholder="name@company.com"
            className="h-12 rounded-xl"
            {...register("email")}
          />

          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        {/* NAMES */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>First Name</Label>

            <Input
              placeholder="John"
              className="h-12 rounded-xl"
              {...register("first_name")}
            />

            {errors.first_name && (
              <p className="text-sm text-red-500">
                {errors.first_name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Last Name</Label>

            <Input
              placeholder="Doe"
              className="h-12 rounded-xl"
              {...register("last_name")}
            />

            {errors.last_name && (
              <p className="text-sm text-red-500">{errors.last_name.message}</p>
            )}
          </div>
        </div>

        {/* PASSWORD */}
        <div className="space-y-2">
          <Label>Password</Label>

          <PasswordInput
            placeholder="Enter your password"
            register={register("password")}
          />

          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>

        <PasswordStrength password={password} />

        {/* CONFIRM PASSWORD */}
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

        {/* BUTTON */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full rounded-xl text-sm font-semibold hover:cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {mode === "signup"
                ? "Creating account..."
                : "Updating information..."}
            </>
          ) : mode === "signup" ? (
            "Create account"
          ) : (
            "Update information"
          )}
        </Button>

        {/* FOOTER */}
        <div className="pt-2 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/"
            className="font-semibold text-foreground hover:opacity-70"
          >
            Login here
          </Link>
        </div>
      </form>
    </div>
  );
}
