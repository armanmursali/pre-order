// utils/notificationActionHelper.ts
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

/**
 * [HELPER AKSI NOTIFIKASI DINAMIS]: Mengatur arah navigasi dan tindakan saat notifikasi diklik.
 * Dirancang secara modular dan dinamis untuk mendukung berbagai menu masa depan (seperti store, orders, dll)
 * berdasarkan penanda token atau kata kunci di dalam pesan, tanpa mengubah logika dasar yang ada.
 */
export function handleNotificationClick(
  notif: { id: string; title: string; message: string }, 
  router: AppRouterInstance
) {
  const titleLower = notif.title.toLowerCase();
  const message = notif.message;

  // [DINAMIS - MODUL ORDERS]: Cek jika notifikasi berkaitan dengan pesanan/orders di masa depan
  if (titleLower.includes('pesanan') || titleLower.includes('order') || message.includes('[ORDER_ID:')) {
    const orderIdMatch = message.match(/\[ORDER_ID:(.*?)\]/);
    if (orderIdMatch && orderIdMatch[1]) {
      const orderId = orderIdMatch[1];
      router.push(`/orders/${orderId}`);
      return;
    }
    router.push('/orders');
    return;
  }

  // [DINAMIS - MODUL TOKO / STORE]: Menangani navigasi terkait toko dan permintaan gabung
  if (titleLower.includes('toko') || message.includes('meminta untuk bergabung') || message.includes('[STORE_ID:')) {
    // Ekstraksi ID Toko secara presisi dari pola [STORE_ID:...] di dalam string pesan
    const storeIdMatch = message.match(/\[STORE_ID:(.*?)\]/);
    
    if (storeIdMatch && storeIdMatch[1]) {
      const storeId = storeIdMatch[1];
      router.push(`/store/${storeId}`);
      return;
    }
    
    router.push('/store');
    return;
  }

  // [FALLBACK AMAN]: Pengarah default jika pola tidak dikenali
  router.push('/store');
}