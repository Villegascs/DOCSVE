export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

// Fallback robusto en caso de que Firestore esté en mantenimiento o se agote la cuota gratuita
const FALLBACK_MAIN_EVENT = {
  id: 'flowers-docs-main',
  title: 'DOCS x FLOWERS',
  date: '03 DE OCTUBRE',
  location: 'CARACAS',
  lineup: "TONY FLORES\nSALOMON CORREA\nFOFY\nNOCTO(VE)",
  description: 'Una inmersión sonora única en la escena underground. Revive la intensidad, los beats y la energía de nuestros artistas en vivo en una experiencia audiovisual diseñada para los verdaderos amantes de la música electrónica.',
  image_url: '/Multimedia/IMG_0724.PNG',
  status: 'active',
  isMainEvent: true,
  ticketLimit: 0,
  soldTickets: 0,
  isSoldOut: false,
  ticketTypes: [
    { name: 'General', priceEur: 12, priceBs: 11693.04 }
  ],
  drinkPacks: [
    { name: '10 Cervezas', priceEur: 15, priceBs: 14616.30 },
    { name: 'Botella de Ron + Servicios', priceEur: 45, priceBs: 43848.90 },
    { name: 'Botella de Whisky + Servicios', priceEur: 65, priceBs: 63337.30 }
  ]
};

let eventsCache = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 segundos de caché en memoria para proteger cuotas de Firestore

export async function GET() {
  const now = Date.now();
  if (eventsCache && (now - lastCacheTime) < CACHE_TTL_MS) {
    return NextResponse.json({ success: true, events: eventsCache, cached: true });
  }

  try {
    const snapshot = await db.collection('events').orderBy('date', 'desc').get();
    
    if (snapshot.empty) {
      eventsCache = [FALLBACK_MAIN_EVENT];
      lastCacheTime = now;
      return NextResponse.json({ success: true, events: [FALLBACK_MAIN_EVENT] });
    }

    const events = snapshot.docs.map(doc => {
      const data = doc.data();
      const eventId = doc.id;
      return { 
        id: eventId, 
        soldTickets: 0,
        soldTicketsByType: {},
        isSoldOut: false,
        ...data 
      };
    });

    eventsCache = events;
    lastCacheTime = now;

    return NextResponse.json({ success: true, events });
  } catch (error) {
    console.error('Error fetching events from Firestore, returning cached or fallback event:', error.message);
    const fallbackList = eventsCache && eventsCache.length > 0 ? eventsCache : [FALLBACK_MAIN_EVENT];
    return NextResponse.json({ success: true, events: fallbackList, fallback: true, warning: error.message });
  }
}

import Jimp from 'jimp';

async function optimizeImageUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return imageUrl;
  if (!imageUrl.startsWith('data:image')) return imageUrl;
  
  // Si la cadena base64 ya es menor o igual a 650KB, es 100% segura para Firestore
  if (imageUrl.length <= 650 * 1024) return imageUrl;

  try {
    const base64Data = imageUrl.split(',')[1];
    if (!base64Data) return imageUrl;
    const buffer = Buffer.from(base64Data, 'base64');
    const image = await Jimp.read(buffer);
    if (image.bitmap.width > 1200 || image.bitmap.height > 1200) {
      image.scaleToFit(1200, 1200);
    }
    image.quality(82);
    const optimizedBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
    return `data:image/jpeg;base64,${optimizedBuffer.toString('base64')}`;
  } catch (err) {
    console.error('Error optimizando imagen en servidor:', err);
    return imageUrl;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, date, location, lineup, description, image_url, status, isMainEvent, ticketLimit, ticketTypes, drinkPacks } = body;

    // Si es el evento principal, actualizar los demas a false
    if (isMainEvent) {
      const batch = db.batch();
      const allEvents = await db.collection('events').where('isMainEvent', '==', true).get();
      allEvents.forEach(doc => {
        batch.update(doc.ref, { isMainEvent: false });
      });
      await batch.commit();
    }

    const finalImageUrl = await optimizeImageUrl(image_url);

    const newEvent = {
      title,
      date,
      location,
      lineup: lineup || '',
      description: description || '',
      image_url: finalImageUrl || '/Multimedia/photo_2026-05-21_17-54-29.jpg', // Fallback temporal
      status: status || 'active',
      isMainEvent: !!isMainEvent,
      ticketLimit: Number(ticketLimit) || 0,
      ticketTypes: Array.isArray(ticketTypes) ? ticketTypes : [],
      drinkPacks: Array.isArray(drinkPacks) ? drinkPacks : [],
      created_at: new Date().toISOString()
    };

    const docRef = await db.collection('events').add(newEvent);
    eventsCache = null;
    lastCacheTime = 0;

    return NextResponse.json({ success: true, event: { id: docRef.id, ...newEvent } });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, title, date, location, lineup, description, image_url, status, isMainEvent, ticketLimit, ticketTypes, drinkPacks } = body;

    if (!id) throw new Error('ID is required');

    if (isMainEvent) {
      const batch = db.batch();
      const allEvents = await db.collection('events').where('isMainEvent', '==', true).get();
      allEvents.forEach(doc => {
        if (doc.id !== id) {
          batch.update(doc.ref, { isMainEvent: false });
        }
      });
      await batch.commit();
    }

    const updateData = {
      title, date, location, lineup: lineup || '', description: description || '', status, isMainEvent: !!isMainEvent,
      ticketLimit: Number(ticketLimit) || 0,
      ticketTypes: Array.isArray(ticketTypes) ? ticketTypes : [],
      drinkPacks: Array.isArray(drinkPacks) ? drinkPacks : []
    };
    if (image_url) {
      updateData.image_url = await optimizeImageUrl(image_url);
    }

    await db.collection('events').doc(id).update(updateData);
    eventsCache = null;
    lastCacheTime = 0;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) throw new Error('ID is required');

    await db.collection('events').doc(id).delete();
    eventsCache = null;
    lastCacheTime = 0;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
