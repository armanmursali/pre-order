import { createClient } from '@/utils/supabase/client';


export async function kirimpesanpermintaanmasuktoko(
  ownerId: string | null | undefined, 
  storeId: string | null | undefined, 
  storeName: string | null | undefined, 
  userName: string | null | undefined, 
  userEmail: string | null | undefined
) {
  try {
    const supabase = createClient();
    
    
    if (!ownerId || !storeId) {
      console.error('Parameter utama helper kirimpesanpermintaanmasuktoko (ownerId atau storeId) tidak lengkap atau bernilai null.');
      return;
    }

    
    const safeStoreName = storeName || 'Toko';
    const safeUserName = userName || 'Pengguna';
    const safeUserEmail = userEmail || 'Email tidak tersedia';

    
    const structuredMessage = `Pengguna "${safeUserName}" (${safeUserEmail}) meminta untuk bergabung ke toko "${safeStoreName}". `;

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