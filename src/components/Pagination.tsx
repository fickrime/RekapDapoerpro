import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-2 py-3 px-3 bg-white border-t border-slate-100 font-sans text-xs no-print">
      {/* Prev button */}
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="p-1 rounded-lg text-slate-400 hover:text-slate-800 disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer"
        title="Halaman Sebelumnya"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Page numbers */}
      <div className="flex items-center gap-1">
        {getPageNumbers().map((page, idx) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 font-black text-xs">
                ...
              </span>
            );
          }

          const isCurrent = page === currentPage;
          return (
            <button
              type="button"
              key={`page-${page}`}
              onClick={() => onPageChange(page as number)}
              className={`min-w-8 h-8 px-2 flex items-center justify-center rounded-xl font-black text-xs transition-all cursor-pointer ${
                isCurrent
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {page}
            </button>
          );
        })}
      </div>

      {/* Next button */}
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="p-1 rounded-lg text-slate-400 hover:text-slate-800 disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer"
        title="Halaman Selanjutnya"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
