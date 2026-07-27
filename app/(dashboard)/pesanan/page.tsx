// app/(dashboard)/pesanan/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import Paginator from '../../components/Paginator';

interface PesananItem {
  id: string;
  toko_id: string; 
  nomor_pesanan: number;
  jumlah: number;
  total_harga: number;
  metode_pilihan: string;
  bukti_transfer?: string | null;
  status: string;
  alamat_pembeli?: string | null;
  telepon_pembeli?: string | null;
  created_at: string;
  produk?: {
    id: string;
    nama: string;
    harga: number;
    foto: string | null;
  } | null;
  toko?: {
    id: string;
    nama: string;
  } | null;
}

export default function PesananPage() {
  const router = useRouter();
  const supabase = createClient();

  const [pesananList, setPesananList] = useState<PesananItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  const [selectedDeletePesanan, setSelectedDeletePesanan] = useState<PesananItem | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState<string>('');
  const [deleteCountdown, setDeleteCountdown] = useState<number>(5);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);

  // State untuk Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);

  const fetchUserPesanan = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        router.push('/login');
        return;
      }

      const userId = session.user.id;

      const { data, error } = await supabase
        .from('pesanan')
        .select(`
          id,
          toko_id,
          nomor_pesanan,
          jumlah,
          total_harga,
          metode_pilihan,
          bukti_transfer,
          status,
          alamat_pembeli,
          telepon_pembeli,
          created_at,
          produk:produk_id(id, nama, harga, foto),
          toko:toko_id(id, nama)
        `)
        .eq('pembeli_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Gagal memuat data pesanan:', error.message);
      } else if (data) {
        const formattedData: PesananItem[] = (data || []).map((item: any) => ({
          ...item,
          produk: Array.isArray(item.produk) ? item.produk[0] : item.produk,
          toko: Array.isArray(item.toko) ? item.toko[0] : item.toko,
        }));
        setPesananList(formattedData);
      }
    } catch (err) {
      console.error('Kesalahan sistem:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const flashMessage = localStorage.getItem('flash_toast');
    if (flashMessage) {
      setToast({ message: flashMessage, type: 'success' });
      localStorage.removeItem('flash_toast');
      setTimeout(() => setToast(null), 4000);
    }

    fetchUserPesanan();
  }, [router, supabase]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (deleteModalVisible && deleteCountdown > 0) {
      timer = setInterval(() => {
        setDeleteCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [deleteModalVisible, deleteCountdown]);

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(angka);
  };

  const openDeleteModal = (pesanan: PesananItem) => {
    setSelectedDeletePesanan(pesanan);
    setDeleteConfirmationText('');
    setDeleteCountdown(5);
    setDeleteModalVisible(true);
  };

  const executeDeletePesanan = async () => {
    if (!selectedDeletePesanan || deleteConfirmationText !== 'HAPUS') return;
    setIsProcessingAction(true);
    
    try {
      const deletedNomor = selectedDeletePesanan.nomor_pesanan;
      const currentTokoId = selectedDeletePesanan.toko_id; 

      if (!currentTokoId) throw new Error("ID Toko tidak terdeteksi pada pesanan ini.");

      const { error: deleteError } = await supabase
        .from('pesanan')
        .delete()
        .eq('id', selectedDeletePesanan.id);

      if (deleteError) throw deleteError;

      const { data: toUpdate, error: fetchError } = await supabase
        .from('pesanan')
        .select('id, nomor_pesanan')
        .eq('toko_id', currentTokoId)
        .gt('nomor_pesanan', deletedNomor);

      if (fetchError) throw fetchError;

      if (toUpdate && toUpdate.length > 0) {
        for (const item of toUpdate) {
          const { error: updateError } = await supabase
            .from('pesanan')
            .update({ nomor_pesanan: item.nomor_pesanan - 1 })
            .eq('id', item.id);

          if (updateError) throw updateError;
        }
      }
      
      setToast({ message: 'Pesanan berhasil dibatalkan dan dihapus.', type: 'success' });
      setDeleteModalVisible(false);
      
      if (paginatedPesanan.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      }

      fetchUserPesanan();
    } catch (err: any) {
      setToast({ message: 'Gagal membatalkan pesanan: ' + (err.message || JSON.stringify(err)), type: 'error' });
      console.error('Error saat membatalkan pesanan:', err);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Kalkulasi data untuk Pagination
  const totalItems = pesananList.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedPesanan = pesananList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-white text-gray-800 p-12">
        <i className="fa-solid fa-circle-notch fa-spin text-3xl text-orange-600 mb-2"></i>
        <p className="text-gray-500 font-medium ml-3">Memuat daftar pesanan Anda...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white text-gray-900 min-h-screen p-0.5 sm:p-6">
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-amber-900 mb-1">
            Daftar Pesanan Saya
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Pantau status pesanan, rincian produk, dan riwayat transaksi Anda di sini.
          </p>
        </div>
        <Link
          href="/beranda"
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
        >
          <i className="fa-solid fa-magnifying-glass"></i>
          <span>Cari Produk Lain</span>
        </Link>
      </div>

      {pesananList.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 text-gray-500 shadow-sm">
          <i className="fa-solid fa-receipt text-4xl mb-3 text-gray-300 block"></i>
          <h2 className="text-base font-bold text-gray-800 mb-1">Belum Ada Pesanan</h2>
          <p className="text-xs sm:text-sm text-gray-500 mb-4">Anda belum pernah melakukan pemesanan produk apapun.</p>
          <Link
            href="/beranda"
            className="inline-flex items-center gap-2 bg-amber-800 hover:bg-amber-900 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors"
          >
            Mulai Belanja Sekarang
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4">
            {paginatedPesanan.map((item) => (
              <div 
                key={item.id} 
                className="bg-white border border-gray-200 rounded-xl shadow-sm hover:border-orange-200 transition-all p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
              >
                <div className="flex items-start gap-4 flex-grow w-full md:w-auto">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-200 cursor-pointer" onClick={() => item.produk?.foto && setPreviewImageUrl(item.produk.foto)}>
                    {item.produk?.foto ? (
                      <img src={item.produk.foto} alt={item.produk.nama} className="w-full h-full object-cover" />
                    ) : (
                      <i className="fa-solid fa-box text-xl text-gray-400"></i>
                    )}
                  </div>

                  <div className="space-y-1 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                        No. Pesanan: #{item.nomor_pesanan || '-'}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">
                        di Toko <strong className="text-amber-900">{item.toko?.nama || 'Toko'}</strong>
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-gray-900">
                      {item.produk?.nama || 'Produk'}
                    </h3>

                    <p className="text-xs text-gray-500">
                      Jumlah: <strong className="text-gray-900">{item.jumlah} item</strong> | Total: <strong className="text-amber-900">{formatRupiah(item.total_harga)}</strong>
                    </p>

                    <p className="text-[11px] text-gray-400">
                      Metode: <span className="font-semibold text-gray-700">{item.metode_pilihan}</span> | Tanggal: {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col items-end justify-between w-full md:w-auto gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-gray-100">
                  
                  <div className="flex flex-col items-end gap-2 w-full">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Status:</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        item.status === 'Sudah Diterima' 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {item.status || 'Belum Diterima'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full justify-end">
                    {item.bukti_transfer && (
                      <button
                        type="button"
                        onClick={() => setPreviewImageUrl(item.bukti_transfer!)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors"
                      >
                        <i className="fa-solid fa-image"></i>
                        <span className="hidden sm:inline">Bukti Transfer</span>
                      </button>
                    )}
                    
                    {item.status === 'Belum Diterima' && (
                      <button
                        type="button"
                        onClick={() => openDeleteModal(item)}
                        className="text-xs text-red-600 hover:text-white font-semibold flex items-center gap-1.5 bg-red-50 hover:bg-red-600 px-3 py-1.5 rounded-lg border border-red-200 transition-colors"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                        <span>Batalkan Pesanan</span>
                      </button>
                    )}
                  </div>

                </div>
              </div>
            ))}
          </div>

          {/* [PERBAIKAN]: Menambahkan tipe data eksplisit (newVal: number) pada parameter callback untuk meredam galat TypeScript */}
          <Paginator 
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newVal: number) => {
              setItemsPerPage(newVal);
              setCurrentPage(1);
            }}
          />
        </>
      )}

      {deleteModalVisible && selectedDeletePesanan && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 text-center relative">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-2xl">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-red-600">Batalkan Pesanan</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-2">
                Anda akan membatalkan pesanan produk <strong className="text-gray-900">{selectedDeletePesanan.produk?.nama}</strong> secara permanen.
              </p>
              <p className="text-xs font-bold text-gray-800 mt-2 bg-gray-50 py-2 rounded border border-gray-200">
                Ketik <span className="text-red-600 select-all">HAPUS</span> untuk melanjutkan pembatalan.
              </p>
            </div>

            <div className="pt-2">
              <input 
                type="text" 
                placeholder="Ketik HAPUS di sini..." 
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-center outline-none focus:ring-2 focus:ring-red-500 uppercase tracking-widest text-red-600"
              />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                disabled={isProcessingAction || deleteCountdown > 0 || deleteConfirmationText !== 'HAPUS'}
                onClick={executeDeletePesanan}
                className={`w-full py-2.5 rounded-xl text-white text-xs sm:text-sm font-bold transition-colors shadow-sm flex items-center justify-center gap-2 ${
                  (isProcessingAction || deleteCountdown > 0 || deleteConfirmationText !== 'HAPUS') ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isProcessingAction ? (
                  <><i className="fa-solid fa-circle-notch fa-spin"></i> Memproses...</>
                ) : deleteCountdown > 0 ? (
                  `Tunggu (${deleteCountdown} detik)`
                ) : (
                  <><i className="fa-solid fa-trash-can"></i> Ya, Batalkan Pesanan</>
                )}
              </button>

              <button
                type="button"
                disabled={isProcessingAction}
                onClick={() => setDeleteModalVisible(false)}
                className="w-full py-2.5 rounded-xl text-gray-600 bg-gray-100 hover:bg-gray-200 text-xs sm:text-sm font-medium transition-colors"
              >
                Kembali
              </button>
            </div>
          </div>
        </div>
      )}

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