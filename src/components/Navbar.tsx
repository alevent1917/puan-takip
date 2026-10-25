import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  LogOut,
  Database,
  UserCheck,
  Server,
  Key,
} from 'lucide-react';

interface NavbarProps {
  onOpenSettings: () => void;
  onOpenDeployModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSettings, onOpenDeployModal }) => {
  const { user, role, signOut, switchDemoUser, isLiveSupabase, isDemoMode, setDemoMode } = useAuth();
  const isDevEnvironment = import.meta.env.DEV;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold">
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            PuanTakip
          </span>
        </div>

        {/* Zone 2: Middle Information */}
        <div className="hidden md:flex items-center gap-3 text-xs text-slate-600">
          {user && (
            <>
              <span className="font-semibold text-slate-900">
                {role === 'teacher' ? 'Öğretmen Yönetim Paneli' : 'Öğrenci Portalı'}
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
            </>
          )}
          <span>2026-2027 Eğitim Öğretim Yılı</span>
          {isDemoMode && (
            <>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-medium border border-amber-200">
                Test / Sandbox Modu
              </span>
            </>
          )}
        </div>

        {/* Zone 3: Actions & User Info */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Yalnızca Sandbox / Demo Modunda Görünen Geliştirici Butonları */}
          {isDemoMode && (
            <>
              {/* Oracle Cloud Deployment Guide Button */}
              <button
                onClick={onOpenDeployModal}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
                title="Oracle Cloud Ubuntu VPS kurulum ve yayınlama rehberi"
              >
                <Server className="w-3.5 h-3.5 text-slate-500" />
                <span>VPS Rehberi</span>
              </button>

              {/* Supabase API Config Button */}
              <button
                onClick={onOpenSettings}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
                title="Supabase Proje Bağlantısı"
              >
                <Key className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Supabase</span>
              </button>

              {/* Role Switcher for Sandbox Testing */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-md text-xs font-medium">
                <button
                  onClick={() => switchDemoUser('teacher')}
                  className={`px-2 py-1 rounded transition-colors whitespace-nowrap ${
                    role === 'teacher'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Test Öğretmen Hesabı"
                >
                  Öğretmen
                </button>
                <button
                  onClick={() => switchDemoUser('student')}
                  className={`px-2 py-1 rounded transition-colors whitespace-nowrap ${
                    role === 'student'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Test Öğrenci Hesabı"
                >
                  Öğrenci
                </button>
              </div>
            </>
          )}

          {/* Geliştirme Ortamında Canlı Üretim Görünümünü Test Etme Butonu */}
          {isDevEnvironment && (
            <button
              onClick={() => setDemoMode(!isDemoMode)}
              className={`text-[11px] px-2 py-1 rounded border font-medium transition-colors ${
                isDemoMode
                  ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
              title="Oracle Cloud'da görünecek temiz orijinal arayüzü simüle edin"
            >
              {isDemoMode ? 'Üretim Görünümüne Geç' : '✅ Üretim Modu (Temiz)'}
            </button>
          )}

          {/* User profile & Sign Out */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-slate-900 truncate max-w-[130px]">
                  {user.first_name} {user.last_name}
                </div>
                <div className="text-[11px] text-slate-500">
                  {role === 'teacher' ? 'Yetkili Öğretmen' : `Öğrenci (${user.student_number || 'No yok'})`}
                </div>
              </div>

              <button
                onClick={() => signOut()}
                className="p-1.5 text-slate-500 hover:text-rose-600 rounded-md hover:bg-slate-100 transition-colors"
                title="Güvenli Çıkış Yap"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <span className="text-xs text-slate-500 font-medium">Giriş Yapılmadı</span>
          )}
        </div>
      </div>
    </header>
  );
};
