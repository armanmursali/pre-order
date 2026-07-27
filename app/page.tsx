// app/page.tsx
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  
  // [STATE POPUP LOGIN]: Mengontrol visibilitas popup login promosi
  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(true);

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-white font-sans text-gray-900 relative overflow-x-hidden">
      
      {/* Header / Navigasi Utama Landing Page */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-800 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-md">
            M
          </div>
          <span className="text-xl font-extrabold text-amber-900 tracking-tight">
            PT Mances
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPopupOpen(true)}
            className="px-4 py-2 text-xs sm:text-sm font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl transition-all shadow-sm"
          >
            Masuk / Login
          </button>
          <Link
            href="/login"
            className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-amber-800 hover:bg-amber-900 rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            Mulai Sekarang
          </Link>
        </div>
      </header>

      {/* Bagian Utama Hero Section Landing Page */}
      <main className="flex flex-1 w-full max-w-6xl mx-auto flex-col lg:flex-row items-center justify-between py-12 px-6 gap-12 z-10">
        
        {/* Kolom Kiri: Teks Promosi, Quote, & Slogan */}
        <div className="flex flex-col items-center lg:items-start gap-6 text-center lg:text-left max-w-xl">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100 text-orange-800 text-xs font-bold tracking-wide animate-pulse">
            <i className="fa-solid fa-store"></i> Platform Pre-Order Terpercaya
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-tight text-amber-950">
            Pesan Barang Harianmu Disini dengan Mudah!
          </h1>

          <p className="text-base sm:text-lg leading-relaxed text-gray-600">
            Selamat datang di <strong className="text-amber-900">Pre-Order PT Mances</strong>. Solusi efisien untuk memenuhi segala kebutuhan pasokan harian Anda secara cepat, aman, dan transparan langsung dari genggaman.
          </p>

          {/* Quote Menarik */}
          <blockquote className="border-l-4 border-amber-800 pl-4 py-1 italic text-sm sm:text-base text-gray-700 bg-amber-50/50 rounded-r-xl w-full text-left shadow-sm">
            &ldquo;Efisiensi adalah kunci kesuksesan bisnis harian Anda. Bersama PT Mances, semua kebutuhan terpenuhi tanpa kompromi.&rdquo;
            <span className="block not-italic font-bold text-xs text-amber-900 mt-1">— Manajemen PT Mances</span>
          </blockquote>

          <div className="flex flex-col sm:flex-row gap-4 w-full pt-4">
            <Link
              href="/login"
              className="flex h-14 w-full sm:w-48 items-center justify-center gap-2 rounded-2xl bg-amber-800 px-6 text-white font-bold transition-all hover:bg-amber-900 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <span>Jelajahi Katalog</span>
              <i className="fa-solid fa-arrow-right"></i>
            </Link>
            
            <button
              onClick={() => setIsPopupOpen(true)}
              className="flex h-14 w-full sm:w-48 items-center justify-center rounded-2xl border-2 border-solid border-amber-800/20 px-6 font-bold text-amber-900 transition-all hover:bg-amber-50 hover:border-amber-800"
            >
              Masuk Akun
            </button>
          </div>
        </div>

        {/* Kolom Kanan: Ilustrasi Gambar Kartun Vektor dari Sumber Daring */}
        <div className="w-full lg:w-1/2 flex items-center justify-center relative">
          <div className="absolute w-72 h-72 sm:w-96 sm:h-96 bg-orange-200/50 rounded-full blur-3xl -z-10 animate-blob"></div>
          
          <div className="relative w-full max-w-md aspect-square rounded-3xl overflow-hidden shadow-2xl border-4 border-white transform hover:scale-[1.02] transition-transform duration-500 bg-amber-100 flex items-center justify-center">
            {/* [PENGGANTIAN GAMBAR KARTUN]: Menggunakan ilustrasi vektor/kartun belanja dari unDraw/Open Source SVG */}
            <img
              src="https://img.freepik.com/free-vector/online-grocery-shopping-concept-illustration_114360-14861.jpg?w=800"
              alt="Ilustrasi Kartun Belanja Harian PT Mances"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex flex-col justify-end p-6 text-white">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-300">Belanja Ceria & Praktis</span>
              <h3 className="text-xl font-extrabold">Pasokan Harian Dalam Genggaman</h3>
            </div>
          </div>
        </div>

      </main>

      {/* Footer Sederhana */}
      <footer className="w-full border-t border-gray-200 py-6 text-center text-xs text-gray-500 bg-white/50 backdrop-blur-sm z-10">
        &copy; {new Date().getFullYear()} Pre-Order PT Mances. Hak Cipta Dilindungi Undang-Undang.
      </footer>

      {/* [POPUP LOGIN INTERAKTIF]: Dapat diabaikan atau diarahkan ke /login */}
      {isPopupOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-gray-100 text-center relative space-y-6 transform animate-scale-up">
            
            {/* Tombol Tutup / Abaikan Popup */}
            <button
              onClick={() => setIsPopupOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              title="Abaikan"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>

            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-inner">
              <i className="fa-solid fa-user-lock"></i>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold text-amber-950">Masuk ke PT Mances</h3>
              <p className="text-xs sm:text-sm text-gray-500">
                Akses seluruh fitur pre-order barang harian eksklusif dengan masuk ke akun Anda sekarang juga.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Link
                href="/login"
                className="w-full py-3.5 rounded-2xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-right-to-bracket"></i>
                <span>Menuju Halaman Login</span>
              </Link>

              <button
                type="button"
                onClick={() => setIsPopupOpen(false)}
                className="w-full py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs sm:text-sm transition-colors"
              >
                Abaikan & Lanjutkan di Sini
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}