// app/(dashboard)/search/produk/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

interface ProdukDetail {
  id: string;
  toko_id: string;
  nama: string;
  harga: number;
  foto: string | null;
  created_at: string;
  jenis_produk?: {
    nama: string;
  };
  toko?: {
    id: string;
    user_id: string;
    nama: string;
    telepon?: string | null;
    alamat?: string | null;
    rekening?: string | null;
    metode_pembayaran?: string | null;
  };
}

export default function PublicProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [produk, setProduk] = useState<ProdukDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (params?.id) {
      fetchPublicProductData(params.id);
    }
  }, [params?.id]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(angka);
  };

  // [FUNGSI AMBIL DATA PRODUK PUBLIK]: Mengambil detail produk beserta informasi toko pemiliknya
  const fetchPublicProductData = async (productId: string) => {
    try {
      setLoading(true);

      const { data: dataProduk, error: errorProduk } = await supabase
        .from('produk')
        .select('*, jenis_produk(nama), toko:toko_id(id, user_id, nama, telepon, alamat, rekening, metode_pembayaran)')
        .eq('id', productId)
        .single();

      if (errorProduk || !dataProduk) {
        showToast('Produk tidak ditemukan.', 'error');
        router.push('/beranda');
        return;
      }

      setProduk(dataProduk);
    } catch (error: any) {
      console.error('Terjadi kesalahan sistem:', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white text-gray-800 rounded-xl shadow-sm border border-gray-200 p-8 flex flex-col items-center justify-center min-h-[400px]">
        <i className="fa-solid fa-circle-notch fa-spin text-4xl text-orange-600 mb-4"></i>
        <p className="text-gray-500 font-medium">Memuat informasi produk...</p>
      </div>
    );
  }

  if (!produk) {
    return null;
  }

  return (
    <div className="space-y-6 relative p-0.5 sm:p-6 bg-white text-gray-900 min-h-screen">
      {/* Tombol Kembali ke Beranda */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/beranda')}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-orange-50 hover:text-orange-700 transition-colors shadow-sm"
          title="Kembali ke Beranda"
        >
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <h1 className="text-xl font-bold text-amber-900">Detail Produk Publik</h1>
      </div>

      {/* Bagian Detail Produk */}
      <div className="bg-white text-gray-900 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-200 flex items-center justify-between bg-orange-50/30">
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider">
            {produk.jenis_produk?.nama || 'Tanpa Jenis'}
          </span>
          <span className="text-xs sm:text-sm font-semibold text-gray-500">
            Dijual di: <strong className="text-amber-900">{produk.toko?.nama || 'Toko'}</strong>
          </span>
        </div>

        <div className="p-4 sm:p-6 md:p-8 flex flex-col md:flex-row gap-6 sm:gap-8 bg-white">
          <div className="w-full md:w-1/3 flex-shrink-0">
            <div className="aspect-square rounded-2xl overflow-hidden border-2 border-gray-100 shadow-sm bg-white flex items-center justify-center cursor-pointer" onClick={() => produk.foto && setPreviewImageUrl(produk.foto)}>
              {produk.foto ? (
                <img src={produk.foto} alt={produk.nama} className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-gray-400 bg-white p-4 rounded-2xl">
                  <i className="fa-solid fa-box text-5xl sm:text-6xl mb-2 sm:mb-3 text-gray-300"></i>
                  <p className="text-xs sm:text-sm font-medium text-gray-400">Tidak ada foto</p>
                </div>
              )}
            </div>
          </div>

          <div className="w-full md:w-2/3 flex flex-col bg-white justify-between">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3">{produk.nama}</h2>
              <div className="mb-6">
                <span className="text-2xl sm:text-3xl font-bold text-amber-900">
                  {formatRupiah(produk.harga)}
                </span>
              </div>

              {/* Informasi Toko Penjual Produk */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3 mb-6">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Informasi Penjual / Toko</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                  <div>
                    <p className="text-gray-500">Nama Toko:</p>
                    <p className="font-semibold text-gray-900">{produk.toko?.nama || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Nomor Telepon:</p>
                    <p className="font-semibold text-gray-900">{produk.toko?.telepon || 'Tidak tersedia'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-gray-500">Alamat:</p>
                    <p className="font-semibold text-gray-900">{produk.toko?.alamat || 'Tidak tersedia'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-gray-500">Metode Pembayaran & Rekening:</p>
                    <p className="font-semibold text-gray-900">{produk.toko?.metode_pembayaran || 'Tunai & Transfer'}</p>
                    <p className="font-mono text-xs text-gray-600 mt-1">{produk.toko?.rekening || 'Tidak ada rekening khusus.'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tombol Kunjungi Toko */}
            <div>
              <Link
                href={`/search/${produk.toko_id}`}
                className="inline-flex items-center justify-center gap-2 bg-amber-800 hover:bg-amber-900 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors shadow-sm"
              >
                <i className="fa-solid fa-store"></i>
                <span>Kunjungi Toko Ini</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Preview Gambar */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" onClick={() => setPreviewImageUrl(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-12 right-0 text-white hover:text-orange-400 transition-colors text-3xl font-bold"
              title="Tutup"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
            <img
              src={previewImageUrl}
              alt="Pratinjau Penuh"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-gray-700 bg-white"
            />
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[200] transition-all duration-300 ease-in-out">
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