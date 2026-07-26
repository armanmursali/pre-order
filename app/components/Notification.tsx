// app/components/Notification.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

interface NotificationProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NotifItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function Notification({ isOpen, onClose }: NotificationProps) {
  const supabase = createClient();
  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const [flashToast, setFlashToast] = useState<string | null>(null);

  useEffect(() => {
    let channel: any;

    const initNotifSystem = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const userId = session.user.id;

      // Ambil data notifikasi awal
      fetchNotifData(userId);

      // [REALTIME SUPABASE]: Mendengarkan perubahan data pada tabel notifikasi secara langsung tanpa reload
      channel = supabase
        .channel('realtime-notifikasi-panel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifikasi',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const newNotif = payload.new as NotifItem;
            setNotifs((prev) => [newNotif, ...prev]);
            
            // Tampilkan Flash Toast saat ada notifikasi baru masuk
            setFlashToast(newNotif.message);
            setTimeout(() => {
              setFlashToast(null);
            }, 4000);
          }
        )
        .subscribe();
    };

    initNotifSystem();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const fetchNotifData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('notifikasi')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setNotifs(data);
      }
    } catch (err: any) {
      console.error('Gagal memuat notifikasi:', err.message);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifikasi')
        .update({ is_read: true })
        .eq('id', id);

      if (!error) {
        setNotifs((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
      }
    } catch (err: any) {
      console.error('Gagal menandai dibaca:', err.message);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await supabase
        .from('notifikasi')
        .update({ is_read: true })
        .eq('user_id', session.user.id);

      if (!error) {
        setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } catch (err: any) {
      console.error('Gagal menandai semua dibaca:', err.message);
    }
  };

  const deleteNotif = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifikasi')
        .delete()
        .eq('id', id);

      if (!error) {
        setNotifs((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (err: any) {
      console.error('Gagal menghapus notifikasi:', err.message);
    }
  };

  const deleteAllNotifs = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await supabase
        .from('notifikasi')
        .delete()
        .eq('user_id', session.user.id);

      if (!error) {
        setNotifs([]);
      }
    } catch (err: any) {
      console.error('Gagal menghapus semua notifikasi:', err.message);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString();
  };

  return (
    <>
      {isOpen && (
        <div 
          onClick={onClose} 
          className="fixed inset-0 z-[60] bg-black/50 md:hidden" 
        />
      )}

      {/* Panel Notifikasi */}
      <div
        className={`fixed top-0 right-0 h-full bg-white shadow-2xl z-[70] transition-transform duration-300 ease-in-out w-full md:w-96 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header Panel Notifikasi */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-800">Notifikasi</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-red-500 focus:outline-none transition-colors"
          >
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        {/* Tombol Aksi Massal */}
        {notifs.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-100 border-b border-gray-200 flex-shrink-0 text-xs">
            <button
              onClick={markAllAsRead}
              className="text-amber-800 hover:text-amber-900 font-semibold transition-colors flex items-center gap-1"
            >
              <i className="fa-solid fa-check-double"></i> Tandai semua dibaca
            </button>
            <button
              onClick={deleteAllNotifs}
              className="text-red-600 hover:text-red-700 font-semibold transition-colors flex items-center gap-1"
            >
              <i className="fa-solid fa-trash-can"></i> Hapus semua
            </button>
          </div>
        )}

        {/* Daftar Isi Notifikasi (Scrollable) */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {notifs.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <i className="fa-regular fa-bell-slash text-4xl mb-3 block"></i>
              <p className="text-sm">Belum ada notifikasi.</p>
            </div>
          ) : (
            notifs.map((notif) => (
              <div 
                key={notif.id} 
                className={`p-4 rounded-xl border transition-all relative group ${
                  notif.is_read 
                    ? 'bg-gray-50 border-gray-200 text-gray-600' 
                    : 'bg-blue-50/80 border-blue-200 text-gray-800 shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start mb-1.5">
                  <span className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
                    {!notif.is_read && <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>}
                    {notif.title}
                  </span>
                  <span className="text-[10px] font-medium text-gray-400">{formatTime(notif.created_at)}</span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed mb-3">{notif.message}</p>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200/60 text-xs">
                  {!notif.is_read && (
                    <button
                      onClick={() => markAsRead(notif.id)}
                      className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                      Tandai dibaca
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotif(notif.id)}
                    className="text-red-500 hover:text-red-700 font-medium transition-colors"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Flash Toast Real-Time */}
      {flashToast && (
        <div className="fixed bottom-6 right-6 z-[200] animate-bounce">
          <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl bg-amber-800 text-white font-medium border border-amber-700">
            <i className="fa-solid bell text-xl text-yellow-300 animate-pulse"></i>
            <div>
              <p className="text-xs font-bold text-yellow-200">Notifikasi Baru!</p>
              <p className="text-xs tracking-wide">{flashToast}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}