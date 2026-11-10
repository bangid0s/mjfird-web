# Setup: login Google + pengirim email (SMTP)

Kode di website sudah siap (tombol Google muncul otomatis begitu provider aktif,
`/auth/callback` menangani Google, konfirmasi email, dan reset password). Yang
tersisa adalah konfigurasi di tiga dasbor luar, karena butuh kunci rahasia yang
hanya bisa dibuat oleh pemilik akun.

Project Supabase: `vocrpuxcgkokuxmrkmqo` (mjfird website).

## 1. Resend — verifikasi domain (± 10 menit + tunggu DNS)

1. Masuk ke resend.com → **Domains → Add domain** → `mjfird.com`.
2. Tambahkan record DNS yang diberikan Resend (SPF/TXT, DKIM, MX untuk
   `send.mjfird.com`) di pengelola DNS domain-mu. Tunggu status **Verified**.
3. **API Keys → Create API key** (permission *Sending access*, domain `mjfird.com`).
   Simpan kuncinya (`re_...`) — kunci yang sama dipakai untuk:
   - `RESEND_API_KEY` di Vercel (notifikasi request & inquiry dari website), dan
   - password SMTP Supabase (email konfirmasi akun & reset password).

## 2. Google Cloud — OAuth client (± 10 menit)

1. console.cloud.google.com → buat project (mis. "MJFIRD Website").
2. **APIs & Services → OAuth consent screen**: User type *External*, nama app
   "MJFIRD", support email, logo opsional, authorized domain `mjfird.com`.
   Scope cukup `email`, `profile`, `openid`. Lalu **Publish app** (status
   *In production*) supaya klien di luar daftar tester bisa login.
3. **Credentials → Create credentials → OAuth client ID** → *Web application*:
   - Authorized JavaScript origins: `https://mjfird.com`
   - Authorized redirect URIs:
     `https://vocrpuxcgkokuxmrkmqo.supabase.co/auth/v1/callback`
4. Salin **Client ID** dan **Client secret**.

## 3. Masukkan ke Supabase

Pilih salah satu.

**A. Lewat dasbor (paling mudah)**

- **Authentication → Sign In / Providers → Google**: aktifkan, tempel Client ID
  & Client secret, Save.
- **Authentication → Emails → SMTP Settings**: aktifkan custom SMTP
  - Sender email: `notifications@mjfird.com` · Sender name: `MJFIRD`
  - Host `smtp.resend.com` · Port `465` · Username `resend` · Password = API key Resend
- **Authentication → Rate Limits**: naikkan *emails per hour* (mis. 60).
- **Authentication → Sign In / Providers → Email**: nyalakan *Confirm email*.
- Template bermerek: salin isi `supabase/templates/*.html` ke
  **Authentication → Emails → Templates** — atau jalankan opsi B yang
  melakukan semua langkah ini sekaligus.

**B. Lewat skrip (sekali jalan, di Mac-mu)**

Buat personal access token di supabase.com/dashboard/account/tokens, lalu dari
folder repo:

```bash
SUPABASE_ACCESS_TOKEN=sbp_xxx RESEND_API_KEY=re_xxx GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com GOOGLE_CLIENT_SECRET=GOCSPX-xxx node scripts/setup-auth.mjs
```

Skrip memasang SMTP → mewajibkan konfirmasi email → template bermerek → Google.
Aman dijalankan ulang; kunci hanya dibaca dari environment, tidak disimpan.

## 4. Vercel

Project Settings → Environment Variables (Production), lalu redeploy:

- `RESEND_API_KEY` = kunci Resend tadi
- `RESEND_FROM` = `MJFIRD <notifications@mjfird.com>`
- `INQUIRY_NOTIFY_EMAIL` = alamat yang menerima notifikasi request baru

## 5. Cek

1. Buka `https://mjfird.com/login` → tombol **Continue with Google** muncul
   (dicek ulang tiap ± 5 menit) → login dengan akun Google → sampai di `/account`.
2. `/signup` dengan email lain → email "Confirm your MJFIRD client account"
   datang dari `notifications@mjfird.com` → klik → masuk `/account`.
3. `/forgot-password` → email reset datang → link membuka `/account/password`.
4. Kirim satu request komisi uji → email notifikasi masuk ke inbox admin.

Catatan: selama SMTP belum terpasang, Supabase hanya mengirim email bawaan
(maks. 2/jam, hanya ke anggota tim Supabase), jadi konfirmasi email sengaja
masih *off* (`mailer_autoconfirm = true`). Skrip mematikannya otomatis begitu
SMTP berhasil dipasang.
