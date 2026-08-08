export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const snapshot = await db.collection('events').orderBy('date', 'desc').get();
    
    // Get approved tickets to calculate sold amount
    const ticketsSnapshot = await db.collection('tickets').where('status', '==', 'approved').get();
    const tickets = ticketsSnapshot.docs.map(doc => doc.data());

    const events = snapshot.docs.map(doc => {
      const data = doc.data();
      const eventId = doc.id;
      
      const soldTickets = tickets.reduce((total, ticket) => {
        if (ticket.event_id === eventId) {
          return total + (Number(ticket.ticket_count) || 1);
        }
        return total;
      }, 0);

      return { 
        id: eventId, 
        soldTickets,
        ...data 
      };
    });

    return NextResponse.json({ success: true, events });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, date, location, description, image_url, status, isMainEvent, ticketLimit, ticketTypes } = body;

    // Si es el evento principal, actualizar los demas a false
    if (isMainEvent) {
      const batch = db.batch();
      const allEvents = await db.collection('events').where('isMainEvent', '==', true).get();
      allEvents.forEach(doc => {
        batch.update(doc.ref, { isMainEvent: false });
      });
      await batch.commit();
    }

    const newEvent = {
      title,
      date,
      location,
      description,
      image_url: image_url || '/Multimedia/photo_2026-05-21_17-54-29.jpg', // Fallback temporal
      status: status || 'active',
      isMainEvent: !!isMainEvent,
      ticketLimit: Number(ticketLimit) || 0,
      ticketTypes: Array.isArray(ticketTypes) ? ticketTypes : [],
      created_at: new Date().toISOString()
    };

    const docRef = await db.collection('events').add(newEvent);

    return NextResponse.json({ success: true, event: { id: docRef.id, ...newEvent } });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, title, date, location, description, image_url, status, isMainEvent, ticketLimit, ticketTypes } = body;

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
      title, date, location, description, status, isMainEvent: !!isMainEvent,
      ticketLimit: Number(ticketLimit) || 0,
      ticketTypes: Array.isArray(ticketTypes) ? ticketTypes : []
    };
    if (image_url) updateData.image_url = image_url;

    await db.collection('events').doc(id).update(updateData);

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
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
