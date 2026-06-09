export default async function handler(req, res) {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: "Missing Supabase configuration in environment variables." });
  }

  try {
    // Lakukan query sederhana ke tabel 'brands' untuk mencegah Supabase di-pause
    const response = await fetch(`${SUPABASE_URL}/rest/v1/brands?select=id&limit=1`, {
      method: "GET",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json"
      }
    });

    if (response.ok) {
      const data = await response.json();
      return res.status(200).json({ 
        message: "Berhasil melakukan query ke database. Project Supabase tetap aktif!", 
        timestamp: new Date().toISOString(),
        data 
      });
    } else {
      const errorText = await response.text();
      return res.status(response.status).json({ 
        error: "Gagal query ke Supabase", 
        details: errorText 
      });
    }
  } catch (error) {
    return res.status(500).json({ error: "Terjadi kesalahan internal", details: error.message });
  }
}
