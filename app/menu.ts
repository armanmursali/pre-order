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
  { name: 'Pesanan', href: '/pesanan', icon: 'fa-solid fa-receipt' },
];