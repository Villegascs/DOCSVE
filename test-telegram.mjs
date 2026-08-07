import TelegramBot from 'node-telegram-bot-api';

const token = "8603180606:AAFw6Gn4pV1CN0kUZf6nl9p8DX24sM-ijI0";
const chatId = "-5421039277";
const bot = new TelegramBot(token, { polling: false });

async function run() {
  try {
    // 1x1 transparent PNG
    const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    console.log('Sending photo...');
    await bot.sendPhoto(chatId, buffer, {
      caption: 'Prueba de Foto',
      parse_mode: 'HTML'
    }, { filename: 'test.png', contentType: 'image/png' });
    console.log('Success!');
  } catch (e) {
    console.error('Error:', e);
  }
}
run();
