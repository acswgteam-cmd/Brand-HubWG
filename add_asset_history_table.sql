-- =========================================================================
-- MIGRATION: Asset Activity Timeline & History logs
-- Jalankan script ini di "SQL Editor" pada dashboard Supabase Anda.
-- =========================================================================

-- 1. Tabel asset_history — menyimpan log aktivitas & perubahan aset
CREATE TABLE IF NOT EXISTS asset_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'CREATE', 'REUPLOAD', 'VERSION_UPDATE', 'UPDATE_INFO'
  description TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- RLS Policies
-- =========================================================================

ALTER TABLE asset_history ENABLE ROW LEVEL SECURITY;

-- asset_history: semua pengguna bisa membaca, admin bisa melakukan insert/tambah log
DROP POLICY IF EXISTS "allow_read_history" ON asset_history;
CREATE POLICY "allow_read_history"
  ON asset_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_insert_history" ON asset_history;
CREATE POLICY "allow_insert_history"
  ON asset_history FOR INSERT WITH CHECK (true);

-- =========================================================================
-- SELESAI!
-- Tabel asset_history berhasil dibuat dengan RLS dan RLS Policies.
-- =========================================================================
