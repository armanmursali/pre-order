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
  const titleLower = notif.title.toLowerCase();
  const message = notif.message;

  // [DINAMIS - MODUL ORDERS]: Penanganan untuk modul orders di masa depan
  if (titleLower.includes('pesanan') || titleLower.includes('order') || message.includes('[ORDER_ID:')) {
    const orderIdMatch = message.match(/\[ORDER_ID:(.*?)\]/);
    if (orderIdMatch && orderIdMatch[1]) {
      router.push(`/orders/${orderIdMatch[1]}`);
      return;
    }
    router.push('/orders');
    return;
  }

  // [DINAMIS - MODUL STORE / TOKO]: Langsung terlempar ke parameter ID toko
  if (titleLower.includes('toko') || message.includes('meminta untuk bergabung') || message.includes('[STORE_ID:')) {
    // 1. Cek jika pesan memiliki pola penanda [STORE_ID:...]
    const storeIdMatch = message.match(/\[STORE_ID:(.*?)\]/);
    if (storeIdMatch && storeIdMatch[1]) {
      router.push(`/store/${storeIdMatch[1]}`);
      return;
    }

    // 2. Jika tidak ada penanda khusus, coba cari pola UUID standar di dalam teks pesan
    const uuidMatch = message.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (uuidMatch && uuidMatch[0]) {
      router.push(`/store/${uuidMatch[0]}`);
      return;
    }

    // 3. Fallback jika ID tidak ditemukan sama sekali di dalam pesan
    router.push('/store');
    return;
  }

  // [FALLBACK DEFAULT AMAN]
  router.push('/store');
}