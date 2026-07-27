// app/(dashboard)/search/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

interface TokoDetail {
  id: string;
  user_id: string;
  nama: string;
  deskripsi?: string | null;
  foto: string | null;
  created_at: string;
  telepon?: string | null;
  alamat?: string | null;
  rekening?: string | null;
  metode_pembayaran?: string | null;
  konfigurasi_pertanyaan?: any[]; // [PENYESUAIAN PERTANYAAN KUSTOM]: Menampung konfigurasi pertanyaan kustom dari toko
  kategori_toko?: {
    nama: string;
  };
}

interface Produk {
  id: string;
  toko_id: string;
  nama: string;
  harga: number;
  foto: string | null;
  jenis_produk?: {
    nama: string;
  };
}

export default function PublicStoreDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [toko, setToko] = useState<TokoDetail | null>(null);
  const [produks, setProduks] = useState<Produk[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // [STATE FOLLOWER TOKO]: Menyimpan status follow, jumlah follower, dan ID user yang sedang login
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followerCount, setFollowerCount] = useState<number>(0);
  const [isProcessingFollow, setIsProcessingFollow] = useState<boolean>(false);

  useEffect(() => {
    if (params?.id) {
      fetchPublicStoreData(params.id);
      checkUserAndFollowStatus(params.id);
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

  // [FUNGSI CEK USER & STATUS FOLLOW]: Memeriksa user aktif dan status apakah sudah mengikuti toko ini serta jumlah total follower
  const checkUserAndFollowStatus = async (tokoId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const userId = session.user.id;
      setCurrentUserId(userId);

      // Ambil jumlah total follower toko
      const { count, error: countError } = await supabase
        .from('follower_toko')
        .select('*', { count: 'exact', head: true })
        .eq('id_toko', tokoId);

      if (!countError && count !== null) {
        setFollowerCount(count);
      }

      // Cek apakah user sudah mengikuti toko ini
      const { data: followData, error: followError } = await supabase
        .from('follower_toko')
        .select('id')
        .eq('id_toko', tokoId)
        .eq('id_users', userId)
        .maybeSingle();

      if (!followError && followData) {
        setIsFollowing(true);
      }
    } catch (err) {
      console.error('Gagal memuat status pengikut:', err);
    }
  };

  // [FUNGSI TOGGLE FOLLOW / UNFOLLOW]: Menangani aksi ikuti dan berhenti mengikuti toko
  const handleToggleFollow = async () => {
    if (!toko || !currentUserId) return;
    if (toko.user_id === currentUserId) {
      showToast('Anda tidak dapat mengikuti toko sendiri.', 'error');
      return;
    }

    setIsProcessingFollow(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follower_toko')
          .delete()
          .eq('id_toko', toko.id)
          .eq('id_users', currentUserId);

        if (error) throw error;

        setIsFollowing(false);
        setFollowerCount((prev) => Math.max(0, prev - 1));
        showToast('Berhenti mengikuti toko.', 'success');
      } else {
        // Follow
        const { error } = await supabase
          .from('follower_toko')
          .insert([{ id_toko: toko.id, id_users: currentUserId }]);

        if (error) throw error;

        setIsFollowing(true);
        setFollowerCount((prev) => prev + 1);
        showToast('Berhasil mengikuti toko!', 'success');
      }
    } catch (err: any) {
      showToast('Gagal memproses pengikut: ' + err.message, 'error');
    } finally {
      setIsProcessingFollow(false);
    }
  };

  // [FUNGSI AMBIL DATA PUBLIK]: Mengambil data informasi toko (termasuk konfigurasi pertanyaan kustom) dan produknya
  const fetchPublicStoreData = async (tokoId: string) => {
    try {
      setLoading(true);

      // 1. Ambil informasi detail toko beserta konfigurasi_pertanyaan
      const { data: dataToko, error: errorToko } = await supabase
        .from('toko')
        .select('*, kategori_toko(nama)')
        .eq('id', tokoId)
        .single();

      if (errorToko || !dataToko) {
        showToast('Toko tidak ditemukan.', 'error');
        router.push('/beranda');
        return;
      }

      setToko(dataToko);

      // 2. Ambil daftar produk yang dijual di toko tersebut
      const { data: dataProduk } = await supabase
        .from('produk')
        .select('*, jenis_produk(nama)')
        .eq('toko_id', tokoId)
        .order('created_at', { ascending: false });

      if (dataProduk) {
        setProduks(dataProduk);
      }
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
        <p className="text-gray-500 font-medium">Memuat informasi toko...</p>
      </div>
    );
  }

  if (!toko) {
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
        <h1 className="text-xl font-bold text-amber-900">Kunjungan Toko</h1>
      </div>

      {/* Bagian Detail Informasi Toko (Read-Only untuk Pengunjung) */}
      <div className="bg-white text-gray-900 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-200 flex items-center justify-between bg-orange-50/30">
          <h2 className="text-base sm:text-lg font-bold text-amber-900">Informasi Toko</h2>
          <span className="bg-orange-100 text-orange-800 px-3 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold tracking-wide">
            {toko.kategori_toko?.nama || 'Tanpa Kategori'}
          </span>
        </div>

        <div className="p-4 sm:p-6 md:p-8 flex flex-col md:flex-row gap-6 sm:gap-8 bg-white">
          <div className="w-full md:w-1/3 flex-shrink-0">
            <div className="aspect-square rounded-2xl overflow-hidden border-2 border-gray-100 shadow-sm bg-white flex items-center justify-center cursor-pointer" onClick={() => toko.foto && setPreviewImageUrl(toko.foto)}>
              {toko.foto ? (
                <img src={toko.foto} alt={toko.nama} className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-gray-400 bg-white p-4 rounded-2xl">
                  <i className="fa-solid fa-store text-5xl sm:text-6xl mb-2 sm:mb-3 text-gray-300"></i>
                  <p className="text-xs sm:text-sm font-medium text-gray-400">Tidak ada foto</p>
                </div>
              )}
            </div>
          </div>

          <div className="w-full md:w-2/3 flex flex-col bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">{toko.nama}</h2>

              {/* [TOMBOL IKUTI TOKO]: Tombol Follow/Unfollow & Info Jumlah Pengikut (Disembunyikan jika milik sendiri) */}
              {currentUserId && toko.user_id !== currentUserId && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 font-medium">
                    <strong className="text-gray-900">{followerCount}</strong> Pengikut
                  </span>
                  <button
                    type="button"
                    disabled={isProcessingFollow}
                    onClick={handleToggleFollow}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center gap-2 ${
                      isFollowing
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                        : 'bg-orange-600 text-white hover:bg-orange-700'
                    }`}
                  >
                    {isProcessingFollow ? (
                      <i className="fa-solid fa-circle-notch fa-spin"></i>
                    ) : isFollowing ? (
                      <>
                        <i className="fa-solid fa-user-check text-green-600"></i>
                        <span>Mengikuti</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-user-plus"></i>
                        <span>Ikuti Toko</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 flex items-center gap-2">
              <i className="fa-regular fa-calendar-days"></i>
              Terdaftar pada {new Date(toko.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>

            <div className="space-y-3 sm:space-y-4 bg-white">
              <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-gray-200">
                <p className="text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 sm:mb-2">Deskripsi Toko</p>
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {toko.deskripsi ? toko.deskripsi : <span className="italic text-gray-400">Tidak ada deskripsi yang ditambahkan.</span>}
                </p>
              </div>

              {/* Informasi Kontak, Alamat, Rekening, dan Metode Pembayaran */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 bg-white">
                <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-gray-200">
                  <p className="text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Nomor Telepon / WhatsApp</p>
                  <p className="text-xs sm:text-sm font-medium text-gray-900 flex items-center gap-2">
                    <i className="fa-solid fa-phone text-orange-600"></i>
                    {toko.telepon ? toko.telepon : <span className="italic text-gray-400">Tidak tersedia</span>}
                  </p>
                </div>

                <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-gray-200">
                  <p className="text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Metode Pembayaran</p>
                  <p className="text-xs sm:text-sm font-medium text-gray-900 flex items-center gap-2">
                    <i className="fa-solid fa-wallet text-orange-600"></i>
                    {toko.metode_pembayaran ? toko.metode_pembayaran : <span className="italic text-gray-400">Tunai & Transfer</span>}
                  </p>
                </div>

                <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-gray-200 md:col-span-2">
                  <p className="text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Alamat Lengkap</p>
                  <p className="text-xs sm:text-sm font-medium text-gray-900 flex items-start gap-2">
                    <i className="fa-solid fa-location-dot text-orange-600 mt-0.5"></i>
                    <span>{toko.alamat ? toko.alamat : <span className="italic text-gray-400">Tidak tersedia</span>}</span>
                  </p>
                </div>

                <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-gray-200 md:col-span-2">
                  <p className="text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Rekening Pembayaran (Transfer)</p>
                  <p className="text-xs sm:text-sm font-medium text-gray-900 flex items-start gap-2">
                    <i className="fa-solid fa-credit-card text-orange-600 mt-0.5"></i>
                    <span className="whitespace-pre-wrap">{toko.rekening ? toko.rekening : <span className="italic text-gray-400">Tidak ada informasi rekening.</span>}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bagian Daftar Produk Toko */}
      <div className="bg-white text-gray-900 rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="mb-4 sm:mb-6 border-b border-gray-100 pb-3.5 sm:pb-4 bg-white">
          <h2 className="text-lg sm:text-xl font-bold text-amber-900">Produk yang Dijual</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Daftar barang dan produk dari toko ini.</p>
        </div>

        {produks.length === 0 ? (
          <div className="text-center py-10 sm:py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300 text-xs sm:text-sm">
            <i className="fa-solid fa-box-open text-3xl sm:text-4xl mb-2 sm:mb-3 text-gray-300 block"></i>
            <p>Toko ini belum memiliki produk.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 bg-white">
            {produks.map((produk) => (
              /* [PENYESUAIAN NAVIGASI PRODUK PUBLIK]: Mengarahkan ke /search-produk/[id] saat produk diklik */
              <Link
                key={produk.id}
                href={`/search-produk/${produk.id}`}
                className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-orange-200 transition-all flex flex-col overflow-hidden group block"
              >
                <div className="h-48 w-full bg-white flex-shrink-0 relative cursor-pointer border-b border-gray-100" onClick={(e) => { e.preventDefault(); produk.foto && setPreviewImageUrl(produk.foto); }}>
                  {produk.foto ? (
                    <img src={produk.foto} alt={produk.nama} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 bg-white">
                      <i className="fa-solid fa-box text-5xl text-gray-200"></i>
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 bg-amber-900/90 backdrop-blur-sm text-white px-3 py-1 rounded-lg font-bold shadow-sm text-sm">
                    {formatRupiah(produk.harga)}
                  </div>
                </div>
                
                <div className="p-5 flex flex-col flex-grow bg-white">
                  <span className="w-fit bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-2">
                    {produk.jenis_produk?.nama || 'Tanpa Jenis'}
                  </span>
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-700 transition-colors leading-tight truncate">
                    {produk.nama}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        )}
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