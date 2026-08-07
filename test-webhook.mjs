import fs from 'fs';

async function run() {
  const form = new FormData();
  form.append('name', 'Test User');
  form.append('email', 'test@test.com');
  form.append('cedula', '123456');
  form.append('phone', '04141234567');
  form.append('bank', 'Banesco');
  form.append('ref', '1234');
  form.append('ticketCount', '1');
  form.append('totalBs', '100');
  form.append('eventId', '1');
  
  // Create a dummy file blob
  const fileBlob = new Blob([new Uint8Array(10)], { type: 'image/png' });
  form.append('receipt', fileBlob, 'receipt.png');

  try {
    console.log('Sending request to localhost...');
    const res = await fetch('http://localhost:3001/api/tickets/request', {
      method: 'POST',
      body: form
    });
    const data = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', data);
  } catch (e) {
    console.error(e);
  }
}
run();
