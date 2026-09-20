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
import { docsLogoBase64 } from '@/lib/docsLogoBase64';
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

async function editTgMessageReplyMarkup(chatId, messageId, replyMarkup = { inline_keyboard: [] }) {
  const payload = { chat_id: chatId, message_id: messageId, reply_markup: replyMarkup };
  return fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, {
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
      } else if (action === 'setMain') {
        try {
          const batch = db.batch();
          const allEvents = await db.collection('events').get();
          allEvents.forEach(doc => {
            batch.update(doc.ref, { isMainEvent: doc.id === id });
          });
          await batch.commit();

          const evDoc = await db.collection('events').doc(id).get();
          const evData = evDoc.data() || {};
          const evTitle = evData.title || 'Evento';

          if (callbackQueryId) {
            answerTgCallbackQuery(callbackQueryId, { text: `✓ Asignado a GET TICKETS: ${evTitle}` }).catch(() => {});
          }

          await sendTgMessage(chatId, `⚡️ <b>ACTUALIZADO CON ÉXITO</b>\n\nEl botón <b>GET TICKETS</b> en la web ahora abre directamente las entradas para:\n🎪 <b>${evTitle}</b>\n📅 ${evData.date || 'Sin fecha'}\n📍 ${evData.location || 'Sin locación'}`, { parse_mode: 'HTML' });
        } catch (err) {
          console.error("Error asignando evento principal en Telegram:", err);
          if (callbackQueryId) {
            answerTgCallbackQuery(callbackQueryId, { text: "⚠️ Error asignando evento." }).catch(() => {});
          }
        }
      }
    } else if (body.message && body.message.text && token) {
      const chatId = body.message.chat.id.toString();
      const adminChats = (process.env.TELEGRAM_ADMIN_CHAT_ID || '').split(',').map(id => id.trim());

      // Restrict commands to admin chat IDs (or group where bot is)
      if (adminChats.includes(chatId)) {
        const text = body.message.text.trim();
        const cmd = text.toLowerCase().split('@')[0];

        if (cmd === '/start' || cmd === '/help' || cmd === '/menu') {
          const helpMsg = `🎛 <b>PANEL DE CONTROL TELEGRAM • DOCS</b>

Comandos disponibles:
📊 <b>/resumen</b> - Ver estado de ventas en vivo, recaudación y pagos pendientes.
🎪 <b>/eventos</b> - Lista de eventos, lineup y cuál tiene activo el botón GET TICKETS.
⚡️ <b>/settickets</b> - Cambiar qué evento abre el botón GET TICKETS en la web.
📈 <b>/ventas</b> - Exportar reporte de ventas en Excel / CSV.
🎟 <b>/escaneadas</b> - Exportar reporte de tickets escaneados en puerta.`;

          await sendTgMessage(chatId, helpMsg, { parse_mode: 'HTML' });
        } else if (cmd === '/resumen') {
          try {
            const [eventsSnap, ticketsSnap] = await Promise.all([
              db.collection('events').get(),
              db.collection('tickets').get()
            ]);

            const mainEventDoc = eventsSnap.docs.find(d => d.data()?.isMainEvent === true) || eventsSnap.docs[0];
            const mainEvent = mainEventDoc ? mainEventDoc.data() : null;

            let totalApproved = 0;
            let totalPending = 0;
            let totalEur = 0;
            let totalBs = 0;

            ticketsSnap.forEach(doc => {
              const t = doc.data() || {};
              if (t.status === 'approved') {
                totalApproved += (parseInt(t.ticket_count, 10) || 1);
                totalEur += (parseFloat(t.total_eur) || 0);
                totalBs += (parseFloat(t.total_bs) || 0);
              } else if (t.status === 'pending') {
                totalPending += 1;
              }
            });

            const resumenMsg = `📊 <b>RESUMEN EN VIVO • DOCS</b>

🎪 <b>Evento Principal (GET TICKETS):</b>
${mainEvent ? `<b>${mainEvent.title}</b>\n📅 ${mainEvent.date || 'S/F'}\n📍 ${mainEvent.location || 'S/L'}\n🎟 Límite: ${mainEvent.ticketLimit || 'Ilimitado'}` : 'Sin evento asignado'}

━━━━━━━━━━━━━━━━━━━━
🎟 <b>Entradas Aprobadas:</b> ${totalApproved}
⏳ <b>Pagos por Revisar:</b> ${totalPending}
💰 <b>Recaudación Total:</b>
• EUR: <b>€${totalEur.toFixed(2)}</b>
• Bs: <b>Bs. ${totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</b>
━━━━━━━━━━━━━━━━━━━━`;

            await sendTgMessage(chatId, resumenMsg, { parse_mode: 'HTML' });
          } catch (err) {
            console.error("Error en resumen:", err);
            await sendTgMessage(chatId, `⚠️ Error obteniendo resumen: ${err.message}`);
          }
        } else if (cmd === '/eventos' || cmd === '/evento') {
          try {
            const eventsSnap = await db.collection('events').get();
            let msg = `🎪 <b>EVENTOS REGISTRADOS EN DOCS</b>\n\n`;
            const buttons = [];

            eventsSnap.forEach(doc => {
              const ev = doc.data() || {};
              const isMain = ev.isMainEvent ? '★ [GET TICKETS ACTIVO]' : '';
              msg += `• <b>${ev.title}</b> ${isMain}\n📅 ${ev.date || 'S/F'} | 📍 ${ev.location || 'S/L'}\n${ev.lineup ? `🎵 Lineup:\n${ev.lineup}\n` : ''}\n`;
              if (!ev.isMainEvent) {
                buttons.push([{ text: `★ Asignar GET TICKETS: ${ev.title.substring(0, 24)}`, callback_data: `setMain_${doc.id}` }]);
              }
            });

            await sendTgMessage(chatId, msg, {
              parse_mode: 'HTML',
              reply_markup: buttons.length > 0 ? { inline_keyboard: buttons } : undefined
            });
          } catch (err) {
            console.error("Error en eventos:", err);
            await sendTgMessage(chatId, `⚠️ Error al consultar eventos: ${err.message}`);
          }
        } else if (cmd === '/settickets') {
          try {
            const eventsSnap = await db.collection('events').get();
            const buttons = [];

            eventsSnap.forEach(doc => {
              const ev = doc.data() || {};
              const badge = ev.isMainEvent ? ' ★ (ACTUAL)' : '';
              buttons.push([{ text: `${ev.title}${badge}`, callback_data: `setMain_${doc.id}` }]);
            });

            await sendTgMessage(chatId, `⚡️ <b>Selecciona qué evento debe abrir el botón GET TICKETS en la web:</b>`, {
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: buttons }
            });
          } catch (err) {
            console.error("Error en settickets:", err);
            await sendTgMessage(chatId, `⚠️ Error: ${err.message}`);
          }
        } else if (cmd === '/ventas' || cmd === '/escaneadas') {
          const action = cmd === '/ventas' ? 'expVentas' : 'expScan';
          try {
            const eventsSnap = await db.collection('events').get();

            const buttons = [];
            buttons.push([{ text: '📊 Todos los Eventos', callback_data: `${action}_all` }]);

            eventsSnap.forEach(doc => {
              const evData = doc.data() || {};
              const title = (evData.title || 'Evento').substring(0, 28);
              buttons.push([{ text: `🎪 ${title}`, callback_data: `${action}_${doc.id}` }]);
            });

            await sendTgMessage(chatId, `¿De qué evento deseas exportar ${cmd === '/ventas' ? 'las ventas' : 'las escaneadas'}?`, {
              reply_markup: { inline_keyboard: buttons }
            });
          } catch (err) {
            console.error("Error al obtener eventos para Telegram:", err);
            await sendTgMessage(chatId, `⚠️ Error al consultar eventos: ${err.message}`);
          }
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
    if (callbackQueryId) {
      answerTgCallbackQuery(callbackQueryId, { text: "⏳ Procesando aprobación..." }).catch(() => {});
    }

    const ticketRef = db.collection('tickets').doc(id);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
      if (callbackQueryId) {
        answerTgCallbackQuery(callbackQueryId, { text: "⚠️ Error: No se encontró el ticket en la BD." }).catch(() => {});
      }
      return sendTgMessage(chatId, "⚠️ Error: No se encontró el ticket en la base de datos.");
    }
    const row = ticketDoc.data() || {};

    if (row.status !== 'pending') {
      if (callbackQueryId) {
        answerTgCallbackQuery(callbackQueryId, { text: `ℹ️ Este pago ya está ${row.status.toUpperCase()}.` }).catch(() => {});
      }
      await editTgMessageReplyMarkup(chatId, messageId, {
        inline_keyboard: []
      }).catch(() => {});
      return;
    }

    // Remover botones inmediatamente de Telegram
    await editTgMessageReplyMarkup(chatId, messageId, {
      inline_keyboard: []
    }).catch(() => {});

    await ticketRef.update({ status: 'approved' });

    // Actualizar caption en Telegram con texto de APROBADO sin botones
    try {
      const cleanCap = (caption || 'NUEVO PAGO RECIBIDO') + '\n\n✅ <b>APROBADO</b>';
      const capRes = await editTgMessageCaption(chatId, messageId, cleanCap, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [] }
      });
      const capData = await capRes.json().catch(() => null);
      if (!capData?.ok) {
        await editTgMessageCaption(chatId, messageId, `${caption || 'NUEVO PAGO RECIBIDO'}\n\n✅ APROBADO`, {
          reply_markup: { inline_keyboard: [] }
        }).catch(console.error);
      }
    } catch (captionErr) {
      console.error("Fallo editando caption:", captionErr);
    }

    const ticketCount = Math.max(1, parseInt(row.ticket_count, 10) || 1);
    const drinkPacksList = row.drink_packs ? row.drink_packs.split(',').map(s => s.trim()).filter(Boolean) : [];
    const attachments = [];

    if (docsLogoBase64) {
      attachments.push({
        filename: 'logo-docs.png',
        content: Buffer.from(docsLogoBase64, 'base64'),
        cid: 'docs_logo',
        contentType: 'image/png'
      });
    }

    let qrHtml = '';
    let couponHtml = '';

    for (let i = 0; i < ticketCount; i++) {
      const ticketUuid = uuidv4();
      const shortId = ticketUuid.split('-')[0];
      await db.collection('qr_codes').add({
        ticket_id: id,
        uuid: ticketUuid,
        short_id: shortId,
        type: 'ticket',
        status: 'approved',
        created_at: new Date()
      });

      const qrDataUrl = await QRCode.toDataURL(ticketUuid, {
        color: { dark: '#000000', light: '#FFFFFF' },
        margin: 2,
        width: 350
      });
      const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

      attachments.push({
        filename: `entrada-docs-${i + 1}.png`,
        content: qrBuffer,
        cid: `qrcode_image_${i}`,
        contentType: 'image/png'
      });

      qrHtml += `
      <div style="margin: 20px auto; max-width: 360px; background: #18181b; padding: 20px; border-radius: 12px; border: 1px solid #27272a; text-align: center;">
        <p style="color: #a1a1aa; font-size: 13px; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 1px;">Entrada ${i + 1} de ${ticketCount}</p>
        <p style="color: #ffffff; font-size: 17px; font-weight: bold; margin: 0 0 15px 0;">${row.name}</p>
        <div style="background: #ffffff; padding: 12px; border-radius: 10px; display: inline-block;">
          <img src="cid:qrcode_image_${i}" alt="Código QR Entrada ${i + 1}" style="width: 220px; height: 220px; display: block; border-radius: 4px;" />
        </div>
        <p style="color: #71717a; font-size: 12px; margin: 12px 0 0 0; font-family: monospace;">ID: ${shortId}</p>
      </div>`;
    }

    // Generate Drink Coupons
    for (let i = 0; i < drinkPacksList.length; i++) {
      const packName = drinkPacksList[i];
      const couponUuid = uuidv4();
      const shortCouponId = couponUuid.split('-')[0];
      await db.collection('qr_codes').add({
        ticket_id: id,
        uuid: couponUuid,
        short_id: shortCouponId,
        type: 'coupon',
        pack_name: packName,
        status: 'approved',
        created_at: new Date()
      });

      const qrDataUrl = await QRCode.toDataURL(couponUuid, {
        color: { dark: '#000000', light: '#FFFFFF' },
        margin: 2,
        width: 350
      });
      const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

      attachments.push({
        filename: `cupon-bebida-${i + 1}.png`,
        content: qrBuffer,
        cid: `coupon_image_${i}`,
        contentType: 'image/png'
      });

      couponHtml += `
      <div style="margin: 20px auto; max-width: 360px; background: #18181b; padding: 16px; border-radius: 12px; border: 1px solid #3f3f46; text-align: center;">
        <p style="color: #ef4444; font-size: 14px; font-weight: bold; margin: 0 0 10px 0; text-transform: uppercase;">Cupón: ${packName}</p>
        <div style="background: #ffffff; padding: 10px; border-radius: 8px; display: inline-block;">
          <img src="cid:coupon_image_${i}" alt="Cupón de Barra ${packName}" style="width: 180px; height: 180px; display: block; border-radius: 4px;" />
        </div>
        <p style="color: #71717a; font-size: 11px; margin: 8px 0 0 0; font-family: monospace;">ID: ${shortCouponId}</p>
      </div>
      `;
    }

    // Fetch event details safely (use row.event_title or live title from events collection)
    let eventTitle = row.event_title || "DOCS";
    let eventDate = "";
    let eventLocation = "";
    if (row.event_id) {
      try {
        const evDoc = await db.collection('events').doc(row.event_id).get();
        if (evDoc.exists) {
          const evData = evDoc.data() || {};
          if (evData.title) eventTitle = evData.title;
          if (evData.date) eventDate = evData.date;
          if (evData.location) eventLocation = evData.location;
        }
      } catch (err) {
        console.error("Error fetching event title for email:", err);
      }
    }

    const totalEurText = row.total_eur ? `€${parseFloat(row.total_eur).toFixed(2)} • ` : '';

    const mailOptions = {
      from: `"DÖCS Eventos" <${process.env.EMAIL_USER}>`,
      replyTo: process.env.EMAIL_USER,
      to: row.email,
      subject: `Tus entradas para ${eventTitle} - ${row.name}`,
      headers: {
        'X-Entity-Ref-ID': `docs-${id}-${Date.now()}`
      },
      text: `Hola ${row.name},\n\n¡Tu compra para ${eventTitle} ha sido confirmada con éxito!\n\nDetalle de tu orden:\n- Evento: ${eventTitle}\n${eventDate ? `- Fecha: ${eventDate}\n` : ''}${eventLocation ? `- Locación: ${eventLocation}\n` : ''}- Titular: ${row.name}\n- Cédula: ${row.cedula || 'N/A'}\n- Cantidad: ${ticketCount} entrada(s)\n- Tipo: ${row.ticket_type || 'General'}\n${drinkPacksList.length > 0 ? `- Combos de Bebida: ${drinkPacksList.join(', ')}\n` : ''}- Total pagado: ${totalEurText}Bs. ${row.total_bs}\n\nTus códigos QR oficiales vienen adjuntos en este correo electrónico.\n\nIMPORTANTE:\n- Cada código QR es único y válido para 1 persona (será escaneado en el acceso al evento).\n- Si no puedes visualizar las imágenes, por favor presiona "Mostrar imágenes" en tu aplicación de correo.\n- Te recomendamos guardar este correo o tomar captura a tus códigos QR.\n\n¿Tienes alguna pregunta? Puedes responder directamente a este correo.\n\nDÖCS Eventos • Caracas y Mérida, Venezuela`,
      html: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tus Entradas para ${eventTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0c0c0c; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
  <!-- Vista previa de bandeja de entrada -->
  <div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    Entradas oficiales y códigos de acceso para ${eventTitle}.
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0c0c0c; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 580px; background-color: #141414; border-radius: 12px; border: 1px solid #282828; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          
          <!-- Encabezado -->
          <tr>
            <td style="padding: 28px 30px 22px 30px; text-align: center; background-color: #181818; border-bottom: 2px solid #ffffff;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto; text-align: center;">
                <tr>
                  <td align="center">
                    <img 
                      src="cid:docs_logo" 
                      alt="DÖCS" 
                      width="135" 
                      style="display: block; margin: 0 auto; max-width: 140px; width: 135px; height: auto; border: 0; outline: none; text-decoration: none; color: #ffffff; font-size: 26px; font-weight: 900; letter-spacing: 3px;" 
                    />
                  </td>
                </tr>
              </table>
              <p style="margin: 10px 0 0 0; font-size: 13px; color: #aaaaaa; letter-spacing: 1px; text-transform: uppercase;">Confirmación de Entradas</p>
            </td>
          </tr>

          <!-- Mensaje Principal -->
          <tr>
            <td style="padding: 30px 30px 10px 30px; text-align: center;">
              <div style="display: inline-block; background: rgba(34, 197, 94, 0.12); border: 1px solid rgba(34, 197, 94, 0.4); border-radius: 50px; padding: 6px 18px; margin-bottom: 15px;">
                <span style="color: #22c55e; font-weight: bold; font-size: 13px;">✓ PAGO CONFIRMADO</span>
              </div>
              <h2 style="margin: 0 0 10px 0; font-size: 22px; color: #ffffff;">¡Hola ${row.name}!</h2>
              <p style="margin: 0; font-size: 15px; color: #cccccc; line-height: 1.6;">
                Tu compra para <strong>${eventTitle}</strong> ha sido procesada con éxito. A continuación encontrarás tus códigos QR oficiales para el ingreso al evento.
              </p>
            </td>
          </tr>

          <!-- Resumen de Compra -->
          <tr>
            <td style="padding: 15px 30px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="10" border="0" style="background-color: #1c1c1c; border-radius: 8px; border: 1px solid #2e2e2e; font-size: 14px;">
                <tr>
                  <td style="color: #888888; border-bottom: 1px solid #282828;">Evento:</td>
                  <td style="color: #ffffff; font-weight: 600; text-align: right; border-bottom: 1px solid #282828;">${eventTitle}</td>
                </tr>
                ${eventDate ? `
                <tr>
                  <td style="color: #888888; border-bottom: 1px solid #282828;">Fecha:</td>
                  <td style="color: #ffffff; font-weight: 600; text-align: right; border-bottom: 1px solid #282828;">${eventDate}</td>
                </tr>` : ''}
                ${eventLocation ? `
                <tr>
                  <td style="color: #888888; border-bottom: 1px solid #282828;">Locación:</td>
                  <td style="color: #ffffff; font-weight: 600; text-align: right; border-bottom: 1px solid #282828;">${eventLocation}</td>
                </tr>` : ''}
                <tr>
                  <td style="color: #888888; border-bottom: 1px solid #282828;">Titular:</td>
                  <td style="color: #ffffff; font-weight: 600; text-align: right; border-bottom: 1px solid #282828;">${row.name} (CI: ${row.cedula || 'N/A'})</td>
                </tr>
                <tr>
                  <td style="color: #888888; border-bottom: 1px solid #282828;">Entradas:</td>
                  <td style="color: #ffffff; font-weight: 600; text-align: right; border-bottom: 1px solid #282828;">${ticketCount}x ${row.ticket_type || 'General'}</td>
                </tr>
                ${drinkPacksList.length > 0 ? `
                <tr>
                  <td style="color: #888888; border-bottom: 1px solid #282828;">Combos de Barra:</td>
                  <td style="color: #ffffff; font-weight: 600; text-align: right; border-bottom: 1px solid #282828;">${drinkPacksList.join(', ')}</td>
                </tr>` : ''}
                <tr>
                  <td style="color: #888888;">Total Pagado:</td>
                  <td style="color: #22c55e; font-weight: bold; text-align: right; font-size: 16px;">${totalEurText}Bs. ${row.total_bs}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Códigos QR de Entradas -->
          <tr>
            <td style="padding: 10px 30px 20px 30px; text-align: center;">
              <p style="font-size: 13px; color: #aaaaaa; margin-bottom: 20px;">
                💡 <em>Presenta estos códigos en tu teléfono al llegar al evento. Cada código es válido para 1 persona.</em>
              </p>
              ${qrHtml}
              ${couponHtml ? `<div style="margin-top: 30px;"><h3 style="color: #ef4444; font-size: 18px; margin-bottom: 15px;">Tus Consumos en Barra</h3>${couponHtml}</div>` : ''}
            </td>
          </tr>

          <!-- Footer Oficial Anti-Spam -->
          <tr>
            <td style="padding: 24px 30px; background-color: #0e0e0e; border-top: 1px solid #222222; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 12px; color: #888888; line-height: 1.5;">
                ¿No visualizas el código QR? Selecciona <strong>"Mostrar imágenes"</strong> o <strong>"Confiar en este remitente"</strong> en tu aplicación de correo.
              </p>
              <p style="margin: 0 0 8px 0; font-size: 11px; color: #71717a; line-height: 1.5;">
                DÖCS Eventos • Caracas y Mérida, Venezuela • docsevents.com
              </p>
              <p style="margin: 0; font-size: 11px; color: #52525b;">
                © ${new Date().getFullYear()} DÖCS Eventos. Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
      attachments
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("Email enviado SMTP:", info.response);
      await sendTgMessage(chatId, `🎟 <b>Entradas Enviadas con Éxito</b>\nSe han enviado ${ticketCount} entrada(s) al correo de <b>${row.name}</b> (<code>${row.email}</code>).`, { parse_mode: 'HTML' });
      if (callbackQueryId) {
        answerTgCallbackQuery(callbackQueryId, { text: "✅ ¡Entradas enviadas con éxito!" }).catch(() => {});
      }
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
    if (callbackQueryId) {
      answerTgCallbackQuery(callbackQueryId, { text: "⏳ Rechazando pago..." }).catch(() => {});
    }

    const ticketRef = db.collection('tickets').doc(id);
    const ticketDoc = await ticketRef.get();
    if (!ticketDoc.exists) return sendTgMessage(chatId, "⚠️ Error: No se encontró el ticket en la base de datos.");

    const row = ticketDoc.data() || {};
    if (row.status !== 'pending') {
      if (callbackQueryId) {
        answerTgCallbackQuery(callbackQueryId, { text: `ℹ️ Este pago ya está ${row.status.toUpperCase()}.` }).catch(() => {});
      }
      await editTgMessageReplyMarkup(chatId, messageId, {
        inline_keyboard: []
      }).catch(() => {});
      return;
    }

    await editTgMessageReplyMarkup(chatId, messageId, {
      inline_keyboard: []
    }).catch(() => {});

    await ticketRef.update({ status: 'rejected' });

    try {
      const cleanCap = (caption || 'PAGO RECIBIDO') + '\n\n❌ <b>RECHAZADO</b>';
      const capRes = await editTgMessageCaption(chatId, messageId, cleanCap, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [] }
      });
      const capData = await capRes.json().catch(() => null);
      if (!capData?.ok) {
        await editTgMessageCaption(chatId, messageId, `${caption || 'PAGO RECIBIDO'}\n\n❌ RECHAZADO`, {
          reply_markup: { inline_keyboard: [] }
        }).catch(console.error);
      }
    } catch (captionErr) {
      console.error("Fallo editando caption reject:", captionErr);
    }

    await sendTgMessage(chatId, `❌ <b>Pago Rechazado</b>\nEl pago de <b>${row.name}</b> (Ref: ${row.ref || 'N/A'}) ha sido marcado como rechazado.`, { parse_mode: 'HTML' });
    if (callbackQueryId) {
      answerTgCallbackQuery(callbackQueryId, { text: "❌ Pago marcado como rechazado." }).catch(() => {});
    }
  } catch (e) {
    console.error("Error en handleReject:", e);
    await sendTgMessage(chatId, `⚠️ Error al rechazar: ${e.message}`).catch(console.error);
  }
}

async function handleExport(eventId, chatId, callbackQueryId, type) {
  try {
    if (callbackQueryId) {
      await answerTgCallbackQuery(callbackQueryId, { text: "⏳ Generando reporte..." }).catch(() => {});
    }

    let csv = '';
    let filename = '';

    if (type === 'tickets') {
      let query = db.collection('tickets');
      if (eventId !== 'all') query = query.where('event_id', '==', eventId);

      const snap = await query.get();
      let tickets = [];
      snap.forEach(doc => tickets.push({ id: doc.id, ...doc.data() }));

      if (tickets.length === 0) {
        await sendTgMessage(chatId, `ℹ️ No hay entradas registradas para este evento.`);
        return;
      }

      // Sort in memory to avoid composite index requirement
      tickets.sort((a, b) => {
        const tA = a.created_at?._seconds || 0;
        const tB = b.created_at?._seconds || 0;
        return tB - tA;
      });

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

      if (qrs.length === 0) {
        await sendTgMessage(chatId, `ℹ️ No hay entradas escaneadas registradas para este evento.`);
        return;
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
    await sendTgMessage(chatId, `⚠️ Error exportando datos: ${e.message}`).catch(console.error);
  }
}
