export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ success: false, error: 'TELEGRAM_BOT_TOKEN no configurado' }, { status: 400 });
  }

  const webhookUrl = 'https://www.docsevents.com/api/telegram-webhook';

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query']
      })
    });
    const data = await res.json();

    const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const infoData = await infoRes.json();

    return NextResponse.json({
      success: true,
      setWebhookResult: data,
      currentWebhookInfo: infoData
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
