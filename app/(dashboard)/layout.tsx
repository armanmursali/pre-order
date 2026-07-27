// app/(dashboard)/layout.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { navMenus } from '../menu'; 
import Notification from '../components/Notification';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState<string>('Administrator');
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  
  // [STATE ADMIN]: State untuk memvalidasi apakah user yang login merupakan seorang admin
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    const supabase = createClient();
    let channel: any;

    const fetchUserDataAndNotifs = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const userId = session.user.id;

        // [PENGECEKAN STATUS ADMIN]: Validasi apakah user terdaftar di tabel admin
        const { data: adminData } = await supabase
          .from('admin')
          .select('id')
          .eq('id_users', userId)
          .maybeSingle();

        if (adminData) {
          setIsAdmin(true);
        }

        const { data: userData, error } = await supabase
          .from('users')
          .select('nama')
          .eq('id', userId)
          .maybeSingle();

        if (!error && userData && userData.nama) {
          setUserName(userData.nama);
        }

        const fetchUnread = async () => {
          const { count, error: countErr } = await supabase
            .from('notifikasi')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

          if (!countErr && count !== null) {
            setUnreadCount(count);
          }
        };

        fetchUnread();

        // [REALTIME DUA ARAH LAYOUT]: Mendengarkan seluruh event INSERT, UPDATE, dan DELETE pada tabel notifikasi agar badge angka hilang real-time saat dihapus/dibaca
        channel = supabase
          .channel(`layout-notif-realtime-sync-${userId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notifikasi',
              filter: `user_id=eq.${userId}`,
            },
            () => {
              fetchUnread();
            }
          )
          .subscribe();
      }
    };

    fetchUserDataAndNotifs();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isDesktopCollapsed ? 'md:w-20' : 'md:w-64'} w-64`} 
      >
        <div className={`flex h-16 items-center px-6 border-b border-gray-200 ${isDesktopCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo AtributShop" className="w-8 h-8 object-contain shrink-0" />
            <span className={`text-xl font-bold text-amber-900 transition-opacity duration-300 ${isDesktopCollapsed ? 'hidden md:hidden' : 'block'}`}>
              AtributShop
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-gray-500 hover:text-gray-700 focus:outline-none ml-auto"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {navMenus.map((menu) => {
            // [VALIDASI MENU ADMIN]: Sembunyikan menu Admin jika user aktif bukan admin
            if (menu.href === '/admin' && !isAdmin) {
              return null;
            }

            const isActive = pathname === menu.href;
            return (
              <Link
                key={menu.name}
                href={menu.href}
                // [OTOMATIS TUTUP SIDEBAR MOBILE]: Menambahkan event onClick untuk menutup sidebar setelah berpindah menu di perangkat seluler
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center rounded-xl text-sm font-medium transition-all ${
                  isDesktopCollapsed ? 'justify-center py-3' : 'gap-3 px-4 py-2.5'
                } ${
                  isActive
                    ? 'bg-amber-800 text-white shadow-sm font-bold' // [TEMA ORANYE TUA & COKELAT]: Warna aktif menu
                    : 'text-gray-600 hover:bg-orange-50 hover:text-amber-900' // [TEMA ORANYE TUA & COKELAT]: Warna hover menu
                }`}
                title={isDesktopCollapsed ? menu.name : undefined}
              >
                <i className={`${menu.icon} text-lg text-center ${isDesktopCollapsed ? '' : 'w-5'}`}></i>
                <span className={`${isDesktopCollapsed ? 'hidden' : 'block whitespace-nowrap'}`}>
                  {menu.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className={`flex w-full items-center rounded-xl bg-red-50 text-sm font-medium text-red-600 transition hover:bg-red-100 ${
              isDesktopCollapsed ? 'justify-center py-3' : 'justify-center gap-2 py-2.5 px-4'
            }`}
            title={isDesktopCollapsed ? 'Keluar (Logout)' : undefined}
          >
            <i className="fa-solid fa-right-from-bracket text-lg"></i>
            <span className={`${isDesktopCollapsed ? 'hidden' : 'block whitespace-nowrap'}`}>
              Keluar (Logout)
            </span>
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between bg-white border-b border-gray-200 px-6 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-gray-500 hover:text-gray-700 focus:outline-none transition"
            >
              <i className="fa-solid fa-bars text-xl"></i>
            </button>
            <button
              onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
              className="hidden md:flex text-gray-500 hover:text-amber-900 focus:outline-none transition items-center justify-center w-8 h-8 rounded-full hover:bg-orange-50"
            >
              <i className="fa-solid fa-bars-staggered text-lg"></i>
            </button>
          </div>

          <div className="flex items-center gap-5 ml-auto">
            {/* Tombol Lonceng Notifikasi dengan Badge Real-Time */}
            <button 
              onClick={() => setIsNotifOpen(true)}
              className="relative text-gray-500 hover:text-amber-900 transition-colors focus:outline-none"
            >
              <i className="fa-regular fa-bell text-xl"></i>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-gray-700 hidden sm:block">{userName}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-2 bg-gray-50">
          {children}
        </main>
      </div>

      <Notification isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </div>
  );
}