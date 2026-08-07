export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const ticketsSnapshot = await db.collection('tickets').orderBy('created_at', 'desc').get();
    const qrSnapshot = await db.collection('qr_codes').get();

    const qrMap = {};
    qrSnapshot.forEach(doc => {
      const data = doc.data();
      if (!qrMap[data.ticket_id]) {
        qrMap[data.ticket_id] = [];
      }
      qrMap[data.ticket_id].push({
        id: doc.id,
        ...data,
        scanned_at: data.scanned_at ? data.scanned_at._seconds * 1000 : null
      });
    });

    const tickets = ticketsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at ? data.created_at._seconds * 1000 : null,
        qr_codes: qrMap[doc.id] || []
      };
    });

    return NextResponse.json({ success: true, tickets });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
