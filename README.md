# Öğrenci Haftalık Puan Takip Sistemi

Öğretmenlerin sınıf, ders ve hafta bazında öğrencilere toplu puan verebilmesini; öğrencilerin ise yalnızca kendi geçmiş haftalık sonuçlarını ve ders ortalamalarını takip edebilmesini sağlayan, Supabase PostgreSQL & Auth ve React + TypeScript + Node.js tabanlı web uygulaması.

---

## 🚀 Temel Özellikler

- **Supabase Auth & PostgreSQL**: Rol bazlı güvenli oturum yönetimi (`teacher` ve `student`).
- **Row Level Security (RLS)**: Veritabanı seviyesinde katı yetkilendirme. Öğrenciler hiçbir koşulda diğer öğrencilerin puanlarına veya sınıflarına erişemez.
- **Toplu Puan Girişi**: Sınıf -> Ders -> Hafta -> Çalışma sıralı filtreleme; klavye ile hızlı geçiş, taslak kaydetme, anlık doğrulama ve tek tıkla toplu güncelleme (`bulk_upsert_grades`).
- **Öğrenci Paneli & Grafikler**: Haftalık puan değişim grafiği (eksik haftalar ile sıfır puanı net ayıran yapı), ders ortalamaları ve öğretmen açıklamaları.
- **Haftalık Çalışma Yönetimi**: Esnek hafta numaralandırması, tarih, açıklama ve dinamik maksimum puan desteği.
- **Oracle Cloud Ubuntu VPS Hazır**: Systemd, Nginx Reverse Proxy, SSL ve Docker desteği ile taşınabilir mimari.

---

## 🛠️ Teknoloji Yığını

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Motion
- **Backend / Sunucu**: Node.js, Express, tsx
- **Veritabanı & Kimlik Doğrulama**: Supabase (PostgreSQL 15+, RLS, SQL Triggers & Functions, Supabase Auth)
- **Deployment Hedefi**: Oracle Cloud Ubuntu 22.04 / 24.04 LTS VPS, Docker & docker-compose

---

## 📦 Kurulum ve Yerel Geliştirme

### 1. Depoyu klonlayın ve bağımlılıkları yükleyin:
```bash
git clone <repo-url>
cd puan-takip-sistemi
npm install
```

### 2. Ortam Değişkenlerini Tanımlayın:
`.env.example` dosyasını `.env` olarak kopyalayın:
```bash
cp .env.example .env
```
`.env` dosyasını açıp Supabase bilgilerinizi girin:
```env
VITE_SUPABASE_URL="https://projeniz.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIs..."
PORT=3000
NODE_ENV="development"
```

### 3. Supabase Veritabanı Migration İşlemi:
Supabase Dashboard -> **SQL Editor** bölümüne gidin ve `supabase/migrations/20261025000000_initial_schema.sql` dosyasındaki tüm SQL kodunu çalıştırın.

Bu işlem:
- `profiles`, `classes`, `subjects`, `class_subjects`, `enrollments`, `weekly_activities`, `grades` tablolarını oluşturur.
- Yeni kayıt olan kullanıcılara otomatik olarak `student` profili atayan tetikleyiciyi (`on_auth_user_created`) kurar.
- Puan sınır kontrollerini (`check_grade_score_limit`) ve toplu kayıt transaction fonksiyonunu (`bulk_upsert_grades`) ekler.
- Tüm tablolarda Row Level Security (RLS) politikalarını devreye alır.

### 4. İlk Öğretmen Hesabını Yetkilendirme:
1. Uygulama arayüzünden veya Supabase Auth panelinden öğretmen olarak kullanacağınız e-posta adresiyle bir hesap oluşturun.
2. Supabase **SQL Editor** üzerinden şu komutu çalıştırarak kullanıcıyı öğretmen rolüne yükseltin:
```sql
UPDATE public.profiles
SET role = 'teacher'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'ogretmen@okul.k12.tr'
);
```

### 5. Uygulamayı Başlatın:
```bash
# Geliştirme sunucusu (Vite)
npm run dev

# veya Üretim derlemesi ve Node.js sunucusu
npm run build
npm start
```
Uygulama `http://localhost:3000` adresinde çalışacaktır.

---

## ☁️ Oracle Cloud Ubuntu VPS Üzerinde Yayınlama

### A Yöntemi: Systemd ve PM2 ile Doğrudan Kurulum (Önerilen)

1. **Ubuntu Sunucunuzu Güncelleyin ve Node.js 22 Kurun**:
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git nginx
```

2. **Projeyi Sunucuya Alın**:
```bash
cd /var/www
sudo git clone <repo-url> puan-takip
cd puan-takip
sudo npm install
sudo cp .env.example .env
# .env dosyasını nano veya vi ile düzenleyin
sudo npm run build
```

3. **Systemd Servisi Oluşturun**:
`/etc/systemd/system/puan-takip.service` dosyasını oluşturun:
```ini
[Unit]
Description=Ogrenci Puan Takip Sistemi Node.js App
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
WantedBy=multi-user.target
```
Servisi başlatın:
```bash
sudo systemctl daemon-reload
sudo systemctl enable puan-takip
sudo systemctl start puan-takip
sudo systemctl status puan-takip
```

4. **Nginx Reverse Proxy ve SSL (Let's Encrypt)**:
`/etc/nginx/sites-available/puan-takip` dosyasını düzenleyin:
```nginx
server {
    listen 80;
    server_name puan.alanadiniz.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
Aktifleştirin ve SSL sertifikasını kurun:
```bash
sudo ln -s /etc/nginx/sites-available/puan-takip /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d puan.alanadiniz.com
```

5. **Oracle Cloud Güvenlik Listeleri (Ingress Rules)**:
Oracle Cloud konsolunda VCN -> Security Lists bölümünden `80` (HTTP) ve `443` (HTTPS) portlarına `0.0.0.0/0` için Ingress izni verin.

---

### B Yöntemi: Docker & docker-compose ile Kurulum

```bash
# Docker ve Docker Compose kurulumu:
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker $USER

# Proje dizininde:
docker-compose up -d --build
```

---

## 🔒 Güvenlik Mimarisi ve RLS Doğrulamaları

1. **Yetkisiz Rol Değişimi Engeli**: Kullanıcı kayıt formundan gelen `role` parametresi dikkate alınmaz; veritabanı tetikleyicisi (`handle_new_user`) rolü daima `student` olarak kilitler.
2. **Öğrenci Veri Yalıtımı**: Öğrenci yalnızca `student_id = auth.uid()` koşulu sağlanan puan kayıtlarını okuyabilir. Doğrudan API istekleri veya sorgu manipülasyonu veritabanı düzeyinde RLS tarafından engellenir.
3. **Puan Aralığı Koruması**: Negatif puanlar veya haftalık çalışmanın `max_score` değerinden yüksek puan girişleri hem arayüzde hem de veritabanı seviyesindeki `trg_check_grade_score` tetikleyicisiyle reddedilir.
4. **Mükerrer Kayıt Engeli**: `uq_activity_student` benzersizlik kısıtı sayesinde aynı öğrenciye aynı etkinlik için iki kayıt açılamaz; `bulk_upsert_grades` fonksiyonu var olan kaydı güvenle günceller.
