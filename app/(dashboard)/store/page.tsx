// app/(dashboard)/store/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

// Mendefinisikan struktur data untuk Kategori Toko
interface Kategori {
  id: string;
  nama: string;
}

// Mendefinisikan struktur data untuk Toko
interface Toko {
  id: string;
  user_id: string;
  kategori_id: string;
  nama: string;
  // [PERBAIKAN]: Menambahkan field deskripsi pada antarmuka Toko
  deskripsi?: string | null;
  foto: string | null;
  kategori_toko?: {
    nama: string;
  };
}

export default function StorePage() {
  const supabase = createClient();
  
  // State untuk menyimpan daftar toko dan kategori
  const [tokos, setTokos] = useState<Toko[]>([]);
  const [kategoris, setKategoris] = useState<Kategori[]>([]);
  
  // State indikator proses
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // State kontrol modal tambah/edit
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editId, setEditId] = useState<string | null>(null);

  // State untuk mengontrol dropdown aksi (titik tiga)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // State untuk kontrol modal konfirmasi hapus khusus
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [tokoToDelete, setTokoToDelete] = useState<Toko | null>(null);
  const [deleteInputName, setDeleteInputName] = useState<string>('');
  
  // State data formulir
  const [formData, setFormData] = useState({
    nama: '',
    // [PERBAIKAN]: Menambahkan deskripsi ke dalam inisialisasi state form
    deskripsi: '',
    kategori_id: '',
    fileFoto: null as File | null,
    previewFoto: '' as string,
  });

  // Mengambil data awal saat komponen dimuat
  useEffect(() => {
    fetchData();
  }, []);

  // Mengoptimalkan pengambilan data secara independen
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Mengambil data kategori toko secara terpisah
      const { data: dataKategori, error: errorKategori } = await supabase
        .from('kategori_toko')
        .select('*')
        .order('nama', { ascending: true });

      if (errorKategori) {
        console.error('Gagal memuat kategori:', errorKategori.message);
      } else if (dataKategori) {
        setKategoris(dataKategori);
      }

      // 2. Mengambil data toko secara terpisah
      const { data: dataToko, error: errorToko } = await supabase
        .from('toko')
        .select('*, kategori_toko(nama)')
        .order('created_at', { ascending: false });

      if (errorToko) {
        console.error('Gagal memuat toko:', errorToko.message);
      } else if (dataToko) {
        setTokos(dataToko);
      }
    } catch (error: any) {
      console.error('Terjadi kesalahan sistem:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Menangani perubahan nilai input form
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Menangani pemilihan file foto baru
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

  // Menutup modal form dan mereset data
  const closeModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    setFormData({
      nama: '',
      // [PERBAIKAN]: Mereset field deskripsi
      deskripsi: '',
      kategori_id: '',
      fileFoto: null,
      previewFoto: '',
    });
  };

  // Membuka modal dalam mode edit data toko
  const openEditModal = (toko: Toko) => {
    setEditId(toko.id);
    setFormData({
      nama: toko.nama,
      // [PERBAIKAN]: Mengisi data deskripsi untuk diedit
      deskripsi: toko.deskripsi || '',
      kategori_id: toko.kategori_id,
      fileFoto: null,
      previewFoto: toko.foto || '',
    });
    setIsModalOpen(true);
    setActiveDropdown(null); 
  };

  // Fungsi untuk membuka modal konfirmasi hapus
  const openDeleteModal = (toko: Toko) => {
    setTokoToDelete(toko);
    setDeleteInputName(''); 
    setIsDeleteModalOpen(true);
    setActiveDropdown(null); 
  };

  // Fungsi untuk menutup modal konfirmasi hapus
  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setTokoToDelete(null);
    setDeleteInputName('');
  };

  // Menyimpan data toko dan mengunggah foto ke Supabase Storage
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nama || !formData.kategori_id) {
      alert('Nama dan Kategori wajib diisi!');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Anda harus login terlebih dahulu.');

      let fotoUrl = formData.previewFoto;

      // Proses unggah file fisik ke Supabase Storage jika ada file baru
      if (formData.fileFoto) {
        const fileExt = formData.fileFoto.name.split('.').pop();
        const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
        const filePath = `public/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('foto-toko')
          .upload(filePath, formData.fileFoto);

        if (uploadError) throw uploadError;

        // Mendapatkan URL publik dari Supabase Storage
        const { data: publicUrlData } = supabase.storage
          .from('foto-toko')
          .getPublicUrl(filePath);

        fotoUrl = publicUrlData.publicUrl;
      }

      // Logika pembaruan (Update) atau penambahan baru (Insert)
      if (editId) {
        const { error } = await supabase
          .from('toko')
          .update({
            nama: formData.nama,
            // [PERBAIKAN]: Menyertakan deskripsi saat update
            deskripsi: formData.deskripsi,
            kategori_id: formData.kategori_id,
            foto: fotoUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('toko')
          .insert({
            user_id: session.user.id,
            kategori_id: formData.kategori_id,
            nama: formData.nama,
            // [PERBAIKAN]: Menyertakan deskripsi saat insert
            deskripsi: formData.deskripsi,
            foto: fotoUrl,
          });

        if (error) throw error;
      }

      closeModal();
      fetchData(); 
    } catch (error: any) {
      alert('Gagal menyimpan data: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fungsi eksekusi hapus yang dipanggil dari dalam Modal Hapus
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
    } catch (error: any) {
      alert('Gagal menghapus data: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      
      {/* Overlay transparan untuk menutup dropdown aksi jika mengklik di luar area dropdown */}
      {activeDropdown && (
        <div 
          className="fixed inset-0 z-[5]" 
          onClick={() => setActiveDropdown(null)}
        />
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-amber-900">Manajemen Toko (Store)</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola data toko dan kategori Anda di sini.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <i className="fa-solid fa-plus"></i>
          <span>Tambah Toko</span>
        </button>
      </div>

      {/* [PERBAIKAN]: Mengubah tampilan dari Tabel menjadi Grid Card */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <i className="fa-solid fa-circle-notch fa-spin text-3xl mb-3 block text-orange-600"></i>
          Memuat data toko...
        </div>
      ) : tokos.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <i className="fa-solid fa-store-slash text-4xl mb-3 text-gray-400"></i>
          <p>Belum ada data toko. Silakan tambahkan toko baru.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tokos.map((toko) => (
            <div key={toko.id} className="relative bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-orange-200 transition-all group flex flex-col overflow-hidden">
              
              {/* [PERBAIKAN]: Area Aksi (Dropdown) ditempatkan secara absolut (mengambang) agar tidak memicu navigasi Link */}
              <div className="absolute top-3 right-3 z-10">
                <div className="relative inline-block text-left">
                  <button
                    onClick={(e) => {
                      e.preventDefault(); // Mencegah klik menyebar ke Link
                      e.stopPropagation();
                      setActiveDropdown(activeDropdown === toko.id ? null : toko.id);
                    }}
                    className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm text-gray-600 hover:bg-orange-100 hover:text-orange-700 flex items-center justify-center transition-colors shadow-sm border border-gray-100"
                    title="Aksi"
                  >
                    <i className="fa-solid fa-ellipsis-vertical"></i>
                  </button>

                  {/* Konten Dropdown */}
                  {activeDropdown === toko.id && (
                    <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg border border-gray-200 z-20 py-1">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openEditModal(toko);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 flex items-center gap-2 transition-colors"
                      >
                        <i className="fa-solid fa-pen-to-square w-4"></i> Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openDeleteModal(toko);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                      >
                        <i className="fa-solid fa-trash w-4"></i> Hapus
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* [PERBAIKAN]: Sisa Card dibungkus dengan Link sehingga seluruh card dapat diklik untuk ke halaman detail */}
              <Link href={`/store/${toko.id}`} className="flex flex-col flex-grow outline-none focus:ring-2 focus:ring-orange-500 rounded-xl">
                {/* Bagian Foto */}
                <div className="h-48 w-full bg-gray-100 flex-shrink-0 relative">
                  {toko.foto ? (
                    <img src={toko.foto} alt={toko.nama} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <i className="fa-solid fa-image text-5xl"></i>
                    </div>
                  )}
                </div>
                
                {/* Bagian Konten Teks */}
                <div className="p-5 flex flex-col flex-grow">
                  <div className="flex flex-col gap-1 mb-3">
                    <span className="w-fit bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                      {toko.kategori_toko?.nama || 'Tanpa Kategori'}
                    </span>
                    <h3 className="text-lg font-bold text-amber-900 group-hover:text-orange-700 transition-colors line-clamp-1">
                      {toko.nama}
                    </h3>
                  </div>
                  
                  {/* [PERBAIKAN]: Menampilkan sebagian teks deskripsi pada card */}
                  <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed">
                    {toko.deskripsi ? toko.deskripsi : <span className="italic">Tidak ada deskripsi.</span>}
                  </p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form Tambah/Edit Toko */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-amber-900">
                {editId ? 'Edit Data Toko' : 'Tambah Toko Baru'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-red-500 transition-colors">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            
            <div className="overflow-y-auto">
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Toko</label>
                  <input
                    type="text"
                    name="nama"
                    value={formData.nama}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                    placeholder="Masukkan nama toko"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Kategori Toko</label>
                  <select
                    name="kategori_id"
                    value={formData.kategori_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white"
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

                {/* [PERBAIKAN]: Menambahkan Textarea untuk input Deskripsi */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Deskripsi Toko (Opsional)</label>
                  <textarea
                    name="deskripsi"
                    value={formData.deskripsi}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all resize-none"
                    placeholder="Tuliskan deksripsi singkat toko..."
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Foto Toko</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 transition-colors"
                  />
                  {formData.previewFoto && (
                    <div className="mt-3">
                      <img
                        src={formData.previewFoto}
                        alt="Pratinjau"
                        className="w-full h-32 object-cover rounded-lg border border-gray-200 shadow-sm"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    disabled={isSubmitting}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
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

      {/* Modal Konfirmasi Hapus Khusus dengan Pengetikan Nama */}
      {isDeleteModalOpen && tokoToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4 text-red-600">
                <i className="fa-solid fa-triangle-exclamation text-3xl"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Konfirmasi Hapus</h3>
              <p className="text-sm text-gray-500 mb-4">
                Tindakan ini tidak dapat dibatalkan. Untuk melanjutkan, silakan ketik <span className="font-bold text-gray-800">"{tokoToDelete.nama}"</span> di bawah ini.
              </p>
              <input
                type="text"
                value={deleteInputName}
                onChange={(e) => setDeleteInputName(e.target.value)}
                placeholder="Ketik nama toko..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all mb-6 text-center"
              />
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={executeDelete}
                  disabled={isSubmitting || deleteInputName !== tokoToDelete.nama}
                  className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center justify-center gap-2 ${
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

    </div>
  );
}