"use client";

import React, { createContext, useState, useCallback, useMemo, useEffect } from "react";
import { getDocuments } from "@/lib/api/document";
import { DocumentListItem, DocumentContextType, PaginationState } from "@/types/document";
import { useUser } from "./UserContext";

const DocContext = createContext<DocumentContextType | undefined>(undefined);

const PAGE_SIZE_STORAGE_KEY = "editly_page_size_pref";
const DEFAULT_PAGE_SIZE = 18;

export const DocProvider = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useUser();
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [count, setCount] = useState(0);

  // Load page size preference from localStorage on mount
  useEffect(() => {
    const savedPageSize = localStorage.getItem(PAGE_SIZE_STORAGE_KEY);
    if (savedPageSize) {
      const parsedSize = parseInt(savedPageSize, 10);
      if ([12, 18, 24, 36, 48].includes(parsedSize)) {
        setPageSizeState(parsedSize);
      }
    }
  }, []);

  // Save page size preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(PAGE_SIZE_STORAGE_KEY, pageSize.toString());
  }, [pageSize]);

  // Calculate derived pagination state
  const pagination: PaginationState = useMemo(() => {
    const totalPages = Math.ceil(count / pageSize);
    return {
      count,
      currentPage,
      pageSize,
      totalPages,
      hasNext: currentPage < totalPages,
      hasPrevious: currentPage > 1,
    };
  }, [count, currentPage, pageSize]);

  // Fetch documents when page, pageSize, or auth state changes
  useEffect(() => {
    const loadDocuments = async () => {
      if (!isAuthenticated) {
        setDocuments([]);
        setCount(0);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const data = await getDocuments(currentPage, pageSize);
        setDocuments(data.results);
        setCount(data.count);
      } catch (err: any) {
        setError(err.message || "Failed to load documents");
      } finally {
        setIsLoading(false);
      }
    };

    loadDocuments();
  }, [currentPage, pageSize, isAuthenticated]);

  // Reset state when authentication changes (handled by refreshDocuments)
  const refreshDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getDocuments(currentPage, pageSize);
      setDocuments(data.results);
      setCount(data.count);
    } catch (err: any) {
      setError(err.message || "Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize]);

  // Method to reset documents (for logout)
  const resetDocuments = useCallback(() => {
    setDocuments([]);
    setCount(0);
    setCurrentPage(1);
    setError(null);
  }, []);

  // Manual fetch function for refresh (manually override current state)
  const fetchDocs = useCallback(async (page: number = 1, newPageSize?: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const effectivePageSize = newPageSize || pageSize;
      const data = await getDocuments(page, effectivePageSize);
      setDocuments(data.results);
      setCount(data.count);
      setCurrentPage(page);
      if (newPageSize) {
        setPageSizeState(newPageSize);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);

  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const setPageSize = useCallback((newPageSize: number) => {
    setPageSizeState(newPageSize);
    // Reset to page 1 when changing page size
    setCurrentPage(1);
  }, []);

  // useMemo ensures the context object itself is stable
  const value: DocumentContextType = useMemo(
    () => ({
      documents,
      pagination,
      fetchDocs,
      setPage,
      setPageSize,
      isLoading,
      error,
      refreshDocuments,
      resetDocuments,
    }),
    // It only recreates if these specific values change
    [documents, pagination, fetchDocs, setPage, setPageSize, isLoading, error, refreshDocuments, resetDocuments]
  );

  return <DocContext.Provider value={value}>{children}</DocContext.Provider>;
};

export const useDocuments = () => {
  const context = React.useContext(DocContext);

  if (context === undefined) {
    throw new Error("useDocuments must be used within a DocProvider");
  }

  return context;
};
