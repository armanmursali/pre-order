// utils/notificationActionHelper.ts
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

/**
 * [HELPER AKSI NOTIFIKASI]: Mengatur arah navigasi dan tindakan saat notifikasi diklik
 * Modular agar mudah ditambah fungsi lain (misal: notifikasi orderan, stok menipis, dll) tanpa ubah komponen UI.
 */
export function handleNotificationClick(notif: { id: string; title: string; message: string }, router: AppRouterInstance) {
  const titleLower = notif.title.toLowerCase();
  const messageLower = notif.message.toLowerCase();

  // Jika notifikasi berkaitan dengan permintaan masuk toko atau toko
  if (titleLower.includes('toko') || messageLower.includes('toko') || messageLower.includes('bergabung')) {
    router.push('/store');
    return;
  }

  // Ekstensi fleksibel untuk masa depan (misal: notifikasi pesanan)
  if (titleLower.includes('pesanan') || messageLower.includes('pesanan')) {
    // router.push('/orders');
    return;
  }

  // Default navigasi aman jika tidak spesifik
  router.push('/store');
}