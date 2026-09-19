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

    // Optimización ultra-rápida: 1 sola consulta directa
    // Si tiene 32+ caracteres con guión es UUID completo, sino busca por prefijo (8 caracteres bajo el QR)
    let qrSnapshot;
    if (cleanInput.length >= 32 && cleanInput.includes('-')) {
      qrSnapshot = await db.collection('qr_codes').where('uuid', '==', cleanInput).limit(1).get();
    } else {
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

    // 1. Caso principal: Entrada aprobada -> Actualizar QR y obtener Ticket en PARALELO
    if (qrData.status === 'approved') {
      const updatePromise = db.collection('qr_codes').doc(qrDoc.id).update({ 
        status: 'used', 
        scanned_at: new Date(),
        scanned_by: effectiveScannerName
      });
      const ticketPromise = db.collection('tickets').doc(qrData.ticket_id).get();

      const [, ticketDoc] = await Promise.all([updatePromise, ticketPromise]);
      const ticketData = ticketDoc.exists ? ticketDoc.data() : { name: 'Cliente' };

      if (qrData.type === 'coupon') {
        return NextResponse.json({ 
          valid: true, 
          status: 'success', 
          message: `✅ CUPÓN CANJEADO\nConsumo: ${qrData.pack_name || 'Bebida'}\nCliente: ${ticketData.name}` 
        });
      } else {
        return NextResponse.json({ 
          valid: true, 
          status: 'success', 
          message: `✅ ACCESO PERMITIDO\nNombre: ${ticketData.name}\nEntrada válida para 1 persona.` 
        });
      }
    }

    // 2. Caso: Entrada ya usada previamente
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

      const ticketDoc = await db.collection('tickets').doc(qrData.ticket_id).get();
      const ticketData = ticketDoc.exists ? ticketDoc.data() : { name: 'Cliente' };

      const isCoupon = qrData.type === 'coupon';
      const msgHeader = isCoupon ? '❌ CUPÓN YA CANJEADO' : '❌ ENTRADA YA USADA';
      const detailInfo = isCoupon ? `Consumo: ${qrData.pack_name || 'Bebida'}\nCliente: ${ticketData.name}` : `Nombre: ${ticketData.name}`;

      return NextResponse.json({ valid: false, status: 'used', message: `${msgHeader}\n${detailInfo}${timeInfo}` });
    }
    
    // 3. Caso: Archivado (Evento pasado)
    if (qrData.status === 'archived') {
      const isCoupon = qrData.type === 'coupon';
      return NextResponse.json({ valid: false, status: 'invalid', message: `❌ ${isCoupon ? 'CUPÓN' : 'ENTRADA'} ARCHIVADO (Evento pasado)` });
    }

    return NextResponse.json({ valid: false, status: 'invalid', message: '❌ ENTRADA NO APROBADA' });
  } catch (error) {
    console.error('Error en el escáner:', error);
    return NextResponse.json({ valid: false, message: 'Error del servidor' }, { status: 500 });
  }
}
