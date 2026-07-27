# 🛍️ Pre-Order — PT Mances

> **Pesan barang harianmu dengan mudah, cepat, dan efisien.**

Pre-Order adalah aplikasi berbasis web modern yang dirancang untuk mempermudah proses pemesanan barang secara **pre-order**. Aplikasi ini menyediakan sistem terintegrasi untuk pelanggan maupun pemilik toko dalam mengelola produk, pesanan, toko, pendapatan, dan aktivitas operasional secara efektif.

## 📖 Tentang Aplikasi

**Pre-Order** merupakan platform pemesanan barang yang memungkinkan pengguna melakukan pemesanan produk secara online melalui sistem yang praktis dan terstruktur.

Pemilik toko dapat membuat dan mengelola toko, menambahkan produk secara kustom, mengatur pesanan yang masuk, memantau status pesanan, serta melihat informasi pendapatan. Aplikasi ini juga mendukung kolaborasi antaranggota tim toko sehingga proses pengelolaan bisnis dapat dilakukan secara lebih terorganisir.

Dengan dukungan teknologi modern dan fitur **real-time**, aplikasi ini diharapkan dapat memberikan pengalaman pemesanan yang lebih cepat, mudah, dan efisien bagi pelanggan maupun pengelola toko.

## ✨ Fitur Utama

- 🏪 **Manajemen Toko**
  - Membuat dan mengelola toko
  - Mengatur informasi toko
  - Mengelola anggota atau tim toko

- 📦 **Manajemen Produk**
  - Menambahkan produk secara kustom
  - Mengelola informasi dan detail produk
  - Mengatur ketersediaan produk

- 🛒 **Pemesanan Pre-Order**
  - Pelanggan dapat melakukan pemesanan barang
  - Pengelolaan pesanan secara terstruktur
  - Pemantauan status pesanan

- 📋 **Manajemen Pesanan**
  - Melihat daftar pesanan masuk
  - Mengelola proses pesanan
  - Memantau perkembangan status pesanan

- 💰 **Monitoring Pendapatan**
  - Melihat informasi transaksi
  - Memantau pendapatan toko
  - Membantu pengelolaan aktivitas penjualan

- ⚡ **Real-Time**
  - Sinkronisasi data secara real-time
  - Mendukung kolaborasi antaranggota tim toko

- 🔐 **Autentikasi**
  - Login menggunakan akun pengguna
  - Mendukung autentikasi OAuth Google melalui Supabase

## 🛠️ Teknologi yang Digunakan

| Teknologi | Penggunaan |
|---|---|
| **Next.js** | Framework utama aplikasi |
| **React** | Pengembangan antarmuka pengguna |
| **TypeScript / JavaScript** | Bahasa pemrograman |
| **Tailwind CSS** | Styling dan desain antarmuka |
| **Supabase** | Backend dan database |
| **PostgreSQL** | Database relasional |
| **Supabase Auth** | Autentikasi pengguna dan OAuth Google |
| **Supabase Realtime** | Sinkronisasi data secara real-time |
| **Supabase Storage** | Penyimpanan file dan aset |
| **Vercel** | Deployment dan hosting aplikasi |

## 🚀 Instalasi dan Menjalankan Proyek

Ikuti langkah-langkah berikut untuk menjalankan aplikasi secara lokal di komputer Anda.

### 1. Clone Repository

```bash
git clone https://github.com/armanmursali/pre-order.git
```

### 2. Masuk ke Direktori Proyek

```bash
cd pre-order
```

### 3. Install Dependencies

Gunakan salah satu package manager berikut:

**npm**

```bash
npm install
```

**yarn**

```bash
yarn install
```

**pnpm**

```bash
pnpm install
```

**bun**

```bash
bun install
```

### 4. Konfigurasi Environment Variable

Buat file `.env.local` pada direktori utama proyek:

```env
NEXT_PUBLIC_SUPABASE_URL=xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=xxxxxxxxxxxxxxxxxxxxxx
```

Pastikan Anda mengisi nilai environment variable sesuai dengan konfigurasi proyek Supabase yang digunakan.

### 5. Jalankan Development Server

Gunakan salah satu perintah berikut:

**npm**

```bash
npm run dev
```

**yarn**

```bash
yarn dev
```

**pnpm**

```bash
pnpm dev
```

**bun**

```bash
bun dev
```

Setelah server berhasil dijalankan, buka browser dan akses:

```text
http://localhost:3000
```

## 🖼️ Pratinjau Aplikasi

Tampilan dan pratinjau antarmuka aplikasi dapat dilihat melalui aset yang tersedia pada direktori:

```text
public/apk.png
```

## 🌐 Deployment

Aplikasi ini menggunakan **Vercel** sebagai platform deployment dan **Supabase** sebagai backend serta database.

Arsitektur aplikasi secara umum:

```text
User
  │
  ▼
Vercel
(Next.js Application)
  │
  ▼
Supabase
  ├── Authentication
  ├── PostgreSQL Database
  ├── Realtime
  └── Storage
```

## 🤝 Kontribusi

Proyek **Pre-Order** terbuka untuk pengembangan dan kontribusi.

Jika Anda ingin berkontribusi, silakan:

1. Fork repository ini.
2. Buat branch baru untuk fitur atau perbaikan.
3. Lakukan perubahan yang diperlukan.
4. Commit perubahan Anda.
5. Push branch ke repository.
6. Buat Pull Request.

Setiap kontribusi, baik berupa fitur baru, perbaikan bug, peningkatan performa, maupun penyempurnaan dokumentasi, sangat diapresiasi.

## ⚠️ Catatan Pengembangan

Beberapa fitur masih dalam tahap pengembangan, di antaranya:

### 📱 Integrasi Notifikasi WhatsApp

Sistem belum terintegrasi secara otomatis dengan layanan pengiriman pesan WhatsApp. Fitur ini masih dalam tahap pengembangan dan direncanakan untuk mendukung notifikasi terkait pesanan kepada pengguna.

### 💳 Integrasi Pembayaran

Pengembangan sistem pembayaran online dapat ditambahkan pada tahap selanjutnya untuk mendukung proses transaksi yang lebih terintegrasi.

## 📌 Status Proyek

**Status:** 🚧 Aktif dalam Pengembangan

Aplikasi ini terus dikembangkan untuk meningkatkan pengalaman pengguna, menambahkan fitur baru, serta meningkatkan stabilitas dan performa sistem.

## 👨‍💻 Author

**Arman Mursali**

> Developed with ❤️ using Next.js, Supabase, and Vercel.