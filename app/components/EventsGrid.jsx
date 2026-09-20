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

const DEFAULT_MAIN_EVENT = {
  id: 'flowers-docs-main',
  title: 'DOCS x FLOWERS',
  date: '03 DE OCTUBRE',
  location: 'CARACAS',
  lineup: "TONY FLORES\nSALOMON CORREA\nFOFY\nNOCTO(VE)",
  description: '',
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

export default function EventsGrid({ initialEvents = null, initialVideoData = null }) {
  const [modalOpen, setModalOpen] = useState(false);
  
  const [events, setEvents] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('docs_events_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (_) {}
    }
    return [DEFAULT_MAIN_EVENT];
  });
  
  const initialMain = events.find(e => e.isMainEvent && e.status === 'active') ||
                      events.find(e => e.isMainEvent) ||
                      events[0] ||
                      DEFAULT_MAIN_EVENT;
                      
  const [selectedEvent, setSelectedEvent] = useState(initialMain);
  const [loading, setLoading] = useState(false);

  // Video Section Info: recupera al instante lo guardado por el usuario (sin textos obsoletos)
  const [videoData, setVideoData] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('docs_video_cache');
        if (cached) return JSON.parse(cached);
      } catch (_) {}
    }
    return {
      title: "",
      subtitle: "",
      description: "",
      youtubeUrl: ""
    };
  });

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/admin/events');
      const data = await res.json();
      if (data.success && Array.isArray(data.events) && data.events.length > 0) {
        setEvents(data.events);
        try {
          localStorage.setItem('docs_events_cache', JSON.stringify(data.events));
        } catch (_) {}
      }
    } catch (error) {
      console.warn('Error fetching events, keeping current state:', error);
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
        try {
          localStorage.setItem('docs_video_cache', JSON.stringify(data.data));
        } catch (_) {}
      }
    } catch (e) {
      console.error('Error fetching video section info:', e);
    }
  };

  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchVideoData();
  }, []);

  // Función para abrir directamente el evento asignado a GET TICKETS
  const handleOpenGetTickets = () => {
    const list = events && events.length > 0 ? events : [DEFAULT_MAIN_EVENT];
    let target = list.find(e => e.isMainEvent && e.status === 'active');
    if (!target) target = list.find(e => e.isMainEvent);
    if (!target) target = list.find(e => e.status === 'active') || list[0] || DEFAULT_MAIN_EVENT;

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
              {videoData.title && <h2 className="session-title">{videoData.title}</h2>}
              
              {videoData.description && (
                <p className="session-description" style={{ whiteSpace: 'pre-line' }}>
                  {videoData.description}
                </p>
              )}

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
            {videoData.youtubeUrl && (
              <div className="video-session-frame-wrapper">
                <div className="video-session-frame">
                  <iframe 
                    src={getEmbedUrl(videoData.youtubeUrl)} 
                    title={videoData.title || "Video Oficial"}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    allowFullScreen
                  />
                </div>
              </div>
            )}
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
