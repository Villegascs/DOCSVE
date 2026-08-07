import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function POST(req) {
  try {
    const { uuid } = await req.json();

    if (!uuid) {
      return NextResponse.json({ valid: false, message: 'No se proveyó código QR' }, { status: 400 });
    }

    const qrSnapshot = await db.collection('qr_codes').where('uuid', '==', uuid).limit(1).get();
    
    if (qrSnapshot.empty) {
      return NextResponse.json({ valid: false, status: 'invalid', message: '❌ ENTRADA INVÁLIDA (No existe)' });
    }

    const qrDoc = qrSnapshot.docs[0];
    const qrData = qrDoc.data();

    const ticketDoc = await db.collection('tickets').doc(qrData.ticket_id).get();
    
    if (!ticketDoc.exists) {
      return NextResponse.json({ valid: false, status: 'invalid', message: '❌ TICKET NO ENCONTRADO' });
    }
    
    const ticketData = ticketDoc.data();

    if (qrData.status === 'used') {
      return NextResponse.json({ valid: false, status: 'used', message: `❌ ENTRADA YA USADA\nNombre: ${ticketData.name}` });
    }
    
    if (qrData.status === 'archived') {
      return NextResponse.json({ valid: false, status: 'invalid', message: `❌ ENTRADA ARCHIVADA (Evento pasado)` });
    }

    if (qrData.status === 'approved') {
      await db.collection('qr_codes').doc(qrDoc.id).update({ 
        status: 'used', 
        scanned_at: new Date()
      });
      return NextResponse.json({ valid: true, status: 'success', message: `✅ ACCESO PERMITIDO\nNombre: ${ticketData.name}\nEntrada válida para 1 persona.` });
    }

    return NextResponse.json({ valid: false, status: 'invalid', message: '❌ ENTRADA NO APROBADA' });
  } catch (error) {
    console.error('Error en el escáner:', error);
    return NextResponse.json({ valid: false, message: 'Error del servidor' }, { status: 500 });
  }
}
