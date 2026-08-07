"use client";
import { useState } from 'react';
import PurchaseModal from './PurchaseModal';

export default function EventsGrid() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Datos mockeados por ahora, luego vendrán de Firebase
  const events = [
    {
      id: 1,
      title: "DOCS | MAYO 23",
      location: "Locación Secreta - Caracas",
      lineup: "Lineup TBA",
      date: "23",
      month: "MAY",
      image: "/Multimedia/photo_2026-05-21_17-54-29.jpg",
      status: "active"
    }
  ];

  const handleBuyClick = (evt) => {
    setSelectedEvent(evt);
    setModalOpen(true);
  };

  return (
    <>
      <section id="eventos" className="section">
        <div className="container">
          <h2 className="section-title">Próximos <span className="highlight">Eventos</span></h2>
          <div className="events-grid">
            {events.map((evt) => (
              <div key={evt.id} className={`event-card ${evt.status === 'disabled' ? 'disabled' : ''} centered-bottom`}>
                <div className="event-image">
                  <img src={evt.image} alt={evt.title} />
                  <div className="event-date">
                    <span className="day">{evt.date}</span>
                    <span className="month">{evt.month}</span>
                  </div>
                  {evt.status === 'active' && <div className="event-badge">ON SALE</div>}
                </div>
                <div className="event-details">
                  <h3>{evt.title}</h3>
                  <p className="location"><i className="fas fa-map-marker-alt"></i> {evt.location}</p>
                  <p className="lineup">{evt.lineup}</p>
                  
                  <button 
                    className="btn-primary full-width" 
                    disabled={evt.status === 'disabled'}
                    onClick={() => handleBuyClick(evt)}
                  >
                    {evt.status === 'disabled' ? 'AGOTADO' : 'COMPRAR ENTRADAS'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {modalOpen && (
        <PurchaseModal 
          event={selectedEvent} 
          onClose={() => setModalOpen(false)} 
        />
      )}
    </>
  );
}
