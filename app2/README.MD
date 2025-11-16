## Apps2 Backend Service - DevSecOps Target

Aplikasi backend ini dikembangkan menggunakan **Node.js (Express.js)** dan **Prisma ORM** dengan database **PostgreSQL**. Tujuan utama proyek ini adalah menyediakan platform forum komunitas yang sengaja **mengandung berbagai kerentanan keamanan** untuk diuji dan didemonstrasikan dalam lingkungan DevSecOps (SAST, DAST).

### Daftar Kerentanan Utama yang Disisipkan

Proyek ini menargetkan kerentanan kritis berdasarkan OWASP Top 10 (2021):

| OWASP ID | Kerentanan | Endpoint Terkait | Mekanisme |
| :--- | :--- | :--- | :--- |
| **A01:2021** | **Broken Access Control (BAC)** | `PUT /threads/:id`, `DELETE /threads/:id`, `PUT /posts/:id`, `DELETE /posts/:id` | User dapat memodifikasi/menghapus resource milik user lain karena tidak ada pengecekan kepemilikan. |
| **A03:2021** | **SQL Injection (SQLi)** | `GET /threads/search?q=...` | Input pengguna digabungkan langsung ke query SQL mentah. |
| **A03:2021** | **Cross-Site Scripting (XSS)** | `POST /threads`, `POST /threads/:id/posts`, `PUT /users/profile` | Konten (`title`, `content`, `bio`) disimpan tanpa sanitasi HTML/script yang memadai. |
| **A03:2021** | **Remote Code Execution (RCE)** | `POST /users/profile/picture`, `POST /posts/:id/attachments` | Validasi tipe file/ekstensi tidak dilakukan secara ketat, memungkinkan upload file berbahaya. |
| **A04:2021** | **Insecure Design (CSRF)** | `DELETE /users/profile` | Endpoint DELETE kritis tidak dilindungi oleh token Anti-CSRF. |
| **A04:2021** | **Path Traversal/LFI** | `GET /posts/file?filePath=...`, `GET /posts/:id` | Endpoint pengambilan file tidak memvalidasi path, memungkinkan akses ke file sistem di luar direktori unggahan. |


---

## Dokumentasi API Endpoints

Semua endpoint berawalan langsung dari root (`/`).

### 0. Akses File Statis dan Pengambilan File

Semua file yang diunggah dapat diakses melalui dua cara:

| Metode | Endpoint | Deskripsi | Kebutuhan | Kerentanan |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/uploads/:path/:filename` | Mengambil file statis yang diunggah. | Guest | - |
| `GET` | `/posts/file?filePath=...` | Mengambil attachment berdasarkan path (Query Param). | Guest | **A04: Path Traversal/LFI** |
| `GET` | `/posts/:id` | Mengambil attachment berdasarkan Attachment ID. | Guest | **A04: Path Traversal/LFI (via DB)** |

#### Detail Endpoint Pengambilan File

| Endpoint | Request (Contoh) | Response (Sukses 200) |
| :--- | :--- | :--- |
| `GET /posts/file?filePath=attachments/abc.jpg` | Query params: `filePath` | Mengembalikan konten file (image/binary stream). |
| `GET /posts/file?filePath=../../../../etc/passwd` | Query params: `filePath` (VULNERABLE LFI) | Mengembalikan konten file `/etc/passwd` dari sistem host. |
| `GET /posts/10` | Path param: Attachment ID | Mengembalikan konten file dari attachment dengan ID 10. |

### 1. Otentikasi (`/auth`)

| Metode | Endpoint | Deskripsi | Kebutuhan |
| :--- | :--- | :--- |
| `POST` | `/auth/register` | Registrasi user baru. | Guest |
| `POST` | `/auth/login` | Login, mengembalikan JWT. | Guest |
| `POST` | `/auth/logout` | Logout (klien harus menghapus JWT). | User |

#### Detail Endpoint Otentikasi

| Endpoint | Request Body (Contoh) | Response Body (Sukses 201/200) |
| :--- | :--- | :--- |
| `POST /auth/register` | ```json { "username": "hacker123", "email": "hacker@example.com", "password": "securepassword123" } ``` | ```json { "message": "Registrasi berhasil.", "user": { "user_id": 5, "username": "hacker123", "email": "hacker@example.com" } } ``` |
| `POST /auth/login` | ```json { "email": "hacker@example.com", "password": "securepassword123" } ``` | ```json { "message": "Login berhasil.", "token": "eyJhbGciOiJIUzI1NiI...", "user": { "user_id": 5, "username": "hacker123", "email": "hacker@example.com" } } ``` |
| `POST /auth/logout` | Tidak ada | ```json { "message": "Logout berhasil." } ``` |

### 2. Thread (`/threads`)

| Metode | Endpoint | Deskripsi | Kebutuhan | Kerentanan |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/threads/` | Melihat semua daftar thread (Paginasi). | Guest | - |
| `GET` | `/threads/:id` | Melihat detail thread. | Guest | - |
| `GET` | `/threads/search?q=keyword` | Pencarian thread. | Guest | A03: SQL Injection |
| `POST` | `/threads/` | Membuat thread baru. | User | A03: XSS (pada `content`) |
| `PUT` | `/threads/:id` | Mengedit thread. | User | A01: Broken Access Control |
| `DELETE` | `/threads/:id` | Menghapus thread. | User | A01: Broken Access Control |
| `POST` | `/threads/:id/like` | Memberi/Menghapus like pada thread. | User | - |
| `POST` | `/threads/:id/attachments` | Mengunggah attachment untuk thread. (Form Data) | User | A03: RCE/XSS Metadata |
| `GET` | `/threads/:threadId/posts` | Mengambil semua balasan dalam sebuah thread (Paginasi). | Guest | - |
| `POST` | `/threads/:threadId/posts` | Membuat balasan pada thread. | User | A03: XSS (pada `content`) |

#### Detail Endpoint Thread

| Endpoint | Request Body (Contoh) | Response Body (Sukses) |
| :--- | :--- | :--- |
| `GET /threads/?page=1&limit=1` | Query params: `page`, `limit` | ```json { "message": "Daftar thread berhasil diambil.", "data": [ { "thread_id": 1, "title": "Thread Pertama", "content": "Konten thread...", "created_at": "...", "author": { "username": "user1" }, "attachments": [], "_count": { "threadLikes": 5, "posts": 12 } } ], "pagination": { "totalItems": 50, "totalPages": 5, "currentPage": 1, "itemsPerPage": 10 } } ``` |
| `GET /threads/search?q=test' OR 1=1 --` | Query params: `q=keyword` (VULNERABLE SQLi) | ```json { "message": "Hasil pencarian berhasil diambil (VULNERABLE SQLi)", "data": [ { "thread_id": 1, "title": "Test Title", "content": "Test Content", "created_at": "...", "author_username": "user1" } ] } ``` |
| `POST /threads/:id/attachments` | `multipart/form-data` dengan field `file` | ```json { "message": "Attachment berhasil diunggah ke thread.", "attachment": { "attachment_id": 1, "file_name": "filename.jpg", "file_path": "uploads/...", "thread_id": 10 } } ``` |
| `POST /threads/1/posts` | ```json { "content": "Balasan dengan script: <img src=x onerror=alert(document.domain)>" } ``` | ```json { "message": "Balasan berhasil dibuat (VULNERABLE XSS)", "post": { "post_id": 20, "user_id": 5, "thread_id": 1, "content": "Balasan dengan script: ...", "created_at": "..." } } ``` |

### 3. Post/Balasan & Attachment Utility (`/posts`)

Rute ini menangani operasi pada post dan fungsionalitas pengambilan file umum.

| Metode | Endpoint | Deskripsi | Kebutuhan | Kerentanan |
| :--- | :--- | :--- | :--- | :--- |
| `PUT` | `/posts/:postId` | Mengedit balasan/post. | User | A01: Broken Access Control |
| `DELETE` | `/posts/:postId` | Menghapus balasan/post. | User | A01: Broken Access Control |
| `POST` | `/posts/:postId/like` | Memberi/Menghapus like pada post. | User | - |
| `POST` | `/posts/:postId/attachments` | Mengunggah attachment untuk post. (Form Data) | User | A03: RCE/XSS Metadata |

#### Detail Endpoint Post dan Attachment Utility

| Endpoint | Request Body (Contoh) | Response Body (Sukses) |
| :--- | :--- | :--- |
| `PUT /posts/5` | ```json { "content": "Konten diperbarui oleh attacker (VULNERABLE BAC)" } ``` | ```json { "message": "Balasan berhasil diperbarui (VULNERABLE BAC)", "post": { "post_id": 5, "content": "Konten diperbarui oleh attacker (VULNERABLE BAC)" } } ``` |
| `DELETE /posts/5` | Path param: `postId=5` | ```json { "message": "Balasan berhasil dihapus (VULNERABLE BAC)." } ``` |
| `POST /posts/5/attachments` | `multipart/form-data` dengan field `file` | ```json { "message": "Attachment berhasil diunggah (VULNERABLE RCE/XSS Metadata)", "attachment": { "attachment_id": 2, "file_name": "evil_payload.php.jpg", "file_path": "uploads/attachments/...", "mime_type": "image/jpeg" } } ``` |

### 4. User dan Profil (`/users`)

| Metode | Endpoint | Deskripsi | Kebutuhan | Kerentanan |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/users/profile` | Melihat profil pengguna sendiri. | User | - |
| `GET` | `/users/:username` | Melihat profil publik pengguna lain. | Guest | - |
| `GET` | `/users/:username/threads` | Melihat daftar thread yang dibuat oleh pengguna. | Guest | - |
| `PUT` | `/users/profile` | Mengedit profil (mengizinkan perubahan username, email, bio, password, atau profile picture). (Form Data) | User | A03: XSS (pada `bio`) dan A03: RCE (melalui upload gambar) |
| `DELETE` | `/users/profile` | Menghapus akun. | User | A04: Insecure Design (CSRF) |

#### Detail Endpoint User dan Profil

| Endpoint | Request Body (Contoh) | Response Body (Sukses) |
| :--- | :--- | :--- |
| `GET /users/profile` | Tidak ada | ```json { "data": { "user_id": 5, "username": "hacker123", "email": "hacker@example.com", "bio": "My awesome bio.", "profile_picture_path": "uploads/profile/...", "created_at": "..." } } ``` |
| `PUT /users/profile` | `multipart/form-data` (contoh update bio) | ```json { "message": "Profil berhasil diperbarui", "user": { "user_id": 5, "username": "hacker123", "email": "hacker@example.com", "bio": "New bio with <script>alert('XSS')</script> (VULNERABLE XSS)", "profile_picture_path": "uploads/profile/new_pic.jpg" } } ``` |
| `DELETE /users/profile` | Tidak ada | ```json { "message": "Akun berhasil dihapus." } ``` |