import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

app.use(express.json());

// API Durum ve Sağlık Kontrolü Uç Noktası
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    supabaseConnected: Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY),
  });
});

// Statik frontend dosyalarını sunma (Production build: dist)
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

// SPA Yönlendirmesi (Single Page Application Fallback)
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html lang="tr">
        <head><meta charset="utf-8"><title>Puan Takip Sistemi - Geliştirme Modu</title></head>
        <body style="font-family:sans-serif;padding:2rem;text-align:center;">
          <h2>Puan Takip Sistemi API Sunucusu Aktif</h2>
          <p>Frontend geliştirme modu için Vite dev sunucusunu (port 3000) kullanınız ya da 'npm run build' çalıştırınız.</p>
        </body>
        </html>
      `);
    }
  });
});

app.listen(PORT, HOST, () => {
  console.log(`[Puan Takip Sistemi] Node.js sunucusu http://${HOST}:${PORT} üzerinde aktif.`);
});
