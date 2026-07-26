// utils/notificationHelper.ts
import { createClient } from '@/utils/supabase/client';

/**
 * [HELPER NOTIFIKASI]: Mengirim notifikasi baru ke database secara aman dan andal
 */
export async function sendNotification(userId: string, title: string, message: string) {
  try {
    const supabase = createClient();
    
    // Validasi parameter wajib
    if (!userId || !title || !message) {
      console.error('Parameter pengiriman notifikasi tidak lengkap:', { userId, title, message });
      return;
    }

    const { error } = await supabase
      .from('notifikasi')
      .insert({
        user_id: userId,
        title: title,
        message: message,
        is_read: false
      });

    if (error) {
      console.error('Gagal menyimpan notifikasi ke Supabase:', error.message);
    } else {
      console.log('Notifikasi berhasil dikirim ke user:', userId);
    }
  } catch (err: any) {
    console.error('Terjadi kesalahan sistem pada helper notifikasi:', err.message);
  }
}