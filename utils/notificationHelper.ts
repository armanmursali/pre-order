// utils/notificationHelper.ts
import { createClient } from '@/utils/supabase/client';

/**
 * [HELPER NOTIFIKASI]: Mengirim notifikasi baru ke database untuk target user tertentu
 */
export async function sendNotification(userId: string, title: string, message: string) {
  try {
    const supabase = createClient();
    
    if (!userId || !title || !message) {
      console.error('Parameter notifikasi tidak lengkap:', { userId, title, message });
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
      console.error('Gagal menyimpan notifikasi:', error.message);
    } else {
      console.log('Notifikasi berhasil dikirim ke user ID:', userId);
    }
  } catch (err: any) {
    console.error('Terjadi kesalahan pada helper notifikasi:', err.message);
  }
}