// app/(dashboard)/store/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { sendNotification } from '@/utils/notificationHelper';

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
  anggota?: any[]; 
  kategori_toko?: {
    nama: string;
  };
}

interface JenisProduk {
  id: string;
  nama: string;
}

interface Produk {
  id: string;
  toko_id: string;
  jenis_produk_id: string;
  nama: string;
  harga: number;
  foto: string | null;
  jenis_produk?: {
    nama: string;
  };
}

export default function StoreDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [toko, setToko] = useState<TokoDetail | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOwner, setIsOwner] = useState<boolean>(false);

  const [isMemberListOpen, setIsMemberListOpen] = useState<boolean>(false); 
  const [activeMemberDropdown, setActiveMemberDropdown] = useState<string | null>(null); 

  const [produks, setProduks] = useState<Produk[]>([]);
  const [jenisProduks, setJenisProduks] = useState<JenisProduk[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [productToDelete, setProductToDelete] = useState<Produk | null>(null);
  const [deleteInputName, setDeleteInputName] = useState<string>('');

  // State Modal Pengaturan Informasi Toko
  const [isStoreSettingsModalOpen, setIsStoreSettingsModalOpen] = useState<boolean>(false);
  const [storeSettingsForm, setStoreSettingsForm] = useState({
    telepon: '',
    alamat: '',
    rekening: '',
    metode_pembayaran: 'Tunai & Transfer',
  });

  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [productFormData, setProductFormData] = useState({
    nama: '',
    jenis_produk_id: '',
    harga: '',
    fileFoto: null as File | null,
    previewFoto: '' as string,
  });

  // [REALTIME DETAIL TOKO]: Mendengarkan perubahan data toko secara langsung tanpa reload halaman
  useEffect(() => {
    let channel: any;

    const initRealtimeDetail = async () => {
      if (!params?.id) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      fetchAllData(params.id);

      channel = supabase
        .channel(`realtime-store-detail-${params.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'toko',
            filter: `id=eq.${params.id}`,
          },
          () => {
            fetchAllData(params.id);
          }
        )
        .subscribe();
    };

    initRealtimeDetail();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
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

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    showToast('ID Toko berhasil disalin ke clipboard!', 'success');
  };

  const fetchAllData = async (tokoId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      
      setCurrentUserId(session.user.id);

      const { data: dataToko, error: errorToko } = await supabase
        .from('toko')
        .select('*, kategori_toko(nama)')
        .eq('id', tokoId)
        .single();

      if (errorToko || !dataToko) {
        showToast('Toko tidak ditemukan.', 'error');
        router.push('/store');
        return;
      }

      const userId = session.user.id;
      let listAnggota = Array.isArray(dataToko.anggota) ? dataToko.anggota : [];
      
      const primaryOwnerId = dataToko.user_id;
      const isPrimaryOwner = primaryOwnerId === userId;
      
      const ownerExists = listAnggota.some((m: any) => m.user_id === primaryOwnerId);
      if (!ownerExists) {
        const { data: ownerProfile } = await supabase
          .from('users')
          .select('nama, email')
          .eq('id', primaryOwnerId)
          .maybeSingle();

        listAnggota.unshift({
          user_id: primaryOwnerId,
          nama: ownerProfile?.nama || 'Pemilik Utama',
          email: ownerProfile?.email || '',
          status: 'pemilik'
        });
      }

      const memberEntry = listAnggota.find((m: any) => m.user_id === userId);
      const isMemberOwner = memberEntry?.status === 'pemilik';
      const isUserOwner = isPrimaryOwner || isMemberOwner;

      setIsOwner(isUserOwner);

      const isApproved = memberEntry?.status === 'tergabung';

      if (!isUserOwner && !isApproved && memberEntry?.status !== 'pending') {
        showToast('Anda tidak memiliki akses ke toko ini.', 'error');
        router.push('/store');
        return;
      }

      setToko({ ...dataToko, anggota: listAnggota });

      // Sinkronisasi data ke state form pengaturan toko
      setStoreSettingsForm({
        telepon: dataToko.telepon || '',
        alamat: dataToko.alamat || '',
        rekening: dataToko.rekening || '',
        metode_pembayaran: dataToko.metode_pembayaran || 'Tunai & Transfer',
      });

      const { data: dataJenis } = await supabase
        .from('jenis_produk')
        .select('*')
        .order('nama', { ascending: true });

      if (dataJenis) setJenisProduks(dataJenis);

      const { data: dataProduk } = await supabase
        .from('produk')
        .select('*, jenis_produk(nama)')
        .eq('toko_id', tokoId)
        .order('created_at', { ascending: false });

      if (dataProduk) setProduks(dataProduk);

    } catch (error: any) {
      console.error('Terjadi kesalahan sistem:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // [FUNGSI KELOLA INFORMASI TOKO]: Menyimpan perubahan telepon, alamat, rekening, dan metode pembayaran
  const handleStoreSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toko) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('toko')
        .update({
          telepon: storeSettingsForm.telepon,
          alamat: storeSettingsForm.alamat,
          rekening: storeSettingsForm.rekening,
          metode_pembayaran: storeSettingsForm.metode_pembayaran,
          updated_at: new Date().toISOString(),
        })
        .eq('id', toko.id);

      if (error) throw error;

      showToast('Informasi detail toko berhasil diperbarui!', 'success');
      setIsStoreSettingsModalOpen(false);
      fetchAllData(toko.id);
    } catch (error: any) {
      showToast('Gagal memperbarui informasi toko: ' + error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // [LOGIKA STATUS ANGGOTA + TOLAK]: Menerima, menolak, ubah jadi pemilik, atau keluar/keluarkan
  const handleUpdateAnggotaStatus = async (targetUserId: string, actionType: string) => {
    if (!toko) return;
    try {
      setIsSubmitting(true);
      setActiveMemberDropdown(null);

      const currentAnggota = Array.isArray(toko.anggota) ? toko.anggota : [];
      let updatedAnggota = [...currentAnggota];

      if (actionType === 'tolak') {
        updatedAnggota = updatedAnggota.filter((m: any) => m.user_id !== targetUserId);
        
        const { error } = await supabase
          .from('toko')
          .update({ anggota: updatedAnggota })
          .eq('id', toko.id);

        if (error) throw error;

        await sendNotification(
          targetUserId,
          'Permintaan Ditolak',
          `Mohon maaf, permintaan Anda untuk bergabung ke toko "${toko.nama}" telah ditolak.`
        );

        showToast('Pengajuan gabung berhasil ditolak.', 'success');
      } else if (actionType === 'keluar' || actionType === 'kick') {
        updatedAnggota = updatedAnggota.filter((m: any) => m.user_id !== targetUserId);

        let updatePayload: any = { anggota: updatedAnggota };
        if (targetUserId === toko.user_id) {
          const remainingOwner = updatedAnggota.find((m: any) => m.status === 'pemilik');
          if (remainingOwner) {
            updatePayload.user_id = remainingOwner.user_id;
          } else if (updatedAnggota.length > 0) {
            updatePayload.user_id = updatedAnggota[0].user_id;
            updatedAnggota[0].status = 'pemilik';
          }
        }

        const { error } = await supabase
          .from('toko')
          .update(updatePayload)
          .eq('id', toko.id);

        if (error) throw error;

        if (actionType === 'kick') {
          await sendNotification(
            targetUserId,
            'Dikeluarkan dari Toko',
            `Anda telah dikeluarkan dari toko "${toko.nama}".`
          );
        }

        showToast(actionType === 'keluar' ? 'Anda berhasil keluar dari toko.' : 'Anggota berhasil dikeluarkan.', 'success');
      } else {
        updatedAnggota = updatedAnggota.map((m: any) => {
          if (m.user_id === targetUserId) {
            return { ...m, status: actionType };
          }
          return m;
        });

        const { error } = await supabase
          .from('toko')
          .update({ anggota: updatedAnggota })
          .eq('id', toko.id);

        if (error) throw error;

        if (actionType === 'tergabung') {
          await sendNotification(
            targetUserId,
            'Bergabung Diterima',
            `Permintaan Anda untuk bergabung ke toko "${toko.nama}" telah disetujui!`
          );
        } else if (actionType === 'pemilik') {
          await sendNotification(
            targetUserId,
            'Hak Akses Diperbarui',
            `Anda sekarang telah diangkat menjadi Pemilik di toko "${toko.nama}".`
          );
        }

        showToast(
          actionType === 'pemilik' 
            ? 'Anggota berhasil diubah menjadi Pemilik toko!' 
            : 'Status anggota berhasil diperbarui menjadi Tergabung!', 
          'success'
        );
      }

      if (actionType === 'keluar' || (actionType === 'kick' && targetUserId === currentUserId)) {
        router.push('/store');
      } else {
        fetchAllData(toko.id);
      }
    } catch (error: any) {
      showToast('Gagal memperbarui status anggota: ' + error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProductFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProductFormData((prev) => ({
        ...prev,
        fileFoto: file,
        previewFoto: URL.createObjectURL(file),
      }));
    }
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setEditProductId(null);
    setProductFormData({
      nama: '',
      jenis_produk_id: '',
      harga: '',
      fileFoto: null,
      previewFoto: '',
    });
  };

  const openEditProductModal = (produk: Produk) => {
    setEditProductId(produk.id);
    setProductFormData({
      nama: produk.nama,
      jenis_produk_id: produk.jenis_produk_id,
      harga: produk.harga.toString(),
      fileFoto: null,
      previewFoto: produk.foto || '',
    });
    setIsProductModalOpen(true);
    setActiveDropdown(null);
  };

  const openDeleteModal = (produk: Produk) => {
    setProductToDelete(produk);
    setDeleteInputName('');
    setIsDeleteModalOpen(true);
    setActiveDropdown(null);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setProductToDelete(null);
    setDeleteInputName('');
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!productFormData.nama || !productFormData.jenis_produk_id || !productFormData.harga) {
      showToast('Nama, Jenis, dan Harga produk wajib diisi!', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      let fotoUrl = productFormData.previewFoto;

      if (productFormData.fileFoto) {
        const fileExt = productFormData.fileFoto.name.split('.').pop();
        const fileName = `prod-${Date.now()}.${fileExt}`;
        const filePath = `public/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('foto-produk')
          .upload(filePath, productFormData.fileFoto);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('foto-produk')
          .getPublicUrl(filePath);

        fotoUrl = publicUrlData.publicUrl;
      }

      const hargaNumber = parseFloat(productFormData.harga);

      if (editProductId) {
        const { error } = await supabase
          .from('produk')
          .update({
            nama: productFormData.nama,
            jenis_produk_id: productFormData.jenis_produk_id,
            harga: hargaNumber,
            foto: fotoUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editProductId);

        if (error) throw error;
        showToast('Data produk berhasil diperbarui!', 'success');
      } else {
        const { error } = await supabase
          .from('produk')
          .insert({
            toko_id: toko?.id,
            jenis_produk_id: productFormData.jenis_produk_id,
            nama: productFormData.nama,
            harga: hargaNumber,
            foto: fotoUrl,
          });

        if (error) throw error;
        showToast('Produk baru berhasil ditambahkan!', 'success');
      }

      closeProductModal();
      if (toko?.id) fetchAllData(toko.id); 
    } catch (error: any) {
      showToast('Gagal menyimpan produk: ' + error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from('produk')
        .delete()
        .eq('id', productToDelete.id);

      if (error) throw error;
      
      closeDeleteModal();
      if (toko?.id) fetchAllData(toko.id);
      showToast('Produk berhasil dihapus secara permanen!', 'success');
    } catch (error: any) {
      showToast('Gagal menghapus produk: ' + error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 flex flex-col items-center justify-center min-h-[400px]">
        <i className="fa-solid fa-circle-notch fa-spin text-4xl text-orange-600 mb-4"></i>
        <p className="text-gray-500 font-medium">Memuat detail dan produk toko...</p>
      </div>
    );
  }

  if (!toko) {
    return null;
  }

  const listAnggota = Array.isArray(toko.anggota) ? toko.anggota : [];

  return (
    <div className="space-y-6 relative p-0.5 sm:p-6">
      
      {(activeDropdown || activeMemberDropdown) && (
        <div 
          className="fixed inset-0 z-[5]" 
          onClick={() => {
            setActiveDropdown(null);
            setActiveMemberDropdown(null);
          }}
        />
      )}

      {/* Bagian Detail Toko */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-200 flex items-center justify-between bg-orange-50/30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/store')}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-orange-100 hover:text-orange-700 transition-colors"
              title="Kembali ke Daftar Toko"
            >
              <i className="fa-solid fa-arrow-left"></i>
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-amber-900">Detail Toko</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Tombol Pengaturan Informasi Toko (Hanya muncul jika user adalah pemilik) */}
            {isOwner && (
              <button
                onClick={() => setIsStoreSettingsModalOpen(true)}
                className="flex items-center gap-1.5 bg-amber-800 hover:bg-amber-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-sm"
              >
                <i className="fa-solid fa-gear"></i>
                <span className="hidden sm:inline">Pengaturan Toko</span>
              </button>
            )}
            <span className="bg-orange-100 text-orange-800 px-3 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold tracking-wide">
              {toko.kategori_toko?.nama || 'Tanpa Kategori'}
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-6 md:p-8 flex flex-col md:flex-row gap-6 sm:gap-8">
          <div className="w-full md:w-1/3 flex-shrink-0">
            <div className="aspect-square rounded-2xl overflow-hidden border-2 border-gray-100 shadow-sm bg-gray-50 flex items-center justify-center cursor-pointer" onClick={() => toko.foto && setPreviewImageUrl(toko.foto)}>
              {toko.foto ? (
                <img src={toko.foto} alt={toko.nama} className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-gray-400">
                  <i className="fa-solid fa-store text-5xl sm:text-6xl mb-2 sm:mb-3"></i>
                  <p className="text-xs sm:text-sm font-medium">Tidak ada foto</p>
                </div>
              )}
            </div>
          </div>

          <div className="w-full md:w-2/3 flex flex-col">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">{toko.nama}</h2>
            <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 flex items-center gap-2">
              <i className="fa-regular fa-calendar-days"></i>
              Terdaftar pada {new Date(toko.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>

            <div className="space-y-3 sm:space-y-4">
              <div className="p-3.5 sm:p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 sm:mb-2">Deskripsi Toko</p>
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {toko.deskripsi ? toko.deskripsi : <span className="italic text-gray-400">Tidak ada deskripsi yang ditambahkan.</span>}
                </p>
              </div>

              {/* [INFORMASI TAMBAHAN TOKO]: Menampilkan Nomor Telepon, Alamat, Rekening, dan Metode Pembayaran */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3.5 sm:p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Nomor Telepon</p>
                  <p className="text-xs sm:text-sm font-medium text-gray-900 flex items-center gap-2">
                    <i className="fa-solid fa-phone text-orange-600"></i>
                    {toko.telepon ? toko.telepon : <span className="italic text-gray-400">Belum diatur</span>}
                  </p>
                </div>

                <div className="p-3.5 sm:p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Metode Pembayaran</p>
                  <p className="text-xs sm:text-sm font-medium text-gray-900 flex items-center gap-2">
                    <i className="fa-solid fa-wallet text-orange-600"></i>
                    {toko.metode_pembayaran ? toko.metode_pembayaran : <span className="italic text-gray-400">Tunai & Transfer</span>}
                  </p>
                </div>

                <div className="p-3.5 sm:p-4 bg-gray-50 rounded-xl border border-gray-100 md:col-span-2">
                  <p className="text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Alamat Lengkap</p>
                  <p className="text-xs sm:text-sm font-medium text-gray-900 flex items-start gap-2">
                    <i className="fa-solid fa-location-dot text-orange-600 mt-0.5"></i>
                    <span>{toko.alamat ? toko.alamat : <span className="italic text-gray-400">Belum diatur</span>}</span>
                  </p>
                </div>

                <div className="p-3.5 sm:p-4 bg-gray-50 rounded-xl border border-gray-100 md:col-span-2">
                  <p className="text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Rekening Pembayaran (Transfer)</p>
                  <p className="text-xs sm:text-sm font-medium text-gray-900 flex items-start gap-2">
                    <i className="fa-solid fa-credit-card text-orange-600 mt-0.5"></i>
                    <span className="whitespace-pre-wrap">{toko.rekening ? toko.rekening : <span className="italic text-gray-400">Belum ada informasi rekening.</span>}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3.5 sm:p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Kategori Utama</p>
                  <p className="text-sm sm:text-base font-medium text-gray-900">{toko.kategori_toko?.nama || '-'}</p>
                </div>
                <div className="p-3.5 sm:p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between gap-2">
                  <div className="overflow-hidden">
                    <p className="text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">ID Toko</p>
                    <p className="text-xs sm:text-sm font-mono text-gray-600 truncate">{toko.id}</p>
                  </div>
                  <button
                    onClick={() => handleCopyId(toko.id)}
                    className="flex-shrink-0 bg-amber-800 hover:bg-amber-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-sm flex items-center gap-1.5"
                    title="Salin ID Toko"
                  >
                    <i className="fa-regular fa-copy"></i>
                    <span>Salin</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bagian Produk Toko */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex justify-between items-center mb-4 sm:mb-6 border-b border-gray-100 pb-3.5 sm:pb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-amber-900">Produk Toko</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Kelola barang yang dijual di toko ini.</p>
          </div>
          <button
            onClick={() => setIsProductModalOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 bg-orange-600 hover:bg-orange-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors shadow-sm"
          >
            <i className="fa-solid fa-plus"></i>
            <span>Tambah Produk</span>
          </button>
        </div>

        {produks.length === 0 ? (
          <div className="text-center py-10 sm:py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-xs sm:text-sm">
            <i className="fa-solid fa-box-open text-3xl sm:text-4xl mb-2 sm:mb-3 text-gray-400"></i>
            <p>Toko ini belum memiliki produk. Silakan tambahkan produk baru.</p>
          </div>
        ) : (
          <>
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6">
              {produks.map((produk) => (
                <div key={produk.id} className="relative bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all group flex flex-col overflow-hidden">
                  
                  <div className="absolute top-3 right-3 z-10">
                    <div className="relative inline-block text-left">
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === produk.id ? null : produk.id)}
                        className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm text-gray-600 hover:bg-orange-100 hover:text-orange-700 flex items-center justify-center transition-colors shadow-sm border border-gray-100"
                      >
                        <i className="fa-solid fa-ellipsis-vertical"></i>
                      </button>

                      {activeDropdown === produk.id && (
                        <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg border border-gray-200 z-20 py-1">
                          <button
                            onClick={() => openEditProductModal(produk)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 flex items-center gap-2 transition-colors"
                          >
                            <i className="fa-solid fa-pen-to-square w-4"></i> Edit
                          </button>
                          <button
                            onClick={() => openDeleteModal(produk)}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                          >
                            <i className="fa-solid fa-trash w-4"></i> Hapus
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="h-48 w-full bg-gray-100 flex-shrink-0 relative cursor-pointer" onClick={() => produk.foto && setPreviewImageUrl(produk.foto)}>
                    {produk.foto ? (
                      <img src={produk.foto} alt={produk.nama} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <i className="fa-solid fa-box text-5xl"></i>
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 bg-amber-900/90 backdrop-blur-sm text-white px-3 py-1 rounded-lg font-bold shadow-sm text-sm">
                      {formatRupiah(produk.harga)}
                    </div>
                  </div>
                  
                  <div className="p-5 flex flex-col flex-grow">
                    <span className="w-fit bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-2">
                      {produk.jenis_produk?.nama || 'Tanpa Jenis'}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">
                      {produk.nama}
                    </h3>
                  </div>
                </div>
              ))}
            </div>

            <div className="md:hidden divide-y divide-gray-100">
              {produks.map((produk) => (
                <div key={produk.id} className="py-3 flex items-center justify-between gap-3 relative">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-14 h-14 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden cursor-pointer border border-gray-200" onClick={() => produk.foto && setPreviewImageUrl(produk.foto)}>
                      {produk.foto ? (
                        <img src={produk.foto} alt={produk.nama} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <i className="fa-solid fa-box text-lg"></i>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col truncate">
                      <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded w-fit mb-1">
                        {produk.jenis_produk?.nama || 'Tanpa Jenis'}
                      </span>
                      <h4 className="font-bold text-gray-900 text-xs sm:text-sm truncate">{produk.nama}</h4>
                      <span className="text-xs font-semibold text-amber-900 mt-0.5">{formatRupiah(produk.harga)}</span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 relative">
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === produk.id ? null : produk.id)}
                      className="w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 flex items-center justify-center transition-colors"
                    >
                      <i className="fa-solid fa-ellipsis-vertical"></i>
                    </button>

                    {activeDropdown === produk.id && (
                      <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg border border-gray-200 z-20 py-1">
                        <button
                          onClick={() => openEditProductModal(produk)}
                          className="w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 flex items-center gap-2 transition-colors"
                        >
                          <i className="fa-solid fa-pen-to-square w-4"></i> Edit
                        </button>
                        <button
                          onClick={() => openDeleteModal(produk)}
                          className="w-full text-left px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                        >
                          <i className="fa-solid fa-trash w-4"></i> Hapus
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Panel Daftar Anggota di Bagian Bawah Detail Toko */}
      {isOwner && (
        <div className="bg-amber-50/60 rounded-xl shadow-sm border border-amber-200">
          <button
            onClick={() => setIsMemberListOpen(!isMemberListOpen)}
            className="w-full px-4 sm:px-6 py-3.5 flex items-center justify-between text-left font-bold text-amber-900 bg-amber-100/50 hover:bg-amber-100 transition-colors text-xs sm:text-sm rounded-xl"
          >
            <span className="flex items-center gap-2">
              <i className="fa-solid fa-users text-amber-800"></i> 
              Daftar Anggota & Pengajuan Toko ({listAnggota.length})
            </span>
            <i className={`fa-solid fa-chevron-down transition-transform ${isMemberListOpen ? 'rotate-180' : ''}`}></i>
          </button>

          {isMemberListOpen && (
            <div className="p-4 sm:p-6 divide-y divide-amber-100 overflow-visible">
              {listAnggota.length === 0 ? (
                <p className="text-xs sm:text-sm text-gray-500 italic py-2">Belum ada anggota lain di toko ini.</p>
              ) : (
                listAnggota.map((item: any) => {
                  const isMe = item.user_id === currentUserId;
                  const isItemOwner = item.status === 'pemilik';

                  return (
                    <div key={item.user_id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative">
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-gray-900 text-xs sm:text-sm">{item.nama || 'Pengguna'}</h4>
                        <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">{item.email || 'Email tidak tersedia'}</p>
                        <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
                          item.status === 'pemilik' 
                            ? 'bg-amber-800 text-white' 
                            : item.status === 'tergabung' 
                            ? 'bg-orange-600 text-white' 
                            : 'bg-yellow-500 text-white'
                        }`}>
                          {item.status === 'pemilik' ? 'pemilik' : item.status}
                        </span>
                      </div>

                      <div className="relative inline-block text-left self-end sm:self-center z-30">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMemberDropdown(activeMemberDropdown === item.user_id ? null : item.user_id);
                          }}
                          className="w-8 h-8 rounded-full bg-white text-gray-600 hover:bg-orange-100 hover:text-orange-700 flex items-center justify-center transition-colors shadow-sm border border-gray-200"
                          title="Aksi Anggota"
                        >
                          <i className="fa-solid fa-ellipsis-vertical"></i>
                        </button>

                        {activeMemberDropdown === item.user_id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-xl border border-gray-200 z-50 py-1">
                            {item.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleUpdateAnggotaStatus(item.user_id, 'tergabung')}
                                  className="w-full text-left px-4 py-2 text-xs sm:text-sm text-green-700 hover:bg-green-50 flex items-center gap-2 transition-colors font-medium"
                                >
                                  <i className="fa-solid fa-check w-4"></i> Terima
                                </button>
                                <button
                                  onClick={() => handleUpdateAnggotaStatus(item.user_id, 'tolak')}
                                  className="w-full text-left px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors font-medium"
                                >
                                  <i className="fa-solid fa-xmark w-4"></i> Tolak
                                </button>
                              </>
                            )}
                            {!isItemOwner && (
                              <button
                                onClick={() => handleUpdateAnggotaStatus(item.user_id, 'pemilik')}
                                className="w-full text-left px-4 py-2 text-xs sm:text-sm text-amber-800 hover:bg-amber-50 flex items-center gap-2 transition-colors font-medium"
                              >
                                <i className="fa-solid fa-user-shield w-4"></i> Ubah Jadi Pemilik
                              </button>
                            )}
                            {(!isItemOwner || !isMe) && (
                              <button
                                onClick={() => handleUpdateAnggotaStatus(item.user_id, isMe && !isItemOwner ? 'keluar' : 'kick')}
                                className="w-full text-left px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors font-medium"
                              >
                                <i className="fa-solid fa-user-slash w-4"></i> {isMe && !isItemOwner ? 'Keluar' : 'Keluarkan'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* [MODAL PENGATURAN TOKO]: Form untuk mengatur nomor telepon, alamat, rekening, dan metode pembayaran */}
      {isStoreSettingsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-200">
              <h2 className="text-base sm:text-lg font-bold text-amber-900">Pengaturan Informasi Toko</h2>
              <button onClick={() => setIsStoreSettingsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <i className="fa-solid fa-xmark text-lg sm:text-xl"></i>
              </button>
            </div>
            
            <div className="overflow-y-auto">
              <form onSubmit={handleStoreSettingsSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Nomor Telepon / WhatsApp</label>
                  <input
                    type="text"
                    value={storeSettingsForm.telepon}
                    onChange={(e) => setStoreSettingsForm({ ...storeSettingsForm, telepon: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-xs sm:text-sm transition-all text-gray-900 bg-white"
                    placeholder="Contoh: 081234567890"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Metode Pembayaran</label>
                  <select
                    value={storeSettingsForm.metode_pembayaran}
                    onChange={(e) => setStoreSettingsForm({ ...storeSettingsForm, metode_pembayaran: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-xs sm:text-sm transition-all text-gray-900 bg-white"
                  >
                    <option value="Tunai (Cash)">Tunai (Cash)</option>
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="Tunai & Transfer">Tunai & Transfer (Keduanya)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Alamat Lengkap Toko</label>
                  <textarea
                    rows={2}
                    value={storeSettingsForm.alamat}
                    onChange={(e) => setStoreSettingsForm({ ...storeSettingsForm, alamat: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-xs sm:text-sm transition-all resize-none text-gray-900 bg-white"
                    placeholder="Tuliskan alamat lengkap..."
                  ></textarea>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Rekening Pembayaran (Untuk Transfer)</label>
                  <textarea
                    rows={3}
                    value={storeSettingsForm.rekening}
                    onChange={(e) => setStoreSettingsForm({ ...storeSettingsForm, rekening: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-xs sm:text-sm transition-all resize-none text-gray-900 bg-white font-mono"
                    placeholder="Contoh: BCA 1234567890 a.n Nama Pemilik"
                  ></textarea>
                </div>

                <div className="pt-3 sm:pt-4 flex justify-end gap-2 sm:gap-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsStoreSettingsModalOpen(false)}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    disabled={isSubmitting}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-amber-800 hover:bg-amber-900 rounded-lg transition-colors flex items-center gap-1.5 sm:gap-2 shadow-sm"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <><i className="fa-solid fa-circle-notch fa-spin"></i> Menyimpan...</>
                    ) : (
                      <><i className="fa-solid fa-save"></i> Simpan Pengaturan</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah/Edit Produk */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-200">
              <h2 className="text-base sm:text-lg font-bold text-amber-900">
                {editProductId ? 'Edit Produk' : 'Tambah Produk Baru'}
              </h2>
              <button onClick={closeProductModal} className="text-gray-400 hover:text-red-500 transition-colors">
                <i className="fa-solid fa-xmark text-lg sm:text-xl"></i>
              </button>
            </div>
            
            <div className="overflow-y-auto">
              <form onSubmit={handleProductSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Nama Produk</label>
                  <input
                    type="text"
                    name="nama"
                    value={productFormData.nama}
                    onChange={handleInputChange}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-xs sm:text-sm transition-all text-gray-900 bg-white"
                    placeholder="Contoh: Baju Kaos Hitam"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Jenis Produk</label>
                  <select
                    name="jenis_produk_id"
                    value={productFormData.jenis_produk_id}
                    onChange={handleInputChange}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-xs sm:text-sm transition-all text-gray-900 bg-white"
                    required
                  >
                    <option value="" disabled>-- Pilih Jenis --</option>
                    {jenisProduks.map((jenis) => (
                      <option key={jenis.id} value={jenis.id}>
                        {jenis.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Harga Produk (Rp)</label>
                  <input
                    type="number"
                    name="harga"
                    min="0"
                    value={productFormData.harga}
                    onChange={handleInputChange}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-xs sm:text-sm transition-all text-gray-900 bg-white"
                    placeholder="Contoh: 50000"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Foto Produk</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full text-xs sm:text-sm text-gray-500 file:mr-3 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-3 sm:file:px-4 file:rounded-lg file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 transition-colors"
                  />
                  {productFormData.previewFoto && (
                    <div className="mt-3">
                      <img
                        src={productFormData.previewFoto}
                        alt="Pratinjau"
                        className="w-full h-28 sm:h-32 object-cover rounded-lg border border-gray-200 shadow-sm"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-3 sm:pt-4 flex justify-end gap-2 sm:gap-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={closeProductModal}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    disabled={isSubmitting}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors flex items-center gap-1.5 sm:gap-2 shadow-sm"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <><i className="fa-solid fa-circle-notch fa-spin"></i> Menyimpan...</>
                    ) : (
                      <><i className="fa-solid fa-save"></i> Simpan Data</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hapus Produk */}
      {isDeleteModalOpen && productToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-4 sm:p-6 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3 sm:mb-4 text-red-600">
                <i className="fa-solid fa-triangle-exclamation text-2xl sm:text-3xl"></i>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1.5 sm:mb-2">Hapus Produk</h3>
              <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                Tindakan ini permanen. Ketik <span className="font-bold text-gray-800">"{productToDelete.nama}"</span> di bawah ini untuk melanjutkan.
              </p>
              <input
                type="text"
                value={deleteInputName}
                onChange={(e) => setDeleteInputName(e.target.value)}
                placeholder="Ketik nama produk..."
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-xs sm:text-sm transition-all mb-4 sm:mb-6 text-center text-gray-900 bg-white"
              />
              
              <div className="flex gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={executeDeleteProduct}
                  disabled={isSubmitting || deleteInputName !== productToDelete.nama}
                  className={`flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 sm:gap-2 ${
                    deleteInputName === productToDelete.nama 
                      ? 'bg-red-600 hover:bg-red-700 shadow-sm' 
                      : 'bg-red-300 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                  ) : (
                    'Hapus Permanen'
                  )}
                </button>
              </div>
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
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-gray-700"
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