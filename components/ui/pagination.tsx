"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

const PAGE_SIZE_OPTIONS = [12, 18, 24, 36, 48];

export function Pagination({
  currentPage,
  totalPages,
  pageSize,
  hasNext,
  hasPrevious,
  isLoading,
  onPageChange,
  onPageSizeChange,
}: Props) {
  const handlePrevious = () => {
    if (hasPrevious && !isLoading) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (hasNext && !isLoading) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageSizeChange = (value: string) => {
    const newSize = parseInt(value, 10);
    onPageSizeChange(newSize);
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row sm:gap-6">
      {/* Page Size Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Show:</span>
        <Select
          value={pageSize.toString()}
          onValueChange={handlePageSizeChange}
          disabled={isLoading}
        >
          <SelectTrigger className="h-9 w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Page Info and Navigation Controls */}
      <div className="flex items-center gap-4">
        <div className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevious}
            disabled={!hasPrevious || isLoading}
            className="h-9 w-9"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            disabled={!hasNext || isLoading}
            className="h-9 w-9"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
