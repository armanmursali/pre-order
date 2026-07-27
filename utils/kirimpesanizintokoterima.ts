import { createClient } from '@/utils/supabase/client';


export async function kirimpesanizintokoterima(
  targetUserId: string,
  namaPemohon: string
) {
  const supabase = createClient();

  try {
    const judul = 'Izin Pembuatan Toko Diterima';
    const pesan = `Halo ${nama_pemohon(namaPemohon)}, pengajuan izin pembuatan toko Anda telah disetujui oleh Administrator. Anda sekarang dapat mulai membuat toko baru di menu Store.`;

    const { error } = await supabase
      .from('notifikasi')
      .insert({
        user_id: targetUserId,
        title: judul,
        message: pesan,
        is_read: false,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Gagal mengirim notifikasi izin toko diterima:', error.message);
      throw error;
    }

    return true;
  } catch (error: any) {
    console.error('Kesalahan sistem saat mengirim notifikasi:', error.message);
    return false;
  }
}


function nama_pemohon(nama: string) {
  return nama || 'Pengguna';
}