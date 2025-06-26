export default function handler(req, res) {
  return res.json({
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
    urlLength: process.env.SUPABASE_URL?.length || 0,
    keyLength: process.env.SUPABASE_SERVICE_KEY?.length || 0
  });
}
