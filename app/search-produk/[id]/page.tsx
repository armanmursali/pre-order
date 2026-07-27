// app/(dashboard)/search-produk/[id]/page.tsx
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
    konfigurasi_pertanyaan?: any[];
  };
}

export default function PublicProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [produk, setProduk] = useState<ProdukDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // [STATE TRANSAKSI]: Kuantitas, Alamat, Telepon, Metode Pembayaran, Bukti Transfer, & Jawaban Pertanyaan Kustom
  const [jumlah, setJumlah] = useState<number>(1);
  const [alamatPembeli, setAlamatPembeli] = useState<string>('');
  const [teleponPembeli, setTeleponPembeli] = useState<string>('');
  const [metodePilihan, setMetodePilihan] = useState<string>('Tunai');
  const [fileBukti, setFileBukti] = useState<File | null>(null);
  const [previewBukti, setPreviewBukti] = useState<string>('');
  const [jawabanPertanyaan, setJawabanPertanyaan] = useState<{ [key: string]: string }>({});

  // [STATE MODAL KONFIRMASI & HITUNG MUNDUR 5 DETIK]
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(5);

  // [LOGIKA PRESISI]: Mengambil ID parameter rute secara aman dan sinkron
  useEffect(() => {
    const resolveParams = async () => {
      if (params && params.id) {
        const resolvedId = Array.isArray(params.id) ? params.id[0] : params.id;
        if (resolvedId) {
          await fetchPublicProductData(resolvedId);
        }
      }
    };
    resolveParams();
  }, [params]);

  // [EFEK HITUNG MUNDUR MODAL]: Mengatur jeda waktu 5 detik agar tombol konfirmasi aktif
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showConfirmModal && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showConfirmModal, countdown]);

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

  // [FUNGSI AMBIL DATA PRODUK PUBLIK]: Mengambil detail produk beserta informasi toko dan konfigurasi pertanyaannya dari Supabase
  const fetchPublicProductData = async (targetId: string) => {
    try {
      setLoading(true);

      const { data: dataProduk, error: errorProduk } = await supabase
        .from('produk')
        .select('*, jenis_produk(nama), toko:toko_id(id, user_id, nama, telepon, alamat, rekening, metode_pembayaran, konfigurasi_pertanyaan)')
        .eq('id', targetId)
        .maybeSingle();

      if (errorProduk || !dataProduk) {
        showToast('Produk tidak ditemukan di database.', 'error');
        setLoading(false);
        return;
      }

      setProduk(dataProduk);
      if (dataProduk.toko?.metode_pembayaran) {
        if (dataProduk.toko.metode_pembayaran.toLowerCase().includes('transfer')) {
          setMetodePilihan('Transfer');
        } else {
          setMetodePilihan('Tunai');
        }
      }

      // Inisialisasi awal state jawaban pertanyaan kustom jika ada
      if (dataProduk.toko?.konfigurasi_pertanyaan && Array.isArray(dataProduk.toko.konfigurasi_pertanyaan)) {
        const initialAnswers: { [key: string]: string } = {};
        dataProduk.toko.konfigurasi_pertanyaan.forEach((item: any) => {
          initialAnswers[item.id || item.pertanyaan] = '';
        });
        setJawabanPertanyaan(initialAnswers);
      }
    } catch (error: any) {
      console.error('Terjadi kesalahan sistem:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // [FUNGSI INTERSEPSI SUBMIT]: Validasi awal sebelum memunculkan modal konfirmasi
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!produk || isSubmitting) return;

    if (!alamatPembeli.trim() || !teleponPembeli.trim()) {
      showToast('Alamat dan Nomor Telepon wajib diisi.', 'error');
      return;
    }

    // Validasi pertanyaan kustom wajib diisi
    if (produk.toko?.konfigurasi_pertanyaan && Array.isArray(produk.toko.konfigurasi_pertanyaan)) {
      for (const item of produk.toko.konfigurasi_pertanyaan) {
        const key = item.id || item.pertanyaan;
        if (!jawabanPertanyaan[key] || !jawabanPertanyaan[key].trim()) {
          showToast(`Pertanyaan "${item.pertanyaan}" wajib diisi.`, 'error');
          return;
        }
      }
    }

    if (metodePilihan === 'Transfer' && !fileBukti) {
      showToast('Silakan unggah bukti transfer terlebih dahulu.', 'error');
      return;
    }

    // Buka modal konfirmasi dan reset hitung mundur ke 5 detik
    setCountdown(5);
    setShowConfirmModal(true);
  };

  // [FUNGSI PROSES PEMESANAN KETAT DI KODE]: Mengambil nomor pesanan berikutnya secara eksplisit per toko lalu melakukan insert
  const executeCheckout = async () => {
    if (!produk || isSubmitting) return;

    setIsSubmitting(true);
    setShowConfirmModal(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Anda harus login terlebih dahulu.');

      // [PENANGANAN KETAT NOMOR PESANAN PER TOKO]: Ambil nomor pesanan tertinggi saat ini untuk toko tersebut
      const { data: existingPesanan, error: fetchOrderError } = await supabase
        .from('pesanan')
        .select('nomor_pesanan')
        .eq('toko_id', produk.toko_id)
        .order('nomor_pesanan', { ascending: false })
        .limit(1);

      if (fetchOrderError) throw fetchOrderError;

      let nextNomorPesanan = 1;
      if (existingPesanan && existingPesanan.length > 0 && existingPesanan[0].nomor_pesanan != null) {
        nextNomorPesanan = Number(existingPesanan[0].nomor_pesanan) + 1;
      }

      let buktiUrl = null;

      // Jika memilih metode transfer, unggah bukti transfer ke storage bucket 'bukti-transfer'
      if (metodePilihan === 'Transfer') {
        if (!fileBukti) {
          throw new Error('Silakan unggah bukti transfer terlebih dahulu.');
        }

        const fileExt = fileBukti.name.split('.').pop();
        const fileName = `bukti-${session.user.id}-${Date.now()}.${fileExt}`;
        const filePath = `public/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('bukti-transfer')
          .upload(filePath, fileBukti, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('bukti-transfer')
          .getPublicUrl(filePath);

        buktiUrl = publicUrlData.publicUrl;
      }

      const totalHarga = produk.harga * jumlah;

      // [INSERT DATA DENGAN NOMOR PESANAN EKSPLISIT]: Menyertakan nomor_pesanan hasil perhitungan ketat di kode
      const { error: insertError } = await supabase
        .from('pesanan')
        .insert({
          produk_id: produk.id,
          toko_id: produk.toko_id,
          pembeli_id: session.user.id,
          jumlah: jumlah,
          total_harga: totalHarga,
          metode_pilihan: metodePilihan,
          bukti_transfer: buktiUrl,
          alamat_pembeli: alamatPembeli,
          telepon_pembeli: teleponPembeli,
          jawaban_pertanyaan: jawabanPertanyaan,
          nomor_pesanan: nextNomorPesanan,
          status: 'Belum Diterima',
        });

      if (insertError) throw insertError;

      // [PENGALIHAN CEPAT KE /pesanan DENGAN FLASH TOAST]: Menyimpan pesan sukses dan langsung redirect tanpa jeda
      localStorage.setItem('flash_toast', 'Pesanan berhasil dibuat! Status: Belum Diterima pemilik.');
      router.push('/pesanan');
    } catch (error: any) {
      showToast('Gagal memproses pesanan: ' + error.message, 'error');
      setIsSubmitting(false);
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
    return (
      <div className="bg-white text-gray-800 rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <i className="fa-solid fa-triangle-exclamation text-4xl text-amber-600 mb-3"></i>
        <h2 className="text-lg font-bold text-gray-800 mb-1">Produk Tidak Ditemukan</h2>
        <p className="text-xs sm:text-sm text-gray-500 mb-6">Produk dengan ID tersebut tidak ditemukan di server.</p>
        <button
          onClick={() => router.push('/beranda')}
          className="bg-amber-800 hover:bg-amber-900 text-white px-5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors"
        >
          Kembali ke Beranda
        </button>
      </div>
    );
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
        <h1 className="text-xl font-bold text-amber-900">Detail Produk & Pembayaran</h1>
      </div>

      {/* [TATA LETAK 2 KOLOM]: Kolom Kiri untuk Detail Produk, Kolom Kanan untuk Proses Pembayaran */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start max-w-7xl mx-auto">
        
        {/* KOLOM KIRI: Detail Produk & Informasi Toko */}
        <div className="bg-white text-gray-900 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-gray-200 flex items-center justify-between bg-orange-50/30">
            <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
              {produk.jenis_produk?.nama || 'Tanpa Jenis'}
            </span>
            <span className="text-xs font-semibold text-gray-500">
              Dijual di: <strong className="text-amber-900">{produk.toko?.nama || 'Toko'}</strong>
            </span>
          </div>

          <div className="p-4 sm:p-6 space-y-4 bg-white">
            <div className="aspect-square w-48 sm:w-64 mx-auto rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white flex items-center justify-center cursor-pointer" onClick={() => produk.foto && setPreviewImageUrl(produk.foto)}>
              {produk.foto ? (
                <img src={produk.foto} alt={produk.nama} className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-gray-400 bg-white p-4">
                  <i className="fa-solid fa-box text-4xl mb-2 text-gray-300"></i>
                  <p className="text-xs font-medium text-gray-400">Tidak ada foto</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{produk.nama}</h2>
              <div>
                <span className="text-xl sm:text-2xl font-bold text-amber-900">
                  {formatRupiah(produk.harga)}
                </span>
                <span className="text-xs text-gray-500 ml-2">per item</span>
              </div>
            </div>

            {/* Informasi Toko Penjual Produk */}
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-xs">
              <h3 className="font-bold text-gray-500 uppercase tracking-wider">Informasi Penjual / Toko</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
              </div>
            </div>

            <div>
              <Link
                href={`/search/${produk.toko_id}`}
                className="inline-flex items-center gap-1.5 text-xs text-amber-800 hover:text-amber-900 font-semibold"
              >
                <i className="fa-solid fa-store"></i>
                <span>Kunjungi Halaman Toko Ini</span>
              </Link>
            </div>
          </div>
        </div>

        {/* KOLOM KANAN: Formulir Pesanan & Proses Pembayaran */}
        <div className="bg-white text-gray-900 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-gray-200 bg-orange-50/30">
            <h3 className="text-base font-bold text-amber-900 flex items-center gap-2">
              <i className="fa-solid fa-cart-shopping text-orange-600"></i>
              <span>Formulir Pesanan & Pembayaran</span>
            </h3>
          </div>

          <div className="p-4 sm:p-6 bg-white">
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Jumlah / Kuantitas Pesanan */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Jumlah Pembelian</label>
                  <input
                    type="number"
                    min="1"
                    value={jumlah}
                    onChange={(e) => setJumlah(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm bg-white text-gray-900 outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                {/* Total Harga Dinamis */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Total Harga Dinamis</label>
                  <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-xs sm:text-sm font-bold text-amber-900 flex items-center">
                    {formatRupiah(produk.harga * jumlah)}
                  </div>
                </div>
              </div>

              {/* [FIELD WAJIB]: Nomor Telepon Pembeli */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nomor Telepon / WhatsApp <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  value={teleponPembeli}
                  onChange={(e) => setTeleponPembeli(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm bg-white text-gray-900 outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              {/* [FIELD WAJIB]: Alamat Lengkap Pembeli */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Alamat Lengkap Pengiriman <span className="text-red-500">*</span></label>
                <textarea
                  value={alamatPembeli}
                  onChange={(e) => setAlamatPembeli(e.target.value)}
                  placeholder="Masukkan alamat lengkap tujuan pengiriman..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm bg-white text-gray-900 outline-none focus:ring-2 focus:ring-orange-500"
                  required
                ></textarea>
              </div>

              {/* [RENDER PERTANYAAN KUSTOM DARI TOKO]: Render dinamis berdasarkan konfigurasi toko (teks / radio button) */}
              {produk.toko?.konfigurasi_pertanyaan && produk.toko.konfigurasi_pertanyaan.length > 0 && (
                <div className="p-4 bg-orange-50/40 rounded-xl border border-orange-200 space-y-3">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Pertanyaan Tambahan dari Toko</h4>
                  {produk.toko.konfigurasi_pertanyaan.map((item: any, index: number) => {
                    const qKey = item.id || item.pertanyaan;
                    return (
                      <div key={qKey} className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-800">
                          {index + 1}. {item.pertanyaan} <span className="text-red-500">*</span>
                        </label>

                        {item.tipe === 'radio' ? (
                          <div className="space-y-1 pl-2">
                            {(item.opsi || []).map((opt: string, oIdx: number) => (
                              <label key={oIdx} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`custom-q-${qKey}`}
                                  value={opt}
                                  checked={jawabanPertanyaan[qKey] === opt}
                                  onChange={(e) => setJawabanPertanyaan({ ...jawabanPertanyaan, [qKey]: e.target.value })}
                                  className="text-orange-600 focus:ring-orange-500"
                                  required
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={jawabanPertanyaan[qKey] || ''}
                            onChange={(e) => setJawabanPertanyaan({ ...jawabanPertanyaan, [qKey]: e.target.value })}
                            placeholder="Tuliskan jawaban Anda..."
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-900 outline-none focus:ring-2 focus:ring-orange-500"
                            required
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pilihan Jenis Pembayaran */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Pilih Metode Pembayaran</label>
                <select
                  value={metodePilihan}
                  onChange={(e) => setMetodePilihan(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm bg-white text-gray-900 outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="Tunai">Tunai (Cash)</option>
                  <option value="Transfer">Transfer Bank</option>
                </select>
              </div>

              {/* Jika Memilih Transfer: Tampil Informasi Rekening & Upload Bukti Transfer */}
              {metodePilihan === 'Transfer' && (
                <div className="p-4 bg-gray-50 rounded-xl border border-orange-200 space-y-3">
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
                    <p className="font-bold mb-1"><i className="fa-solid fa-circle-info mr-1"></i> Informasi Rekening Tujuan:</p>
                    <p className="font-mono whitespace-pre-wrap">{produk.toko?.rekening || 'Belum ada informasi rekening.'}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Upload Bukti Transfer <span className="text-red-500">*</span></label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setFileBukti(file);
                          setPreviewBukti(URL.createObjectURL(file));
                        }
                      }}
                      className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                      required
                    />
                    {previewBukti && (
                      <div className="mt-2">
                        <img src={previewBukti} alt="Pratinjau Bukti" className="w-32 h-32 object-cover rounded-lg border border-gray-200 shadow-sm" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* [PENGAMAN TOMBOL KIRIM]: Tombol dikunci (disabled) jika isSubmitting bernilai true */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2 text-white ${
                    isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'
                  }`}
                >
                  {isSubmitting ? (
                    <><i className="fa-solid fa-circle-notch fa-spin"></i> Memproses...</>
                  ) : (
                    <><i className="fa-solid fa-paper-plane"></i> Kirim Pesanan Sekarang</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>

      {/* [MODAL KONFIRMASI PESANAN]: Muncul saat tombol kirim ditekan dengan jeda hitung mundur 5 detik */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 text-center">
            <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto text-2xl">
              <i className="fa-solid fa-circle-question"></i>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Konfirmasi Pesanan</h3>
            <p className="text-xs sm:text-sm text-gray-600">
              Apakah semua informasi pesanan, jumlah, alamat, dan pembayaran sudah benar?
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-xs sm:text-sm font-medium hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={countdown > 0 || isSubmitting}
                onClick={executeCheckout}
                className={`flex-1 px-4 py-2.5 rounded-xl text-white text-xs sm:text-sm font-medium transition-colors shadow-sm ${
                  countdown > 0 || isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {isSubmitting ? (
                  <><i className="fa-solid fa-circle-notch fa-spin"></i> Memproses...</>
                ) : countdown > 0 ? (
                  `Tunggu (${countdown}s)`
                ) : (
                  'Ya, Proses Sekarang'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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