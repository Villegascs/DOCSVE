export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { storage } from '@/lib/firebase-admin';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, error: 'No se envió ninguna imagen válida' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = `events/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;

    const bucket = storage.bucket();
    const fileRef = bucket.file(fileName);

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type || 'image/jpeg',
      },
    });

    // Hacer público el archivo
    await fileRef.makePublic();
    
    // Obtener la URL pública
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
