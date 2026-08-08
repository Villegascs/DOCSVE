export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { convertTicketsToCSV } from '@/lib/csvUtils';

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const eventId = url.searchParams.get('eventId');
    
    let query = db.collection('tickets').orderBy('created_at', 'desc');
    if (eventId && eventId !== 'all') {
      query = query.where('event_id', '==', eventId);
    }
    
    const snapshot = await query.get();
    const tickets = [];
    snapshot.forEach(doc => tickets.push({ id: doc.id, ...doc.data() }));

    const csv = convertTicketsToCSV(tickets);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="ventas_${eventId || 'todas'}.csv"`
      }
    });
  } catch (error) {
    console.error('Error exportando tickets:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
