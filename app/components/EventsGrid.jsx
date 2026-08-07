"use client";
import { useState, useEffect } from 'react';
import PurchaseModal from './PurchaseModal';

export default function EventsGrid() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch('/api/admin/events');
        const data = await res.json();
        if (data.success) {
          // Format date for display
          const formattedEvents = data.events.map(evt => {
            const d = new Date(evt.date);
            const months = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
            return {
              ...evt,
              displayDate: d.getDate().toString(),
              displayMonth: months[d.getMonth()]
            };
          });
          setEvents(formattedEvents);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

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
            {loading ? (
              <p style={{textAlign: 'center', width: '100%', color: '#888'}}>Cargando eventos...</p>
            ) : events.length === 0 ? (
              <p style={{textAlign: 'center', width: '100%', color: '#888'}}>No hay eventos disponibles en este momento.</p>
            ) : events.map((evt) => (
              <div key={evt.id} className={`event-card ${evt.status === 'disabled' ? 'disabled' : ''} centered-bottom`}>
                <div className="event-image">
                  <img src={evt.image_url || evt.image} alt={evt.title} />
                  <div className="event-date">
                    <span className="day">{evt.displayDate}</span>
                    <span className="month">{evt.displayMonth}</span>
                  </div>
                  {evt.status === 'active' && <div className="event-badge">ON SALE</div>}
                </div>
                <div className="event-details">
                  <h3>{evt.title}</h3>
                  <p className="location"><i className="fas fa-map-marker-alt"></i> {evt.location}</p>
                  <p className="lineup" style={{whiteSpace: 'pre-wrap'}}>{evt.description || evt.lineup}</p>
                  
                  <button 
                    className="btn-primary full-width" 
                    disabled={evt.status === 'disabled' || evt.status === 'archived'}
                    onClick={() => handleBuyClick(evt)}
                  >
                    {evt.status === 'disabled' || evt.status === 'archived' ? 'AGOTADO' : 'COMPRAR ENTRADAS'}
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
