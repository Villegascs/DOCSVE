import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function POST(req) {
  try {
    const { uuid, scannerKey, scannerName } = await req.json();

    if (!uuid) {
      return NextResponse.json({ valid: false, message: 'No se proveyó código QR' }, { status: 400 });
    }

    const isAdmin = scannerKey === 'ADMIN_MASTER' || scannerKey === 'ADMIN_PANEL' || scannerKey === 'DOCS2026' || scannerKey === 'Docs2026';
    let effectiveScannerName = scannerName;

    if (!isAdmin) {
      if (!scannerKey || !scannerName) {
        return NextResponse.json({ valid: false, message: 'Faltan credenciales de escáner' }, { status: 401 });
      }

      // Verify key
      const keySnapshot = await db.collection('scanner_keys').where('key', '==', scannerKey).limit(1).get();
      if (keySnapshot.empty) {
        return NextResponse.json({ valid: false, message: 'Clave de escáner inválida' }, { status: 401 });
      }
    } else {
      effectiveScannerName = scannerName || 'Administrador';
    }

    const cleanInput = (uuid || '').trim().toLowerCase();

    // 1. Buscar por UUID exacto
    let qrSnapshot = await db.collection('qr_codes').where('uuid', '==', cleanInput).limit(1).get();

    // 2. Si no lo encuentra, buscar por short_id (los 8 caracteres que salen debajo del QR)
    if (qrSnapshot.empty && cleanInput.length === 8) {
      qrSnapshot = await db.collection('qr_codes').where('short_id', '==', cleanInput).limit(1).get();
    }

    // 3. Respaldo por prefijo en el campo uuid para entradas anteriores
    if (qrSnapshot.empty && cleanInput.length >= 6) {
      qrSnapshot = await db.collection('qr_codes')
        .where('uuid', '>=', cleanInput)
        .where('uuid', '<=', cleanInput + '\uf8ff')
        .limit(1)
        .get();
    }
    
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
      let timeStr = '';
      if (qrData.scanned_at) {
        try {
          const dateObj = qrData.scanned_at.toDate ? qrData.scanned_at.toDate() : new Date(qrData.scanned_at._seconds * 1000);
          timeStr = dateObj.toLocaleTimeString('es-VE', { 
            timeZone: 'America/Caracas',
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true 
          });
        } catch(e) {
          console.error(e);
        }
      }
      const scannedByStr = qrData.scanned_by ? ` por ${qrData.scanned_by}` : '';
      const timeInfo = timeStr ? `\n\n(Canjeado a las ${timeStr}${scannedByStr})` : '';

      const isCoupon = qrData.type === 'coupon';
      const msgHeader = isCoupon ? '❌ CUPÓN YA CANJEADO' : '❌ ENTRADA YA USADA';
      const detailInfo = isCoupon ? `Consumo: ${qrData.pack_name}\nCliente: ${ticketData.name}` : `Nombre: ${ticketData.name}`;

      return NextResponse.json({ valid: false, status: 'used', message: `${msgHeader}\n${detailInfo}${timeInfo}` });
    }
    
    if (qrData.status === 'archived') {
      const isCoupon = qrData.type === 'coupon';
      return NextResponse.json({ valid: false, status: 'invalid', message: `❌ ${isCoupon ? 'CUPÓN' : 'ENTRADA'} ARCHIVADO (Evento pasado)` });
    }

    if (qrData.status === 'approved') {
      await db.collection('qr_codes').doc(qrDoc.id).update({ 
        status: 'used', 
        scanned_at: new Date(),
        scanned_by: effectiveScannerName
      });
      
      if (qrData.type === 'coupon') {
        return NextResponse.json({ valid: true, status: 'success', message: `✅ CUPÓN CANJEADO\nConsumo: ${qrData.pack_name}\nCliente: ${ticketData.name}` });
      } else {
        return NextResponse.json({ valid: true, status: 'success', message: `✅ ACCESO PERMITIDO\nNombre: ${ticketData.name}\nEntrada válida para 1 persona.` });
      }
    }

    return NextResponse.json({ valid: false, status: 'invalid', message: '❌ ENTRADA NO APROBADA' });
  } catch (error) {
    console.error('Error en el escáner:', error);
    return NextResponse.json({ valid: false, message: 'Error del servidor' }, { status: 500 });
  }
}
