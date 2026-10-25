import React, { useState } from 'react';
import { Server, Copy, Check, Terminal, ExternalLink, ShieldCheck } from 'lucide-react';

interface DeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeploymentModal: React.FC<DeploymentModalProps> = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyCode = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const systemdScript = `sudo nano /etc/systemd/system/puan-takip.service

[Unit]
Description=Ogrenci Puan Takip Sistemi
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/var/www/puan-takip
ExecStart=/usr/bin/npm start
Restart=always
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target`;

  const nginxScript = `server {
    listen 80;
    server_name puan.alanadiniz.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Oracle Cloud Ubuntu VPS Yayınlama Rehberi</h2>
              <p className="text-xs text-slate-500">Üretim sunucusu, Nginx, SSL ve Servis Yapılandırması</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Giriş Bilgilendirmesi */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 leading-relaxed">
            Bu proje <strong>Oracle Cloud Ubuntu 22.04 / 24.04 LTS</strong> üzerinde minimum maliyetle ve sıfır çakışmayla çalışacak şekilde tasarlanmıştır. Veritabanı ve kimlik doğrulama Supabase tarafından sağlandığından sunucuda ikinci bir PostgreSQL yükü oluşmaz.
          </div>

          {/* Adım 1: Ubuntu Paketleri ve Node.js */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">1</span>
                Node.js 22 LTS, Nginx ve Git Kurulumu
              </h3>
              <button
                onClick={() => copyCode('step1', `sudo apt update && sudo apt upgrade -y\ncurl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -\nsudo apt install -y nodejs git nginx`)}
                className="text-[11px] text-slate-600 hover:text-slate-900 flex items-center gap-1"
              >
                {copiedKey === 'step1' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'step1' ? 'Kopyalandı' : 'Kodu Kopyala'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto">
{`sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git nginx`}
            </pre>
          </div>

          {/* Adım 2: Proje Derleme */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">2</span>
                Depoyu Alma, .env Yapılandırması ve Derleme
              </h3>
              <button
                onClick={() => copyCode('step2', `cd /var/www\nsudo git clone <repo-url> puan-takip\ncd puan-takip\nsudo npm install\nsudo cp .env.example .env\nsudo npm run build`)}
                className="text-[11px] text-slate-600 hover:text-slate-900 flex items-center gap-1"
              >
                {copiedKey === 'step2' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'step2' ? 'Kopyalandı' : 'Kodu Kopyala'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto">
{`cd /var/www
sudo git clone <repo-url> puan-takip
cd puan-takip
sudo npm install
sudo cp .env.example .env  # Supabase URL ve Anon Key giriniz
sudo npm run build`}
            </pre>
          </div>

          {/* Adım 3: Systemd Servisi */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">3</span>
                Systemd Servisi ile Otomatik Başlatma
              </h3>
              <button
                onClick={() => copyCode('step3', systemdScript)}
                className="text-[11px] text-slate-600 hover:text-slate-900 flex items-center gap-1"
              >
                {copiedKey === 'step3' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'step3' ? 'Kopyalandı' : 'Kodu Kopyala'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto">
{systemdScript}
            </pre>
            <p className="text-[11px] text-slate-500 mt-1">
              Başlatmak için: <code className="font-mono">sudo systemctl enable --now puan-takip</code>
            </p>
          </div>

          {/* Adım 4: Nginx ve SSL */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">4</span>
                Nginx Ters Proxy &amp; Let's Encrypt SSL
              </h3>
              <button
                onClick={() => copyCode('step4', nginxScript)}
                className="text-[11px] text-slate-600 hover:text-slate-900 flex items-center gap-1"
              >
                {copiedKey === 'step4' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'step4' ? 'Kopyalandı' : 'Kodu Kopyala'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto">
{nginxScript}
            </pre>
            <p className="text-[11px] text-slate-500 mt-1">
              SSL sertifikası için: <code className="font-mono">sudo certbot --nginx -d puan.alanadiniz.com</code>
            </p>
          </div>

          {/* Adım 5: Oracle Security List */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
            <strong>⚠️ Önemli (Oracle Cloud VCN Ayarı):</strong> Oracle Cloud konsolunda Virtual Cloud Network (VCN) &gt; Security Lists &gt; Ingress Rules sekmesinde <code>80</code> ve <code>443</code> portlarına <code>0.0.0.0/0</code> kaynağından izin verildiğinden emin olunuz.
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
