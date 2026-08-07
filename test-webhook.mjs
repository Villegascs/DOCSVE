import fs from 'fs';
import path from 'path';

async function testWebhook() {
  try {
    const form = new FormData();
    form.append('name', 'Test User');
    form.append('email', 'test@test.com');
    form.append('cedula', 'V-12345678');
    form.append('phone', '04141234567');
    form.append('bank', 'BDV');
    form.append('ref', '123456');
    form.append('ticketCount', '1');
    form.append('totalBs', '127.50');
    form.append('eventId', 'test_event');
    
    // Create a dummy 1x1 png image
    const dummyImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    const blob = new Blob([dummyImage], { type: 'image/png' });
    form.append('receipt', blob, 'dummy.png');

    console.log('Sending request to Vercel...');
    const res = await fetch('https://docsve.vercel.app/api/tickets/request', {
      method: 'POST',
      body: form
    });
    
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log(`Response: ${text}`);
  } catch (e) {
    console.error(e);
  }
}

testWebhook();
