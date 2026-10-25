#!/bin/bash
# ==============================================================================
# Öğrenci Puan Takip Sistemi - Hızlı Güncelleme Betiği
# ==============================================================================
set -e

echo "📦 1. Bağımlılıklar güncelleniyor..."
npm install

echo "🏗️ 2. Proje yeniden derleniyor..."
npm run build

echo "🔄 3. puan-takip servisi yeniden başlatılıyor..."
sudo systemctl restart puan-takip

echo "✅ Güncelleme tamamlandı! Servis durumu:"
sudo systemctl status puan-takip --no-pager -n 10
