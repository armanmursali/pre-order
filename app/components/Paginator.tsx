// components/Paginator.tsx
'use client';

import React from 'react';

interface PaginatorProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void; 
}

export default function Paginator({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange
}: PaginatorProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200 mt-4">
      <div className="text-xs sm:text-sm text-gray-500">
        Menampilkan <span className="font-bold text-gray-900">{startItem}</span> - <span className="font-bold text-gray-900">{endItem}</span> dari <span className="font-bold text-gray-900">{totalItems}</span> data
      </div>
      
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="itemsPerPage" className="text-xs sm:text-sm text-gray-500 font-medium">Tampilkan:</label>
          <select
            id="itemsPerPage"
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs sm:text-sm bg-white text-gray-900 outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={150}>150</option>
            <option value={200}>200</option>
            <option value={2}>2</option>
          </select>
        </div>

        <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-white border border-gray-200 text-gray-600 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <i className="fa-solid fa-chevron-left text-xs"></i>
          </button>
          <span className="text-xs sm:text-sm font-bold text-gray-700 px-3 select-none">
            {currentPage} / {totalPages || 1}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-white border border-gray-200 text-gray-600 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <i className="fa-solid fa-chevron-right text-xs"></i>
          </button>
        </div>
      </div>
    </div>
  );
}