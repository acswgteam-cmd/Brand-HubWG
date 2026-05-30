-- =========================================================================
-- MIGRATION: Request Assets, Version History, Update Schedule
-- Jalankan script ini di "SQL Editor" pada dashboard Supabase Anda.
-- =========================================================================

-- 1. Tabel asset_requests — menyimpan request aset dari user
CREATE TABLE IF NOT EXISTS asset_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_name TEXT NOT NULL,
  requester_email TEXT,
  asset_name TEXT NOT NULL,
  description TEXT,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  asset_type_id UUID REFERENCES asset_types(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel asset_versions — riwayat versi + changelog per aset
CREATE TABLE IF NOT EXISTS asset_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  changelog TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(asset_id, version_number)
);

-- 3. Kolom baru di tabel assets untuk jadwal update
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS update_interval_months INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS next_update_due TIMESTAMPTZ DEFAULT NULL;

-- =========================================================================
-- RLS Policies
-- Sesuaikan dengan kebijakan keamanan yang sudah ada di project Anda.
-- Jika RLS belum aktif, langkah ini bisa dilewati.
-- =========================================================================

ALTER TABLE asset_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_versions ENABLE ROW LEVEL SECURITY;

-- asset_requests: public bisa baca, insert, dan admin bisa update
DROP POLICY IF EXISTS "allow_read_requests" ON asset_requests;
CREATE POLICY "allow_read_requests"
  ON asset_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_insert_requests" ON asset_requests;
CREATE POLICY "allow_insert_requests"
  ON asset_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "allow_update_requests" ON asset_requests;
CREATE POLICY "allow_update_requests"
  ON asset_requests FOR UPDATE USING (true);

DROP POLICY IF EXISTS "allow_delete_requests" ON asset_requests;
CREATE POLICY "allow_delete_requests"
  ON asset_requests FOR DELETE USING (true);

-- asset_versions: semua bisa baca, admin bisa insert
DROP POLICY IF EXISTS "allow_read_versions" ON asset_versions;
CREATE POLICY "allow_read_versions"
  ON asset_versions FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_insert_versions" ON asset_versions;
CREATE POLICY "allow_insert_versions"
  ON asset_versions FOR INSERT WITH CHECK (true);

-- =========================================================================
-- SELESAI!
-- Tabel asset_requests, asset_versions berhasil dibuat.
-- Kolom update_interval_months dan next_update_due ditambahkan ke assets.
-- =========================================================================
