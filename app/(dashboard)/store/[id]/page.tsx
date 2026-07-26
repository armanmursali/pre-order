// app/(dashboard)/store/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

// Mendefinisikan struktur data untuk Detail Toko
interface TokoDetail {
  id: string;
  nama: string;
  foto: string | null;
  created_at: string;
  kategori_toko?: {
    nama: string;
  };
}

export default function StoreDetailPage() {
  // Mengambil parameter 'id' dari URL yang dikirim oleh halaman sebelumnya
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  // State untuk menyimpan data tunggal toko dan status pemuatan
  const [toko, setToko] = useState<TokoDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Memanggil fungsi fetch saat komponen dimuat dan parameter id tersedia
  useEffect(() => {
    if (params?.id) {
      fetchTokoDetail(params.id);
    }
  }, [params?.id]);

  // Fungsi khusus untuk mengambil hanya satu data toko berdasarkan ID dari database Supabase
  const fetchTokoDetail = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('toko')
        .select('*, kategori_toko(nama)')
        .eq('id', id)
        .single(); // Menggunakan .single() karena kita hanya mencari 1 baris data spesifik

      if (error) {
        console.error('Gagal memuat detail toko:', error.message);
      } else if (data) {
        setToko(data);
      }
    } catch (error: any) {
      console.error('Terjadi kesalahan sistem:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Tampilan ketika data sedang dimuat
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 flex flex-col items-center justify-center min-h-[400px]">
        <i className="fa-solid fa-circle-notch fa-spin text-4xl text-orange-600 mb-4"></i>
        <p className="text-gray-500 font-medium">Memuat detail toko...</p>
      </div>
    );
  }

  // Tampilan ketika data toko tidak ditemukan (misal ID salah atau sudah dihapus)
  if (!toko) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center min-h-[400px] flex flex-col items-center justify-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
          <i className="fa-solid fa-store-slash text-3xl"></i>
        </div>
        <h2 className="text-xl font-bold text-amber-900 mb-2">Toko Tidak Ditemukan</h2>
        <p className="text-gray-500 mb-6">Data toko yang Anda cari mungkin telah dihapus atau tidak tersedia.</p>
        <button
          onClick={() => router.push('/store')}
          className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          Kembali ke Daftar Toko
        </button>
      </div>
    );
  }

  // Tampilan utama ketika data toko berhasil dimuat
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header Halaman Detail */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-orange-50/30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/store')}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-orange-100 hover:text-orange-700 transition-colors"
            title="Kembali ke Daftar Toko"
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <h1 className="text-xl font-bold text-amber-900">Detail Toko</h1>
        </div>
        <span className="bg-orange-100 text-orange-800 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide">
          {toko.kategori_toko?.nama || 'Tanpa Kategori'}
        </span>
      </div>

      {/* Area Konten Detail */}
      <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
        
        {/* Bagian Foto Profil Toko */}
        <div className="w-full md:w-1/3 flex-shrink-0">
          <div className="aspect-square rounded-2xl overflow-hidden border-2 border-gray-100 shadow-sm bg-gray-50 flex items-center justify-center">
            {toko.foto ? (
              <img 
                src={toko.foto} 
                alt={toko.nama} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center text-gray-400">
                <i className="fa-solid fa-store text-6xl mb-3"></i>
                <p className="text-sm font-medium">Tidak ada foto</p>
              </div>
            )}
          </div>
        </div>

        {/* Bagian Informasi Teks Toko */}
        <div className="w-full md:w-2/3 flex flex-col">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">{toko.nama}</h2>
          
          <p className="text-sm text-gray-500 mb-6 flex items-center gap-2">
            <i className="fa-regular fa-calendar-days"></i>
            Terdaftar pada {new Date(toko.created_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </p>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Kategori Utama</p>
              <p className="text-base font-medium text-gray-900">{toko.kategori_toko?.nama || '-'}</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">ID Sistem (UUID)</p>
              <p className="text-sm font-mono text-gray-600 break-all">{toko.id}</p>
            </div>
          </div>

          {/* Tombol Navigasi Bawah */}
          <div className="mt-auto pt-8 flex gap-3">
            <Link 
              href="/store"
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <i className="fa-solid fa-list"></i> Lihat Semua Toko
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}