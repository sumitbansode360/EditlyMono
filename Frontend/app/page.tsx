"use client";

import Link from "next/link";
import { FileText, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import AuthHeroSection from "@/components/auth/AuthHeroSection";
import { useUser } from "@/context/UserContext";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginSchemaType = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { login } = useUser();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchemaType>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginSchemaType) => {
    try {
      await login(data.email, data.password);
      toast.success("Login successful!");
      router.push("/home");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || error.message || "Login failed");
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* LEFT SIDE */}
        <section className="relative hidden overflow-hidden border-r bg-muted/20 lg:flex">
          <AuthHeroSection />
        </section>

        {/* RIGHT SIDE */}
        <section className="flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            {/* Form */}
            <div>
              <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border bg-muted">
                <FileText className="h-6 w-6" />
              </div>

              <h2 className="text-4xl font-bold tracking-tight">
                Welcome back
              </h2>

              <p className="mt-3 text-muted-foreground">
                Sign in to continue your journey
              </p>

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="mt-10 space-y-6"
              >
                {/* Email */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold tracking-[0.2em] uppercase">
                    Email Address
                  </Label>

                  <Input
                    type="email"
                    placeholder="name@company.com"
                    className="h-12 rounded-xl"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-xs text-red-500">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold tracking-[0.2em] uppercase">
                    Password
                  </Label>

                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="h-12 rounded-xl pr-12"
                      {...register("password")}
                    />
                    {errors.password && (
                      <p className="text-xs text-red-500">
                        {errors.password.message}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:cursor-pointer"
                      onClick={() => router.push("/forgot-password")}
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 w-full rounded-xl text-sm font-semibold tracking-wide"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      SIGNING IN...
                    </>
                  ) : (
                    "→ SIGN IN TO YOUR ACCOUNT"
                  )}
                </Button>

                {/* Footer */}
                <div className="pt-2 text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/signup"
                    className="font-semibold text-foreground transition-opacity hover:opacity-70"
                  >
                    Create account
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
