export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

const DEFAULT_VIDEO_DATA = {
  title: "DÖCS | GALLERY SESSION",
  subtitle: "DÖCS SESSIONS",
  description: "Una inmersión sonora única en la escena underground. Revive la intensidad, los beats y la energía de nuestros artistas en vivo en una experiencia audiovisual diseñada para los verdaderos amantes de la música electrónica.",
  youtubeUrl: "https://www.youtube.com/watch?v=5qap5aO4i9A"
};

export async function GET() {
  try {
    const doc = await db.collection('settings').doc('video_section').get();
    if (doc.exists) {
      return NextResponse.json({ success: true, data: { ...DEFAULT_VIDEO_DATA, ...doc.data() } });
    }
    return NextResponse.json({ success: true, data: DEFAULT_VIDEO_DATA });
  } catch (error) {
    console.error('Error fetching video section settings:', error);
    return NextResponse.json({ success: true, data: DEFAULT_VIDEO_DATA });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, subtitle, description, youtubeUrl } = body;

    const dataToSave = {
      title: title || DEFAULT_VIDEO_DATA.title,
      subtitle: subtitle || DEFAULT_VIDEO_DATA.subtitle,
      description: description || DEFAULT_VIDEO_DATA.description,
      youtubeUrl: youtubeUrl || DEFAULT_VIDEO_DATA.youtubeUrl,
      updated_at: new Date().toISOString()
    };

    await db.collection('settings').doc('video_section').set(dataToSave, { merge: true });

    return NextResponse.json({ success: true, data: dataToSave });
  } catch (error) {
    console.error('Error updating video section settings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
