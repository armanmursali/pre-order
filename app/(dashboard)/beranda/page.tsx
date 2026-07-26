// app/(dashboard)/beranda/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

interface TokoSearchResult {
  id: string;
  user_id: string;
  nama: string;
  deskripsi?: string | null;
  foto: string | null;
  kategori_id?: string;
  kategori_toko?: {
    nama: string;
  };
  tipe: 'toko';
}

interface ProdukSearchResult {
  id: string;
  toko_id: string;
  nama: string;
  harga: number;
  foto: string | null;
  jenis_produk_id?: string;
  jenis_produk?: {
    nama: string;
  };
  toko?: {
    id: string;
    user_id: string;
    nama: string;
  };
  tipe: 'produk';
}

type SearchResultItem = TokoSearchResult | ProdukSearchResult;

export default function BerandaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // State untuk input pencarian dan hasil pencarian
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // State untuk rekomendasi produk atau toko serupa di panel samping secara otomatis
  const [similarItems, setSimilarItems] = useState<SearchResultItem[]>([]);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);

  // Memeriksa sesi pengguna aktif saat halaman dimuat
  useEffect(() => {
    const supabase = createClient();

    async function checkUserSession() {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        router.push('/login');
      } else {
        setCurrentUserId(session.user.id);
        setLoading(false);
      }
    }

    checkUserSession();
  }, [router]);

  // [FUNGSI PENCARIAN UTAMA & OTOMATIS AMBIL ITEM SERUPA]:
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setHasSearched(true);
    setSimilarItems([]);
    const supabase = createClient();

    try {
      // 1. Cari kategori toko yang cocok dengan query untuk mendapatkan ID-nya
      const { data: matchedKategori } = await supabase
        .from('kategori_toko')
        .select('id')
        .ilike('nama', `%${query}%`);
      const kategoriIds = (matchedKategori || []).map((k: any) => k.id);

      // 2. Ambil data Toko berdasarkan nama atau kategori_id
      let tokoQuery = supabase
        .from('toko')
        .select('id, user_id, nama, deskripsi, foto, kategori_id, kategori_toko(nama)');
      
      if (kategoriIds.length > 0) {
        tokoQuery = tokoQuery.or(`nama.ilike.%${query}%,kategori_id.in.(${kategoriIds.join(',')})`);
      } else {
        tokoQuery = tokoQuery.ilike('nama', `%${query}%`);
      }
      const { data: tokoData } = await tokoQuery.limit(10);

      // 3. Cari jenis produk yang cocok dengan query untuk mendapatkan ID-nya
      const { data: matchedJenis } = await supabase
        .from('jenis_produk')
        .select('id')
        .ilike('nama', `%${query}%`);
      const jenisIds = (matchedJenis || []).map((j: any) => j.id);

      // 4. Ambil data Produk berdasarkan nama atau jenis_produk_id
      let produkQuery = supabase
        .from('produk')
        .select('id, toko_id, nama, harga, foto, jenis_produk_id, jenis_produk(nama), toko:toko_id(id, user_id, nama)');

      if (jenisIds.length > 0) {
        produkQuery = produkQuery.or(`nama.ilike.%${query}%,jenis_produk_id.in.(${jenisIds.join(',')})`);
      } else {
        produkQuery = produkQuery.ilike('nama', `%${query}%`);
      }
      const { data: produkData } = await produkQuery.limit(10);

      const formattedTokos: TokoSearchResult[] = (tokoData || []).map((t: any) => ({
        ...t,
        tipe: 'toko' as const,
      }));

      const formattedProduks: ProdukSearchResult[] = (produkData || []).map((p: any) => ({
        ...p,
        tipe: 'produk' as const,
      }));

      const combinedResults = [...formattedTokos, ...formattedProduks];
      setSearchResults(combinedResults);

      // [LOGIKA OTOMATIS PRODUK/TOKO SERUPA]: Langsung ambil item sejenis tanpa tombol
      if (combinedResults.length > 0) {
        const firstItem = combinedResults[0];
        setIsLoadingSimilar(true);

        if (firstItem.tipe === 'produk' && firstItem.jenis_produk_id) {
          const { data: simProd } = await supabase
            .from('produk')
            .select('id, toko_id, nama, harga, foto, jenis_produk_id, jenis_produk(nama), toko:toko_id(id, user_id, nama)')
            .eq('jenis_produk_id', firstItem.jenis_produk_id)
            .neq('id', firstItem.id)
            .limit(6);

          setSimilarItems((simProd || []).map((p: any) => ({ ...p, tipe: 'produk' as const })));
        } else if (firstItem.tipe === 'toko' && firstItem.kategori_id) {
          const { data: simToko } = await supabase
            .from('toko')
            .select('id, user_id, nama, deskripsi, foto, kategori_id, kategori_toko(nama)')
            .eq('kategori_id', firstItem.kategori_id)
            .neq('id', firstItem.id)
            .limit(6);

          setSimilarItems((simToko || []).map((t: any) => ({ ...t, tipe: 'toko' as const })));
        } else {
          setSimilarItems([]);
        }
        setIsLoadingSimilar(false);
      } else {
        setSimilarItems([]);
      }
    } catch (err) {
      console.error('Kesalahan saat melakukan pencarian:', err);
    } finally {
      setIsSearching(false);
      setIsLoadingSimilar(false);
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
      <div className="flex h-full items-center justify-center bg-white text-gray-800">
        <p className="text-gray-500">Memuat data sesi...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white text-gray-900 min-h-screen p-0.5 sm:p-6">
      {/* Kartu Pencarian Utama */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
        <h1 className="text-xl sm:text-2xl font-bold text-amber-900 mb-2">
          Pencarian Toko & Produk
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mb-6">
          Cari berdasarkan nama toko, produk, kategori toko, atau jenis produk.
        </p>

        {/* Form Input Pencarian dan Tombol Search */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ketik nama toko, produk, jenis, atau kategori..."
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

      {/* Bagian Menampilkan Hasil Pencarian */}
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Kolom Kiri: Hasil Utama Pencarian (2 Kolom span pada layar besar) */}
              <div className="lg:col-span-2 space-y-4">
                {searchResults.map((item) => {
                  if (item.tipe === 'toko') {
                    const isMyStore = item.user_id === currentUserId;
                    const targetHref = isMyStore ? `/store/${item.id}` : `/search/${item.id}`;

                    return (
                      <Link
                        key={`toko-${item.id}`}
                        href={targetHref}
                        className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-orange-200 transition-all p-4 flex items-center gap-4 group block"
                      >
                        <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-200">
                          {item.foto ? (
                            <img src={item.foto} alt={item.nama} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <i className="fa-solid fa-store text-xl text-gray-400"></i>
                          )}
                        </div>
                        <div className="flex flex-col truncate flex-grow">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                              Toko {isMyStore ? '(Milik Saya)' : ''}
                            </span>
                            {item.kategori_toko?.nama && (
                              <span className="text-[10px] text-gray-500 font-medium">Kategori: {item.kategori_toko.nama}</span>
                            )}
                          </div>
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
                    const storeOwnerId = item.toko?.user_id;
                    const isMyStore = storeOwnerId === currentUserId;
                    // [PENYESUAIAN RUTE PUBLIK]: Mengarahkan ke rute rata /search-produk/[id] agar bebas dari error 404 Vercel
                    const targetHref = isMyStore ? `/store/${item.toko_id}` : `/search-produk/${item.id}`;

                    return (
                      <Link
                        key={`produk-${item.id}`}
                        href={targetHref}
                        className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-orange-200 transition-all p-4 flex items-center gap-4 group block"
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
                            {item.jenis_produk?.nama && (
                              <span className="text-[10px] text-gray-500 font-medium">Jenis: {item.jenis_produk.nama}</span>
                            )}
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

              {/* [KOLOM KANAN]: Bagian Samping Berjejer Produk/Toko Serupa secara Otomatis */}
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 sticky top-4">
                  <h3 className="font-bold text-amber-900 text-sm sm:text-base mb-3 flex items-center gap-2">
                    <i className="fa-solid fa-boxes-stacked text-orange-600"></i>
                    <span>Rekomendasi Serupa</span>
                  </h3>

                  {isLoadingSimilar ? (
                    <div className="text-center py-8 text-gray-500 text-xs">
                      <i className="fa-solid fa-circle-notch fa-spin text-xl text-orange-600 mb-2 block"></i>
                      Memuat item serupa...
                    </div>
                  ) : similarItems.length === 0 ? (
                    <p className="text-xs text-gray-500 italic py-6 text-center">
                      Tidak ada rekomendasi serupa ditemukan.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {similarItems.map((sim) => {
                        if (sim.tipe === 'toko') {
                          const isMySimStore = sim.user_id === currentUserId;
                          const simStoreHref = isMySimStore ? `/store/${sim.id}` : `/search/${sim.id}`;

                          return (
                            <Link
                              key={`sim-toko-${sim.id}`}
                              href={simStoreHref}
                              className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-sm hover:border-orange-300 transition-all flex items-center gap-3 group block"
                            >
                              <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-200">
                                {sim.foto ? (
                                  <img src={sim.foto} alt={sim.nama} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                ) : (
                                  <i className="fa-solid fa-store text-sm text-gray-400"></i>
                                )}
                              </div>
                              <div className="flex flex-col truncate flex-grow">
                                <span className="text-[9px] font-bold text-orange-700 bg-orange-50 px-1.5 py-0.2 rounded w-fit mb-0.5">Toko</span>
                                <h4 className="font-bold text-gray-900 text-xs group-hover:text-orange-700 transition-colors truncate">
                                  {sim.nama}
                                </h4>
                                <span className="text-[10px] text-gray-400 truncate mt-0.5">{sim.kategori_toko?.nama || ''}</span>
                              </div>
                            </Link>
                          );
                        } else {
                          const storeOwnerId = sim.toko?.user_id;
                          const isMyStore = storeOwnerId === currentUserId;
                          // [PENYESUAIAN RUTE PRODUK SERUPA]: Mengarahkan ke /search-produk/[id]
                          const simTargetHref = isMyStore ? `/store/${sim.toko_id}` : `/search-produk/${sim.id}`;

                          return (
                            <Link
                              key={`similar-${sim.id}`}
                              href={simTargetHref}
                              className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-sm hover:border-orange-300 transition-all flex items-center gap-3 group block"
                            >
                              <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-200">
                                {sim.foto ? (
                                  <img src={sim.foto} alt={sim.nama} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                ) : (
                                  <i className="fa-solid fa-box text-sm text-gray-400"></i>
                                )}
                              </div>
                              <div className="flex flex-col truncate flex-grow">
                                <h4 className="font-bold text-gray-900 text-xs group-hover:text-orange-700 transition-colors truncate">
                                  {sim.nama}
                                </h4>
                                <span className="text-[10px] text-gray-400 truncate mt-0.5">di {sim.toko?.nama || 'Toko'}</span>
                                <span className="text-xs font-semibold text-amber-900 mt-0.5">
                                  {formatRupiah(sim.harga)}
                                </span>
                              </div>
                            </Link>
                          );
                        }
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}