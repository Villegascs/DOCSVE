export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
const token = process.env.TELEGRAM_BOT_TOKEN;
const adminChatIds = process.env.TELEGRAM_ADMIN_CHAT_ID ? process.env.TELEGRAM_ADMIN_CHAT_ID.split(',').map(id => id.trim()) : [];
export async function POST(req) {
  try {
    const formData = await req.formData();
    const name = formData.get('name');
    const email = formData.get('email');
    const cedula = formData.get('cedula');
    const phone = formData.get('phone');
    const bank = formData.get('bank');
    const ref = formData.get('ref');
    const ticketCount = parseInt(formData.get('ticketCount'), 10);
    const totalBs = formData.get('totalBs');
    const totalEur = formData.get('totalEur');
    const eventId = formData.get('eventId') || 'default_event';
    const ticketTypeName = formData.get('ticketTypeName') || 'Entrada General';
    const drinkPacks = formData.get('drinkPacks') || '';
    const receiptFile = formData.get('receipt');

    if (!receiptFile || typeof receiptFile === 'string') {
      return NextResponse.json({ error: 'Falta el comprobante de pago' }, { status: 400 });
    }

    const arrayBuffer = await receiptFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate Event Capacity
    const eventDoc = await db.collection('events').doc(eventId).get();
    if (eventDoc.exists) {
      const eventData = eventDoc.data();
      const ticketTypeConfig = eventData.ticketTypes?.find(t => t.name === ticketTypeName);
      
      if (ticketTypeConfig && ticketTypeConfig.limit > 0) {
        // Calculate sold tickets for this type
        const ticketsSnap = await db.collection('tickets')
          .where('event_id', '==', eventId)
          .where('status', '==', 'approved')
          .get();
          
        let soldForType = 0;
        ticketsSnap.forEach(tDoc => {
          const tData = tDoc.data();
          if ((tData.ticket_type || 'Entrada General') === ticketTypeName) {
            soldForType += (Number(tData.ticket_count) || 1);
          }
        });

        if (soldForType + ticketCount > ticketTypeConfig.limit) {
          return NextResponse.json({ error: `La entrada "${ticketTypeName}" está agotada o no hay suficientes cupos disponibles.` }, { status: 400 });
        }
      }
    }

    // Save ticket to Firestore
    const ticketRef = await db.collection('tickets').add({
      name, email, cedula, phone, bank, ref,
      ticket_count: ticketCount,
      ticket_type: ticketTypeName,
      drink_packs: drinkPacks,
      total_bs: totalBs,
      total_eur: parseFloat(totalEur) || 0,
      event_id: eventId,
      status: 'pending',
      created_at: new Date()
    });
    
    const insertId = ticketRef.id;

    let telegramErrors = [];
    if (token && adminChatIds.length > 0) {
      const drinkPacksText = drinkPacks ? `\n🍾 <b>Combos</b>: ${drinkPacks}` : '';
      const caption = `🚨 <b>NUEVO PAGO RECIBIDO</b> 🚨\n\n👤 <b>Nombre</b>: ${name}\n📧 <b>Email</b>: ${email}\n🆔 <b>Cédula</b>: ${cedula}\n📱 <b>Teléfono</b>: ${phone}\n🎟 <b>Entradas</b>: ${ticketCount}x ${ticketTypeName}${drinkPacksText}\n💰 <b>Total Bs</b>: ${totalBs}\n🏦 <b>Banco</b>: ${bank} (Ref: ${ref})`;

      for (const chatId of adminChatIds) {
        try {
          const tgFormData = new FormData();
          tgFormData.append('chat_id', chatId);
          tgFormData.append('caption', caption);
          tgFormData.append('parse_mode', 'HTML');
          tgFormData.append('reply_markup', JSON.stringify({
            inline_keyboard: [[
              { text: '✅ Aprobar y Enviar', callback_data: `approve_${insertId}` },
              { text: '❌ Rechazar', callback_data: `reject_${insertId}` }
            ]]
          }));
          
          const receiptBlob = new Blob([arrayBuffer], { type: receiptFile.type || 'image/png' });
          tgFormData.append('photo', receiptBlob, receiptFile.name || 'comprobante.png');

          const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: 'POST',
            body: tgFormData
          });

          if (!tgRes.ok) {
            const errData = await tgRes.text();
            throw new Error(`Telegram API Error: ${errData}`);
          }
        } catch (err) {
          console.error('Telegram Error:', err.message);
          telegramErrors.push(err.message);
        }
      }
    } else {
      telegramErrors.push('El bot no está configurado o no hay chat IDs validos.');
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Pago registrado. Esperando verificación.',
      telegramErrors: telegramErrors.length > 0 ? telegramErrors : undefined
    });
  } catch (error) {
    console.error('Error en /api/tickets/request:', error);
    return NextResponse.json({ error: 'Error procesando la solicitud: ' + (error.stack || error.message) }, { status: 500 });
  }
}
