export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { convertScannedToCSV } from '@/lib/csvUtils';

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const eventId = url.searchParams.get('eventId');
    
    // QR codes don't have eventId directly, so we either fetch all scanned and join with tickets, 
    // or if eventId is 'all', just fetch all scanned QRs.
    // If eventId is specific, we first need to get all tickets for that event.
    
    let qrs = [];
    
    if (eventId && eventId !== 'all') {
      const ticketsSnap = await db.collection('tickets').where('event_id', '==', eventId).get();
      const ticketIds = [];
      ticketsSnap.forEach(doc => ticketIds.push(doc.id));
      
      if (ticketIds.length > 0) {
        // Firestore 'in' query has a limit of 10, so we might need to batch or just fetch all and filter in memory if it's large.
        // For simplicity and to avoid limit errors, fetch all scanned QRs and filter in memory.
        const qrSnap = await db.collection('qr_codes').where('status', '==', 'used').get();
        qrSnap.forEach(doc => {
          const data = doc.data();
          if (ticketIds.includes(data.ticket_id)) {
            // Find ticket name
            const ticketData = ticketsSnap.docs.find(t => t.id === data.ticket_id)?.data();
            qrs.push({ id: doc.id, ...data, ticket_name: ticketData?.name || 'Desconocido' });
          }
        });
      }
    } else {
      const qrSnap = await db.collection('qr_codes').where('status', '==', 'used').get();
      // To get names, we'd need to fetch tickets. 
      const ticketIdsToFetch = [...new Set(qrSnap.docs.map(d => d.data().ticket_id))];
      
      // Fetch all tickets to map names (inefficient for HUGE data, but ok for now)
      const allTicketsSnap = await db.collection('tickets').get();
      const ticketsMap = {};
      allTicketsSnap.forEach(t => ticketsMap[t.id] = t.data().name);
      
      qrSnap.forEach(doc => {
        const data = doc.data();
        qrs.push({ id: doc.id, ...data, ticket_name: ticketsMap[data.ticket_id] || 'Desconocido' });
      });
    }

    const csv = convertScannedToCSV(qrs);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="escaneadas_${eventId || 'todas'}.csv"`
      }
    });
  } catch (error) {
    console.error('Error exportando escaneadas:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
