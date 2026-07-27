// app/(dashboard)/admin/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { sendNotification } from '@/utils/notificationHelper'; // [HELPER NOTIFIKASI REALTIME]: Mengirim pemberitahuan ke pengguna

interface IzinTokoItem {
  id: string;
  user_id: string;
  nama_lengkap: string;
  telepon: string;
  catatan?: string | null;
  bukti_transfer: string;
  status: string; // 'pending', 'diterima', 'ditolak'
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [daftarIzin, setDaftarIzin] = useState<IzinTokoItem[]>([]);
  const [previewBukti, setPreviewBukti] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // [FUNGSI NOTIFIKASI TOAST]: Menampilkan pesan umpan balik ke layar
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // [FUNGSI INISIALISASI & KEAMANAN ADMIN]: Mengecek hak akses admin dan mengambil daftar pengajuan izin
  useEffect(() => {
    const checkAdminAndFetchData = async () => {
      try {
        setLoading(true);
        const { data: { session }, error: authError } = await supabase.auth.getSession();

        if (authError || !session?.user) {
          router.push('/login');
          return;
        }

        const userId = session.user.id;

        // Validasi apakah user terdaftar sebagai admin di tabel admin
        const { data: adminCheck, error: adminError } = await supabase
          .from('admin')
          .select('id')
          .eq('id_users', userId)
          .maybeSingle();

        if (adminError || !adminCheck) {
          showToast('Akses ditolak. Anda bukan administrator.', 'error');
          router.push('/beranda');
          return;
        }

        setIsAdmin(true);

        // Ambil data pengajuan izin buat toko
        const { data: izinData, error: izinError } = await supabase
          .from('izin_buat_toko')
          .select('*')
          .order('created_at', { ascending: false });

        if (izinError) throw izinError;
        setDaftarIzin(izinData || []);

      } catch (err: any) {
        console.error('Kesalahan sistem:', err.message);
        showToast('Gagal memuat data admin: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    };

    checkAdminAndFetchData();
  }, [router, supabase]);

  // [FUNGSI UBAH STATUS IZIN TOKO + KIRIM NOTIFIKASI REALTIME]: Mengubah status dan mengirim notifikasi jika diterima
  const handleUpdateStatusIzin = async (izin: IzinTokoItem, statusBaru: 'diterima' | 'ditolak') => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('izin_buat_toko')
        .update({ status: statusBaru })
        .eq('id', izin.id);

      if (error) throw error;

      // [KIRIM NOTIFIKASI REALTIME KE USER]: Jika status diterima, kirim pemberitahuan bahwa mereka sudah bisa membuat toko
      if (statusBaru === 'diterima') {
        await sendNotification(
          izin.user_id,
          'Izin Toko Disetujui',
          'Selamat! Pengajuan izin pembuatan toko Anda telah disetujui oleh Administrator. Sekarang Anda dapat membuat toko baru di menu Store.'
        );
      } else {
        await sendNotification(
          izin.user_id,
          'Izin Toko Ditolak',
          'Mohon maaf, pengajuan izin pembuatan toko Anda belum dapat disetujui oleh Administrator.'
        );
      }

      showToast(`Status pengajuan berhasil diubah menjadi ${statusBaru} & notifikasi terkirim!`, 'success');

      // Refresh data lokal
      setDaftarIzin(prev =>
        prev.map(item => (item.id === izin.id ? { ...item, status: statusBaru } : item))
      );
    } catch (err: any) {
      showToast('Gagal mengubah status: ' + err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // [FUNGSI HAPUS PENGAJUAN IZIN]: Menghapus data pengajuan dari database admin
  const handleDeleteIzin = async (izinId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data pengajuan izin ini?')) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('izin_buat_toko')
        .delete()
        .eq('id', izinId);

      if (error) throw error;

      showToast('Pengajuan izin berhasil dihapus.', 'success');
      setDaftarIzin(prev => prev.filter(item => item.id !== izinId));
    } catch (err: any) {
      showToast('Gagal menghapus pengajuan: ' + err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <i className="fa-solid fa-circle-notch fa-spin text-4xl text-orange-600 mb-4"></i>
        <p className="text-gray-500 font-medium">Memverifikasi hak akses administrator...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6 bg-white text-gray-900 min-h-screen p-2 sm:p-6 rounded-xl shadow-sm border border-gray-200">
      
      {/* Header Halaman Admin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 text-amber-900 rounded-xl flex items-center justify-center text-lg shadow-inner">
            <i className="fa-solid fa-user-shield"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold text-amber-900">Panel Administrator</h1>
            <p className="text-xs text-gray-500">Verifikasi, kirim notifikasi realtime, dan kelola permohonan izin toko</p>
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-orange-800">
          Total Pengajuan: {daftarIzin.length}
        </div>
      </div>

      {/* Tabel Daftar Pengajuan Izin Toko */}
      {daftarIzin.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500">
          <i className="fa-solid fa-folder-open text-4xl mb-3 text-gray-300 block"></i>
          <h2 className="text-base font-bold text-gray-800 mb-1">Belum Ada Pengajuan</h2>
          <p className="text-xs text-gray-500">Belum ada pengguna yang mengajukan permohonan izin buat toko.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-orange-50 border-b border-orange-100 text-xs font-bold text-amber-900 uppercase tracking-wider">
                <th className="p-3 border-r border-orange-100">Nama Pemohon</th>
                <th className="p-3 border-r border-orange-100">Telepon / WhatsApp</th>
                <th className="p-3 border-r border-orange-100">Catatan</th>
                <th className="p-3 border-r border-orange-100">Bukti Transfer</th>
                <th className="p-3 border-r border-orange-100">Status</th>
                <th className="p-3 text-center">Aksi Verifikasi & Hapus</th>
              </tr>
            </thead>
            <tbody className="text-xs text-gray-700">
              {daftarIzin.map((item, idx) => (
                <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-orange-50/50 border-b border-gray-100 transition-colors`}>
                  <td className="p-3 border-r border-gray-200 font-bold text-gray-900">{item.nama_lengkap}</td>
                  <td className="p-3 border-r border-gray-200 font-medium">{item.telepon}</td>
                  <td className="p-3 border-r border-gray-200 text-gray-600 max-w-xs truncate" title={item.catatan || ''}>
                    {item.catatan || <span className="italic text-gray-400">Tidak ada catatan</span>}
                  </td>
                  <td className="p-3 border-r border-gray-200">
                    <button
                      onClick={() => setPreviewBukti(item.bukti_transfer)}
                      className="bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-image"></i> Cek Bukti
                    </button>
                  </td>
                  <td className="p-3 border-r border-gray-200">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      item.status === 'diterima'
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : item.status === 'ditolak'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        disabled={isProcessing || item.status === 'diterima'}
                        onClick={() => handleUpdateStatusIzin(item, 'diterima')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1 ${
                          item.status === 'diterima'
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        <i className="fa-solid fa-check"></i> Terima
                      </button>

                     

                      <button
                        disabled={isProcessing}
                        onClick={() => handleDeleteIzin(item.id)}
                        className="px-2.5 py-1.5 bg-gray-100 hover:bg-red-600 hover:text-white text-gray-600 rounded-lg text-xs font-bold transition-colors shadow-sm"
                        title="Hapus Pengajuan"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Preview Bukti Transfer */}
      {previewBukti && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" onClick={() => setPreviewBukti(null)}>
          <div className="relative max-w-2xl w-full max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewBukti(null)}
              className="absolute -top-10 right-0 text-white hover:text-orange-400 transition-colors text-2xl font-bold"
              title="Tutup"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
            <div className="bg-white p-2 rounded-xl shadow-2xl">
              <img
                src={previewBukti}
                alt="Bukti Pembayaran DANA"
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Komponen Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[300] transition-all duration-300 ease-in-out">
          <div className={`flex items-center gap-2.5 sm:gap-3 px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl shadow-xl text-white font-medium ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}>
            <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'} text-lg sm:text-xl`}></i>
            <span className="text-xs sm:text-sm tracking-wide">{toast.message}</span>
          </div>
        </div>
      )}

    </div>
  );
}