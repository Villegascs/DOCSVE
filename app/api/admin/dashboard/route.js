export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const ticketsSnapshot = await db.collection('tickets').orderBy('created_at', 'desc').get();
    const qrSnapshot = await db.collection('qr_codes').get();

    let totalTickets = 0;
    let totalBs = 0;
    let totalEur = 0;
    let pendingPayments = 0;
    let scannedTickets = 0;
    const latestPayments = [];

    // Calcular stats de tickets
    ticketsSnapshot.forEach(doc => {
      const data = doc.data();
      const count = parseInt(data.ticket_count) || 1;
      const amount = parseFloat(data.total_bs) || 0;

      if (data.status === 'approved') {
        totalTickets += count;
        totalBs += amount;
        totalEur += (parseFloat(data.total_eur) || 0);
      } else if (data.status === 'pending') {
        pendingPayments++;
      }

      // Guardar los últimos 5 para la tabla
      if (latestPayments.length < 5) {
        latestPayments.push({
          id: doc.id,
          name: data.name,
          ticket_count: count,
          ticket_type: data.ticket_type || 'General',
          drink_packs: data.drink_packs || '',
          bank: data.bank,
          ref: data.ref,
          status: data.status,
          created_at: data.created_at ? data.created_at._seconds * 1000 : Date.now()
        });
      }
    });

    // Contar tickets escaneados
    qrSnapshot.forEach(doc => {
      if (doc.data().scanned) {
        scannedTickets++;
      }
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalTickets,
        totalBs,
        totalEur,
        pendingPayments,
        scannedTickets
      },
      latestPayments
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
