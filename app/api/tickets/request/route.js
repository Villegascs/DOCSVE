import { NextResponse } from 'next/server';
import { db, storage } from '@/lib/firebase-admin';
import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_BOT_TOKEN;
const adminChatIds = process.env.TELEGRAM_ADMIN_CHAT_ID ? process.env.TELEGRAM_ADMIN_CHAT_ID.split(',').map(id => id.trim()) : [];
const bot = token ? new TelegramBot(token, { polling: false }) : null;

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
    const eventId = formData.get('eventId') || 'default_event';
    const receiptFile = formData.get('receipt');

    if (!receiptFile || typeof receiptFile === 'string') {
      return NextResponse.json({ error: 'Falta el comprobante de pago' }, { status: 400 });
    }

    const arrayBuffer = await receiptFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save ticket to Firestore
    const ticketRef = await db.collection('tickets').add({
      name, email, cedula, phone, bank, ref,
      ticket_count: ticketCount,
      total_bs: totalBs,
      event_id: eventId,
      status: 'pending',
      created_at: new Date()
    });
    
    const insertId = ticketRef.id;

    // Notify Telegram Admin (Enviamos el buffer directamente a Telegram para no depender del Storage si falla)
    if (bot && adminChatIds.length > 0) {
      const caption = `🚨 <b>NUEVO PAGO RECIBIDO</b> 🚨\n\n👤 <b>Nombre</b>: ${name}\n📧 <b>Email</b>: ${email}\n🆔 <b>Cédula</b>: ${cedula}\n📱 <b>Teléfono</b>: ${phone}\n🎟 <b>Entradas</b>: ${ticketCount}\n💰 <b>Total Bs</b>: ${totalBs}\n🏦 <b>Banco</b>: ${bank} (Ref: ${ref})`;

      for (const chatId of adminChatIds) {
        await bot.sendPhoto(chatId, buffer, {
          caption,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Aprobar y Enviar', callback_data: `approve_${insertId}` },
              { text: '❌ Rechazar', callback_data: `reject_${insertId}` }
            ]]
          }
        }, { filename: receiptFile.name, contentType: receiptFile.type }).catch(console.error);
      }
    }

    return NextResponse.json({ success: true, message: 'Pago registrado. Esperando verificación.' });
  } catch (error) {
    console.error('Error en /api/tickets/request:', error);
    return NextResponse.json({ error: 'Error procesando la solicitud' }, { status: 500 });
  }
}
