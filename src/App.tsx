import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { StudentDashboard } from './components/student/StudentDashboard';
import { AuthModal } from './components/auth/AuthModal';
import { SupabaseSettingsModal } from './components/settings/SupabaseSettingsModal';
import { DeploymentModal } from './components/DeploymentModal';
import { GraduationCap, LogIn, Database, Server, CheckCircle2, ShieldCheck } from 'lucide-react';

const MainContent: React.FC = () => {
  const { user, role, isLoading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-600 font-medium">Sistem Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Navigation Bar */}
      <Navbar
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenDeployModal={() => setIsDeployModalOpen(true)}
      />

      {/* Main Body */}
      <div className="flex-1">
        {user ? (
          role === 'teacher' ? (
            <TeacherDashboard key={refreshKey} />
          ) : (
            <StudentDashboard key={refreshKey} />
          )
        ) : (
          /* Giriş Yapılmamışsa Karşılama Kartı */
          <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
            <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
              <GraduationCap className="w-8 h-8" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Öğrenci Haftalık Puan Takip Sistemi
              </h1>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Öğretmenler için toplu puan girişi ve sınıf yönetimi; öğrenciler için haftalık sonuç geçmişi ve ders grafikleri.
              </p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 text-left text-xs space-y-2">
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Supabase PostgreSQL &amp; Auth altyapısı</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Row Level Security (RLS) veri güvenliği</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Server className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Oracle Cloud Ubuntu VPS için taşınabilir mimari</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <LogIn className="w-4 h-4" />
                <span>Giriş Yap veya Öğrenci Hesabı Aç</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <SupabaseSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onRefresh={() => setRefreshKey((k) => k + 1)}
      />

      <DeploymentModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <span>Öğrenci Haftalık Puan Takip Sistemi © 2026-2027</span>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Supabase Auth &amp; PostgreSQL RLS</span>
            <span aria-hidden="true">·</span>
            <span>Oracle Cloud Ubuntu VPS Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
