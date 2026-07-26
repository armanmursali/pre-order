// app/(dashboard)/layout.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { navMenus } from '../menu'; 
// [PENAMBAHAN] Mengimpor komponen Notifikasi yang baru dibuat
import Notification from '../components/Notification';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  
  // State bawaan Anda untuk kontrol sidebar mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // State bawaan Anda untuk menyimpan nama pengguna
  const [userName, setUserName] = useState<string>('Administrator');

  // [PENAMBAHAN] State untuk mengontrol sidebar mengecil di desktop (collapse)
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  // [PENAMBAHAN] State untuk mengontrol visibilitas panel Notifikasi
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Mengambil data nama pengguna secara spesifik dari kolom 'nama' di tabel public.users (Logic Tidak Diubah)
  useEffect(() => {
    const fetchUserData = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('nama')
          .eq('id', session.user.id)
          .maybeSingle();

        if (!error && userData && userData.nama) {
          setUserName(userData.nama);
        }
      }
    };

    fetchUserData();
  }, []);

  // Fungsi untuk menangani proses keluar (Logout) pengguna (Logic Tidak Diubah)
  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Overlay latar belakang gelap untuk mode mobile ketika sidebar terbuka */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}

      {/* Sidebar Navigasi Utama */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isDesktopCollapsed ? 'md:w-20' : 'md:w-64'} w-64`} 
        /* [PERBAIKAN TAMPILAN] Lebar menyesuaikan state isDesktopCollapsed (w-20 atau w-64) */
      >
        {/* Header Sidebar dengan Logo dan Teks AtributShop */}
        <div className={`flex h-16 items-center px-6 border-b border-gray-200 ${isDesktopCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo AtributShop" className="w-8 h-8 object-contain shrink-0" />
            {/* Teks logo disembunyikan jika sedang di-collapse di desktop */}
            <span className={`text-xl font-bold text-gray-800 transition-opacity duration-300 ${isDesktopCollapsed ? 'hidden md:hidden' : 'block'}`}>
              AtributShop
            </span>
          </div>
          {/* Tombol tutup sidebar hanya muncul di layar Mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-gray-500 hover:text-gray-700 focus:outline-none ml-auto"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Daftar Tautan Menu Navigasi yang dimuat dari menu.ts */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {navMenus.map((menu) => {
            const isActive = pathname === menu.href;
            return (
              <Link
                key={menu.name}
                href={menu.href}
                className={`flex items-center rounded-lg text-sm font-medium transition-all ${
                  isDesktopCollapsed ? 'justify-center py-3' : 'gap-3 px-4 py-2.5'
                } ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                title={isDesktopCollapsed ? menu.name : undefined} // Memunculkan nama menu sebagai tooltip saat di-hover dalam mode collapse
              >
                <i className={`${menu.icon} text-lg text-center ${isDesktopCollapsed ? '' : 'w-5'}`}></i>
                {/* Teks menu disembunyikan jika sedang di-collapse */}
                <span className={`${isDesktopCollapsed ? 'hidden' : 'block whitespace-nowrap'}`}>
                  {menu.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bagian Bawah Sidebar: Tombol Keluar / Logout */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className={`flex w-full items-center rounded-lg bg-red-50 text-sm font-medium text-red-600 transition hover:bg-red-100 ${
              isDesktopCollapsed ? 'justify-center py-3' : 'justify-center gap-2 py-2.5 px-4'
            }`}
            title={isDesktopCollapsed ? 'Keluar (Logout)' : undefined}
          >
            <i className="fa-solid fa-right-from-bracket text-lg"></i>
            {/* Teks Keluar disembunyikan jika sedang di-collapse */}
            <span className={`${isDesktopCollapsed ? 'hidden' : 'block whitespace-nowrap'}`}>
              Keluar (Logout)
            </span>
          </button>
        </div>
      </aside>

      {/* Area Konten Utama */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header Atas untuk Mode Mobile dan Desktop */}
        <header className="flex h-16 items-center justify-between bg-white border-b border-gray-200 px-6 z-30">
          <div className="flex items-center gap-4">
            {/* Tombol Buka/Tutup Sidebar untuk Mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-gray-500 hover:text-gray-700 focus:outline-none transition"
            >
              <i className="fa-solid fa-bars text-xl"></i>
            </button>
            {/* [PENAMBAHAN] Tombol Collapse Sidebar untuk Desktop */}
            <button
              onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
              className="hidden md:flex text-gray-500 hover:text-gray-700 focus:outline-none transition items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100"
            >
              <i className="fa-solid fa-bars-staggered text-lg"></i>
            </button>
          </div>

          <div className="flex items-center gap-5 ml-auto">
            {/* [PENAMBAHAN] Tombol Lonceng Notifikasi */}
            <button 
              onClick={() => setIsNotifOpen(true)}
              className="relative text-gray-500 hover:text-blue-600 transition-colors focus:outline-none"
            >
              <i className="fa-regular fa-bell text-xl"></i>
              {/* Badge indikator merah di lonceng */}
              <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[8px] text-white ring-2 ring-white">
                3
              </span>
            </button>

            {/* Menampilkan nama pengguna secara dinamis dari kolom nama */}
            <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                {/* Mengambil huruf pertama nama pengguna sebagai avatar */}
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-gray-700 hidden sm:block">{userName}</span>
            </div>
          </div>
        </header>

        {/* Konten Halaman Dinamis */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {children}
        </main>
      </div>

      {/* [PENAMBAHAN] Memanggil Komponen Notifikasi di Luar Flow Konten agar Bebas Menimpa Layar */}
      <Notification isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </div>
  );
}