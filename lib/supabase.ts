import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey) 
  : null;

/**
 * Uploads a PDF buffer directly to the Supabase 'reports' bucket.
 * Returns the public URL, or null if upload fails.
 */
export async function uploadPdf(buffer: Buffer, filename: string): Promise<string | null> {
  if (!supabase) {
    console.log('[Supabase] Storage client not configured, skipping PDF upload.');
    return null;
  }

  try {
    // Ensure the reports bucket exists (silently handles list checks)
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.error('[Supabase] Error listing buckets:', listError);
    }
    
    if (!buckets?.some((b) => b.name === 'reports')) {
      await supabase.storage.createBucket('reports', { public: true });
      console.log('[Supabase] Created bucket "reports".');
    }

    const { error: uploadError } = await supabase.storage
      .from('reports')
      .upload(filename, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('[Supabase] Error uploading PDF file:', uploadError);
      return null;
    }

    const { data } = supabase.storage.from('reports').getPublicUrl(filename);
    return data?.publicUrl || null;
  } catch (err) {
    console.error('[Supabase] PDF upload exception:', err);
    return null;
  }
}

/**
 * Uploads a file buffer (logo, image) directly to the Supabase 'reports' bucket.
 */
export async function uploadLogo(buffer: Buffer, filename: string, contentType: string): Promise<string | null> {
  if (!supabase) {
    console.log('[Supabase] Storage client not configured, skipping logo upload.');
    return null;
  }

  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((b) => b.name === 'reports')) {
      await supabase.storage.createBucket('reports', { public: true });
    }

    const { error: uploadError } = await supabase.storage
      .from('reports')
      .upload(filename, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[Supabase] Error uploading logo file:', uploadError);
      return null;
    }

    const { data } = supabase.storage.from('reports').getPublicUrl(filename);
    return data?.publicUrl || null;
  } catch (err) {
    console.error('[Supabase] Logo upload exception:', err);
    return null;
  }
}
