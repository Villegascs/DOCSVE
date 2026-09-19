export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

let ticketsCache = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 20 * 1000;

export async function GET() {
  const now = Date.now();
  if (ticketsCache && (now - lastCacheTime) < CACHE_TTL_MS) {
    return NextResponse.json({ success: true, tickets: ticketsCache, cached: true });
  }

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

    ticketsCache = tickets;
    lastCacheTime = now;

    return NextResponse.json({ success: true, tickets });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    const isQuota = error.message?.includes('RESOURCE_EXHAUSTED') || error.code === 8;

    if (ticketsCache) {
      return NextResponse.json({ success: true, tickets: ticketsCache, cached: true, isQuotaExceeded: isQuota });
    }

    return NextResponse.json({ 
      success: false, 
      isQuotaExceeded: isQuota,
      error: error.message 
    }, { status: isQuota ? 429 : 500 });
  }
}
