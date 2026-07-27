// menu.ts
export interface MenuItem {
  name: string;
  href: string;
  icon: string;
}

// Daftar menu navigasi utama aplikasi
export const navMenus: MenuItem[] = [
  { name: 'Beranda', href: '/beranda', icon: 'fa-solid fa-house' },
  { name: 'Store', href: '/store', icon: 'fa-solid fa-store' },
  { name: 'Pesanan Saya', href: '/pesanan', icon: 'fa-solid fa-receipt' },
  { name: 'Pesanan Masuk', href: '/pesanan-masuk', icon: 'fa-solid fa-inbox' },
  { name: 'Pendapatan', href: '/pendapatan', icon: 'fa-solid fa-wallet' },

  { name: 'Admin', href: '/admin', icon: 'fa-solid fa-user-shield' },
];