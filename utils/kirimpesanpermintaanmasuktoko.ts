// utils/kirimpesanpermintaanmasuktoko.ts
import { createClient } from '@/utils/supabase/client';

/**
 * [HELPER TERPISAH]: Mengirim pesan pemberitahuan permintaan masuk toko ke pemilik toko.
 * Menyisipkan ID toko ke dalam pesan agar dapat diekstrak untuk navigasi langsung ke parameter ID toko.
 */
export async function kirimpesanpermintaanmasuktoko(
  ownerId: string | null | undefined, 
  storeId: string | null | undefined, 
  storeName: string | null | undefined, 
  userName: string | null | undefined, 
  userEmail: string | null | undefined
) {
  try {
    const supabase = createClient();
    
    // Validasi pengaman ketat terhadap parameter utama yang wajib ada (tidak boleh null/kosong)
    if (!ownerId || !storeId) {
      console.error('Parameter utama helper kirimpesanpermintaanmasuktoko (ownerId atau storeId) tidak lengkap atau bernilai null.');
      return;
    }

    // Menangani nilai null/undefined pada parameter teks agar memiliki fallback yang aman
    const safeStoreName = storeName || 'Toko';
    const safeUserName = userName || 'Pengguna';
    const safeUserEmail = userEmail || 'Email tidak tersedia';

    // Menyisipkan format ID toko di dalam string pesan agar mudah diurai (parsing) oleh helper aksi notifikasi
    const structuredMessage = `Pengguna "${safeUserName}" (${safeUserEmail}) meminta untuk bergabung ke toko "${safeStoreName}". [STORE_ID:${storeId}]`;

    const { error } = await supabase
      .from('notifikasi')
      .insert({
        user_id: ownerId,
        title: 'Permintaan Gabung Toko',
        message: structuredMessage,
        is_read: false,
      });

    if (error) {
      console.error('Gagal mengirim pesan permintaan masuk toko:', error.message);
    } else {
      console.log('Pesan permintaan berhasil dikirim ke pemilik toko.');
    }
  } catch (err: any) {
    console.error('Terjadi kesalahan sistem pada helper kirimpesanpermintaanmasuktoko:', err.message);
  }
}