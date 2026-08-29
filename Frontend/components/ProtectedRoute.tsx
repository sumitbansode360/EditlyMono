// components/ProtectedRoute.tsx
"use client";

import { useUser } from "@/context/UserContext";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const publicRoutes = ["/", "/signup", "/activate", "/forgot-password", "/reset-password"];
  const isPublicRoute = publicRoutes.some((route) => 
    route === "/" ? pathname === "/" : pathname.startsWith(route)
  );

  useEffect(() => {
    // Wait until the authentication state is fully loaded
    if (isLoading) return;

    if (isPublicRoute && isAuthenticated) {
      // 1. Authenticated user trying to access login/signup -> Redirect to Home
      router.push("/home");
    } else if (!isPublicRoute && !isAuthenticated) {
      // 2. Guest user trying to access a protected page -> Redirect to Login
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router, pathname, isPublicRoute]);

  // Global loading state while checking token/session status
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Loading...</p>
      </div>
    );
  }

  /* PREVENT UI FLASHING:
    - If it's a public route but the user IS authenticated, render nothing (null) 
      while the useEffect pushes them to /home.
    - If it's a public route and they are NOT authenticated, safely render the page.
  */
  if (isPublicRoute) {
    return isAuthenticated ? null : <>{children}</>;
  }

  // For protected routes, only render if authenticated
  return isAuthenticated ? <>{children}</> : null;
}