#!/bin/bash
# ==============================================================================
# Öğrenci Haftalık Puan Takip Sistemi - Oracle Cloud Ubuntu Otomatik Kurulum Betiği
# ==============================================================================

set -e

echo "🚀 [1/6] Ubuntu paketleri güncelleniyor ve bağımlılıklar kuruluyor..."
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git nginx certbot python3-certbot-nginx

echo "📦 [2/6] Bağımlılıklar yükleniyor (npm install)..."
npm install

echo "⚙️ [3/6] Ortam değişkenleri kontrol ediliyor..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠️ .env dosyası oluşturuldu. Lütfen Supabase URL ve Anon Key değerlerinizi .env dosyasına ekleyiniz."
fi

echo "🏗️ [4/6] Üretim sürümü derleniyor (npm run build)..."
npm run build

echo "🔄 [5/6] Systemd 7/24 Arka Plan Servisi Yapılandırılıyor..."
SERVICE_FILE="/etc/systemd/system/puan-takip.service"
CURRENT_DIR=$(pwd)
CURRENT_USER=$(whoami)

sudo bash -c "cat > $SERVICE_FILE" <<EOL
[Unit]
Description=Ogrenci Puan Takip Sistemi Node.js App
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$CURRENT_DIR
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOST=0.0.0.0

[Install]
WantedBy=multi-user.target
EOL

sudo systemctl daemon-reload
sudo systemctl enable puan-takip
sudo systemctl restart puan-takip

echo "🌐 [6/6] Nginx Web Sunucusu Yapılandırılıyor..."
NGINX_CONF="/etc/nginx/sites-available/puan-takip"
sudo bash -c "cat > $NGINX_CONF" <<EOL
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOL

sudo ln -sf /etc/nginx/sites-available/puan-takip /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Oracle Cloud iptables ve Güvenlik Duvarı İzinleri
echo "🛡️ Güvenlik duvarı portları açılıyor (80 ve 3000)..."
sudo iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT || true
sudo iptables -I INPUT 1 -p tcp --dport 3000 -j ACCEPT || true

if command -v ufw >/dev/null 2>&1; then
  sudo ufw allow 80/tcp || true
  sudo ufw allow 443/tcp || true
  sudo ufw allow 3000/tcp || true
fi

echo ""
echo "=========================================================================="
echo "✅ TEBRİKLER! Puan Takip Sistemi Oracle Cloud üzerinde başarıyla kuruldu!"
echo "📍 Sunucunuzun IP adresini tarayıcıya yazarak hemen erişebilirsiniz."
echo "🔒 SSL (HTTPS) kurmak için: sudo certbot --nginx -d alanadiniz.com"
echo "=========================================================================="
