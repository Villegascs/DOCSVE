export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60; // Extend Vercel timeout to 60 seconds
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import nodemailer from 'nodemailer';
import path from 'path';
import { convertTicketsToCSV, convertScannedToCSV } from '@/lib/csvUtils';
const token = process.env.TELEGRAM_BOT_TOKEN;

async function sendTgMessage(chatId, text, options = {}) {
  const payload = { chat_id: chatId, text, ...options };
  return fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

async function answerTgCallbackQuery(callbackQueryId, options = {}) {
  const payload = { callback_query_id: callbackQueryId, ...options };
  return fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

async function editTgMessageCaption(chatId, messageId, caption, options = {}) {
  const payload = { chat_id: chatId, message_id: messageId, caption, ...options };
  return fetch(`https://api.telegram.org/bot${token}/editMessageCaption`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

export async function POST(req) {
  try {
    const body = await req.json();

    if (body.callback_query && token) {
      const query = body.callback_query;
      const [action, id] = query.data.split('_');
      const chatId = query.message.chat.id;
      const messageId = query.message.message_id;
      const callbackQueryId = query.id;

      if (action === 'approve') {
        await handleApprove(id, chatId, messageId, query.message.caption, callbackQueryId);
      } else if (action === 'reject') {
        await handleReject(id, chatId, messageId, query.message.caption, callbackQueryId);
      } else if (action === 'expVentas') {
        await handleExport(id, chatId, callbackQueryId, 'tickets');
      } else if (action === 'expScan') {
        await handleExport(id, chatId, callbackQueryId, 'scanned');
      }
    } else if (body.message && body.message.text && token) {
      const chatId = body.message.chat.id.toString();
      const adminChats = (process.env.TELEGRAM_ADMIN_CHAT_ID || '').split(',').map(id => id.trim());
      
      // Restrict commands to admin chat IDs (or group where bot is)
      if (adminChats.includes(chatId)) {
        const text = body.message.text.trim();
        
        if (text === '/ventas' || text === '/escaneadas') {
          const action = text === '/ventas' ? 'expVentas' : 'expScan';
          const eventsSnap = await db.collection('events').where('status', '==', 'active').get();
          
          const buttons = [];
          buttons.push([{ text: 'Todos los Eventos', callback_data: `${action}_all` }]);
          
          eventsSnap.forEach(doc => {
            buttons.push([{ text: doc.data().title, callback_data: `${action}_${doc.id}` }]);
          });
          
          await sendTgMessage(chatId, `¿De qué evento deseas exportar ${text === '/ventas' ? 'las ventas' : 'las escaneadas'}?`, {
            reply_markup: { inline_keyboard: buttons }
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error procesando webhook de Telegram:', error);
    return NextResponse.json({ error: 'Error processing webhook' }, { status: 500 });
  }
}

async function handleApprove(id, chatId, messageId, caption, callbackQueryId) {
  try {
    const ticketRef = db.collection('tickets').doc(id);
    const ticketDoc = await ticketRef.get();
    
    if (!ticketDoc.exists) return sendTgMessage(chatId, "Error encontrando el ticket.");
    const row = ticketDoc.data();
    
    if (row.status !== 'pending') {
      answerTgCallbackQuery(callbackQueryId, { text: "Este pago ya fue procesado." }).catch(console.error);
      return;
    }

    await ticketRef.update({ status: 'approved' });

    await editTgMessageCaption(chatId, messageId, `${caption || 'NUEVO PAGO'}\n\n✅ <b>APROBADO</b>`, {
      parse_mode: 'HTML', reply_markup: { inline_keyboard: [] }
    }).catch(console.error);
    await answerTgCallbackQuery(callbackQueryId).catch(console.error);

    const ticketCount = row.ticket_count;
    const attachments = [];
    let qrHtml = '';

    for (let i = 0; i < ticketCount; i++) {
      const ticketUuid = uuidv4();
      await db.collection('qr_codes').add({
        ticket_id: id,
        uuid: ticketUuid,
        status: 'approved',
        created_at: new Date()
      });

      const qrDataUrl = await QRCode.toDataURL(ticketUuid, { 
        color: { dark: '#000000', light: '#FFFFFF' }, 
        margin: 2,
        width: 350
      });
      const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

      attachments.push({ filename: `qrcode-docs-${i+1}.png`, content: qrBuffer, cid: `qrcode_image_${i}` });
      
      qrHtml += `
      <div style="margin: 20px auto; max-width: 400px; background: #111; padding: 20px; border-radius: 15px; border: 1px solid #333;">
        <h3 style="color:#ccc; margin-top: 0;">Entrada ${i+1} de ${ticketCount}</h3>
        <p style="color:#fff; font-size: 18px;"><strong>Titular:</strong> ${row.name}</p>
        <img src="cid:qrcode_image_${i}" style="margin:10px 0;border-radius:10px;width:100%;max-width:300px;">
        <p style="color:#A0A0A0; font-size: 12px;">ID: ${ticketUuid.split('-')[0]}</p>
      </div>`;
    }

    const mailOptions = {
      from: `"DOCS Underground" <${process.env.EMAIL_USER}>`,
      to: row.email,
      subject: `Tus Entradas para DOCS`,
      html: `<div style="background:#050505;color:white;padding:40px;font-family:sans-serif;text-align:center;">
          <h2>¡Pago Verificado!</h2>
          <p>Hola ${row.name}, tu pago de Bs. ${row.total_bs} ha sido verificado con éxito.</p>
          <p>Aquí tienes tus códigos QR. <strong>Cada entrada es válida para 1 persona.</strong></p>
          ${qrHtml}
          <p style="color:#A0A0A0;margin-top:30px;">No compartas estos códigos. Serán escaneados individualmente en la puerta.</p>
      </div>`,
      attachments
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("Email enviado SMTP:", info.response);
    } catch (err) {
      console.error("Error email SMTP:", err);
      await sendTgMessage(chatId, `⚠️ <b>Error Crítico:</b> No se pudo enviar el correo a ${row.email}.\n\n<b>Motivo:</b> ${err.message}`, { parse_mode: 'HTML' });
    }


  } catch (e) {
    console.error("Error en handleApprove:", e);
    await sendTgMessage(chatId, `❌ <b>Fallo interno del servidor:</b>\n${e.message}`, { parse_mode: 'HTML' }).catch(console.error);
  }
}

async function handleReject(id, chatId, messageId, caption, callbackQueryId) {
  try {
    const ticketRef = db.collection('tickets').doc(id);
    const ticketDoc = await ticketRef.get();
    if (!ticketDoc.exists) return sendTgMessage(chatId, "Error encontrando el ticket.");
    
    const row = ticketDoc.data();
    if (row.status !== 'pending') {
      answerTgCallbackQuery(callbackQueryId, { text: "Este pago ya fue procesado." }).catch(console.error);
      return;
    }

    await ticketRef.update({ status: 'rejected' });
    
    await editTgMessageCaption(chatId, messageId, `${caption || 'NUEVO PAGO'}\n\n❌ <b>RECHAZADO</b>`, {
      parse_mode: 'HTML', reply_markup: { inline_keyboard: [] }
    }).catch(console.error);
    await answerTgCallbackQuery(callbackQueryId, { text: "Pago rechazado." }).catch(console.error);
  } catch (e) {
    console.error("Error en handleReject:", e);
  }
}

async function handleExport(eventId, chatId, callbackQueryId, type) {
  try {
    await answerTgCallbackQuery(callbackQueryId, { text: "Generando reporte..." });
    
    let csv = '';
    let filename = '';

    if (type === 'tickets') {
      let query = db.collection('tickets').orderBy('created_at', 'desc');
      if (eventId !== 'all') query = query.where('event_id', '==', eventId);
      
      const snap = await query.get();
      const tickets = [];
      snap.forEach(doc => tickets.push({ id: doc.id, ...doc.data() }));
      csv = convertTicketsToCSV(tickets);
      filename = `ventas_${eventId}.csv`;
    } else {
      let qrs = [];
      if (eventId !== 'all') {
        const tSnap = await db.collection('tickets').where('event_id', '==', eventId).get();
        const tIds = [];
        tSnap.forEach(d => tIds.push(d.id));
        if (tIds.length > 0) {
          const qSnap = await db.collection('qr_codes').where('status', '==', 'used').get();
          qSnap.forEach(doc => {
            if (tIds.includes(doc.data().ticket_id)) {
              const tData = tSnap.docs.find(t => t.id === doc.data().ticket_id)?.data();
              qrs.push({ id: doc.id, ...doc.data(), ticket_name: tData?.name || 'Desconocido' });
            }
          });
        }
      } else {
        const qSnap = await db.collection('qr_codes').where('status', '==', 'used').get();
        const tSnap = await db.collection('tickets').get();
        const tMap = {};
        tSnap.forEach(t => tMap[t.id] = t.data().name);
        qSnap.forEach(doc => {
          qrs.push({ id: doc.id, ...doc.data(), ticket_name: tMap[doc.data().ticket_id] || 'Desconocido' });
        });
      }
      csv = convertScannedToCSV(qrs);
      filename = `escaneadas_${eventId}.csv`;
    }

    const formData = new FormData();
    formData.append('chat_id', chatId);
    const blob = new Blob([csv], { type: 'text/csv' });
    formData.append('document', blob, filename);

    await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
      method: 'POST',
      body: formData
    });

  } catch (e) {
    console.error("Error en handleExport:", e);
    await sendTgMessage(chatId, `Error exportando: ${e.message}`);
  }
}
