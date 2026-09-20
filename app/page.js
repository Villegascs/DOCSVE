export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SponsorsTicker from './components/SponsorsTicker';
import EventsGrid from './components/EventsGrid';
import Footer from './components/Footer';
import { db } from '@/lib/firebase-admin';

async function getVideoSectionData() {
  try {
    const doc = await db.collection('settings').doc('video_section').get();
    if (doc.exists) {
      const data = doc.data();
      return {
        title: data.title ?? '',
        subtitle: data.subtitle ?? '',
        description: data.description ?? '',
        youtubeUrl: data.youtubeUrl ?? ''
      };
    }
  } catch (error) {
    console.error('Error obteniendo video section en servidor:', error);
  }
  return null;
}

async function getEventsData() {
  try {
    const snapshot = await db.collection('events').orderBy('date', 'desc').get();
    if (!snapshot.empty) {
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          soldTickets: 0,
          soldTicketsByType: {},
          isSoldOut: false,
          ...data
        };
      });
    }
  } catch (error) {
    console.error('Error obteniendo eventos en servidor:', error);
  }
  return null;
}

export default async function Home() {
  const [initialVideoData, initialEvents] = await Promise.all([
    getVideoSectionData(),
    getEventsData()
  ]);

  return (
    <>
      <Navbar />
      <Hero />
      <SponsorsTicker />
      <EventsGrid initialVideoData={initialVideoData} initialEvents={initialEvents} />
      
      <section id="tienda" style={{ padding: '8rem 2rem', textAlign: 'center', background: 'black', borderTop: '1px solid #1a1a1a' }}>
        <h2 style={{ fontSize: '3.5rem', fontWeight: '900', color: 'white', marginBottom: '1rem', fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>MERCH OFICIAL</h2>
        <p style={{ color: '#888', fontSize: '1.2rem' }}>Próximamente. Viste la cultura.</p>
      </section>

      <Footer />
    </>
  );
}
