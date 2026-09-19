"use client";
import { useState, useEffect } from 'react';
import PurchaseModal from './PurchaseModal';
import { Ticket, Play } from 'lucide-react';

function getEmbedUrl(url) {
  if (!url) return "https://www.youtube-nocookie.com/embed/5qap5aO4i9A";
  if (url.includes('/embed/')) return url;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}?rel=0&modestbranding=1` : url;
}

export default function EventsGrid() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Video Section Info
  const [videoData, setVideoData] = useState({
    title: "DÖCS | GALLERY SESSION",
    subtitle: "DÖCS SESSIONS",
    description: "Una inmersión sonora única en la escena underground. Revive la intensidad, los beats y la energía de nuestros artistas en vivo en una experiencia audiovisual diseñada para los verdaderos amantes de la música electrónica.",
    youtubeUrl: "https://www.youtube.com/watch?v=5qap5aO4i9A"
  });

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/admin/events');
      const data = await res.json();
      if (data.success) {
        setEvents(data.events);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVideoData = async () => {
    try {
      const res = await fetch('/api/admin/video-section');
      const data = await res.json();
      if (data.success && data.data) {
        setVideoData(data.data);
      }
    } catch (e) {
      console.error('Error fetching video section info:', e);
    }
  };

  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchVideoData();
    const interval = setInterval(fetchEvents, 8000);
    return () => clearInterval(interval);
  }, []);

  // Función para abrir directamente el evento asignado a GET TICKETS
  const handleOpenGetTickets = () => {
    if (events.length === 0) return;
    // 1. Prioriza el evento marcado como GET TICKETS (isMainEvent === true) y activo
    let target = events.find(e => e.isMainEvent && e.status === 'active');
    // 2. Si no, cualquier evento con isMainEvent
    if (!target) target = events.find(e => e.isMainEvent);
    // 3. Fallback a cualquier evento activo
    if (!target) target = events.find(e => e.status === 'active') || events[0];

    if (target) {
      setSelectedEvent(target);
      setModalOpen(true);
    }
  };

  // Escuchar el evento global "open-get-tickets" desde Hero, Navbar u otros botones
  useEffect(() => {
    const handleListener = () => {
      handleOpenGetTickets();
    };

    window.addEventListener('open-get-tickets', handleListener);
    
    // Si la URL contiene #tickets al entrar, abrir modal
    if (typeof window !== 'undefined' && (window.location.hash === '#tickets' || window.location.hash === '#comprar')) {
      handleOpenGetTickets();
    }

    return () => window.removeEventListener('open-get-tickets', handleListener);
  }, [events]);

  // Restaurar automáticamente el modal si el cliente recargó por accidente
  useEffect(() => {
    if (hasRestoredDraft || events.length === 0 || modalOpen) return;
    try {
      const saved = localStorage.getItem('docs_purchase_draft');
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft && draft.eventId && (Date.now() - (draft.updatedAt || 0) < 24 * 60 * 60 * 1000)) {
          const matchingEvent = events.find(e => e.id === draft.eventId);
          if (matchingEvent && matchingEvent.status === 'active') {
            setSelectedEvent(matchingEvent);
            setModalOpen(true);
            setHasRestoredDraft(true);
          }
        }
      }
    } catch (_) {}
  }, [events, modalOpen, hasRestoredDraft]);

  const handleCloseModal = () => {
    try {
      localStorage.removeItem('docs_purchase_draft');
    } catch (_) {}
    setModalOpen(false);
  };

  const activeMainEvent = events.find(e => e.isMainEvent && e.status === 'active') || events.find(e => e.isMainEvent) || events.find(e => e.status === 'active');

  return (
    <>
      <section id="eventos" className="video-session-section">
        <div className="container">
          <div className="video-session-grid">
            {/* COLUMNA IZQUIERDA: INFORMACIÓN Y DESCRIPCIÓN DEL VIDEO */}
            <div className="video-session-info">
              {videoData.subtitle && (
                <div className="session-badge">
                  <span className="session-badge-dot"></span>
                  <span>{videoData.subtitle}</span>
                </div>
              )}
              
              <h2 className="session-title">{videoData.title}</h2>
              
              <p className="session-description">
                {videoData.description}
              </p>

              <div className="session-actions">
                <button 
                  type="button" 
                  className="btn-primary session-btn-tickets" 
                  onClick={handleOpenGetTickets}
                >
                  <Ticket size={18} />
                  <span>{activeMainEvent ? `GET TICKETS • ${activeMainEvent.title}` : 'GET TICKETS'}</span>
                </button>

                {videoData.youtubeUrl && (
                  <a 
                    href={videoData.youtubeUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn-secondary session-btn-youtube"
                  >
                    <Play size={16} />
                    <span>Ver en YouTube</span>
                  </a>
                )}
              </div>
            </div>

            {/* COLUMNA DERECHA: RECUADRO CON VIDEO DE YOUTUBE */}
            <div className="video-session-frame-wrapper">
              <div className="video-session-frame">
                <iframe 
                  src={getEmbedUrl(videoData.youtubeUrl)} 
                  title={videoData.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MODAL DE COMPRA DIRECTO PARA EL EVENTO SELECCIONADO */}
      {modalOpen && selectedEvent && (
        <PurchaseModal 
          event={selectedEvent} 
          onClose={handleCloseModal} 
          onPurchaseSuccess={fetchEvents}
        />
      )}
    </>
  );
}
