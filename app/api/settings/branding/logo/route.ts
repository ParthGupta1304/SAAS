import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getOrCreateOrg } from '@/lib/db/org-helper';
import { uploadLogo } from '@/lib/supabase';
import path from 'path';

// C7 fix: File validation constants
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']);
// Note: SVG is intentionally excluded due to potential XSS via embedded scripts

/**
 * Sanitize a filename to prevent path traversal and special characters.
 * C7 fix: Prevents path traversal attacks.
 */
function sanitizeFilename(name: string): string {
  // Remove directory traversal, keep only safe chars
  return path.basename(name)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 100); // Max 100 chars
}

/**
 * POST handler to upload agency logo files securely to Supabase.
 * C7 fix: Added file size limit, MIME type whitelist, and filename sanitization.
 * M18 fix: Added org-level auth check — user must belong to an org.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // M18 fix: Verify user belongs to an org (prevents any user from uploading)
    const billingEntityId = orgId || userId;
    const org = await getOrCreateOrg(billingEntityId);

    // L12 fix: Restrict logo upload to white-label plans
    if (!org.isWhiteLabel) {
      return NextResponse.json(
        { error: 'Logo upload is available on Agency and Scale plans only.' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // C7 fix: Enforce file size limit (2MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File size exceeds the maximum allowed size of ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.` },
        { status: 400 }
      );
    }

    // C7 fix: Validate MIME type against whitelist
    const contentType = file.type.toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES.has(contentType)) {
      return NextResponse.json(
        { error: `File type "${contentType}" is not allowed. Permitted types: PNG, JPEG, GIF, WebP.` },
        { status: 400 }
      );
    }

    // C7 fix: Verify actual file content starts with valid image magic bytes
    const arrayBuffer = await file.arrayBuffer();
    const header = new Uint8Array(arrayBuffer.slice(0, 12));

    const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
    const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    const isGif = header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46;
    const isWebP = header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50;

    if (!isPng && !isJpeg && !isGif && !isWebP) {
      return NextResponse.json(
        { error: 'File content does not match an allowed image format.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(arrayBuffer);

    // C7 fix: Sanitize filename to prevent path traversal
    const safeName = sanitizeFilename(file.name);
    const filename = `logo-${org.id}-${Date.now()}-${safeName}`;

    const publicUrl = await uploadLogo(buffer, filename, contentType);

    if (!publicUrl) {
      return NextResponse.json({ error: 'Failed to upload logo file to storage' }, { status: 502 });
    }

    return NextResponse.json({ logoUrl: publicUrl });
  } catch (error) {
    console.error('POST /api/settings/branding/logo error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
