// menu.ts
export interface MenuItem {
  name: string;
  href: string;
  icon: string;
}

// Daftar menu navigasi utama aplikasi
export const navMenus: MenuItem[] = [
  { name: 'Beranda', href: '/beranda', icon: 'fa-solid fa-house' },
  // Contoh penambahan menu baru di masa depan:
  // { name: 'Produk', href: '/beranda/produk', icon: 'fa-solid fa-box' },
];