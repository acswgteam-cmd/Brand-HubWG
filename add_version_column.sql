-- =========================================================================
-- SQL MIGRATION: Tambah kolom 'version' pada tabel assets
-- =========================================================================
-- Jalankan script ini di "SQL Editor" pada dashboard Supabase Anda.
-- Kolom 'version' adalah integer yang diset secara manual oleh admin.
-- BERBEDA dengan uploaded_date — upload ulang tidak otomatis mengganti versi.

-- Step 1: Tambahkan kolom 'version' dengan default nilai 1
ALTER TABLE assets
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Step 2 (Opsional): Tambahkan CHECK constraint agar version selalu >= 1
ALTER TABLE assets
DROP CONSTRAINT IF EXISTS assets_version_check;

ALTER TABLE assets
ADD CONSTRAINT assets_version_check
CHECK (version >= 1);

-- =========================================================================
-- SELESAI! Kolom 'version' berhasil ditambahkan.
-- Semua aset lama otomatis mendapat version = 1.
-- Admin bisa mengubah version via form Edit Asset di Admin Hub.
-- =========================================================================
