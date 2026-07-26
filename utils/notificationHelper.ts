// utils/notificationHelper.ts
import { createClient } from '@/utils/supabase/client';

/**
 * [HELPER NOTIFIKASI]: Mengirim notifikasi baru ke database Supabase secara instan dan real-time
 */
export async function sendNotification(userId: string, title: string, message: string) {
  try {
    const supabase = createClient();
    
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
      console.error('Gagal mengirim notifikasi:', error.message);
    } else {
      console.log('Notifikasi berhasil disimpan ke database untuk user:', userId);
    }
  } catch (err: any) {
    console.error('Terjadi kesalahan sistem pada helper notifikasi:', err.message);
  }
}