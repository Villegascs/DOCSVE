export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET(req) {
  try {
    const qrsSnap = await db.collection('qr_codes')
      .where('type', '==', 'coupon')
      .get();
      
    const coupons = [];
    qrsSnap.forEach(doc => {
      coupons.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort descending by creation date
    coupons.sort((a, b) => {
      const tA = a.created_at?._seconds || 0;
      const tB = b.created_at?._seconds || 0;
      return tB - tA;
    });

    // Map ticket details to get buyer name
    const ticketIds = [...new Set(coupons.map(c => c.ticket_id))];
    
    // Process in batches of 10 for 'in' query if needed, but since we are just doing admin dashboard, fetching all tickets is easier if not huge, 
    // or just fetch the ones we need.
    const ticketsMap = {};
    if (ticketIds.length > 0) {
      // Firebase 'in' queries have a limit of 30, so we split into chunks
      const chunkSize = 30;
      for (let i = 0; i < ticketIds.length; i += chunkSize) {
        const chunk = ticketIds.slice(i, i + chunkSize);
        const tSnap = await db.collection('tickets').where('__name__', 'in', chunk).get();
        tSnap.forEach(doc => {
          ticketsMap[doc.id] = doc.data().name;
        });
      }
    }

    const finalCoupons = coupons.map(c => ({
      ...c,
      buyer_name: ticketsMap[c.ticket_id] || 'Desconocido'
    }));

    return NextResponse.json(finalCoupons);
  } catch (error) {
    console.error('Error fetching consumos:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
