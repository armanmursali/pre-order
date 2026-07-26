// app/(dashboard)/store/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

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
  
  // State kontrol modal dan edit
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  // State data formulir
  const [formData, setFormData] = useState({
    nama: '',
    kategori_id: '',
    fileFoto: null as File | null,
    previewFoto: '' as string,
  });

  // Mengambil data awal saat komponen dimuat
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Mengambil data kategori toko
      const { data: dataKategori, error: errorKategori } = await supabase
        .from('kategori_toko')
        .select('*')
        .order('nama', { ascending: true });

      if (errorKategori) throw errorKategori;
      if (dataKategori) setKategoris(dataKategori);

      // Mengambil data toko beserta relasi nama kategori
      const { data: dataToko, error: errorToko } = await supabase
        .from('toko')
        .select('*, kategori_toko(nama)')
        .order('created_at', { ascending: false });

      if (errorToko) throw errorToko;
      if (dataToko) setTokos(dataToko);
    } catch (error: any) {
      alert('Gagal memuat data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Menangani perubahan nilai input form
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

  // Menutup modal dan mereset form
  const closeModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    setFormData({
      nama: '',
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
      kategori_id: toko.kategori_id,
      fileFoto: null,
      previewFoto: toko.foto || '',
    });
    setIsModalOpen(true);
  };

  // [PERBAIKAN UTAMA] Menyimpan data toko dan mengunggah foto ke Supabase Storage (bucket foto-toko)
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

      // Logika pembaruan (Update) atau penambahan baru (Insert) ke tabel toko
      if (editId) {
        const { error } = await supabase
          .from('toko')
          .update({
            nama: formData.nama,
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

  // Menghapus data toko dari database
  const handleDelete = async (id: string) => {
    const isConfirm = window.confirm('Apakah Anda yakin ingin menghapus toko ini?');
    if (!isConfirm) return;

    try {
      const { error } = await supabase
        .from('toko')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      fetchData();
    } catch (error: any) {
      alert('Gagal menghapus data: ' + error.message);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manajemen Toko (Store)</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola data toko dan kategori Anda di sini.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <i className="fa-solid fa-plus"></i>
          <span>Tambah Toko</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-sm font-semibold text-gray-600">Foto</th>
              <th className="px-4 py-3 text-sm font-semibold text-gray-600">Nama Toko</th>
              <th className="px-4 py-3 text-sm font-semibold text-gray-600">Kategori</th>
              <th className="px-4 py-3 text-sm font-semibold text-gray-600 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2 block"></i>
                  Memuat data...
                </td>
              </tr>
            ) : tokos.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  Belum ada data toko. Silakan tambahkan toko baru.
                </td>
              </tr>
            ) : (
              tokos.map((toko) => (
                <tr key={toko.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    {toko.foto ? (
                      <img src={toko.foto} alt={toko.nama} className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400">
                        <i className="fa-solid fa-image"></i>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{toko.nama}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-semibold">
                      {toko.kategori_toko?.nama || 'Tanpa Kategori'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(toko)}
                        className="w-8 h-8 rounded-lg bg-yellow-50 text-yellow-600 hover:bg-yellow-100 flex items-center justify-center transition-colors"
                        title="Edit"
                      >
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>
                      <button
                        onClick={() => handleDelete(toko.id)}
                        className="w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-colors"
                        title="Hapus"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-800">
                {editId ? 'Edit Data Toko' : 'Tambah Toko Baru'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-red-500 transition-colors">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Toko</label>
                <input
                  type="text"
                  name="nama"
                  value={formData.nama}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">Foto Toko</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
                />
                {formData.previewFoto && (
                  <div className="mt-3">
                    <img
                      src={formData.previewFoto}
                      alt="Pratinjau"
                      className="w-full h-32 object-cover rounded-lg border border-gray-200"
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
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
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
      )}
    </div>
  );
}