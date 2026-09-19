export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import Jimp from 'jimp';
import nodemailer from 'nodemailer';
import path from 'path';

export async function GET() {
  try {
    const ticketCount = 1;
    const attachments = [];
    let qrHtml = '';
    const row = { name: 'Prueba Completa', email: process.env.EMAIL_USER, total_bs: '100' };

    for (let i = 0; i < ticketCount; i++) {
      const ticketUuid = "test-uuid-12345";
      
      const qrDataUrl = await QRCode.toDataURL(ticketUuid, { color: { dark: '#000000', light: '#FFFFFF' }, margin: 2 });
      const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

      const image = new Jimp(600, 1000, '#050505');
      
      const fontTitlePath = path.join(process.cwd(), 'public', 'fonts', 'open-sans', 'open-sans-32-white', 'open-sans-32-white.fnt');
      const fontSubPath = path.join(process.cwd(), 'public', 'fonts', 'open-sans', 'open-sans-16-white', 'open-sans-16-white.fnt');
      
      const fontTitle = await Jimp.loadFont(fontTitlePath);
      const fontSub = await Jimp.loadFont(fontSubPath);

      image.print(fontTitle, 0, 100, { text: "ENTRADA OFICIAL", alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, 600);
      image.print(fontSub, 0, 180, { text: `Titular: ${row.name}`, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, 600);
      image.print(fontSub, 0, 210, { text: `Entrada: ${i+1} de ${ticketCount}`, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, 600);
      
      const qr = await Jimp.read(qrBuffer);
      qr.resize(350, 350);
      const qrX = (600 - qr.bitmap.width) / 2;
      image.composite(qr, qrX, 300);

      image.print(fontSub, 0, 700, { text: "NO COMPARTAS ESTE CÓDIGO", alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, 600);
      image.print(fontSub, 0, 730, { text: `ID: ${ticketUuid.split('-')[0]}`, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, 600);

      const finalBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);

      attachments.push({ filename: `entrada-docs-${i+1}.jpg`, content: finalBuffer, cid: `qrcode_image_${i}` });
      qrHtml += `<h3 style="color:#ccc;">Entrada ${i+1} de ${ticketCount}</h3><img src="cid:qrcode_image_${i}" style="margin:10px 0;border-radius:10px;width:100%;max-width:350px;">`;
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    const mailOptions = {
      from: `"DOCS Underground" <${process.env.EMAIL_USER}>`,
      replyTo: process.env.EMAIL_USER,
      to: row.email,
      subject: `🎟️ Tus Entradas confirmadas para DOCS - ${row.name}`,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'High'
      },
      text: `Hola ${row.name},\n\n¡Tu pago de Bs. ${row.total_bs} para DOCS ha sido verificado con éxito!\n\nTus códigos QR oficiales de acceso vienen adjuntos en este correo electrónico.\n\nDOCS Underground`,
      html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Tus Entradas</title></head>
<body style="background:#0c0c0c;color:white;padding:30px;font-family:sans-serif;text-align:center;">
  <h2>¡Pago Verificado!</h2>
  <p>Hola ${row.name}, tu pago de Bs. ${row.total_bs} ha sido verificado con éxito.</p>
  <p>Aquí tienes tus códigos QR de acceso:</p>
  ${qrHtml}
  <p style="color:#888;font-size:12px;margin-top:30px;">DOCS Underground - Todos los derechos reservados.</p>
</body>
</html>`,
      attachments
    };

    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, info: info.response });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message, stack: error.stack });
  }
}
