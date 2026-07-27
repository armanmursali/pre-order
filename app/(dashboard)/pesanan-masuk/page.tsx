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
  pembeli_id: string; 
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
    konfigurasi_pertanyaan?: any[];
  };
  users?: {
    nama?: string;
    email?: string;
  };
}

export default function PesananMasukPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState<boolean>(true);
  const [daftarToko, setDaftarToko] = useState<Toko[]>([]);
  const [selectedTokoId, setSelectedTokoId] = useState<string>('semua');
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [daftarPesanan, setDaftarPesanan] = useState<PesananMasuk[]>([]);
  const [previewBukti, setPreviewBukti] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [dynamicQuestionKeys, setDynamicQuestionKeys] = useState<string[]>([]);
  const [questionMap, setQuestionMap] = useState<Record<string, string>>({});
  
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'nomor_pesanan', 'email_pembeli', 'produk', 'jumlah', 'total_harga', 'status', 'aksi'
  ]);
  
  const [draggedCol, setDraggedCol] = useState<string | null>(null);

  const [actionModalVisible, setActionModalVisible] = useState<boolean>(false);
  const [selectedActionPesanan, setSelectedActionPesanan] = useState<PesananMasuk | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // [FUNGSI UTAMA]: Mengambil data pesanan dari server
  // Logika pembacaan toko (pemilik OR anggota) tetap utuh sesuai arsitektur cerdas Anda
  const fetchPesananMasuk = async () => {
    try {
      setLoading(true);
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session?.user) {
        router.push('/login');
        return;
      }

      const { data: tokoData, error: tokoError } = await supabase
        .from('toko')
        .select('id, nama')
        .or(`user_id.eq.${session.user.id},anggota.cs.[{"user_id":"${session.user.id}"}]`);

      if (tokoError) throw tokoError;

      setDaftarToko(tokoData || []);

      if (tokoData && tokoData.length > 0) {
        const tokoIds = tokoData.map(t => t.id);

        const { data: pesananData, error: pesananError } = await supabase
          .from('pesanan')
          .select('*, produk(nama, foto), toko(nama, konfigurasi_pertanyaan), users(nama, email)')
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

  useEffect(() => {
    const keys = new Set<string>();
    const qMap: Record<string, string> = {};

    daftarPesanan.forEach(p => {
      if (p.jawaban_pertanyaan) {
        Object.keys(p.jawaban_pertanyaan).forEach(k => {
          keys.add(k);
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

  const getEmailPembeli = (pesanan: PesananMasuk) => {
    return pesanan.users?.email || 'Email tidak tersedia';
  };

  const pesananDitampilkan = daftarPesanan.filter(p => {
    const isTokoMatch = selectedTokoId === 'semua' || p.toko_id === selectedTokoId;
    
    const query = searchQuery.toLowerCase();
    const emailPembeli = getEmailPembeli(p).toLowerCase();
    const noPesanan = p.nomor_pesanan.toString();
    const isSearchMatch = query === '' || emailPembeli.includes(query) || noPesanan.includes(query);

    return isTokoMatch && isSearchMatch;
  });

  const allPossibleCols = [
    { id: 'nomor_pesanan', label: 'No. Pesanan' },
    { id: 'toko', label: 'Toko' },
    { id: 'email_pembeli', label: 'Email Pembeli' }, 
    { id: 'telepon', label: 'Telepon' },
    { id: 'alamat', label: 'Alamat' },
    { id: 'produk', label: 'Produk' },
    { id: 'jumlah', label: 'Jumlah' },
    { id: 'total_harga', label: 'Total Harga' },
    { id: 'metode', label: 'Metode' },
    { id: 'status', label: 'Status' },
    { id: 'waktu', label: 'Waktu' },
    ...dynamicQuestionKeys.map(qKey => ({ id: `dyn_${qKey}`, label: `Q: ${questionMap[qKey] || qKey}` })),
    { id: 'aksi', label: 'Aksi' }
  ];

  const activeColumns = selectedColumns.map(id => allPossibleCols.find(c => c.id === id)).filter(Boolean) as {id: string, label: string}[];
  const availableColumns = allPossibleCols.filter(c => !selectedColumns.includes(c.id));

  const toggleColumn = (colId: string) => {
    setSelectedColumns(prev => 
      prev.includes(colId) ? prev.filter(c => c !== colId) : [...prev, colId]
    );
  };

  const handleDragStart = (e: React.DragEvent, colId: string) => {
    setDraggedCol(colId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    if (!draggedCol || draggedCol === targetColId) return;

    const newOrder = [...selectedColumns];
    const draggedIdx = newOrder.indexOf(draggedCol);
    const targetIdx = newOrder.indexOf(targetColId);

    newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIdx, 0, draggedCol);
    
    setSelectedColumns(newOrder);
    setDraggedCol(null);
  };

  const getRawCellValue = (pesanan: PesananMasuk, colId: string): string => {
    switch (colId) {
      case 'nomor_pesanan': return String(pesanan.nomor_pesanan);
      case 'toko': return pesanan.toko?.nama || '-';
      case 'email_pembeli': return getEmailPembeli(pesanan);
      case 'telepon': return pesanan.telepon_pembeli || '-';
      case 'alamat': return pesanan.alamat_pembeli || '-';
      case 'produk': return pesanan.produk?.nama || '-';
      case 'jumlah': return String(pesanan.jumlah);
      case 'total_harga': return formatRupiah(pesanan.total_harga);
      case 'metode': return pesanan.metode_pilihan;
      case 'status': return pesanan.status;
      case 'waktu': return formatDate(pesanan.created_at);
      case 'aksi': return ''; 
      default:
        if (colId.startsWith('dyn_')) {
          const qKey = colId.replace('dyn_', '');
          return pesanan.jawaban_pertanyaan?.[qKey] ? String(pesanan.jawaban_pertanyaan[qKey]) : '-';
        }
        return '-';
    }
  };

  const handleExportExcel = () => {
    const colsToExport = activeColumns.filter(c => c.id !== 'aksi');
    if (colsToExport.length === 0) return showToast('Pilih setidaknya satu kolom untuk diekspor', 'error');

    const headerRow = colsToExport.map(c => `"${c.label}"`).join(',');
    const dataRows = pesananDitampilkan.map(pesanan => {
      return colsToExport.map(col => {
        const rawValue = getRawCellValue(pesanan, col.id);
        return `"${rawValue.replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csvContent = [headerRow, ...dataRows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Pesanan_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Berhasil diekspor ke format Excel (CSV)', 'success');
  };

  const handleExportPDF = () => {
    const colsToExport = activeColumns.filter(c => c.id !== 'aksi');
    if (colsToExport.length === 0) return showToast('Pilih setidaknya satu kolom untuk diekspor', 'error');

    let html = '<table border="1" style="border-collapse: collapse; width: 100%; font-family: sans-serif; font-size: 12px; text-align: left;">';
    html += '<thead><tr style="background-color: #f3f4f6;">';
    colsToExport.forEach(c => {
      html += `<th style="padding: 8px;">${c.label}</th>`;
    });
    html += '</tr></thead>';
    html += '<tbody>';
    pesananDitampilkan.forEach(pesanan => {
      html += '<tr>';
      colsToExport.forEach(col => {
        html += `<td style="padding: 8px;">${getRawCellValue(pesanan, col.id)}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';

    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Cetak / PDF Pesanan</title></head><body style="padding: 20px;">');
      printWindow.document.write('<h2 style="font-family: sans-serif; color: #333;">Laporan Pesanan Masuk</h2>');
      printWindow.document.write('<p style="font-family: sans-serif; font-size: 12px; color: #666;">Dicetak pada: ' + new Date().toLocaleString() + '</p>');
      printWindow.document.write(html);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    } else {
      showToast('Gagal membuka pop-up PDF. Izinkan pop-up pada browser Anda.', 'error');
    }
  };

  const handleOpenActionModal = (pesanan: PesananMasuk) => {
    setSelectedActionPesanan(pesanan);
    setActionModalVisible(true);
  };

  const handleTerimaPesanan = async () => {
    if (!selectedActionPesanan) return;
    setIsProcessingAction(true);
    try {
      const { error } = await supabase
        .from('pesanan')
        .update({ status: 'Sudah Diterima' })
        .eq('id', selectedActionPesanan.id);

      if (error) throw error;
      
      showToast('Pesanan berhasil diterima dan status diperbarui', 'success');
      setActionModalVisible(false);
      fetchPesananMasuk(); 
    } catch (err: any) {
      showToast('Gagal memperbarui status: ' + err.message, 'error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // [CATATAN]: Fungsi penghapusan/penolakan ini akan 100% bekerja setelah RLS Policy Delete dijalankan di Supabase.
  const handleTolakPesanan = async () => {
    if (!selectedActionPesanan) return;
    setIsProcessingAction(true);
    try {
      const { error } = await supabase
        .from('pesanan')
        .delete()
        .eq('id', selectedActionPesanan.id);

      if (error) throw error;
      
      showToast('Pesanan berhasil ditolak dan dihapus dari sistem', 'success');
      setActionModalVisible(false);
      fetchPesananMasuk();
    } catch (err: any) {
      showToast('Gagal menghapus pesanan: ' + err.message, 'error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const renderTableCell = (pesanan: PesananMasuk, colId: string) => {
    switch (colId) {
      case 'nomor_pesanan':
        return <span className="font-bold">{pesanan.nomor_pesanan}</span>;
      case 'toko':
        return <span className="font-semibold text-orange-700">{pesanan.toko?.nama}</span>;
      case 'email_pembeli':
        return <span className="font-bold text-gray-800">{getEmailPembeli(pesanan)}</span>;
      case 'telepon':
        return pesanan.telepon_pembeli;
      case 'alamat':
        return <span className="block max-w-[150px] truncate" title={pesanan.alamat_pembeli}>{pesanan.alamat_pembeli}</span>;
      case 'produk':
        return <span className="font-semibold text-gray-900">{pesanan.produk?.nama}</span>;
      case 'jumlah':
        return <span className="font-bold text-center block">{pesanan.jumlah}</span>;
      case 'total_harga':
        return <span className="font-bold text-amber-900">{formatRupiah(pesanan.total_harga)}</span>;
      case 'metode':
        return (
          <span className={`px-2 py-0.5 rounded font-semibold ${pesanan.metode_pilihan === 'Transfer' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
            {pesanan.metode_pilihan}
          </span>
        );
      case 'status':
        return (
          <span className={`px-2 py-0.5 rounded font-semibold border ${pesanan.status === 'Sudah Diterima' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-300'}`}>
            {pesanan.status}
          </span>
        );
      case 'waktu':
        return <span className="whitespace-nowrap">{formatDate(pesanan.created_at)}</span>;
      case 'aksi':
        return (
          <div className="flex items-center justify-center gap-2">
            {pesanan.bukti_transfer && (
              <button onClick={() => setPreviewBukti(pesanan.bukti_transfer)} className="bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-xs font-bold transition-colors" title="Lihat Bukti">
                <i className="fa-solid fa-image"></i>
              </button>
            )}
            <button onClick={() => handleOpenActionModal(pesanan)} className="bg-amber-800 hover:bg-amber-900 text-white px-2 py-1 rounded text-xs font-bold transition-colors shadow-sm">
              <i className="fa-solid fa-pen"></i> Proses
            </button>
          </div>
        );
      default:
        if (colId.startsWith('dyn_')) {
          const qKey = colId.replace('dyn_', '');
          return <span>{pesanan.jawaban_pertanyaan?.[qKey] ? String(pesanan.jawaban_pertanyaan[qKey]) : '-'}</span>;
        }
        return '-';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <i className="fa-solid fa-circle-notch fa-spin text-4xl text-orange-600 mb-4"></i>
        <p className="text-gray-500 font-medium">Memuat data pesanan masuk...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative p-0.5 sm:p-6 bg-transparent text-gray-900 min-h-screen">
      
      <div className="space-y-4">
        
        {/* Kotak 1: Judul, Toggle View Mode, & Dropdown Toko */}
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

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 w-full sm:w-auto justify-center">
              <button 
                onClick={() => setViewMode('card')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex-1 sm:flex-none ${viewMode === 'card' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <i className="fa-solid fa-list mr-1"></i> Card
              </button>
              <button 
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex-1 sm:flex-none ${viewMode === 'table' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <i className="fa-solid fa-table mr-1"></i> Tabel
              </button>
            </div>

            <div className="w-full sm:w-auto flex items-center gap-2">
              <label htmlFor="filterToko" className="text-xs font-semibold text-gray-600 whitespace-nowrap hidden xl:block">
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

        {/* Kotak 2: Container Pencarian Tersendiri */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <i className="fa-solid fa-magnifying-glass text-gray-400 text-sm"></i>
            </div>
            <input
              type="text"
              placeholder="Cari pesanan berdasarkan email pembeli atau nomor pesanan..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all shadow-sm"
            />
          </div>
        </div>

      </div>

      {/* Konfigurasi Kolom Dinamis & Tombol Ekspor */}
      {viewMode === 'table' && daftarPesanan.length > 0 && (
        <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-2">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              <i className="fa-solid fa-arrows-up-down-left-right mr-1.5"></i> Urutan Kolom Aktif (Geser untuk mengatur)
            </h3>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={handleExportExcel}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 rounded-lg text-xs font-bold transition-colors shadow-sm"
              >
                <i className="fa-solid fa-file-excel"></i> Export CSV
              </button>
              <button 
                onClick={handleExportPDF}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors shadow-sm"
              >
                <i className="fa-solid fa-file-pdf"></i> Export PDF
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {activeColumns.map(col => (
              <div 
                key={col.id}
                draggable
                onDragStart={(e) => handleDragStart(e, col.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                className="flex items-center gap-2 text-xs text-orange-800 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-lg cursor-grab active:cursor-grabbing hover:bg-orange-100 transition-colors shadow-sm"
              >
                <i className="fa-solid fa-grip-vertical text-orange-400"></i>
                <span className="font-semibold select-none">{col.label}</span>
                <button onClick={() => toggleColumn(col.id)} className="ml-1 text-orange-400 hover:text-red-500" title="Sembunyikan Kolom">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            ))}
          </div>

          {availableColumns.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider border-b border-gray-100 pb-1.5 mt-2">
                <i className="fa-solid fa-plus mr-1.5"></i> Kolom Tersedia (Klik untuk menambahkan)
              </h3>
              <div className="flex flex-wrap gap-2">
                {availableColumns.map(col => (
                  <button 
                    key={col.id}
                    onClick={() => toggleColumn(col.id)}
                    className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  >
                    <i className="fa-solid fa-plus text-gray-400"></i>
                    <span className="font-medium select-none">{col.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

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
          <h2 className="text-lg font-bold text-gray-800 mb-1">Tidak Ditemukan</h2>
          <p className="text-xs sm:text-sm text-gray-500">
            {searchQuery 
              ? `Tidak ada pesanan dengan email atau nomor yang cocok dengan "${searchQuery}".` 
              : selectedTokoId === 'semua'
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
                    {activeColumns.map(col => (
                      <th key={`th_${col.id}`} className="p-3 border-r border-orange-100 last:border-r-0">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-xs text-gray-700">
                  {pesananDitampilkan.map((pesanan, idx) => (
                    <tr key={pesanan.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-orange-50/50 border-b border-gray-100 transition-colors`}>
                      {activeColumns.map(col => (
                        <td key={`td_${pesanan.id}_${col.id}`} className={`p-3 border-r border-gray-100 last:border-r-0`}>
                          {renderTableCell(pesanan, col.id)}
                        </td>
                      ))}
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
                        <p><span className="font-semibold text-gray-800">Email:</span> <span className="font-bold text-amber-900">{getEmailPembeli(pesanan)}</span></p>
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
                          <span className={`text-xs px-2 py-0.5 rounded font-semibold border ${pesanan.status === 'Sudah Diterima' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-300'}`}>
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
                          onClick={() => handleOpenActionModal(pesanan)}
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

      {/* Modal Konfirmasi Aksi (Terima / Tolak Pesanan) */}
      {actionModalVisible && selectedActionPesanan && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-5 text-center relative">
            <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto text-2xl">
              <i className="fa-solid fa-clipboard-check"></i>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-gray-900">Proses Pesanan No. {selectedActionPesanan.nomor_pesanan}</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Pilih aksi yang ingin Anda lakukan untuk pesanan dari <strong className="text-gray-800">{getEmailPembeli(selectedActionPesanan)}</strong>.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={handleTerimaPesanan}
                className={`w-full py-2.5 rounded-xl text-white text-xs sm:text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2 ${
                  isProcessingAction ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isProcessingAction ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                Terima Pesanan (Update Status)
              </button>
              
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={handleTolakPesanan}
                className={`w-full py-2.5 rounded-xl text-white text-xs sm:text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2 ${
                  isProcessingAction ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isProcessingAction ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-trash"></i>}
                Tolak & Hapus Pesanan
              </button>

              <button
                type="button"
                disabled={isProcessingAction}
                onClick={() => setActionModalVisible(false)}
                className="w-full mt-2 py-2 rounded-xl text-gray-600 bg-gray-100 hover:bg-gray-200 text-xs sm:text-sm font-medium transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
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