export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const snapshot = await db.collection('scanner_keys').get();
    const keys = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ success: true, keys });
  } catch (error) {
    console.error('Error fetching scanner keys:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { key } = await req.json();
    if (!key) throw new Error('Key is required');

    const docRef = await db.collection('scanner_keys').add({
      key,
      created_at: new Date()
    });

    return NextResponse.json({ success: true, key: { id: docRef.id, key } });
  } catch (error) {
    console.error('Error creating scanner key:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) throw new Error('ID is required');

    await db.collection('scanner_keys').doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting scanner key:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
