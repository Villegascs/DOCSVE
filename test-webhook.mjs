async function testWebhook() {
  try {
    const payload = {
      callback_query: {
        id: "12345",
        data: "approve_dummy-id-that-doesnt-exist",
        message: {
          message_id: 1,
          chat: { id: -5421039277 },
          caption: "Test Caption"
        }
      }
    };

    console.log('Sending webhook...');
    const res = await fetch('https://docsve.vercel.app/api/telegram-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log(`Response: ${text}`);
  } catch (e) {
    console.error(e);
  }
}

testWebhook();
