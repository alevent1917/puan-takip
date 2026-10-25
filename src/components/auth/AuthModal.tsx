import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogIn, UserPlus, ShieldAlert, CheckCircle2, Lock, Mail, User, Hash } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signIn, signUp, switchDemoUser, isLiveSupabase, isDemoMode } = useAuth();
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    const res = await signIn(email, password);
    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'Giriş yapılamadı. Lütfen bilgilerinizi kontrol ediniz.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg('Lütfen adınızı ve soyadınızı giriniz.');
      return;
    }

    setIsSubmitting(true);
    // Güvenlik: Öğrenci kayıt formunda rol seçimi bulunmaz, backend ve trigger student olarak zorlar
    const res = await signUp({
      email,
      password,
      firstName,
      lastName,
      studentNumber,
    });
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMsg('Öğrenci hesabınız başarıyla oluşturuldu. Yönlendiriliyorsunuz...');
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setErrorMsg(res.error || 'Kayıt sırasında bir hata oluştu.');
    }
  };

  const handleDemoSelect = (role: 'teacher' | 'student', studentId?: string) => {
    switchDemoUser(role, studentId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {tab === 'login' && 'Kullanıcı Girişi'}
              {tab === 'register' && 'Yeni Öğrenci Kaydı'}
              {tab === 'forgot' && 'Parola Sıfırlama'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {tab === 'login' && 'Öğretmen veya öğrenci hesabınızla giriş yapın.'}
              {tab === 'register' && 'Öğrenci hesabı oluşturun. (Öğretmen hesapları yönetici onaylıdır)'}
              {tab === 'forgot' && 'E-posta adresinize sıfırlama bağlantısı gönderilir.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
          >
            ✕
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-100 bg-slate-50 text-xs font-medium">
          <button
            onClick={() => { setTab('login'); setErrorMsg(null); }}
            className={`flex-1 py-2.5 text-center transition-colors ${
              tab === 'login' ? 'bg-white text-slate-900 border-b-2 border-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Giriş Yap
          </button>
          <button
            onClick={() => { setTab('register'); setErrorMsg(null); }}
            className={`flex-1 py-2.5 text-center transition-colors ${
              tab === 'register' ? 'bg-white text-slate-900 border-b-2 border-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Öğrenci Kaydı
          </button>
          <button
            onClick={() => { setTab('forgot'); setErrorMsg(null); }}
            className={`flex-1 py-2.5 text-center transition-colors ${
              tab === 'forgot' ? 'bg-white text-slate-900 border-b-2 border-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Şifremi Unuttum
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  E-Posta Adresi
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@okul.k12.tr"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Parola
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2 px-4 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{isSubmitting ? 'Giriş Yapılıyor...' : 'Giriş Yap'}</span>
              </button>

              {isDemoMode && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-[11px] text-slate-500 mb-2 font-medium">Hızlı Test Girişleri (Sandbox):</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleDemoSelect('teacher')}
                      className="py-1.5 px-2 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-[11px] text-slate-700 font-medium transition-colors"
                    >
                      👨‍🏫 Test Öğretmen Girişi
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDemoSelect('student', 's1-uuid-ogrenci-ahmet')}
                      className="py-1.5 px-2 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-[11px] text-slate-700 font-medium transition-colors"
                    >
                      👨‍🎓 Test Öğrenci Girişi
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}

          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Ad</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Ahmet"
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Soyad</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Yılmaz"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Öğrenci Numarası (İsteğe Bağlı)</label>
                <div className="relative">
                  <Hash className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value)}
                    placeholder="1024"
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">E-Posta</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ogrenci@okul.k12.tr"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Parola</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="En az 6 karakter"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600">
                🔒 <strong>Güvenlik Politikası:</strong> Yeni kayıtlar doğrudan <em>öğrenci</em> rolünde başlatılır. Öğretmen rolleri sistem yöneticisi ve Supabase RLS tarafından atanmaktadır.
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2 px-4 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isSubmitting ? 'Kaydediliyor...' : 'Öğrenci Hesabı Oluştur'}</span>
              </button>
            </form>
          )}

          {tab === 'forgot' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">E-Posta Adresi</label>
                <input
                  type="email"
                  placeholder="kayitli@okul.k12.tr"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setSuccessMsg('Şifre sıfırlama talimatı e-posta adresinize gönderildi.');
                }}
                className="w-full py-2 px-4 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
              >
                Sıfırlama Bağlantısı Gönder
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
