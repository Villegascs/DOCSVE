import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user: 'docssweb@gmail.com', pass: 'ffrsimncoawtvkvo' } // without spaces
});

async function run() {
  try {
    const info = await transporter.sendMail({
      from: '"Test DOCS" <docssweb@gmail.com>',
      to: 'docssweb@gmail.com',
      subject: 'Prueba de Correo Node.js',
      text: 'Si te llega esto, las credenciales están perfectas.'
    });
    console.log('Email enviado:', info.response);
  } catch (e) {
    console.error('Error:', e);
  }
}
run();
