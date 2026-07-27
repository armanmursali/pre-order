'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import Paginator from '../../components/Paginator';

interface Toko {
  id: string;
  nama: string;
}

interface PesananItem {
  id: string;
  toko_id: string;
  total_harga: number;
  metode_pilihan: string; 
  status: string;
  created_at: string;
  produk?: {
    nama: string;
  } | null;
  toko?: {
    nama: string;
  } | null;
}

export default function PendapatanPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState<boolean>(true);
  const [daftarToko, setDaftarToko] = useState<Toko[]>([]);
  const [selectedTokoId, setSelectedTokoId] = useState<string>('semua');
  const [daftarPesanan, setDaftarPesanan] = useState<PesananItem[]>([]);


  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);

 
  const fetchPendapatanData = async () => {
    try {
      setLoading(true);
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session?.user) {
        router.push('/login');
        return;
      }

      const userId = session.user.id;

    
      const { data: tokoData, error: tokoError } = await supabase
        .from('toko')
        .select('id, nama')
        .or(`user_id.eq.${userId},anggota.cs.[{"user_id":"${userId}"}]`);

      if (tokoError) throw tokoError;

      setDaftarToko(tokoData || []);

      if (tokoData && tokoData.length > 0) {
        const tokoIds = tokoData.map(t => t.id);

       
        const { data: pesananData, error: pesananError } = await supabase
          .from('pesanan')
          .select('id, toko_id, total_harga, metode_pilihan, status, created_at, produk(nama), toko(nama)')
          .in('toko_id', tokoIds)
          .order('created_at', { ascending: false });

        if (pesananError) throw pesananError;

        const formattedPesanan: PesananItem[] = (pesananData || []).map((item: any) => ({
          ...item,
          produk: Array.isArray(item.produk) ? item.produk[0] : item.produk,
          toko: Array.isArray(item.toko) ? item.toko[0] : item.toko,
        }));

        setDaftarPesanan(formattedPesanan);
      }
    } catch (error: any) {
      console.error('Gagal memuat data pendapatan:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendapatanData();
  }, [router, supabase]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTokoId]);

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(angka);
  };


  const pesananFiltered = daftarPesanan.filter(p => {
    return selectedTokoId === 'semua' || p.toko_id === selectedTokoId;
  });

  const totalPendapatan = pesananFiltered.reduce((acc, curr) => acc + Number(curr.total_harga || 0), 0);
  
  const pendapatanTunai = pesananFiltered
    .filter(p => p.metode_pilihan?.toLowerCase() === 'tunai' || p.metode_pilihan?.toLowerCase() === 'cash')
    .reduce((acc, curr) => acc + Number(curr.total_harga || 0), 0);

  const pendapatanTransfer = pesananFiltered
    .filter(p => p.metode_pilihan?.toLowerCase() === 'transfer')
    .reduce((acc, curr) => acc + Number(curr.total_harga || 0), 0);


  const totalItems = pesananFiltered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedPesanan = pesananFiltered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white">
        <i className="fa-solid fa-circle-notch fa-spin text-4xl text-orange-600 mb-4"></i>
        <p className="text-gray-500 font-medium">Memuat data pendapatan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white text-gray-900 min-h-screen p-0.5 sm:p-6">
      
     
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-amber-900 mb-1">
            Total Pendapatan Toko
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Analisis rekapitulasi finansial dan rincian metode pembayaran masuk.
          </p>
        </div>

       
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label htmlFor="filterTokoPendapatan" className="text-xs font-semibold text-gray-600 whitespace-nowrap">
            Pilih Toko:
          </label>
          <select
            id="filterTokoPendapatan"
            value={selectedTokoId}
            onChange={(e) => setSelectedTokoId(e.target.value)}
            className="w-full sm:w-52 px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm bg-white text-gray-900 outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
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

     
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Total Keseluruhan */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-orange-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-orange-800 uppercase tracking-wider">Total Pendapatan</span>
            <div className="w-9 h-9 bg-orange-600 text-white rounded-xl flex items-center justify-center text-sm shadow-sm">
              <i className="fa-solid fa-wallet"></i>
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-amber-900">{formatRupiah(totalPendapatan)}</h2>
          <p className="text-[11px] text-gray-500 mt-1">Akumulasi dari seluruh transaksi berhasil</p>
        </div>

        {/* Pendapatan Tunai */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-green-800 uppercase tracking-wider">Pendapatan Tunai (Cash)</span>
            <div className="w-9 h-9 bg-green-600 text-white rounded-xl flex items-center justify-center text-sm shadow-sm">
              <i className="fa-solid fa-money-bill-wave"></i>
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-green-900">{formatRupiah(pendapatanTunai)}</h2>
          <p className="text-[11px] text-gray-500 mt-1">Pembayaran langsung secara tunai</p>
        </div>

        {/* Pendapatan Transfer */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Pendapatan Transfer</span>
            <div className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center text-sm shadow-sm">
              <i className="fa-solid fa-building-columns"></i>
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-blue-900">{formatRupiah(pendapatanTransfer)}</h2>
          <p className="text-[11px] text-gray-500 mt-1">Pembayaran melalui transfer bank</p>
        </div>

      </div>

      {/* Tabel Riwayat Transaksi Pendapatan */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            <i className="fa-solid fa-list-check mr-1.5"></i> Rincian Transaksi Masuk
          </h3>
          <span className="text-xs text-gray-500 font-medium">Total: {totalItems} transaksi</span>
        </div>

        {paginatedPesanan.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <i className="fa-solid fa-folder-open text-3xl text-gray-300 mb-2 block"></i>
            <p className="text-xs sm:text-sm">Belum ada data transaksi pendapatan untuk toko ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-orange-50 border-b border-orange-100 text-xs font-bold text-amber-900 uppercase tracking-wider">
                  <th className="p-3 border border-orange-100">Toko</th>
                  <th className="p-3 border border-orange-100">Produk</th>
                  <th className="p-3 border border-orange-100">Metode Pembayaran</th>
                  <th className="p-3 border border-orange-100">Status</th>
                  <th className="p-3 border border-orange-100">Waktu Transaksi</th>
                  <th className="p-3 border border-orange-100 text-right">Nominal</th>
                </tr>
              </thead>
              <tbody className="text-xs text-gray-700">
                {paginatedPesanan.map((item, idx) => (
                  <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-orange-50/50 border-b border-gray-100 transition-colors`}>
                    <td className="p-3 border border-gray-200 font-semibold text-orange-700">{item.toko?.nama || '-'}</td>
                    <td className="p-3 border border-gray-200 font-bold text-gray-900">{item.produk?.nama || 'Produk'}</td>
                    <td className="p-3 border border-gray-200">
                      <span className={`px-2.5 py-0.5 rounded font-semibold ${item.metode_pilihan?.toLowerCase() === 'transfer' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {item.metode_pilihan || 'Tunai'}
                      </span>
                    </td>
                    <td className="p-3 border border-gray-200">
                      <span className="px-2 py-0.5 rounded font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                        {item.status || 'Berhasil'}
                      </span>
                    </td>
                    <td className="p-3 border border-gray-200 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3 border border-gray-200 text-right font-bold text-amber-900">
                      {formatRupiah(Number(item.total_harga || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      
      {totalItems > 0 && (
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
      )}

    </div>
  );
}