// app/(dashboard)/beranda/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

interface TokoSearchResult {
  id: string;
  nama: string;
  deskripsi?: string | null;
  foto: string | null;
  tipe: 'toko';
}

interface ProdukSearchResult {
  id: string;
  toko_id: string;
  nama: string;
  harga: number;
  foto: string | null;
  tipe: 'produk';
  toko?: {
    nama: string;
  };
}

type SearchResultItem = TokoSearchResult | ProdukSearchResult;

export default function BerandaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // State untuk input pencarian dan hasil pencarian di halaman utama
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Memeriksa sesi pengguna aktif saat halaman dimuat
  useEffect(() => {
    const supabase = createClient();

    async function checkUserSession() {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        router.push('/login');
      } else {
        setLoading(false);
      }
    }

    checkUserSession();
  }, [router]);

  // Fungsi untuk mengeksekusi pencarian toko atau produk berdasarkan kata kunci
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setHasSearched(true);
    const supabase = createClient();

    try {
      // 1. Cari data Toko yang cocok
      const { data: tokoData } = await supabase
        .from('toko')
        .select('id, nama, deskripsi, foto')
        .ilike('nama', `%${query}%`)
        .limit(10);

      // 2. Cari data Produk yang cocok (beserta relasi toko)
      const { data: produkData } = await supabase
        .from('produk')
        .select('id, toko_id, nama, harga, foto, toko:toko_id(nama)')
        .ilike('nama', `%${query}%`)
        .limit(10);

      const formattedTokos: TokoSearchResult[] = (tokoData || []).map((t: any) => ({
        ...t,
        tipe: 'toko' as const,
      }));

      const formattedProduks: ProdukSearchResult[] = (produkData || []).map((p: any) => ({
        ...p,
        tipe: 'produk' as const,
      }));

      setSearchResults([...formattedTokos, ...formattedProduks]);
    } catch (err) {
      console.error('Kesalahan saat melakukan pencarian:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(angka);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">Memuat data sesi...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Kartu Pencarian Utama */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
        <h1 className="text-xl sm:text-2xl font-bold text-amber-900 mb-2">
          Pencarian Toko & Produk
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mb-6">
          Temukan toko atau produk yang Anda inginkan dengan cepat di sini.
        </p>

        {/* Form Input Pencarian dan Tombol Search */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ketik nama toko atau produk..."
              className="w-full pl-11 pr-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-xs sm:text-sm text-gray-900 transition-all shadow-sm"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            {isSearching ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin"></i>
                <span>Mencari...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-magnifying-glass"></i>
                <span>Cari</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Bagian Menampilkan Hasil Pencarian Langsung di Halaman Ini */}
      {hasSearched && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800 px-1">
            Hasil Pencarian untuk "{searchQuery}" ({searchResults.length})
          </h2>

          {isSearching ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <i className="fa-solid fa-circle-notch fa-spin text-3xl text-orange-600 mb-2 block"></i>
              <p className="text-xs sm:text-sm text-gray-500">Sedang mencari data...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 text-gray-500">
              <i className="fa-solid fa-box-open text-4xl mb-3 text-gray-300 block"></i>
              <p className="text-xs sm:text-sm">Tidak ada toko atau produk yang ditemukan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {searchResults.map((item) => {
                if (item.tipe === 'toko') {
                  return (
                    <Link
                      key={`toko-${item.id}`}
                      href={`/store/${item.id}`}
                      className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-orange-200 transition-all p-4 flex items-center gap-4 group"
                    >
                      <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-200">
                        {item.foto ? (
                          <img src={item.foto} alt={item.nama} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <i className="fa-solid fa-store text-xl text-gray-400"></i>
                        )}
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="w-fit bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mb-1">
                          Toko
                        </span>
                        <h3 className="text-sm sm:text-base font-bold text-amber-900 group-hover:text-orange-700 transition-colors truncate">
                          {item.nama}
                        </h3>
                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                          {item.deskripsi || 'Tidak ada deskripsi.'}
                        </p>
                      </div>
                    </Link>
                  );
                } else {
                  return (
                    <Link
                      key={`produk-${item.id}`}
                      href={`/store/${item.toko_id}`}
                      className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-orange-200 transition-all p-4 flex items-center gap-4 group"
                    >
                      <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-200">
                        {item.foto ? (
                          <img src={item.foto} alt={item.nama} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <i className="fa-solid fa-box text-xl text-gray-400"></i>
                        )}
                      </div>
                      <div className="flex flex-col truncate flex-grow">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                            Produk
                          </span>
                          <span className="text-[10px] text-gray-400 truncate">di {item.toko?.nama || 'Toko'}</span>
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-gray-900 group-hover:text-orange-700 transition-colors truncate">
                          {item.nama}
                        </h3>
                        <span className="text-xs sm:text-sm font-semibold text-amber-900 mt-0.5">
                          {formatRupiah(item.harga)}
                        </span>
                      </div>
                    </Link>
                  );
                }
              })}
            </div>
          )}
        </div>
      )}

      {/* Grid Informasi / Statistik Singkat */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 pt-4">
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Status Sistem</h3>
          <p className="mt-2 text-2xl font-semibold text-green-600">Aktif & Aman</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Autentikasi</h3>
          <p className="mt-2 text-2xl font-semibold text-blue-600">Google OAuth</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Framework</h3>
          <p className="mt-2 text-2xl font-semibold text-purple-600">Next.js & Supabase</p>
        </div>
      </div>
    </div>
  );
}