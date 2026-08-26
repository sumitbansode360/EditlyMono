"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Plus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createDocument } from "@/lib/api/document";

import { DocumentGrid } from "./DocumentGrid";
import { DocumentListItem } from "./DocumentListItem";
import { DocumentViewToggle } from "./DocumentViewToggle";
import { EmptyDocuments } from "./EmptyDocuments";
import { Pagination } from "@/components/ui/pagination";

import { DocumentListItem as DocType } from "@/types/document";
import { toast } from "sonner";
import { useDocuments } from "@/context/DocumentContext";

const VIEW_STORAGE_KEY = "editly_doc_view_pref";

export function DocumentList() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const { documents, pagination, setPage, setPageSize, isLoading } = useDocuments();

  // Industry Method: Handle persistence in useEffect to avoid hydration mismatch
  useEffect(() => {
    const savedView = sessionStorage.getItem(VIEW_STORAGE_KEY);
    if (savedView === "grid" || savedView === "list") {
      setView(savedView);
    }
  }, []);

  const handleViewChange = (newView: "grid" | "list") => {
    setView(newView);
    sessionStorage.setItem(VIEW_STORAGE_KEY, newView);
  };

  const handleCreateDocument = async () => {
    try {
      setIsCreating(true);
      const response = await createDocument({
        title: "Untitled Document",
      });
      // Redirect user to the newly created document's editor
      if (response.message){
        toast.success(response.message)
      }
      router.push(`/documents/${response.id}`);
    } catch (error) {
      console.error("Failed to create document:", error);
      setIsCreating(false);
    } finally {
    }
  };

  if (documents.length === 0 && !isLoading) {
    return <EmptyDocuments onCreate={handleCreateDocument} isCreating={isCreating} />;
  }

  return (
    <section className="space-y-6">
      {/* FULL PAGE LOADER OVERLAY */}
      {isCreating && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/60 backdrop-blur-md">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium animate-pulse">Creating your document...</p>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Recent Documents
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage and collaborate on your files
          </p>
        </div>

        <div className="flex items-center gap-3 md:ml-auto">
          <DocumentViewToggle
            view={view}
            onChange={handleViewChange}
          />

          <Button
            onClick={handleCreateDocument}
            disabled={isCreating}
            className="h-10 rounded-xl px-6 font-semibold shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:-translate-y-0.5 active:scale-95 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isCreating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {isCreating ? "Creating..." : "New Document"}
          </Button>
        </div>
      </div>

      {/* GRID VIEW */}
      {view === "grid" ? (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-6">
          {documents.map((document) => (
            <DocumentGrid
              key={document.id}
              document={document}
            />
          ))}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="space-y-3">
          {documents.map((document) => (
            <DocumentListItem
              key={document.id}
              document={document}
            />
          ))}
        </div>
      )}

      {/* PAGINATION */}
      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        pageSize={pagination.pageSize}
        hasNext={pagination.hasNext}
        hasPrevious={pagination.hasPrevious}
        isLoading={isLoading}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </section>
  );
}