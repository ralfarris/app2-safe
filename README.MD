# GameKom Forum App (Vulnerable DevSecOps Target)

Ini adalah proyek aplikasi forum komunitas yang dikembangkan menggunakan stack modern (Node.js/Express, Prisma, React/Vite) dan sengaja diisi dengan kerentanan keamanan (berdasarkan OWASP Top 10) untuk tujuan DevSecOps Training, pengujian SAST, dan pengujian DAST.

## ⚠️ Peringatan Keamanan

## Kerentanan yang Ditargetkan

| OWASP ID | Kerentanan | Endpoint Terkait | Keterangan Singkat |
| :--- | :--- | :--- | :--- |
| **A01:2021** | **Broken Access Control (BAC)** | `PUT /threads/:id`, `DELETE /threads/:id`, `PUT/DELETE /posts/:id` | Kurangnya pengecekan kepemilikan resource. |
| **A03:2021** | **SQL Injection (SQLi)** | `GET /threads/search?q=...` | Query mentah tanpa sanitasi input. |
| **A03:2021** | **Cross-Site Scripting (XSS)** | `POST /threads`, `POST /threads/:id/posts`, `PUT /users/profile` | Input konten/bio tanpa sanitasi HTML. |
| **A03 & A04:2021** | **Remote Code Execution (RCE) & Path Traversal/LFI** | `POST /threads/:id/attachments`, `POST /posts/:id/attachments`, `GET /posts/file?filePath=...` | Validasi file upload longgar & akses file sistem tanpa normalisasi path. |
| **A04:2021** | **Insecure Design (CSRF)** | `DELETE /users/profile` | Endpoint kritis tanpa perlindungan Anti-CSRF token. |

---

## Setup Project (Local Development)

Proyek ini menggunakan Docker Compose untuk mengelola database PostgreSQL, layanan backend (Node.js/Express), dan frontend (React/Vite).

### Prasyarat

Pastikan Anda telah menginstal:
1. Docker dan Docker Compose.
2. Node.js (untuk menjalankan perintah Prisma secara lokal).

### Langkah 1: Konfigurasi Environment Backend (`app2`)

1.  Masuk ke direktori `app2`.
2.  Buat file `.env` dan salin seluruh isi dari file `.env.example` ke dalamnya.

    ```bash
    cd app2
    cp .env.example .env
    ```

3.  Edit file `app2/.env`:
    *   Ganti nilai `JWT_SECRET` dengan string rahasia yang kuat (misalnya, gunakan generator online).
    *   Pada `DATABASE_URL`, ganti `db_postgres:5432` menjadi **`localhost:5432`**. Ini diperlukan agar Prisma CLI di mesin lokal Anda dapat mengakses database untuk migrasi.

    Contoh perubahan di `app2/.env`:

    ```ini
    # SEBELUM MIGRASI (Untuk akses dari host lokal)
    DATABASE_URL="postgresql://app2_user:testpass@localhost:5432/app2_db?schema=public"
    JWT_SECRET="YOUR_VERY_STRONG_AND_NEW_SECRET_KEY"
    ```

### Langkah 2: Membangun dan Menjalankan Kontainer Awal

Kita akan menggunakan `docker-compose.local.yml` untuk development lokal.

1.  Jalankan Docker Compose untuk membangun dan menjalankan semua layanan (database, backend, dan frontend):

    ```bash
    docker compose -f docker-compose.local.yml up -d --build
    ```

2.  Pastikan semua kontainer berjalan:
    ```bash
    docker ps
    ```
    Anda akan melihat `db_postgres` (port 5432), `app2` (port 3000), dan `app2-fe` (port 3001) berjalan.

### Langkah 3: Menjalankan Migrasi Database

Karena kita mengarahkan `DATABASE_URL` ke `localhost`, kita bisa menjalankan perintah Prisma dari host lokal kita untuk menerapkan skema ke database di Docker.

1.  Jalankan migrasi skema dan *seeding* data:

    ```bash
    cd app2
    npx prisma migrate dev --name init_schema
    # Atau gunakan perintah seed jika Anda ingin data awal:
    # npx prisma db seed
    ```

### Langkah 4: Finalisasi Konfigurasi Backend

Setelah migrasi selesai, kita harus mengembalikan `DATABASE_URL` agar layanan backend `app2` dapat berkomunikasi dengan database melalui jaringan Docker.

1.  Edit kembali file `app2/.env`:
    *   Pada `DATABASE_URL`, ganti `localhost:5432` kembali menjadi **`db_postgres:5432`**.

    Contoh perubahan di `app2/.env`:

    ```ini
    # SETELAH MIGRASI (Untuk akses dari kontainer app2)
    DATABASE_URL="postgresql://app2_user:testpass@db_postgres:5432/app2_db?schema=public"
    ```

2.  Rebuild dan restart kontainer backend agar menggunakan koneksi jaringan Docker yang benar:

    ```bash
    docker compose -f docker-compose.local.yml up -d --build app2
    ```

### Langkah 5: Konfigurasi Environment Frontend (`app2-fe`)

1.  Masuk ke direktori `app2-fe`.
2.  Buat file `.env` dan salin isinya dari `.env.example`.

    ```bash
    cd ../app2-fe
    cp .env.example .env
    ```

    Isi file `.env` harus mengarah ke backend yang berjalan di port 3000 (sesuai setup Docker Compose):

    ```ini
    VITE_API_URL="http://localhost:3000"
    ```

### Langkah 6: Akses Aplikasi

| Layanan | URL Akses |
| :--- | :--- |
| **Frontend (App2-FE)** | `http://localhost:3001` |
| **Backend API (App2)** | `http://localhost:3000` |

**Verifikasi Database:**
Akses endpoint API untuk memastikan database terhubung:

```bash
curl http://localhost:3000/threads
```
Anda seharusnya menerima respons JSON yang berisi daftar thread yang telah di-seed sebelumnya.

## Penggunaan Akun Default

Setelah `prisma db seed` dijalankan, beberapa akun uji telah dibuat:

| Username | Email | Password |
| :--- | :--- | :--- |
| `testuser1` | `user1@example.com` | `password123` |
| `testuser2` | `user2@example.com` | `password123` |
| `testuser3` | `user3@example.com` | `password123` |

Gunakan akun-akun ini untuk menguji fungsionalitas dan kerentanan Broken Access Control.