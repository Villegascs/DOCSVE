export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function GET() {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    
    const info = await transporter.sendMail({
      from: `"DOCS Underground" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: `Prueba SMTP desde Vercel`,
      text: `Si lees esto, Vercel puede enviar correos.`
    });
    
    return NextResponse.json({ success: true, info: info.response });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message, stack: error.stack });
  }
}
