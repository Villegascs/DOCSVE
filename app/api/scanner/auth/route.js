import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function POST(req) {
  try {
    const { key, name } = await req.json();

    if (!key) {
      return NextResponse.json({ valid: false, message: 'La clave es requerida' }, { status: 400 });
    }

    const snapshot = await db.collection('scanner_keys').where('key', '==', key).limit(1).get();
    
    if (snapshot.empty) {
      return NextResponse.json({ valid: false, message: 'Clave inválida' }, { status: 401 });
    }

    // Save the user who logged in with this key
    if (name) {
      const docRef = snapshot.docs[0].ref;
      const docData = snapshot.docs[0].data();
      const currentUsers = docData.active_users || [];
      if (!currentUsers.includes(name)) {
        await docRef.update({
          active_users: [...currentUsers, name]
        });
      }
    }

    return NextResponse.json({ valid: true, message: 'Autenticación exitosa' });
  } catch (error) {
    console.error('Error en scanner auth:', error);
    return NextResponse.json({ valid: false, message: 'Error del servidor' }, { status: 500 });
  }
}
