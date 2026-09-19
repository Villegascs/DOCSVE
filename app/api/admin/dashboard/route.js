export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

let dashboardCache = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 20 * 1000; // 20 segundos de caché para ahorrar lecturas de Firestore

export async function GET() {
  const now = Date.now();
  if (dashboardCache && (now - lastCacheTime) < CACHE_TTL_MS) {
    return NextResponse.json({ ...dashboardCache, cached: true });
  }

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

    // Contar tickets escaneados (solo entradas, no servicios/cupones)
    qrSnapshot.forEach(doc => {
      const data = doc.data();
      if ((data.scanned || data.status === 'used') && data.type !== 'coupon') {
        scannedTickets++;
      }
    });

    const result = {
      success: true,
      stats: {
        totalTickets,
        totalBs,
        totalEur,
        pendingPayments,
        scannedTickets
      },
      latestPayments
    };

    dashboardCache = result;
    lastCacheTime = now;

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    const isQuota = error.message?.includes('RESOURCE_EXHAUSTED') || error.code === 8;
    
    // Si tenemos datos en caché previos, devolverlos
    if (dashboardCache) {
      return NextResponse.json({ ...dashboardCache, isQuotaExceeded: isQuota, cached: true });
    }

    return NextResponse.json({ 
      success: false, 
      isQuotaExceeded: isQuota,
      error: error.message 
    }, { status: isQuota ? 429 : 500 });
  }
}
