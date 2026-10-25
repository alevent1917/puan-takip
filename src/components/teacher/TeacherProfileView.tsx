import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase, isLiveSupabaseActive } from '../../lib/supabaseClient';
import { User, CheckCircle2, AlertCircle, Save } from 'lucide-react';

export const TeacherProfileView: React.FC = () => {
  const { user, email, refreshProfile } = useAuth();
  const isLive = isLiveSupabaseActive();

  const [firstName, setFirstName] = useState(
    user?.first_name === 'Yeni' ? '' : user?.first_name || ''
  );
  const [lastName, setLastName] = useState(
    user?.last_name === 'Öğrenci' ? '' : user?.last_name || ''
  );
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setMsg({ type: 'error', text: 'Lütfen adınızı ve soyadınızı giriniz.' });
      return;
    }

    setIsSaving(true);
    setMsg(null);

    try {
      if (isLive && supabase && user) {
        const { error } = await supabase
          .from('profiles')
          .update({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (error) throw error;
        await refreshProfile();
      } else if (user) {
        user.first_name = firstName.trim();
        user.last_name = lastName.trim();
        const stored = localStorage.getItem('pt_profiles');
        if (stored) {
          const list = JSON.parse(stored);
          const idx = list.findIndex((p: any) => p.id === user.id);
          if (idx >= 0) {
            list[idx].first_name = firstName.trim();
            list[idx].last_name = lastName.trim();
            localStorage.setItem('pt_profiles', JSON.stringify(list));
          }
        }
      }

      setMsg({ type: 'success', text: 'Profil bilgileriniz başarıyla güncellendi!' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.message || 'Profil güncellenirken hata oluştu.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-xl space-y-6">
      <div>
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <User className="w-5 h-5 text-slate-700" />
          <span>Öğretmen Profil Bilgileri</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Panelde ve öğrenci raporlarında görünecek gerçek adınızı ve soyadınızı buradan tanımlayabilirsiniz.
        </p>
      </div>

      {msg && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center gap-2 ${
            msg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Giriş Yapılan E-Posta
          </label>
          <input
            type="text"
            disabled
            value={email || 'Kayıtlı E-posta'}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md bg-slate-50 text-slate-500 font-mono"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Adınız
            </label>
            <input
              type="text"
              required
              placeholder="Örn: Ahmet"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Soyadınız
            </label>
            <input
              type="text"
              required
              placeholder="Örn: Levent"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Sistem Rolü
          </label>
          <span className="inline-block text-xs bg-slate-100 text-slate-800 font-semibold px-2.5 py-1 rounded border border-slate-200">
            Öğretmen (Teacher)
          </span>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 py-2 px-4 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Kaydediliyor...' : 'Profil Bilgilerini Kaydet'}</span>
        </button>
      </form>
    </div>
  );
};
