"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DocumentList } from "@/components/documents/Home/DocumentList";
import { SearchBar } from "@/components/documents/Home/SearchBar";
import Navbar from "@/components/Navbar";
import { useUser } from "@/context/UserContext";
import { useDocuments } from "@/context/DocumentContext";


function Home() {
  const router = useRouter();
  const { logout, isAuthenticated, user } = useUser();
  const { isLoading, error } = useDocuments();

  const login = () => {
    router.push("/login");
  };

  const userDetails = {
    name: `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "Guest User",
    email: user?.email,
    image: user?.profile_pic ?? undefined,
    isAuthenticated: !!isAuthenticated,
  };

  return (
    <>
      <Navbar 
        onLogout={logout} 
        onLogin={login} 
        user={userDetails} 
        searchComponent={<SearchBar />}
      />
      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* Page Header */}
        <section className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome back, {user?.first_name}
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Access your recent documents, continue editing, and collaborate with
            your team in real time.
          </p>
        </section>

        {/* Documents */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Loading documents...</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-center text-destructive">
            <p className="font-medium">Error</p>
            <p className="text-sm opacity-90">{error}</p>
          </div>
        ) : (
          <DocumentList />
        )}
      </div>
    </>
  );
}

export default Home;
