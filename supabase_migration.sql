-- =========================================================================
-- SQL MIGRATION SCRIPT FOR BRANDHUB STATUS UPDATE (FIXED ORDER)
-- =========================================================================
-- Jalankan script ini di "SQL Editor" pada dashboard Supabase Anda.
-- Catatan: CHECK constraint harus dihapus terlebih dahulu sebelum data di-update,
-- jika tidak, query update akan ditolak oleh constraint lama.

-- Step 1: Hapus CHECK constraint status lama yang membatasi input
ALTER TABLE assets 
DROP CONSTRAINT IF EXISTS assets_status_check;

-- Step 2: Sekarang kita bebas mengupdate data status lama ke penamaan baru
UPDATE assets 
SET status = 'PUBLISHED' 
WHERE status = 'ACTIVE';

UPDATE assets 
SET status = 'DRAFT' 
WHERE status = 'ARCHIVED';

-- Step 3: Tambahkan CHECK constraint baru khusus untuk 'PUBLISHED' dan 'DRAFT'
ALTER TABLE assets 
ADD CONSTRAINT assets_status_check 
CHECK (status IN ('PUBLISHED', 'DRAFT'));

-- =========================================================================
-- BERHASIL! Database Supabase Anda sekarang siap menerima status baru.
-- =========================================================================
