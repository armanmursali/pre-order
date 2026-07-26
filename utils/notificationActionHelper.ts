// utils/notificationActionHelper.ts
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

/**
 * [HELPER AKSI NOTIFIKASI DINAMIS]: Mengatur arah navigasi dan tindakan saat notifikasi diklik.
 * Mengekstrak ID Toko dari pesan agar langsung membuka halaman /store/[id] secara presisi.
 */
export function handleNotificationClick(
  notif: { id: string; title: string; message: string }, 
  router: AppRouterInstance
) {
  const message = notif.message || '';

  // [PERBAIKAN PRESISI]: Ekstraksi ID Toko secara langsung dari pola [STORE_ID:...] yang dikirim oleh helper
  const storeIdMatch = message.match(/\[STORE_ID:(.*?)\]/);
  
  if (storeIdMatch && storeIdMatch[1]) {
    const storeId = storeIdMatch[1].trim();
    router.push(`/store/${storeId}`);
    return;
  }

  // [CADANGAN AMAN]: Jika format khusus tidak ditemukan, cari pola UUID standar di dalam teks pesan
  const uuidMatch = message.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (uuidMatch && uuidMatch[0]) {
    router.push(`/store/${uuidMatch[0]}`);
    return;
  }

  // [FALLBACK DEFAULT]: Jika tidak ada ID sama sekali, arahkan ke halaman utama store
  router.push('/store');
}