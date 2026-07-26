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
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // [FITUR PENCARIAN]: State untuk query pencarian, hasil, dan status loading pencarian
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Memeriksa sesi pengguna aktif saat halaman dimuat
  useEffect(() => {
    const supabase = createClient();

    async function checkUserSession() {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        router.push('/login');
      } else {
        setUserEmail(session.user.email || 'Pengguna');
        setLoading(false);
      }
    }

    checkUserSession();
  }, [router]);

  // [FUNGSI PENCARIAN DINAMIS]: Mencari toko dan produk secara bersamaan berdasarkan kata kunci
  useEffect(() => {
    const supabase = createClient();

    const performSearch = async () => {
      const query = searchQuery.trim();
      if (!query) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        // 1. Cari data Toko yang cocok
        const { data: tokoData } = await supabase
          .from('toko')
          .select('id, nama, deskripsi, foto')
          .ilike('nama', `%${query}%`)
          .limit(5);

        // 2. Cari data Produk yang cocok (beserta relasi toko)
        const { data: produkData } = await supabase
          .from('produk')
          .select('id, toko_id, nama, harga, foto, toko:toko_id(nama)')
          .ilike('nama', `%${query}%`)
          .limit(5);

        const formattedTokos: TokoSearchResult[] = (tokoData || []).map((t: any) => ({
          ...t,
          tipe: 'toko' as const,
        }));

        const formattedProduks: ProdukSearchResult[] = (produkData || []).map((p: any) => ({
          ...p,
          tipe: 'produk' as const,
        }));

        // Gabungkan hasil pencarian toko dan produk
        setSearchResults([...formattedTokos, ...formattedProduks]);
      } catch (err) {
        console.error('Kesalahan saat melakukan pencarian:', err);
      } finally {
        setIsSearching(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      performSearch();
    }, 3005); // Penundaan sejenak agar tidak terlalu sering memanggil query saat mengetik

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

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
      {/* Kartu Sambutan */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">
          Selamat Datang di Beranda Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Anda masuk menggunakan akun: <span className="font-semibold text-blue-600">{userEmail}</span>
        </p>

        {/* [TAMPILAN BARU]: Kotak Input Pencarian Toko atau Produk */}
        <div className="mt-6 relative">
          <div className="relative flex items-center">
            <i className="fa-solid fa-search absolute left-4 text-gray-400"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari toko atau produk..."
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm text-gray-900 transition-all shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 text-gray-400 hover:text-gray-600 text-sm font-bold"
                title="Bersihkan"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          {/* [DROPDOWN HASIL PENCARIAN]: Muncul dinamis saat ada query pencarian */}
          {searchQuery.trim() !== '' && (
            <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto divide-y divide-gray-100">
              {isSearching ? (
                <div className="p-4 text-center text-gray-500 text-xs">
                  <i className="fa-solid fa-circle-notch fa-spin mr-2 text-orange-600"></i> Mencari...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-xs italic">
                  Tidak ditemukan hasil untuk "{searchQuery}".
                </div>
              ) : (
                searchResults.map((item) => {
                  if (item.tipe === 'toko') {
                    return (
                      <Link
                        key={`toko-${item.id}`}
                        href={`/store/${item.id}`}
                        onClick={() => setSearchQuery('')}
                        className="flex items-center gap-3 p-3 hover:bg-orange-50/50 transition-colors"
                      >
                        <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-200">
                          {item.foto ? (
                            <img src={item.foto} alt={item.nama} className="w-full h-full object-cover" />
                          ) : (
                            <i className="fa-solid fa-store text-gray-400"></i>
                          )}
                        </div>
                        <div className="flex flex-col truncate">
                          <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded w-fit mb-0.5">Toko</span>
                          <h4 className="font-bold text-gray-900 text-xs sm:text-sm truncate">{item.nama}</h4>
                        </div>
                      </Link>
                    );
                  } else {
                    return (
                      <Link
                        key={`produk-${item.id}`}
                        href={`/store/${item.toko_id}`}
                        onClick={() => setSearchQuery('')}
                        className="flex items-center gap-3 p-3 hover:bg-orange-50/50 transition-colors"
                      >
                        <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-200">
                          {item.foto ? (
                            <img src={item.foto} alt={item.nama} className="w-full h-full object-cover" />
                          ) : (
                            <i className="fa-solid fa-box text-gray-400"></i>
                          )}
                        </div>
                        <div className="flex flex-col truncate flex-grow">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded w-fit mb-0.5">Produk</span>
                            <span className="text-[10px] text-gray-400 truncate">di {item.toko?.nama || 'Toko'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <h4 className="font-bold text-gray-900 text-xs sm:text-sm truncate">{item.nama}</h4>
                            <span className="text-xs font-semibold text-amber-900">{formatRupiah(item.harga)}</span>
                          </div>
                        </div>
                      </Link>
                    );
                  }
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Grid Informasi / Statistik Singkat */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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