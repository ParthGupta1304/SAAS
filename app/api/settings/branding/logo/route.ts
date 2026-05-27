import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadLogo } from '@/lib/supabase';

/**
 * POST handler to upload agency logo files securely to Supabase.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = `logo-${userId}-${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const contentType = file.type;

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
