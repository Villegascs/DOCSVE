export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const doc = await db.collection('settings').doc('video_section').get();
    if (doc.exists) {
      const data = doc.data();
      return NextResponse.json({
        success: true,
        data: {
          title: data.title ?? '',
          subtitle: data.subtitle ?? '',
          description: data.description ?? '',
          youtubeUrl: data.youtubeUrl ?? '',
          updated_at: data.updated_at
        }
      });
    }
    return NextResponse.json({
      success: true,
      data: {
        title: '',
        subtitle: '',
        description: '',
        youtubeUrl: ''
      }
    });
  } catch (error) {
    console.error('Error fetching video section settings:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, subtitle, description, youtubeUrl } = body;

    const dataToSave = {
      title: title ?? '',
      subtitle: subtitle ?? '',
      description: description ?? '',
      youtubeUrl: youtubeUrl ?? '',
      updated_at: new Date().toISOString()
    };

    await db.collection('settings').doc('video_section').set(dataToSave, { merge: true });

    return NextResponse.json({ success: true, data: dataToSave });
  } catch (error) {
    console.error('Error updating video section settings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
