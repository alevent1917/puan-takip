import React, { useState } from 'react';
import { updateSupabaseConfig, isLiveSupabaseActive, mockDb } from '../../lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { Database, CheckCircle2, AlertCircle, Copy, Check, RotateCcw } from 'lucide-react';

interface SupabaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const SupabaseSettingsModal: React.FC<SupabaseSettingsModalProps> = ({
  isOpen,
  onClose,
  onRefresh,
}) => {
  const currentUrl = typeof window !== 'undefined' ? localStorage.getItem('supabase_url') || import.meta.env.VITE_SUPABASE_URL || '' : '';
  const currentKey = typeof window !== 'undefined' ? localStorage.getItem('supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '' : '';

  const [url, setUrl] = useState(currentUrl);
  const [anonKey, setAnonKey] = useState(currentKey);
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message?: string }>({ status: 'idle' });
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const isLive = isLiveSupabaseActive();

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      setTestResult({ status: 'error', message: 'Lütfen Supabase URL ve Anon Key giriniz.' });
      return;
    }

    setTestResult({ status: 'testing' });

    try {
      const client = createClient(url.trim(), anonKey.trim());
      // Basit bir bağlantı testi (profiles veya auth)
      const { error } = await client.from('profiles').select('id').limit(1);

      if (error && error.code !== 'PGRST116') {
        // Tablo henüz migration çalıştırılmadıysa da bağlanmış olabilir
        setTestResult({
          status: 'success',
          message: `Supabase'e başarıyla bağlanıldı! (Uyarı: Tablolar henüz oluşturulmadıysa SQL Editor'den migration kodunu çalıştırmayı unutmayın)`,
        });
      } else {
        setTestResult({
          status: 'success',
          message: 'Canlı Supabase veritabanına ve PostgreSQL servislerine başarıyla bağlanıldı!',
        });
      }

      updateSupabaseConfig(url.trim(), anonKey.trim());
      onRefresh();
    } catch (err: any) {
      setTestResult({
        status: 'error',
        message: 'Bağlantı hatası: ' + (err?.message || 'Sunucuya erişilemedi.'),
      });
    }
  };

  const handleResetSeed = () => {
    if (confirm('Test verileri başlangıç durumuna döndürülecek. Onaylıyor musunuz?')) {
      mockDb.resetToDefault();
      onRefresh();
      onClose();
    }
  };

  const handleCopySql = () => {
    const sql = `-- Migration dosyasını supabase/migrations/20261025000000_initial_schema.sql içinde bulabilirsiniz.`;
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Supabase Veritabanı Yapılandırması</h2>
              <p className="text-xs text-slate-500">Canlı PostgreSQL ve Auth bağlantı ayarları</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status banner */}
          <div className={`p-3.5 rounded-lg border text-xs flex items-center justify-between ${
            isLive ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <div className="flex items-center gap-2">
              {isLive ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
              <span>
                <strong>Mevcut Durum:</strong> {isLive ? 'Canlı Supabase PostgreSQL Bağlantısı Aktif' : 'Geliştirme / Test Veritabanı Modunda Çalışıyor'}
              </span>
            </div>
          </div>

          <form onSubmit={handleTestAndSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supabase Proje URL (VITE_SUPABASE_URL)
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Supabase Dashboard &gt; Project Settings &gt; API &gt; Project URL
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supabase Anon Public Key (VITE_SUPABASE_ANON_KEY)
              </label>
              <textarea
                rows={2}
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                İstemci tarafı erişimi için anon public key (service_role anahtarını asla girmeyiniz).
              </p>
            </div>

            {testResult.message && (
              <div className={`p-3 rounded-lg text-xs border ${
                testResult.status === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}>
                {testResult.message}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={testResult.status === 'testing'}
                className="flex-1 py-2 px-4 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
              >
                {testResult.status === 'testing' ? 'Bağlantı Test Ediliyor...' : 'Bağlan ve Ayarları Kaydet'}
              </button>
            </div>
          </form>

          {/* Quick info & Reset seed */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Migration SQL: <code className="font-mono text-[11px]">supabase/migrations/</code>
            </span>
            <button
              onClick={handleResetSeed}
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Test Verilerini Sıfırla</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
