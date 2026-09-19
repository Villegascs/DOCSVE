import Countdown from './Countdown';
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
      <video
        autoPlay
        loop
        muted
        playsInline
        className="hero-video"
      >
        <source src="/Multimedia/video-fondo-wildbloom.mp4" type="video/mp4" />
        <source src="/Multimedia/VIDEO%20FONDO%20WILDBLOOM.mp4" type="video/mp4" />
      </video>
      <div className="hero-overlay"></div>
      <div className="hero-content">
        <Countdown targetDate={nextEventDate.toISOString()} />
      </div>
    </header>
  );
}
