// app/components/Notification.tsx
'use client';

import React from 'react';

// Mendefinisikan tipe data untuk props (parameter) komponen notifikasi
interface NotificationProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Notification({ isOpen, onClose }: NotificationProps) {
  // Data dummy notifikasi untuk sementara
  const dummyNotifs = [
    { id: 1, title: 'Pesanan Baru', message: 'Anda menerima pesanan atribut seragam baru.', time: '5 mnt lalu' },
    { id: 2, title: 'Pembaruan Sistem', message: 'Sistem telah diperbarui ke versi 2.1.', time: '1 jam lalu' },
    { id: 3, title: 'Stok Menipis', message: 'Stok kemeja ukuran L sisa 2 pcs.', time: '1 hari lalu' },
  ];

  return (
    <>
      {/* Overlay latar belakang gelap untuk mobile saat notifikasi terbuka */}
      {isOpen && (
        <div 
          onClick={onClose} 
          className="fixed inset-0 z-[60] bg-black/50 md:hidden" 
        />
      )}

      {/* Panel Notifikasi: Muncul dari sisi kanan layar */}
      {/* Di layar mobile lebarnya penuh (w-full), di layar desktop lebarnya 320px (md:w-80) */}
      <div
        className={`fixed top-0 right-0 h-full bg-white shadow-2xl z-[70] transition-transform duration-300 ease-in-out w-full md:w-80 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header Panel Notifikasi */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">Notifikasi</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-red-500 focus:outline-none transition-colors"
          >
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        {/* Daftar Isi Notifikasi (Scrollable) */}
        <div className="p-4 overflow-y-auto h-[calc(100vh-64px)] space-y-3">
          {dummyNotifs.map((notif) => (
            <div key={notif.id} className="p-4 bg-blue-50 rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors cursor-pointer">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-sm text-gray-800">{notif.title}</span>
                <span className="text-xs font-medium text-gray-500">{notif.time}</span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{notif.message}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}