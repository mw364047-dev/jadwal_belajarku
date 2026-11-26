# Jadwal Belajarku

Monorepo aplikasi **latihan penyusunan jadwal belajar mingguan siswa kelas VIII SMP** sebagai media pendukung layanan Bimbingan dan Konseling (BK).

## Teknologi

- **Backend:** Laravel 10, PHP 8.1+, REST API, Laravel Sanctum (SPA/cookie).
- **Frontend:** Vite, React, Tailwind CSS, React Router, Axios.
- **Database:** MySQL melalui Laragon/phpMyAdmin.
- **Bahasa antarmuka:** Indonesia.

## Struktur proyek

```text
jadwal-belajarku/
├── backend/
│   ├── app/Models/                 # Model dan relasi Eloquent
│   ├── database/migrations/       # Skema seluruh tabel
│   ├── database/seeders/          # Data demo fiktif
│   ├── routes/api.php             # Endpoint API
│   └── ...
├── frontend/                      # Vite + React + Tailwind
└── README.md
```

## 1. Persiapan Laragon

Pastikan perangkat sudah memiliki:

- Laragon, dengan MySQL aktif.
- PHP 8.1+ dan ekstensi PHP yang dibutuhkan Laravel, termasuk `pdo_mysql`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `curl`, dan `fileinfo`.
- Composer 2.x.
- Node.js 18+ dan npm.

Ekstrak proyek, misalnya ke `C:\laragon\www\jadwal-belajarku`.

## 2. Buat database MySQL

1. Jalankan MySQL dari Laragon.
2. Buka `http://localhost/phpmyadmin`.
3. Buat database bernama `jadwal_belajarku` dengan collation `utf8mb4_unicode_ci`.
4. Pastikan `backend/.env` mengarah ke MySQL Laragon:

```dotenv
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=jadwal_belajarku
DB_USERNAME=root
DB_PASSWORD=
```

Sesuaikan host, port, dan password bila konfigurasi Laragon berbeda.

## 3. Instalasi backend

Buka terminal pada folder proyek:

```powershell
cd C:\laragon\www\jadwal-belajarku\backend
composer install
```

Bila `.env` belum tersedia, salin dari contoh:

```powershell
Copy-Item .env.example .env
```

Buat application key:

```powershell
php artisan key:generate
```

**Penting:** jalankan `key:generate` sebelum seeder. Kolom `layanan_bk.tindak_lanjut` menggunakan cast `encrypted` Laravel yang memerlukan `APP_KEY`.

Pastikan `.env` berisi konfigurasi database di atas serta pengaturan lokal Sanctum berikut:

```dotenv
APP_NAME="Jadwal Belajarku"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000
SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173,localhost,127.0.0.1
SESSION_DRIVER=file
SESSION_DOMAIN=null
SESSION_SECURE_COOKIE=false
```

Jalankan migrasi dan seeder:

```powershell
php artisan migrate --seed
```

Untuk menghapus dan membangun ulang seluruh tabel lalu mengisi ulang data demo:

```powershell
php artisan migrate:fresh --seed
```

> **Peringatan:** `migrate:fresh` menghapus semua tabel pada database yang dipakai. Gunakan hanya pada database pengembangan/demo, bukan database berisi data penting.

Jalankan server API:

```powershell
php artisan serve --host=127.0.0.1 --port=8000
```

Endpoint pemeriksaan API: `http://127.0.0.1:8000/api/ping`.

## 4. Instalasi frontend

Buka terminal kedua:

```powershell
cd C:\laragon\www\jadwal-belajarku\frontend
npm install
npm run dev
```

Buka alamat Vite, biasanya `http://127.0.0.1:5173`. Pastikan `frontend/.env` menggunakan URL root backend, bukan URL yang sudah ditambah `/api`:

```dotenv
VITE_API_URL=http://127.0.0.1:8000
```

## 5. Akun demo dari seeder

Semua akun di bawah adalah **data fiktif** untuk pengembangan lokal. Password semua akun:

```text
Belajar123!
```

| Peran | Username | Email | Password |
|---|---|---|---|
| Admin | `admin` | `admin@jadwalbelajarku.test` | `Belajar123!` |
| Guru BK 1 | `guru01` | `guru01@jadwalbelajarku.test` | `Belajar123!` |
| Guru BK 2 | `guru02` | `guru02@jadwalbelajarku.test` | `Belajar123!` |
| Guru BK 3 | `guru03` | `guru03@jadwalbelajarku.test` | `Belajar123!` |
| Siswa | `siswa01` sampai `siswa20` | `siswa01@jadwalbelajarku.test` sampai `siswa20@jadwalbelajarku.test` | `Belajar123!` |

Akun guru dan siswa diset `must_change_password=true` sebagai contoh alur akun awal. Seeder tidak membuat data pribadi siswa nyata. Jangan gunakan akun/password demo ini di produksi.

## 6. Skema tabel dan relasi

| Tabel | Isi utama | Relasi utama |
|---|---|---|
| `users` | Identitas login, role, status akun, waktu login, penguncian sementara, soft delete | Induk akun admin, guru BK, dan siswa |
| `guru_bk` | Profil guru BK (`user_id`, NIP, jabatan) | `users` 1:1; guru memiliki banyak penugasan, komentar, dan layanan |
| `kelas` | Nama kelas dan tahun ajaran | Kelas memiliki banyak siswa dan layanan |
| `siswa` | Profil siswa, NIS unik, kelas | `users` 1:1; siswa memiliki tugas, jadwal, refleksi, komentar, layanan, dan guru binaan |
| `penugasan_guru_siswa` | Penugasan guru ke siswa per tahun ajaran | Pivot many-to-many guru BK dan siswa; kombinasi guru, siswa, tahun ajaran unik |
| `tugas` | Mata pelajaran, judul, tenggat, durasi, prioritas, status | Milik seorang siswa; dapat ditautkan ke beberapa blok jadwal |
| `jadwal` | Tahun, minggu, hari, jam, jenis blok, kegiatan, catatan | Milik siswa; tugas opsional; memiliki komentar guru |
| `refleksi` | Refleksi mingguan dan opsi privat | Milik siswa; satu refleksi per siswa/tahun/minggu; memiliki komentar guru |
| `komentar_guru` | Umpan balik guru untuk siswa | Terkait guru dan siswa, serta opsional ke jadwal atau refleksi |
| `layanan_bk` | Catatan layanan BK | Milik guru; siswa/kelas opsional; soft delete |
| `materi` | Materi pembelajaran | Pembuat terhubung ke `users` melalui `dibuat_oleh` |
| `log_aktivitas` | Catatan aksi, modul, IP, waktu | Terhubung ke pengguna; referensi pengguna boleh null agar log dapat dipertahankan |

### Aturan foreign key dan penghapusan

- Profil `guru_bk`/`siswa` mengikuti akun `users`; penghapusan fisik akun menghapus profil terkait. Penghapusan normal pengguna memakai **SoftDeletes**, sehingga tidak langsung menghapus relasi.
- `kelas` menggunakan `RESTRICT` terhadap siswa agar kelas yang masih dipakai tidak terhapus.
- Penugasan, tugas, jadwal, refleksi, dan komentar mengikuti data induknya dengan `CASCADE` saat penghapusan fisik.
- `jadwal.tugas_id`, target komentar (`jadwal_id`/`refleksi_id`), `layanan_bk.siswa_id`, `layanan_bk.kelas_id`, `materi.dibuat_oleh`, dan `log_aktivitas.user_id` memakai `SET NULL` pada penghapusan fisik referensi opsional.
- `layanan_bk.guru_id` memakai `RESTRICT` untuk menjaga riwayat layanan ketika ada upaya menghapus fisik profil guru. Tabel `layanan_bk` juga memakai **SoftDeletes**.
- `layanan_bk.tindak_lanjut` menggunakan tipe `LONGTEXT` dan Eloquent cast `encrypted`, bukan teks terenkripsi manual.

### Model Eloquent

Model yang tersedia di `backend/app/Models/`:

`User`, `GuruBk`, `Kelas`, `Siswa`, `PenugasanGuruSiswa`, `Tugas`, `Jadwal`, `Refleksi`, `KomentarGuru`, `LayananBk`, `Materi`, dan `LogAktivitas`.

Relasi utama disediakan sebagai `hasOne`, `hasMany`, `belongsTo`, dan `belongsToMany` sesuai hubungan tabel. `User` dan `LayananBk` menggunakan `SoftDeletes`; `User.password` menggunakan cast `hashed`; `LayananBk.tindak_lanjut` menggunakan cast `encrypted`.

## 7. Isi data seeder

`DatabaseSeeder` membuat data demo:

- 1 admin dan 3 guru BK.
- 2 kelas (VIII A dan VIII B, tahun ajaran 2026/2027).
- 20 siswa fiktif (10 siswa per kelas).
- 24 penugasan guru–siswa.
- 40 tugas, 60 blok jadwal, dan 20 refleksi mingguan.
- 3 catatan layanan BK untuk menguji penyimpanan terenkripsi.
- 2 materi singkat.

Seeder menggunakan data deterministik dan tidak membutuhkan Faker. Tanggal tenggat dan minggu jadwal dibentuk relatif terhadap tanggal proses seeding.

## 8. Pengujian hasil di phpMyAdmin

Sesudah `php artisan migrate:fresh --seed` berhasil:

1. Buka `http://localhost/phpmyadmin`.
2. Pilih database `jadwal_belajarku`.
3. Pastikan tabel berikut terbentuk: `users`, `guru_bk`, `kelas`, `siswa`, `penugasan_guru_siswa`, `tugas`, `jadwal`, `refleksi`, `komentar_guru`, `layanan_bk`, `materi`, `log_aktivitas`, `password_reset_tokens`, dan `personal_access_tokens` (tabel Sanctum dibuat oleh migrasi paket).
4. Periksa jumlah data inti dengan SQL:

```sql
SELECT role, COUNT(*) AS jumlah FROM users GROUP BY role;
SELECT COUNT(*) AS jumlah_kelas FROM kelas;
SELECT COUNT(*) AS jumlah_siswa FROM siswa;
SELECT COUNT(*) AS jumlah_penugasan FROM penugasan_guru_siswa;
SELECT COUNT(*) AS jumlah_tugas FROM tugas;
SELECT COUNT(*) AS jumlah_jadwal FROM jadwal;
SELECT COUNT(*) AS jumlah_refleksi FROM refleksi;
SELECT COUNT(*) AS jumlah_layanan FROM layanan_bk;
```

Jumlah yang diharapkan: `users` = admin 1, guru BK 3, siswa 20; kelas 2; siswa 20; penugasan 24; tugas 40; jadwal 60; refleksi 20; layanan BK 3.

Untuk memastikan kolom `tindak_lanjut` terenkripsi, buka baris pada tabel `layanan_bk`: nilai tersimpan akan berupa ciphertext, bukan kalimat demo yang dapat dibaca. Saat dibaca melalui model `LayananBk`, Laravel mendekripsinya otomatis selama `APP_KEY` tetap sama.

## 9. Pengujian endpoint dan frontend

1. Jalankan backend di terminal pertama dan frontend di terminal kedua.
2. Buka `http://127.0.0.1:8000/api/ping`; respons seharusnya berupa JSON dengan `success: true`.
3. Buka `http://127.0.0.1:5173`; halaman pemeriksaan koneksi akan meminta endpoint ping dan menampilkan status koneksi.
4. Perubahan konfigurasi `.env` frontend memerlukan Vite dimulai ulang. Perubahan `.env` backend dapat memerlukan `php artisan config:clear`.

## 10. Autentikasi, sesi, dan otorisasi peran

Aplikasi menggunakan **Sanctum SPA berbasis cookie sesi**. Browser tidak menyimpan personal access token di `localStorage`; Axios mengirim cookie sesi dan XSRF token. Tidak ada endpoint pendaftaran mandiri. Akun dibuat oleh admin atau melalui seeder.

### Konfigurasi lokal

Gunakan hostname yang konsisten untuk frontend dan backend. Konfigurasi proyek memakai Vite di `http://127.0.0.1:5173` dan Laravel di `http://127.0.0.1:8000`. Pastikan `backend/.env` memuat:

```dotenv
APP_URL=http://127.0.0.1:8000
SANCTUM_STATEFUL_DOMAINS=127.0.0.1:5173,localhost:5173,127.0.0.1,localhost
SESSION_DRIVER=file
SESSION_DOMAIN=null
SESSION_SECURE_COOKIE=false
SESSION_SAME_SITE=lax
```

CORS sudah mengizinkan origin `http://127.0.0.1:5173` dan `http://localhost:5173`, serta `supports_credentials=true`. Sanctum stateful middleware sudah aktif pada grup API. Sesudah mengubah `.env`, jalankan:

```powershell
cd backend
php artisan config:clear
```

### Endpoint autentikasi

| Method | Endpoint | Fungsi |
|---|---|---|
| `POST` | `/api/login` | Login menggunakan `username` atau email dan password |
| `POST` | `/api/logout` | Mengakhiri sesi pengguna |
| `GET` | `/api/me` | Mengambil pengguna yang sedang login |
| `PUT` | `/api/password` | Mengganti password saat ini dan menyelesaikan kewajiban ganti password awal |
| `GET` | `/api/admin/access-check` | Uji akses khusus admin |
| `GET` | `/api/guru/access-check` | Uji akses khusus guru BK |
| `GET` | `/api/siswa/access-check` | Uji akses khusus siswa |

Payload login:

```json
{
  "username": "admin",
  "password": "Belajar123!"
}
```

Payload ganti password:

```json
{
  "current_password": "Belajar123!",
  "password": "KataSandiBaru123!",
  "password_confirmation": "KataSandiBaru123!"
}
```

Akun dinonaktifkan ditolak. Lima password salah untuk akun yang sama menyebabkan akun terkunci selama 10 menit. Waktu login berhasil disimpan di `users.last_login_at`, penghitung kegagalan direset, dan aksi login/logout/ganti password dicatat di `log_aktivitas`. Setelah masa penguncian berakhir, hitungan dimulai kembali.

### Middleware dan aturan akses

- `auth:sanctum`: pengguna wajib terautentikasi.
- `active`: menolak akun yang sudah dinonaktifkan.
- `password.changed`: mewajibkan penggantian password awal sebelum menggunakan modul terlindungi.
- `role:admin`, `role:guru_bk`, atau `role:siswa`: memeriksa peran di backend. Middleware dapat menerima beberapa role, misalnya `role:guru_bk,siswa`.

Untuk endpoint CRUD berikutnya, gunakan kombinasi `auth:sanctum`, `active`, `password.changed`, dan middleware `role` yang sesuai. Pemeriksaan rute di React hanya untuk navigasi; keputusan keamanan tetap dilakukan Laravel.

### Alur halaman frontend

- `/` menampilkan halaman informasi dan pemeriksaan koneksi API yang sudah ada.
- `/login` menampilkan form login; tidak ada tombol atau endpoint daftar akun.
- `/ganti-password` wajib dibuka setelah login jika `must_change_password=true`.
- Admin diarahkan ke `/admin`, guru BK ke `/guru`, dan siswa ke `/siswa`.
- Rute peran yang tidak sesuai akan diarahkan kembali sesuai peran pengguna. Backend tetap menolak akses API lintas peran dengan HTTP 403.
- AuthContext memeriksa ulang sesi setiap 60 detik. Ketika sesi tidak valid (HTTP 401) atau akun dinonaktifkan, status login dibersihkan dan ProtectedRoute mengarahkan pengguna ke halaman login.

Halaman `/admin`, `/guru`, dan `/siswa` pada tahap ini merupakan dashboard awal/placeholder untuk menguji autentikasi dan perutean peran. Modul CRUD belum ditambahkan.

### Akun demo dan cara uji

Password awal semua akun seeder adalah `Belajar123!`.

| Peran | Username | Perilaku login pertama |
|---|---|---|
| Admin | `admin` | Langsung masuk ke `/admin` |
| Guru BK | `guru01`, `guru02`, `guru03` | Diwajibkan mengganti password |
| Siswa | `siswa01` sampai `siswa20` | Diwajibkan mengganti password |

1. Jalankan server backend: `php artisan serve --host=127.0.0.1 --port=8000`.
2. Jalankan frontend: `npm run dev` pada folder `frontend`, lalu buka `http://127.0.0.1:5173/login`.
3. Login dengan `admin` untuk memeriksa redirect `/admin`. Logout, lalu login dengan `guru01` atau `siswa01`; pastikan halaman mengarahkan ke `/ganti-password`.
4. Ganti password awal. Setelah berhasil, pengguna diarahkan ke dashboard sesuai perannya.
5. Uji endpoint akses peran dari browser DevTools/Postman dengan cookie sesi yang sama. Admin hanya boleh memperoleh HTTP 200 pada `/api/admin/access-check`; permintaan ke `/api/guru/access-check` atau `/api/siswa/access-check` harus HTTP 403. Lakukan uji serupa untuk guru dan siswa. Guru/siswa yang belum mengganti password akan menerima HTTP 423 pada endpoint modul terlindungi.
6. Untuk uji penguncian, logout lalu masukkan password salah sebanyak lima kali untuk username yang sama. Percobaan kelima harus menerima HTTP 423. Periksa `failed_login_count=5` dan `locked_until` pada tabel `users`. Akun akan dapat mencoba lagi setelah 10 menit.
7. Uji akun nonaktif dengan mengubah `is_active` menjadi `0` untuk akun demo, lalu coba login; server harus menolak dengan HTTP 403. Pulihkan nilainya setelah pengujian.

Contoh pemeriksaan database:

```sql
SELECT username, role, is_active, must_change_password,
       failed_login_count, locked_until, last_login_at
FROM users
WHERE username IN ('admin', 'guru01', 'siswa01');

SELECT user_id, aksi, modul, ip_address, waktu
FROM log_aktivitas
WHERE modul = 'auth'
ORDER BY waktu DESC;
```

**Catatan:** sesi SPA membutuhkan cookie dan XSRF. Untuk pengujian browser lokal, gunakan hostname `127.0.0.1` secara konsisten untuk Vite dan Laravel, dan jangan mencampur `localhost` dengan `127.0.0.1` pada tab yang sama. Login frontend otomatis meminta `/sanctum/csrf-cookie` sebelum `POST /api/login`.

## 11. Catatan cakupan dan keamanan

Tahap autentikasi ini menambahkan login, logout, endpoint pengguna aktif, ganti password, middleware status/peran, penguncian sementara, pencatatan login, dan halaman awal dashboard. Modul CRUD belum ditambahkan. Jangan masukkan data siswa nyata sebelum izin sekolah dan persetujuan orang tua/wali dipenuhi. `migrate:fresh` hanya untuk database lokal/demo.
