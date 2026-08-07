import Countdown from './Countdown';
import Link from 'next/link';
import { db } from '@/lib/firebase-admin';

export default async function Hero() {
  let nextEventDate = new Date();
  nextEventDate.setDate(nextEventDate.getDate() + 15);
  let eventTitle = 'Pronto';

  try {
    const snapshot = await db.collection('events').where('isMainEvent', '==', true).limit(1).get();
    if (!snapshot.empty) {
      const mainEvent = snapshot.docs[0].data();
      if (mainEvent.date) {
        nextEventDate = new Date(mainEvent.date);
        eventTitle = mainEvent.title || 'Próximo Evento';
      }
    }
  } catch (error) {
    console.error('Error fetching main event:', error);
  }

  return (
    <header id="inicio" className="hero">
      <div className="hero-overlay"></div>
      <div className="hero-content">
        <div className="hero-badge">{eventTitle}</div>
        <h1 className="hero-title">
          <span>WITHOUT MUSIC,</span>
          <span className="highlight">LIFE WOULD BE A MISTAKE.</span>
        </h1>
        
        <Countdown targetDate={nextEventDate.toISOString()} />

        <div className="hero-actions" style={{ marginTop: '2rem' }}>
          <Link href="#eventos" className="btn-primary">COMPRAR ENTRADAS</Link>
          <Link href="#musica" className="btn-secondary">ESCUCHAR SETS</Link>
        </div>
      </div>
    </header>
  );
}
