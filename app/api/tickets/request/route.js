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

    // Atomic validation and ticket creation via Firestore Transaction to eliminate race conditions
    let insertId;
    try {
      insertId = await db.runTransaction(async (transaction) => {
        const eventRef = db.collection('events').doc(eventId);
        const eventDoc = await transaction.get(eventRef);

        if (eventDoc.exists) {
          const eventData = eventDoc.data();
          const ticketTypeConfig = eventData.ticketTypes?.find(t => t.name === ticketTypeName);

          // Read all tickets for this event within the transaction
          const ticketsQuery = db.collection('tickets').where('event_id', '==', eventId);
          const ticketsSnap = await transaction.get(ticketsQuery);

          let soldForType = 0;
          let totalSold = 0;
          ticketsSnap.forEach(tDoc => {
            const tData = tDoc.data();
            // Count both approved and pending (reserved) tickets
            if (tData.status === 'approved' || tData.status === 'pending') {
              const count = Number(tData.ticket_count) || 1;
              totalSold += count;
              if ((tData.ticket_type || 'Entrada General') === ticketTypeName) {
                soldForType += count;
              }
            }
          });

          // 1. Overall event limit check
          if (eventData.ticketLimit > 0 && (totalSold + ticketCount) > eventData.ticketLimit) {
            const availableTotal = Math.max(0, eventData.ticketLimit - totalSold);
            const err = new Error(
              availableTotal > 0
                ? `Lo sentimos, otro cliente acaba de adquirir entradas. Actualmente solo quedan ${availableTotal} entrada(s) disponibles.`
                : 'Lo sentimos, las entradas para este evento acaban de agotarse.'
            );
            err.isStockError = true;
            err.available = availableTotal;
            throw err;
          }

          // 2. Ticket type limit check
          if (ticketTypeConfig && ticketTypeConfig.limit > 0 && (soldForType + ticketCount) > ticketTypeConfig.limit) {
            const availableForType = Math.max(0, ticketTypeConfig.limit - soldForType);
            const err = new Error(
              availableForType > 0
                ? `Lo sentimos, otro cliente acaba de adquirir entradas de "${ticketTypeName}". Actualmente solo quedan ${availableForType} disponibles.`
                : `Lo sentimos, la entrada "${ticketTypeName}" se acaba de agotar.`
            );
            err.isStockError = true;
            err.available = availableForType;
            throw err;
          }

          // Update event timestamp to guarantee conflict detection for concurrent transactions
          transaction.update(eventRef, {
            last_order_at: new Date()
          });
        }

        // Save new ticket to Firestore
        const newTicketRef = db.collection('tickets').doc();
        transaction.set(newTicketRef, {
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

        return newTicketRef.id;
      });
    } catch (txError) {
      if (txError.isStockError) {
        return NextResponse.json({ 
          error: txError.message,
          isStockError: true,
          available: txError.available !== undefined ? txError.available : null
        }, { status: 400 });
      }
      throw txError;
    }

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
