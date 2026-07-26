// app/(dashboard)/store/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { sendNotification } from '@/utils/notificationHelper';

interface Kategori {
  id: string;
  nama: string;
}

interface Toko {
  id: string;
  user_id: string;
  kategori_id: string;
  nama: string;
  deskripsi?: string | null;
  foto: string | null;
  anggota?: any[]; 
  kategori_toko?: {
    nama: string;
  };
  status_keanggotaan?: string;
}

export default function StorePage() {
  const supabase = createClient();
  
  const [tokos, setTokos] = useState<Toko[]>([]);
  const [kategoris, setKategoris] = useState<Kategori[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [tokoToDelete, setTokoToDelete] = useState<Toko | null>(null);
  const [deleteInputName, setDeleteInputName] = useState<string>('');
  
  const [isJoinModalOpen, setIsJoinModalOpen] = useState<boolean>(false);
  const [joinStoreId, setJoinStoreId] = useState<string>('');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [formData, setFormData] = useState({
    nama: '',
    deskripsi: '',
    kategori_id: '',
    fileFoto: null as File | null,
    previewFoto: '' as string,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: dataKategori, error: errorKategori } = await supabase
        .from('kategori_toko')
        .select('*')
        .order('nama', { ascending: true });

      if (errorKategori) {
        console.error('Gagal memuat kategori:', errorKategori.message);
      } else if (dataKategori) {
        setKategoris(dataKategori);
      }

      let { data: dataToko, error: errorToko } = await supabase
        .from('toko')
        .select('*, kategori_toko(nama)')
        .order('created_at', { ascending: false });

      if (errorToko) {
        console.error('Gagal memuat toko:', errorToko.message);
      } else if (dataToko) {
        const userId = session.user.id;

        const mappedTokos = dataToko
          .map((toko: any) => {
            const listAnggota = Array.isArray(toko.anggota) ? toko.anggota : [];
            const isPrimaryOwner = toko.user_id === userId;
            const foundMember = listAnggota.find((m: any) => m.user_id === userId);

            let status = 'pending';
            if (isPrimaryOwner || foundMember?.status === 'pemilik') {
              status = 'pemilik';
            } else if (foundMember?.status === 'tergabung') {
              status = 'tergabung';
            } else if (foundMember?.status === 'pending') {
              status = 'pending';
            } else if (!isPrimaryOwner && !foundMember) {
              return null;
            }

            return { ...toko, status_keanggotaan: status, anggota: listAnggota };
          })
          .filter(Boolean);

        setTokos(mappedTokos);
      }
    } catch (error: any) {
      console.error('Terjadi kesalahan sistem:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData((prev) => ({
        ...prev,
        fileFoto: file,
        previewFoto: URL.createObjectURL(file),
      }));
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    setFormData({
      nama: '',
      deskripsi: '',
      kategori_id: '',
      fileFoto: null,
      previewFoto: '',
    });
  };

  const openEditModal = (toko: Toko) => {
    setEditId(toko.id);
    setFormData({
      nama: toko.nama,
      deskripsi: toko.deskripsi || '',
      kategori_id: toko.kategori_id,
      fileFoto: null,
      previewFoto: toko.foto || '',
    });
    setIsModalOpen(true);
    setActiveDropdown(null); 
  };

  const openDeleteModal = (toko: Toko) => {
    setTokoToDelete(toko);
    setDeleteInputName(''); 
    setIsDeleteModalOpen(true);
    setActiveDropdown(null); 
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setTokoToDelete(null);
    setDeleteInputName('');
  };

  const handleJoinStore = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanStoreId = joinStoreId.trim();
    if (!cleanStoreId) {
      showToast('ID Toko wajib diisi!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Anda harus login terlebih dahulu.');

      const { data: targetToko, error: findError } = await supabase
        .from('toko')
        .select('id, nama, user_id, anggota')
        .eq('id', cleanStoreId)
        .maybeSingle();

      if (findError || !targetToko) {
        throw new Error('Toko dengan ID tersebut tidak ditemukan di database.');
      }

      if (targetToko.user_id === session.user.id) {
        throw new Error('Anda adalah pemilik utama toko ini.');
      }

      const currentAnggota = Array.isArray(targetToko.anggota) ? targetToko.anggota : [];
      const alreadyExists = currentAnggota.some((m: any) => m.user_id === session.user.id);
      
      if (alreadyExists) {
        throw new Error('Anda sudah mengajukan permintaan atau tergabung di toko ini.');
      }

      const { data: userData } = await supabase
        .from('users')
        .select('nama, email')
        .eq('id', session.user.id)
        .maybeSingle();

      const userName = userData?.nama || session.user.user_metadata?.name || 'Pengguna';
      const userEmail = userData?.email || session.user.email || '';

      const newMember = {
        user_id: session.user.id,
        nama: userName,
        email: userEmail,
        status: 'pending'
      };

      const updatedAnggota = [...currentAnggota, newMember];

      const { error: updateError } = await supabase
        .from('toko')
        .update({ anggota: updatedAnggota })
        .eq('id', targetToko.id);

      if (updateError) throw updateError;

      // Kirim notifikasi real-time ke pemilik toko
      await sendNotification(
        targetToko.user_id,
        'Permintaan Gabung Toko',
        `Pengguna "${userName}" (${userEmail}) meminta untuk bergabung ke toko "${targetToko.nama}".`
      );

      showToast(`Permintaan gabung ke toko "${targetToko.nama}" dikirim (Status: Pending)!`, 'success');
      setIsJoinModalOpen(false);
      setJoinStoreId('');
      fetchData();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nama || !formData.kategori_id) {
      showToast('Nama dan Kategori wajib diisi!', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Anda harus login terlebih dahulu.');

      let fotoUrl = formData.previewFoto;

      if (formData.fileFoto) {
        const fileExt = formData.fileFoto.name.split('.').pop();
        const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
        const filePath = `public/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('foto-toko')
          .upload(filePath, formData.fileFoto);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('foto-toko')
          .getPublicUrl(filePath);

        fotoUrl = publicUrlData.publicUrl;
      }

      if (editId) {
        const { error } = await supabase
          .from('toko')
          .update({
            nama: formData.nama,
            deskripsi: formData.deskripsi,
            kategori_id: formData.kategori_id,
            foto: fotoUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editId);

        if (error) throw error;
        showToast('Data toko berhasil diperbarui!', 'success');
      } else {
        const { error } = await supabase
          .from('toko')
          .insert({
            user_id: session.user.id,
            kategori_id: formData.kategori_id,
            nama: formData.nama,
            deskripsi: formData.deskripsi,
            foto: fotoUrl,
            anggota: []
          });

        if (error) throw error;
        showToast('Toko baru berhasil ditambahkan!', 'success');
      }

      closeModal();
      fetchData(); 
    } catch (error: any) {
      showToast('Gagal menyimpan data: ' + error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeDelete = async () => {
    if (!tokoToDelete) return;

    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from('toko')
        .delete()
        .eq('id', tokoToDelete.id);

      if (error) throw error;
      
      closeDeleteModal();
      fetchData();
      showToast('Data toko berhasil dihapus secara permanen!', 'success');
    } catch (error: any) {
      showToast('Gagal menghapus data: ' + error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-0.5 sm:p-6 relative">
      
      {activeDropdown && (
        <div 
          className="fixed inset-0 z-[5]" 
          onClick={() => setActiveDropdown(null)}
        />
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6 px-2 sm:px-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-amber-900">Manajemen Toko (Store)</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Kelola data toko dan kategori Anda di sini.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsJoinModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-amber-800 hover:bg-amber-900 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors shadow-sm"
          >
            <i className="fa-solid fa-right-to-bracket"></i>
            <span>Gabung Toko</span>
          </button>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors shadow-sm"
          >
            <i className="fa-solid fa-plus"></i>
            <span>Tambah Toko</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">
          <i className="fa-solid fa-circle-notch fa-spin text-2xl sm:text-3xl mb-2 sm:mb-3 block text-orange-600"></i>
          Memuat data toko...
        </div>
      ) : tokos.length === 0 ? (
        <div className="text-center py-10 sm:py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-xs sm:text-sm mx-2 sm:mx-0">
          <i className="fa-solid fa-store-slash text-3xl sm:text-4xl mb-2 sm:mb-3 text-gray-400"></i>
          <p>Belum ada data toko. Silakan tambahkan toko baru atau gabung ke toko lain.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 px-2 sm:px-0">
          {tokos.map((toko) => {
            const isPending = toko.status_keanggotaan === 'pending';
            
            return (
              <div key={toko.id} className="relative bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-orange-200 transition-all group flex flex-col overflow-hidden">
                
                <div className="absolute top-3 left-3 z-10">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                    toko.status_keanggotaan === 'pemilik' 
                      ? 'bg-amber-800 text-white' 
                      : toko.status_keanggotaan === 'tergabung' 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-yellow-500 text-white'
                  }`}>
                    {toko.status_keanggotaan === 'pemilik' ? 'toko/store saya' : toko.status_keanggotaan}
                  </span>
                </div>

                {toko.status_keanggotaan === 'pemilik' && (
                  <div className="absolute top-3 right-3 z-10">
                    <div className="relative inline-block text-left">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setActiveDropdown(activeDropdown === toko.id ? null : toko.id);
                        }}
                        className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm text-gray-600 hover:bg-orange-100 hover:text-orange-700 flex items-center justify-center transition-colors shadow-sm border border-gray-100"
                        title="Aksi"
                      >
                        <i className="fa-solid fa-ellipsis-vertical"></i>
                      </button>

                      {activeDropdown === toko.id && (
                        <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg border border-gray-200 z-20 py-1">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openEditModal(toko);
                            }}
                            className="w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 flex items-center gap-2 transition-colors"
                          >
                            <i className="fa-solid fa-pen-to-square w-4"></i> Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openDeleteModal(toko);
                            }}
                            className="w-full text-left px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                          >
                            <i className="fa-solid fa-trash w-4"></i> Hapus
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isPending ? (
                  <div className="flex flex-col flex-grow cursor-not-allowed opacity-75">
                    <div className="h-44 sm:h-48 w-full bg-gray-100 flex-shrink-0 relative">
                      {toko.foto ? (
                        <img src={toko.foto} alt={toko.nama} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <i className="fa-solid fa-image text-4xl sm:text-5xl"></i>
                        </div>
                      )}
                    </div>
                    <div className="p-4 sm:p-5 flex flex-col flex-grow">
                      <div className="flex flex-col gap-1 mb-2 sm:mb-3">
                        <span className="w-fit bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                          {toko.kategori_toko?.nama || 'Tanpa Kategori'}
                        </span>
                        <h3 className="text-base sm:text-lg font-bold text-amber-900 line-clamp-1">
                          {toko.nama}
                        </h3>
                      </div>
                      <p className="text-xs sm:text-sm text-yellow-600 font-medium italic mb-2">
                        Menunggu persetujuan pemilik toko...
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 line-clamp-2 leading-relaxed">
                        {toko.deskripsi ? toko.deskripsi : <span className="italic">Tidak ada deskripsi.</span>}
                      </p>
                    </div>
                  </div>
                ) : (
                  <Link href={`/store/${toko.id}`} className="flex flex-col flex-grow outline-none focus:ring-2 focus:ring-orange-500 rounded-xl">
                    <div className="h-44 sm:h-48 w-full bg-gray-100 flex-shrink-0 relative">
                      {toko.foto ? (
                        <img src={toko.foto} alt={toko.nama} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <i className="fa-solid fa-image text-4xl sm:text-5xl"></i>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4 sm:p-5 flex flex-col flex-grow">
                      <div className="flex flex-col gap-1 mb-2 sm:mb-3">
                        <span className="w-fit bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                          {toko.kategori_toko?.nama || 'Tanpa Kategori'}
                        </span>
                        <h3 className="text-base sm:text-lg font-bold text-amber-900 group-hover:text-orange-700 transition-colors line-clamp-1">
                          {toko.nama}
                        </h3>
                      </div>
                      
                      <p className="text-xs sm:text-sm text-gray-500 line-clamp-3 leading-relaxed">
                        {toko.deskripsi ? toko.deskripsi : <span className="italic">Tidak ada deskripsi.</span>}
                      </p>
                    </div>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <h2 className="text-base sm:text-lg font-bold text-amber-900">
                {editId ? 'Edit Data Toko' : 'Tambah Toko Baru'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-red-500 transition-colors">
                <i className="fa-solid fa-xmark text-lg sm:text-xl"></i>
              </button>
            </div>
            
            <div className="overflow-y-auto">
              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Nama Toko</label>
                  <input
                    type="text"
                    name="nama"
                    value={formData.nama}
                    onChange={handleInputChange}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-xs sm:text-sm transition-all"
                    placeholder="Masukkan nama toko"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Kategori Toko</label>
                  <select
                    name="kategori_id"
                    value={formData.kategori_id}
                    onChange={handleInputChange}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-xs sm:text-sm transition-all bg-white"
                    required
                  >
                    <option value="" disabled>-- Pilih Kategori --</option>
                    {kategoris.map((kategori) => (
                      <option key={kategori.id} value={kategori.id}>
                        {kategori.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Deskripsi Toko (Opsional)</label>
                  <textarea
                    name="deskripsi"
                    value={formData.deskripsi}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-xs sm:text-sm transition-all resize-none"
                    placeholder="Tuliskan deksripsi singkat toko..."
                  ></textarea>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Foto Toko</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full text-xs sm:text-sm text-gray-500 file:mr-3 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-3 sm:file:px-4 file:rounded-lg file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 transition-colors"
                  />
                  {formData.previewFoto && (
                    <div className="mt-3">
                      <img
                        src={formData.previewFoto}
                        alt="Pratinjau"
                        className="w-full h-28 sm:h-32 object-cover rounded-lg border border-gray-200 shadow-sm"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-3 sm:pt-4 flex justify-end gap-2 sm:gap-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={closeModal}
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

      {isJoinModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <h2 className="text-base sm:text-lg font-bold text-amber-900">Gabung ke Toko</h2>
              <button onClick={() => setIsJoinModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <i className="fa-solid fa-xmark text-lg sm:text-xl"></i>
              </button>
            </div>
            
            <form onSubmit={handleJoinStore} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">ID Toko (UUID)</label>
                <input
                  type="text"
                  value={joinStoreId}
                  onChange={(e) => setJoinStoreId(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-800 focus:border-amber-800 outline-none transition-all font-mono text-xs sm:text-sm"
                  placeholder="Masukkan ID unik toko..."
                  required
                />
                <p className="text-[11px] sm:text-xs text-gray-500 mt-1">Anda bisa mendapatkan ID toko dari pemilik toko terkait.</p>
              </div>

              <div className="pt-2 flex justify-end gap-2 sm:gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
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
                    <><i className="fa-solid fa-circle-notch fa-spin"></i> Memproses...</>
                  ) : (
                    <><i className="fa-solid fa-right-to-bracket"></i> Gabung Toko</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && tokoToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-4 sm:p-6 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3 sm:mb-4 text-red-600">
                <i className="fa-solid fa-triangle-exclamation text-2xl sm:text-3xl"></i>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1.5 sm:mb-2">Konfirmasi Hapus</h3>
              <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                Tindakan ini tidak dapat dibatalkan. Untuk melanjutkan, silakan ketik <span className="font-bold text-gray-800">"{tokoToDelete.nama}"</span> di bawah ini.
              </p>
              <input
                type="text"
                value={deleteInputName}
                onChange={(e) => setDeleteInputName(e.target.value)}
                placeholder="Ketik nama toko..."
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-xs sm:text-sm transition-all mb-4 sm:mb-6 text-center"
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
                  onClick={executeDelete}
                  disabled={isSubmitting || deleteInputName !== tokoToDelete.nama}
                  className={`flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 sm:gap-2 ${
                    deleteInputName === tokoToDelete.nama 
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