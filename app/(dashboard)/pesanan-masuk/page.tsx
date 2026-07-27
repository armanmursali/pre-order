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
    // [PERBAIKAN]: Menambahkan konfigurasi_pertanyaan untuk menerjemahkan ID ke teks pertanyaan
    konfigurasi_pertanyaan?: any[];
  };
  users?: {
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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [dynamicQuestionKeys, setDynamicQuestionKeys] = useState<string[]>([]);
  // [PERBAIKAN]: State baru untuk menyimpan pemetaan dari ID pertanyaan ke Teks Pertanyaan asli
  const [questionMap, setQuestionMap] = useState<Record<string, string>>({});
  
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'nomor_pesanan', 'nama_pembeli', 'produk', 'jumlah', 'total_harga', 'status'
  ]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // [FUNGSI UTAMA]: Mengambil data toko milik pengguna yang login, dan seluruh pesanan yang masuk
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
        // [PERBAIKAN]: Mengambil konfigurasi_pertanyaan dari toko, dan mengurutkan berdasarkan nomor_pesanan terkecil (ascending: true)
        const { data: pesananData, error: pesananError } = await supabase
          .from('pesanan')
          .select('*, produk(nama, foto), toko(nama, konfigurasi_pertanyaan), users(nama)')
          .in('toko_id', tokoIds)
          .order('nomor_pesanan', { ascending: true });

        if (pesananError) throw pesananError;
        setDaftarPesanan(pesananData || []);
      }
    } catch (error: any) {
      console.error('Gagal mengambil data pesanan masuk:', error.message);
      showToast('Gagal mengambil data pesanan: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPesananMasuk();
  }, []);

  // [PERBAIKAN]: Effect untuk mengekstrak kunci pertanyaan dan memetakan ID ke teks pertanyaan aslinya
  useEffect(() => {
    const keys = new Set<string>();
    const qMap: Record<string, string> = {};

    daftarPesanan.forEach(p => {
      if (p.jawaban_pertanyaan) {
        Object.keys(p.jawaban_pertanyaan).forEach(k => {
          keys.add(k);
          
          // Menerjemahkan ID pertanyaan ke teks pertanyaan dari konfigurasi toko
          if (p.toko?.konfigurasi_pertanyaan && Array.isArray(p.toko.konfigurasi_pertanyaan)) {
            const config = p.toko.konfigurasi_pertanyaan.find((item: any) => item.id === k || item.pertanyaan === k);
            if (config && config.pertanyaan) {
              qMap[k] = config.pertanyaan;
            }
          }
        });
      }
    });
    setDynamicQuestionKeys(Array.from(keys));
    setQuestionMap(qMap);
  }, [daftarPesanan]);

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

  const toggleColumn = (colName: string) => {
    setSelectedColumns(prev => 
      prev.includes(colName) ? prev.filter(c => c !== colName) : [...prev, colName]
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <i className="fa-solid fa-circle-notch fa-spin text-4xl text-orange-600 mb-4"></i>
        <p className="text-gray-500 font-medium">Memuat data pesanan masuk...</p>
      </div>
    );
  }

  const staticColumns = [
    { id: 'nomor_pesanan', label: 'No. Pesanan' },
    { id: 'toko', label: 'Toko' },
    { id: 'nama_pembeli', label: 'Nama Pembeli' },
    { id: 'telepon', label: 'Telepon' },
    { id: 'alamat', label: 'Alamat' },
    { id: 'produk', label: 'Produk' },
    { id: 'jumlah', label: 'Jumlah' },
    { id: 'total_harga', label: 'Total Harga' },
    { id: 'metode', label: 'Metode Pembayaran' },
    { id: 'status', label: 'Status' },
    { id: 'waktu', label: 'Waktu Pesanan' },
  ];

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

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button 
              onClick={() => setViewMode('card')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'card' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <i className="fa-solid fa-list mr-1"></i> Card
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <i className="fa-solid fa-table mr-1"></i> Tabel
            </button>
          </div>

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
      </div>

      {/* Kontrol Pilihan Kolom (Hanya muncul jika mode Tabel) */}
      {viewMode === 'table' && daftarPesanan.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wider border-b border-gray-100 pb-2">
            <i className="fa-solid fa-table-columns mr-1.5"></i> Konfigurasi Kolom Tampilan
          </h3>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {staticColumns.map(col => (
              <label key={col.id} className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer bg-gray-50 hover:bg-gray-100 px-2.5 py-1.5 rounded-lg border border-gray-200 transition-colors">
                <input 
                  type="checkbox" 
                  className="text-orange-600 focus:ring-orange-500 rounded cursor-pointer"
                  checked={selectedColumns.includes(col.id)}
                  onChange={() => toggleColumn(col.id)}
                />
                <span className="select-none font-medium">{col.label}</span>
              </label>
            ))}
            
            {/* Generate Kolom Pertanyaan Custom Secara Dinamis */}
            {dynamicQuestionKeys.map(qKey => (
              <label key={`dyn_${qKey}`} className="flex items-center gap-1.5 text-xs text-amber-800 cursor-pointer bg-orange-50 hover:bg-orange-100 px-2.5 py-1.5 rounded-lg border border-orange-200 transition-colors">
                <input 
                  type="checkbox" 
                  className="text-orange-600 focus:ring-orange-500 rounded cursor-pointer"
                  checked={selectedColumns.includes(`dyn_${qKey}`)}
                  onChange={() => toggleColumn(`dyn_${qKey}`)}
                />
                {/* [PERBAIKAN]: Menampilkan teks pertanyaan dari hasil pemetaan, bukan sekadar ID */}
                <span className="select-none font-medium italic">{questionMap[qKey] || qKey}</span>
              </label>
            ))}
          </div>
        </div>
      )}

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
        <>
          {viewMode === 'table' ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr className="bg-orange-50 border-b border-orange-100 text-xs font-bold text-amber-900 uppercase tracking-wider">
                    {selectedColumns.includes('nomor_pesanan') && <th className="p-3 border-r border-orange-100">No.</th>}
                    {selectedColumns.includes('toko') && <th className="p-3 border-r border-orange-100">Toko</th>}
                    {selectedColumns.includes('nama_pembeli') && <th className="p-3 border-r border-orange-100">Nama Pembeli</th>}
                    {selectedColumns.includes('telepon') && <th className="p-3 border-r border-orange-100">Telepon</th>}
                    {selectedColumns.includes('alamat') && <th className="p-3 border-r border-orange-100">Alamat</th>}
                    {selectedColumns.includes('produk') && <th className="p-3 border-r border-orange-100">Produk</th>}
                    {selectedColumns.includes('jumlah') && <th className="p-3 border-r border-orange-100">Jml</th>}
                    {selectedColumns.includes('total_harga') && <th className="p-3 border-r border-orange-100">Total Harga</th>}
                    {selectedColumns.includes('metode') && <th className="p-3 border-r border-orange-100">Metode</th>}
                    {selectedColumns.includes('status') && <th className="p-3 border-r border-orange-100">Status</th>}
                    {selectedColumns.includes('waktu') && <th className="p-3 border-r border-orange-100">Waktu</th>}
                    
                    {/* [PERBAIKAN]: Menampilkan teks pertanyaan pada Header Tabel Excel-like */}
                    {dynamicQuestionKeys.map(qKey => 
                      selectedColumns.includes(`dyn_${qKey}`) && (
                        <th key={`th_${qKey}`} className="p-3 border-r border-orange-100 italic bg-amber-50">
                          {questionMap[qKey] || qKey}
                        </th>
                      )
                    )}
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-gray-700">
                  {pesananDitampilkan.map((pesanan, idx) => (
                    <tr key={pesanan.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-orange-50/50 border-b border-gray-100 transition-colors`}>
                      {selectedColumns.includes('nomor_pesanan') && <td className="p-3 border-r border-gray-100 font-bold">{pesanan.nomor_pesanan}</td>}
                      {selectedColumns.includes('toko') && <td className="p-3 border-r border-gray-100 font-semibold text-orange-700">{pesanan.toko?.nama}</td>}
                      {selectedColumns.includes('nama_pembeli') && <td className="p-3 border-r border-gray-100 font-bold">{pesanan.users?.nama || 'Anonim'}</td>}
                      {selectedColumns.includes('telepon') && <td className="p-3 border-r border-gray-100">{pesanan.telepon_pembeli}</td>}
                      {selectedColumns.includes('alamat') && <td className="p-3 border-r border-gray-100 max-w-[150px] truncate" title={pesanan.alamat_pembeli}>{pesanan.alamat_pembeli}</td>}
                      {selectedColumns.includes('produk') && <td className="p-3 border-r border-gray-100 font-semibold text-gray-900">{pesanan.produk?.nama}</td>}
                      {selectedColumns.includes('jumlah') && <td className="p-3 border-r border-gray-100 text-center font-bold">{pesanan.jumlah}</td>}
                      {selectedColumns.includes('total_harga') && <td className="p-3 border-r border-gray-100 font-bold text-amber-900">{formatRupiah(pesanan.total_harga)}</td>}
                      {selectedColumns.includes('metode') && (
                        <td className="p-3 border-r border-gray-100">
                          <span className={`px-2 py-0.5 rounded font-semibold ${pesanan.metode_pilihan === 'Transfer' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                            {pesanan.metode_pilihan}
                          </span>
                        </td>
                      )}
                      {selectedColumns.includes('status') && (
                        <td className="p-3 border-r border-gray-100">
                          <span className="px-2 py-0.5 rounded font-semibold bg-gray-200 text-gray-700 border border-gray-300">
                            {pesanan.status}
                          </span>
                        </td>
                      )}
                      {selectedColumns.includes('waktu') && <td className="p-3 border-r border-gray-100 whitespace-nowrap">{formatDate(pesanan.created_at)}</td>}
                      
                      {/* Isi Kolom Pertanyaan Dinamis */}
                      {dynamicQuestionKeys.map(qKey => 
                        selectedColumns.includes(`dyn_${qKey}`) && (
                          <td key={`td_${pesanan.id}_${qKey}`} className="p-3 border-r border-gray-100 bg-amber-50/30">
                            {pesanan.jawaban_pertanyaan?.[qKey] ? String(pesanan.jawaban_pertanyaan[qKey]) : '-'}
                          </td>
                        )
                      )}

                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          {pesanan.bukti_transfer && (
                            <button onClick={() => setPreviewBukti(pesanan.bukti_transfer)} className="bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-xs font-bold transition-colors">
                              <i className="fa-solid fa-image"></i>
                            </button>
                          )}
                          <button onClick={() => showToast('Fitur update status akan datang', 'success')} className="bg-amber-800 hover:bg-amber-900 text-white px-2 py-1 rounded text-xs font-bold transition-colors">
                            <i className="fa-solid fa-pen"></i> Proses
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pesananDitampilkan.map((pesanan) => (
                <div key={pesanan.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col sm:flex-row">
                  
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

                  <div className="p-4 flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <i className="fa-solid fa-address-card text-gray-400"></i>
                        <h4 className="text-xs font-bold text-gray-700 uppercase">Info Pembeli</h4>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p><span className="font-semibold text-gray-800">Nama:</span> <span className="font-bold text-amber-900">{pesanan.users?.nama || 'Anonim'}</span></p>
                        <p><span className="font-semibold text-gray-800">Telepon:</span> {pesanan.telepon_pembeli}</p>
                        <p><span className="font-semibold text-gray-800">Alamat:</span> {pesanan.alamat_pembeli}</p>
                        <p><span className="font-semibold text-gray-800">Waktu:</span> {formatDate(pesanan.created_at)}</p>
                      </div>

                      {pesanan.jawaban_pertanyaan && Object.keys(pesanan.jawaban_pertanyaan).length > 0 && (
                        <div className="mt-3 p-2 bg-orange-50 border border-orange-100 rounded-lg">
                          <p className="text-[10px] font-bold text-amber-900 uppercase mb-1">Jawaban Kustom:</p>
                          <ul className="text-xs text-gray-700 space-y-0.5 list-disc pl-3">
                            {Object.entries(pesanan.jawaban_pertanyaan).map(([key, value]) => (
                              <li key={key}>
                                {/* [PERBAIKAN]: Menampilkan teks pertanyaan asli di Card View */}
                                <span className="font-medium">{questionMap[key] || key}:</span> {String(value)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

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
        </>
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