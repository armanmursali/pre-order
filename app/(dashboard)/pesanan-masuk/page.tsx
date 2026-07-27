// app/(dashboard)/pesanan-masuk/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

interface Toko {
  id: string;
  nama: string;
}

interface PesananMasuk {
  id: string;
  toko_id: string;
  nomor_pesanan: number;
  jumlah: number;
  total_harga: number;
  metode_pilihan: string;
  bukti_transfer: string | null;
  alamat_pembeli: string;
  telepon_pembeli: string;
  jawaban_pertanyaan: any;
  status: string;
  created_at: string;
  produk?: {
    nama: string;
    foto: string | null;
  };
  toko?: {
    nama: string;
  };
}

export default function PesananMasukPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState<boolean>(true);
  const [daftarToko, setDaftarToko] = useState<Toko[]>([]);
  const [selectedTokoId, setSelectedTokoId] = useState<string>('semua');
  const [daftarPesanan, setDaftarPesanan] = useState<PesananMasuk[]>([]);
  const [previewBukti, setPreviewBukti] = useState<string | null>(null);

  // [PERBAIKAN]: Menambahkan inisialisasi state untuk 'toast' yang sebelumnya terlewat
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // [PERBAIKAN]: Menambahkan fungsi 'showToast' untuk menangani notifikasi pop-up
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // [FUNGSI UTAMA]: Mengambil data toko milik pengguna yang login, dan seluruh pesanan yang masuk ke toko-toko tersebut
  const fetchPesananMasuk = async () => {
    try {
      setLoading(true);
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session?.user) {
        router.push('/login');
        return;
      }

      // 1. Ambil daftar toko yang dimiliki oleh user yang sedang login
      const { data: tokoData, error: tokoError } = await supabase
        .from('toko')
        .select('id, nama')
        .eq('user_id', session.user.id);

      if (tokoError) throw tokoError;

      setDaftarToko(tokoData || []);

      if (tokoData && tokoData.length > 0) {
        const tokoIds = tokoData.map(t => t.id);

        // 2. Ambil pesanan yang toko_id nya termasuk dalam daftar toko milik user
        const { data: pesananData, error: pesananError } = await supabase
          .from('pesanan')
          .select('*, produk(nama, foto), toko(nama)')
          .in('toko_id', tokoIds)
          .order('created_at', { ascending: false });

        if (pesananError) throw pesananError;
        setDaftarPesanan(pesananData || []);
      }
    } catch (error: any) {
      console.error('Gagal mengambil data pesanan masuk:', error.message);
      // Memanggil fungsi showToast jika terjadi error saat mengambil data
      showToast('Gagal mengambil data pesanan: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Jalankan fetch saat komponen pertama kali dimuat
  useEffect(() => {
    fetchPesananMasuk();
  }, []);

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(angka);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // [FILTER LOGIC]: Menyaring daftar pesanan berdasarkan toko yang dipilih pada dropdown
  const pesananDitampilkan = selectedTokoId === 'semua' 
    ? daftarPesanan 
    : daftarPesanan.filter(p => p.toko_id === selectedTokoId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <i className="fa-solid fa-circle-notch fa-spin text-4xl text-orange-600 mb-4"></i>
        <p className="text-gray-500 font-medium">Memuat data pesanan masuk...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative p-0.5 sm:p-6 bg-transparent text-gray-900 min-h-screen">
      
      {/* Header & Dropdown Filter Toko */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center text-lg shadow-inner">
            <i className="fa-solid fa-inbox"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold text-amber-900">Pesanan Masuk</h1>
            <p className="text-xs text-gray-500">Kelola semua pesanan dari pelanggan Anda</p>
          </div>
        </div>

        {/* [DROPDOWN TOKO]: Di sinilah user bisa memilih toko mana yang ingin dilihat pesanannya */}
        <div className="w-full sm:w-auto flex items-center gap-2">
          <label htmlFor="filterToko" className="text-xs font-semibold text-gray-600 whitespace-nowrap">
            Filter Toko:
          </label>
          <select
            id="filterToko"
            value={selectedTokoId}
            onChange={(e) => setSelectedTokoId(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm bg-white text-gray-900 outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
          >
            <option value="semua">Semua Toko Saya</option>
            {daftarToko.map((toko) => (
              <option key={toko.id} value={toko.id}>
                {toko.nama}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Konten Daftar Pesanan */}
      {daftarToko.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <i className="fa-solid fa-store-slash text-4xl text-gray-300 mb-3"></i>
          <h2 className="text-lg font-bold text-gray-800 mb-1">Anda Belum Memiliki Toko</h2>
          <p className="text-xs sm:text-sm text-gray-500 mb-6">Silakan buat toko terlebih dahulu untuk mulai menerima pesanan.</p>
          <Link
            href="/store"
            className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors shadow-sm"
          >
            Kelola Toko Saya
          </Link>
        </div>
      ) : pesananDitampilkan.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <i className="fa-solid fa-box-open text-4xl text-gray-300 mb-3"></i>
          <h2 className="text-lg font-bold text-gray-800 mb-1">Belum Ada Pesanan</h2>
          <p className="text-xs sm:text-sm text-gray-500">
            {selectedTokoId === 'semua' 
              ? "Belum ada pesanan yang masuk ke toko-toko Anda." 
              : "Belum ada pesanan yang masuk ke toko ini."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {pesananDitampilkan.map((pesanan) => (
            <div key={pesanan.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col sm:flex-row">
              
              {/* Info Singkat Produk (Kolom Kiri) */}
              <div className="p-4 bg-gray-50 border-b sm:border-b-0 sm:border-r border-gray-200 w-full sm:w-64 flex-shrink-0 flex items-start gap-4">
                <div className="w-16 h-16 bg-white border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                  {pesanan.produk?.foto ? (
                    <img src={pesanan.produk.foto} alt={pesanan.produk.nama} className="w-full h-full object-cover" />
                  ) : (
                    <i className="fa-solid fa-image text-gray-300 text-xl"></i>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-orange-600 font-bold mb-0.5 truncate uppercase tracking-wider">{pesanan.toko?.nama}</p>
                  <h3 className="text-sm font-bold text-gray-900 truncate" title={pesanan.produk?.nama}>
                    {pesanan.produk?.nama || 'Produk Dihapus'}
                  </h3>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="font-semibold bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded text-[10px]">
                      {pesanan.jumlah}x
                    </span>
                    <span>No. {pesanan.nomor_pesanan}</span>
                  </div>
                </div>
              </div>

              {/* Detail Pesanan (Kolom Kanan) */}
              <div className="p-4 flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Data Pembeli & Pengiriman */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <i className="fa-solid fa-address-card text-gray-400"></i>
                    <h4 className="text-xs font-bold text-gray-700 uppercase">Info Pembeli</h4>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p><span className="font-semibold text-gray-800">Telepon:</span> {pesanan.telepon_pembeli}</p>
                    <p><span className="font-semibold text-gray-800">Alamat:</span> {pesanan.alamat_pembeli}</p>
                    <p><span className="font-semibold text-gray-800">Waktu:</span> {formatDate(pesanan.created_at)}</p>
                  </div>

                  {/* Jawaban Pertanyaan Tambahan (Jika ada) */}
                  {pesanan.jawaban_pertanyaan && Object.keys(pesanan.jawaban_pertanyaan).length > 0 && (
                    <div className="mt-3 p-2 bg-orange-50 border border-orange-100 rounded-lg">
                      <p className="text-[10px] font-bold text-amber-900 uppercase mb-1">Jawaban Kustom:</p>
                      <ul className="text-xs text-gray-700 space-y-0.5 list-disc pl-3">
                        {Object.entries(pesanan.jawaban_pertanyaan).map(([key, value]) => (
                          <li key={key}>
                            <span className="font-medium">{key}:</span> {String(value)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Status, Pembayaran & Aksi */}
                <div className="space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-gray-700 uppercase">Total Harga</span>
                      <span className="text-sm font-bold text-amber-900">{formatRupiah(pesanan.total_harga)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-700 uppercase">Metode</span>
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${pesanan.metode_pilihan === 'Transfer' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {pesanan.metode_pilihan}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700 uppercase">Status</span>
                      <span className="text-xs px-2 py-0.5 rounded font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                        {pesanan.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    {pesanan.bukti_transfer && (
                      <button
                        onClick={() => setPreviewBukti(pesanan.bukti_transfer)}
                        className="flex-1 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <i className="fa-solid fa-image"></i> Cek Bukti
                      </button>
                    )}
                    <button
                      className="flex-1 bg-amber-800 hover:bg-amber-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-sm flex items-center justify-center gap-1.5"
                      onClick={() => showToast('Fitur update status akan datang', 'success')}
                    >
                      <i className="fa-solid fa-pen-to-square"></i> Proses
                    </button>
                  </div>
                </div>

              </div>
            </div>
          ))}
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
            <div className="bg-white p-2 rounded-xl">
              <img
                src={previewBukti}
                alt="Bukti Transfer"
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