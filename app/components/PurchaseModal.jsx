"use client";
import { useState, useEffect } from 'react';

function formatEventDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const dayName = days[d.getDay()];
    const dayNum = String(d.getDate()).padStart(2, '0');
    const monthName = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const timeStr = (hours !== '00' || mins !== '00') ? ` • ${hours}:${mins}` : '';
    return `${dayName}, ${dayNum} de ${monthName} de ${year}${timeStr}`;
  } catch (e) {
    return dateStr;
  }
}

export default function PurchaseModal({ event: initialEvent, onClose, onPurchaseSuccess }) {
  const [event, setEvent] = useState(initialEvent);

  // Sync real-time stock immediately and poll while modal is open
  useEffect(() => {
    let isMounted = true;
    async function syncStock() {
      try {
        const res = await fetch('/api/admin/events');
        const data = await res.json();
        if (data.success && isMounted) {
          const freshEvent = data.events.find(e => e.id === initialEvent.id);
          if (freshEvent) {
            setEvent(freshEvent);
          }
        }
      } catch (err) {
        console.error('Error syncing stock:', err);
      }
    }

    syncStock();
    const interval = setInterval(syncStock, 3500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [initialEvent.id]);

  // Helper to calculate available tickets for a ticket type and event
  const calculateAvailableForType = (type) => {
    let max = 20; // Default limit per purchase

    if (type && type.limit > 0) {
      const sold = (event.soldTicketsByType && event.soldTicketsByType[type.name]) || 0;
      const remainingType = Math.max(0, type.limit - sold);
      max = Math.min(max, remainingType);
    }

    if (event.ticketLimit > 0) {
      const soldTotal = event.soldTickets || 0;
      const remainingEvent = Math.max(0, event.ticketLimit - soldTotal);
      max = Math.min(max, remainingEvent);
    }

    return max;
  };

  // Helper para leer borrador en caso de recarga accidental
  const getDraft = () => {
    if (typeof window === 'undefined') return null;
    try {
      const item = localStorage.getItem('docs_purchase_draft');
      if (item) {
        const parsed = JSON.parse(item);
        if (parsed && parsed.eventId === initialEvent.id && (Date.now() - (parsed.updatedAt || 0) < 24 * 60 * 60 * 1000)) {
          return parsed;
        }
      }
    } catch (_) {}
    return null;
  };

  const initialDraft = getDraft();

  const [selectedTicketType, setSelectedTicketType] = useState(() => {
    if (initialDraft?.ticketTypeName && initialEvent.ticketTypes) {
      const matched = initialEvent.ticketTypes.find(t => t.name === initialDraft.ticketTypeName);
      if (matched && calculateAvailableForType(matched) > 0) {
        return matched;
      }
    }
    if (initialEvent.ticketTypes && initialEvent.ticketTypes.length > 0) {
      const availableType = initialEvent.ticketTypes.find(t => calculateAvailableForType(t) > 0);
      return availableType || initialEvent.ticketTypes[0];
    }
    return null;
  });

  const maxAvailableTickets = calculateAvailableForType(selectedTicketType);

  const [ticketCount, setTicketCount] = useState(() => {
    if (typeof initialDraft?.ticketCount === 'number' && initialDraft.ticketCount > 0) {
      return initialDraft.ticketCount;
    }
    const available = calculateAvailableForType(
      initialEvent.ticketTypes && initialEvent.ticketTypes.length > 0 
        ? (initialEvent.ticketTypes.find(t => calculateAvailableForType(t) > 0) || initialEvent.ticketTypes[0])
        : null
    );
    return available > 0 ? 1 : 0;
  });

  const [selectedDrinkPacks, setSelectedDrinkPacks] = useState(() => {
    return Array.isArray(initialDraft?.selectedDrinkPacks) ? initialDraft.selectedDrinkPacks : [];
  });

  const [currentStep, setCurrentStep] = useState(() => {
    if (initialDraft?.currentStep && [1, 2, 3].includes(initialDraft.currentStep)) {
      return initialDraft.currentStep;
    }
    return 1;
  });

  const [paymentMethod, setPaymentMethod] = useState(() => {
    return initialDraft?.paymentMethod || 'pagomovil';
  });

  const [selectedBank, setSelectedBank] = useState(() => {
    return initialDraft?.selectedBank || 'Provincial';
  });

  const [clientInfo, setClientInfo] = useState(() => {
    return initialDraft?.clientInfo || {
      name: '',
      email: '',
      cedulaPrefix: 'V-',
      cedula: '',
      phone: '',
      ref: ''
    };
  });

  const [customAlert, setCustomAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [currentRateEUR, setCurrentRateEUR] = useState(0);
  const [copiedKey, setCopiedKey] = useState(null);

  // Guardar automáticamente el progreso en localStorage ante cualquier cambio
  useEffect(() => {
    if (success) return;
    try {
      localStorage.setItem('docs_purchase_draft', JSON.stringify({
        eventId: event.id,
        currentStep,
        ticketTypeName: selectedTicketType?.name,
        ticketCount,
        selectedDrinkPacks,
        paymentMethod,
        selectedBank,
        clientInfo,
        updatedAt: Date.now()
      }));
    } catch (_) {}
  }, [event.id, currentStep, selectedTicketType, ticketCount, selectedDrinkPacks, paymentMethod, selectedBank, clientInfo, success]);

  // Cierre limpio del modal que elimina el borrador
  const handleModalClose = () => {
    try {
      localStorage.removeItem('docs_purchase_draft');
    } catch (_) {}
    onClose();
  };

  // Sync ticketCount when selected ticket type changes or if maxAvailableTickets changes
  useEffect(() => {
    if (maxAvailableTickets <= 0) {
      setTicketCount(0);
    } else if (ticketCount > maxAvailableTickets) {
      setTicketCount(maxAvailableTickets);
    } else if (ticketCount < 1) {
      setTicketCount(1);
    }
  }, [selectedTicketType, maxAvailableTickets]);

  useEffect(() => {
    async function fetchRate() {
      try {
        const response = await fetch('https://ve.dolarapi.com/v1/euros/oficial');
        const data = await response.json();
        if (data && data.promedio) {
          setCurrentRateEUR(Math.round(data.promedio * 100) / 100);
        }
      } catch (error) {
        console.error('Error fetching BCV EUR rate:', error);
      }
    }
    fetchRate();
  }, []);

  const ticketPriceEUR = selectedTicketType ? selectedTicketType.price : 3; // Fallback a 3 EUR si no hay tipos
  
  const drinkPacksTotal = selectedDrinkPacks.reduce((total, packName) => {
    const pack = event.drinkPacks?.find(p => p.name === packName);
    return total + (pack ? pack.price : 0);
  }, 0);

  const grandTotalEUR = (ticketPriceEUR * ticketCount) + drinkPacksTotal;
  const totalBs = currentRateEUR > 0 ? (currentRateEUR * grandTotalEUR).toFixed(2) : 'Cargando...';

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGoToStep2 = () => {
    setCurrentStep(2);
    const modalEl = document.querySelector('.modal');
    if (modalEl) modalEl.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToStep1 = () => {
    setCurrentStep(1);
    const modalEl = document.querySelector('.modal');
    if (modalEl) modalEl.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToStep2 = () => {
    setCurrentStep(2);
    const modalEl = document.querySelector('.modal');
    if (modalEl) modalEl.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleContinueToPayment = () => {
    if (maxAvailableTickets <= 0) {
      setCustomAlert({
        title: 'Entradas Agotadas',
        message: 'Lo sentimos, las entradas seleccionadas ya no se encuentran disponibles.',
        actionText: 'Entendido'
      });
      return;
    }
    if (ticketCount <= 0 || ticketCount > maxAvailableTickets) {
      setCustomAlert({
        title: 'Disponibilidad Limitada',
        message: `Actualmente solo puedes seleccionar entre 1 y ${maxAvailableTickets} entrada(s).`,
        actionText: 'Entendido'
      });
      return;
    }
    setCurrentStep(3);
    const modalEl = document.querySelector('.modal');
    if (modalEl) modalEl.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);
    if (method === 'zelle') {
      setSelectedBank('Zelle');
    } else if (method === 'binance') {
      setSelectedBank('Binance');
    } else if (method === 'pagomovil') {
      if (selectedBank === 'Zelle' || selectedBank === 'Binance') {
        setSelectedBank('Provincial');
      }
    }
  };

  const compressImage = (file, maxWidth = 1000, quality = 0.7) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round(height * (maxWidth / width));
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg', lastModified: Date.now() }));
            } else {
              resolve(file);
            }
          }, 'image/jpeg', quality);
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (maxAvailableTickets <= 0) {
      setCustomAlert({
        title: 'Entradas Agotadas',
        message: 'Lo sentimos, no hay entradas disponibles para esta selección.',
        actionText: 'Entendido'
      });
      return;
    }

    if (ticketCount > maxAvailableTickets) {
      setCustomAlert({
        title: 'Disponibilidad Limitada',
        message: `Solo puedes comprar un máximo de ${maxAvailableTickets} entrada(s) disponibles.`,
        actionText: 'Entendido'
      });
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData(e.target);
      
      const fileInput = e.target.querySelector('input[type="file"]');
      if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        if (file.size > 2 * 1024 * 1024) { // Si es mayor a 2MB, comprimir
          try {
            const compressedFile = await compressImage(file, 1000, 0.7);
            formData.set('receipt', compressedFile);
          } catch(err) {
            console.error("Error al comprimir:", err);
          }
        }
      }

      formData.set('ticketCount', ticketCount);
      formData.set('totalBs', totalBs);
      formData.set('totalEur', grandTotalEUR);
      formData.set('eventId', event.id);
      formData.set('ticketTypeName', selectedTicketType ? selectedTicketType.name : 'Entrada General');
      if (selectedDrinkPacks.length > 0) {
        formData.set('drinkPacks', selectedDrinkPacks.join(', '));
      }

      const response = await fetch('/api/tickets/request', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        if (result.isStockError) {
          const avail = result.available;
          setCustomAlert({
            title: '¡Disponibilidad Actualizada!',
            message: (result.error || 'Lo sentimos, otro cliente acaba de adquirir entradas.').replace(/^Error:\s*/i, ''),
            actionText: (avail && avail > 0) ? `Ajustar a ${avail} entrada${avail > 1 ? 's' : ''} y continuar` : 'Ver otras entradas',
            onAction: () => {
              if (avail && avail > 0) setTicketCount(avail);
              handleBackToStep1();
            }
          });
          return;
        }
        throw new Error(result.error || 'Error al procesar el pago');
      }

      setSuccess(true);
      try {
        localStorage.removeItem('docs_purchase_draft');
      } catch (_) {}
      onPurchaseSuccess?.();
    } catch (error) {
      console.error(error);
      const cleanMsg = (error.message || 'Error al procesar la solicitud').replace(/^Error:\s*/i, '');
      setCustomAlert({
        title: 'Aviso',
        message: cleanMsg,
        actionText: 'Entendido'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal active" onClick={(e) => { if (e.target.className.includes('modal active')) handleModalClose(); }}>
      <div className="modal-content custom-modal">
        
        {!success ? (
          <>
            {/* Top Bar with Stepper & Close Button */}
            <div className="modal-top-bar">
              <div className="checkout-stepper">
                <button 
                  type="button" 
                  className={`stepper-step ${currentStep === 1 ? 'active' : 'completed'}`}
                  onClick={handleBackToStep1}
                >
                  <span className="step-number">1.</span>
                  <span className="step-full">Info Evento</span>
                  <span className="step-short">Info</span>
                </button>

                <div className={`stepper-divider ${currentStep >= 2 ? 'completed' : ''}`} />

                <button 
                  type="button" 
                  className={`stepper-step ${currentStep === 2 ? 'active' : (currentStep > 2 ? 'completed' : '')}`}
                  onClick={handleBackToStep2}
                >
                  <span className="step-number">2.</span>
                  <span className="step-full">Entradas y Servicios</span>
                  <span className="step-short">Entradas</span>
                </button>

                <div className={`stepper-divider ${currentStep === 3 ? 'completed' : ''}`} />

                <button 
                  type="button" 
                  className={`stepper-step ${currentStep === 3 ? 'active' : ''}`}
                  onClick={() => {
                    if (maxAvailableTickets > 0 && ticketCount > 0) {
                      handleContinueToPayment();
                    }
                  }}
                  style={{ cursor: (maxAvailableTickets > 0 && ticketCount > 0) ? 'pointer' : 'not-allowed' }}
                >
                  <span className="step-number">3.</span>
                  <span className="step-full">Verificación de Pago</span>
                  <span className="step-short">Pago</span>
                </button>
              </div>

              <button 
                type="button" 
                className="modal-close-btn" 
                onClick={handleModalClose} 
                aria-label="Cerrar modal"
              >
                &times;
              </button>
            </div>

            <form className="payment-form" onSubmit={handleSubmit}>
              {/* ================= PASO 1: PORTADA E INFORMACIÓN DEL EVENTO ================= */}
              <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
                <div className="event-stage1-container">
                  {/* INFORMACIÓN DEL EVENTO ENCIMA DE LA PORTADA */}
                  <div className="event-info-header">
                    <h2 className="modal-main-title event-stage1-title">{event.title}</h2>
                    
                    <div className="event-meta-row">
                      {event.date && (
                        <div className="event-meta-item">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="18" y2="10"></line>
                          </svg>
                          <span>{formatEventDate(event.date)}</span>
                        </div>
                      )}

                      {event.location && (
                        <div className="event-meta-item">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                          </svg>
                          <span>{event.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Portada del evento */}
                  {(event.image_url || event.image) && (
                    <div className="event-cover-wrapper">
                      <img 
                        src={event.image_url || event.image} 
                        alt={event.title || 'Portada del evento'} 
                        className="event-cover-img" 
                      />
                    </div>
                  )}

                  {/* Lineup / Artistas si está configurado */}
                  {event.lineup && (
                    <div className="event-section-box">
                      <div className="event-section-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 18V5l12-2v13"></path>
                          <circle cx="6" cy="18" r="3"></circle>
                          <circle cx="18" cy="16" r="3"></circle>
                        </svg>
                        LINEUP / ARTISTAS
                      </div>
                      <div className="event-lineup-content">
                        {(event.lineup.includes('\n') 
                          ? event.lineup.split('\n') 
                          : event.lineup.split(',')
                        ).map((artist, idx) => {
                          const trimmed = artist.trim();
                          if (!trimmed) return null;
                          return (
                            <div key={idx} className="event-lineup-artist">
                              <span className="artist-bullet">•</span>
                              <span className="artist-name">{trimmed}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Breve descripción de la fiesta */}
                  {event.description && (
                    <div className="event-section-box">
                      <div className="event-section-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="16" x2="12" y2="12"></line>
                          <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                        DESCRIPCIÓN DE LA FIESTA
                      </div>
                      <p className="event-desc-text">
                        {event.description}
                      </p>
                    </div>
                  )}

                  {/* Botón para pasar a selección de entradas */}
                  <div className="event-stage1-cta">
                    <button 
                      type="button" 
                      className="btn-continue-step"
                      onClick={handleGoToStep2}
                    >
                      COMPRAR ENTRADAS →
                    </button>
                  </div>
                </div>
              </div>

              {/* ================= PASO 2: SELECCIÓN DE ENTRADAS Y SERVICIOS ================= */}
              <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
                <div className="step-nav-header">
                  <button 
                    type="button" 
                    className="btn-back-step" 
                    onClick={handleBackToStep1}
                  >
                    ← Volver a información del evento
                  </button>
                </div>

                <h2 className="modal-main-title">SELECCIÓN DE ENTRADAS</h2>
                <p className="modal-subtitle">Para asegurar tu asistencia a <strong>{event.title}</strong>, selecciona el tipo de entrada, la cantidad y los combos de bebidas opcionales.</p>
                
                {event.ticketTypes && event.ticketTypes.length > 0 && (
                  <div className="ticket-types-container" style={{marginBottom: '1.8rem'}}>
                    <h4 style={{marginBottom: '0.8rem', color: 'var(--text-secondary)'}}>Selecciona el Tipo de Entrada:</h4>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.8rem'}}>
                      {event.ticketTypes.map((type, index) => {
                        const availableForThisType = calculateAvailableForType(type);
                        const isSoldOut = availableForThisType <= 0;
                        return (
                        <label key={index} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                          background: selectedTicketType?.name === type.name ? 'rgba(255,255,255,0.1)' : 'rgba(10,10,10,0.5)', 
                          padding: '1rem 1.4rem', borderRadius: '8px', border: `1px solid ${selectedTicketType?.name === type.name ? 'var(--primary-neon)' : '#222'}`,
                          cursor: isSoldOut ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                          opacity: isSoldOut ? 0.5 : 1
                        }}>
                          <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                            <input 
                              type="radio" 
                              name="ticketTypeSelection" 
                              checked={selectedTicketType?.name === type.name}
                              onChange={() => { if (!isSoldOut) setSelectedTicketType(type); }}
                              disabled={isSoldOut}
                              style={{accentColor: 'var(--primary-neon)', width: '1.2rem', height: '1.2rem', cursor: isSoldOut ? 'not-allowed' : 'pointer'}}
                            />
                            <span style={{fontWeight: selectedTicketType?.name === type.name ? 'bold' : 'normal', color: selectedTicketType?.name === type.name ? 'white' : '#ccc'}}>
                              {type.name} {isSoldOut && (
                                <span style={{color: '#ff4444', fontSize: '0.8rem', marginLeft: '0.5rem'}}>(Agotado)</span>
                              )}
                            </span>
                          </div>
                          <span style={{fontWeight: 'bold', color: 'var(--primary-neon)'}}>€{type.price}</span>
                        </label>
                      )})}
                    </div>
                  </div>
                )}

                <div className="form-group" style={{marginBottom: '1.8rem'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem'}}>
                    <label htmlFor="ticketCount" style={{margin: 0}}>Número de Entradas</label>
                  </div>

                  <div className="quantity-stepper">
                    <button 
                      type="button" 
                      className="stepper-btn"
                      onClick={() => setTicketCount(prev => Math.max(1, prev - 1))}
                      disabled={ticketCount <= 1 || maxAvailableTickets <= 0}
                      aria-label="Disminuir cantidad"
                    >
                      −
                    </button>
                    <div className="stepper-value">
                      <span className="stepper-number">{maxAvailableTickets <= 0 ? 0 : ticketCount}</span>
                      {maxAvailableTickets <= 0 && (
                        <span className="stepper-unit" style={{color: '#ff4444'}}>Agotado</span>
                      )}
                    </div>
                    <button 
                      type="button" 
                      className="stepper-btn"
                      onClick={() => setTicketCount(prev => Math.min(maxAvailableTickets, prev + 1))}
                      disabled={ticketCount >= maxAvailableTickets || maxAvailableTickets <= 0}
                      aria-label="Aumentar cantidad"
                    >
                      +
                    </button>
                  </div>
                </div>

                {event.drinkPacks && event.drinkPacks.length > 0 && (
                  <div className="ticket-types-container" style={{marginBottom: '1.8rem'}}>
                    <h4 style={{marginBottom: '0.8rem', color: 'var(--text-secondary)'}}>Combos de Bebidas (Opcional):</h4>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.8rem'}}>
                      {event.drinkPacks.map((pack, index) => {
                        const isSelected = selectedDrinkPacks.includes(pack.name);
                        return (
                          <label key={index} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                            background: isSelected ? 'rgba(255,255,255,0.1)' : 'rgba(10,10,10,0.5)', 
                            padding: '1rem 1.4rem', borderRadius: '8px', border: `1px solid ${isSelected ? 'var(--primary-neon)' : '#222'}`,
                            cursor: 'pointer', transition: 'all 0.2s'
                          }}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                              <input 
                                type="checkbox" 
                                checked={isSelected}
                                onChange={() => {
                                  if (isSelected) {
                                    setSelectedDrinkPacks(selectedDrinkPacks.filter(name => name !== pack.name));
                                  } else {
                                    setSelectedDrinkPacks([...selectedDrinkPacks, pack.name]);
                                  }
                                }}
                                style={{accentColor: 'var(--primary-neon)', width: '1.2rem', height: '1.2rem'}}
                              />
                              <span style={{fontWeight: isSelected ? 'bold' : 'normal', color: isSelected ? 'white' : '#ccc'}}>{pack.name}</span>
                            </div>
                            <span style={{fontWeight: 'bold', color: 'var(--primary-neon)'}}>€{pack.price}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Resumen de Selección Paso 1 */}
                <div className="step1-summary-card">
                  <div className="summary-row">
                    <span>Entradas ({ticketCount}x {selectedTicketType ? selectedTicketType.name : 'Entrada'}):</span>
                    <span style={{fontWeight: '700', color: '#fff'}}>€{(ticketPriceEUR * ticketCount).toFixed(2)}</span>
                  </div>
                  {selectedDrinkPacks.length > 0 && (
                    <div className="summary-row">
                      <span>Combos ({selectedDrinkPacks.length}):</span>
                      <span style={{fontWeight: '700', color: '#fff'}}>€{drinkPacksTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="summary-divider" />
                  <div className="summary-total-row">
                    <div>
                      <div className="total-label">TOTAL A PAGAR</div>
                      <div className="total-bcv">Tasa BCV EUR: Bs. {currentRateEUR}</div>
                    </div>
                    <div className="total-values">
                      <div className="total-eur">€{grandTotalEUR.toFixed(2)}</div>
                      <div className="total-bs">Bs. {totalBs}</div>
                    </div>
                  </div>
                </div>

                <button 
                  type="button" 
                  className="btn-continue-step" 
                  onClick={handleContinueToPayment}
                  disabled={maxAvailableTickets <= 0 || ticketCount <= 0}
                >
                  {maxAvailableTickets <= 0 ? 'ENTRADAS AGOTADAS' : 'CONTINUAR AL PAGO →'}
                </button>
              </div>

              {/* ================= PASO 3: VERIFICACIÓN DE PAGO Y DATOS ================= */}
              <div style={{ display: currentStep === 3 ? 'block' : 'none' }}>
                <div className="step-nav-header">
                  <button 
                    type="button" 
                    className="btn-back-step" 
                    onClick={handleBackToStep2}
                  >
                    ← Volver a selección de entradas
                  </button>
                </div>

                <h2 className="modal-main-title">VERIFICACIÓN DE PAGO</h2>
                <p className="modal-subtitle">Para asegurar tus entradas a <strong>{event.title}</strong>, realiza el pago vía Pago Móvil, Zelle o Binance y adjunta tu comprobante.</p>

                {/* Resumen compacto del pedido */}
                <div className="step2-order-badge">
                  <div className="order-badge-info">
                    <div className="order-badge-title">
                      <span>TU SELECCIÓN</span>
                      <button type="button" className="btn-edit-selection" onClick={handleBackToStep2}>
                        (Modificar)
                      </button>
                    </div>
                    <div className="order-badge-details">
                      <strong>{ticketCount}x {selectedTicketType ? selectedTicketType.name : 'Entrada'}</strong>
                      {selectedDrinkPacks.length > 0 && <span> + {selectedDrinkPacks.join(', ')}</span>}
                    </div>
                  </div>
                  <div className="order-badge-price">
                    <span className="badge-eur">€{grandTotalEUR.toFixed(2)}</span>
                    <span className="badge-bs">Bs. {totalBs}</span>
                  </div>
                </div>

                {/* Selector Desplegable de Métodos de Pago */}
                <div className="payment-selector-card">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="paymentMethodSelector">
                      <span>MÉTODO DE PAGO</span>
                      <span style={{ fontSize: '0.78rem', color: '#888', fontWeight: 'normal' }}>Selecciona para ver los datos</span>
                    </label>
                    <select 
                      id="paymentMethodSelector"
                      className="payment-dropdown-select"
                      value={paymentMethod}
                      onChange={(e) => handlePaymentMethodChange(e.target.value)}
                    >
                      <option value="pagomovil">📱 Pago Móvil (Provincial / Bolívares)</option>
                      <option value="zelle">💵 Zelle (Dólares / USD)</option>
                      <option value="binance">🪙 Binance Pay (USDT)</option>
                    </select>
                  </div>

                  {/* Panel dinámico según el método elegido */}
                  {paymentMethod === 'pagomovil' && (
                    <div className="single-payment-details">
                      <div className="single-payment-header">
                        <span className="method-tag">DATOS PARA PAGO MÓVIL</span>
                        <span className="method-rate-tag">Tasa BCV EUR: Bs. {currentRateEUR}</span>
                      </div>
                      <div className="payment-items-list">
                        <div className="payment-item-row" onClick={() => copyText('0108', 'banco')}>
                          <div className="item-row-left">
                            <span className="item-row-label">Banco Destino</span>
                            <span className="item-row-value">Provincial (0108)</span>
                          </div>
                          <span className="item-copy-badge">{copiedKey === 'banco' ? '✓ Copiado' : 'Copiar'}</span>
                        </div>
                        <div className="payment-item-row" onClick={() => copyText('10903146', 'cedula')}>
                          <div className="item-row-left">
                            <span className="item-row-label">Cédula de Identidad</span>
                            <span className="item-row-value">10903146</span>
                          </div>
                          <span className="item-copy-badge">{copiedKey === 'cedula' ? '✓ Copiado' : 'Copiar'}</span>
                        </div>
                        <div className="payment-item-row" onClick={() => copyText('04126711208', 'telefono')}>
                          <div className="item-row-left">
                            <span className="item-row-label">Teléfono</span>
                            <span className="item-row-value">0412-6711208</span>
                          </div>
                          <span className="item-copy-badge">{copiedKey === 'telefono' ? '✓ Copiado' : 'Copiar'}</span>
                        </div>
                      </div>
                      <div className="monto-highlight-card" onClick={() => copyText(totalBs, 'monto')}>
                        <div>
                          <div className="monto-title">Monto exacto a transferir:</div>
                          <div className="monto-number">Bs. {totalBs}</div>
                        </div>
                        <span className="item-copy-badge">{copiedKey === 'monto' ? '✓ Copiado' : 'Copiar Monto'}</span>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'zelle' && (
                    <div className="single-payment-details">
                      <div className="single-payment-header">
                        <span className="method-tag">DATOS PARA ZELLE</span>
                        <span className="method-rate-tag">Total a pagar: €{grandTotalEUR.toFixed(2)}</span>
                      </div>
                      <div className="payment-items-list">
                        <div className="payment-item-row" onClick={() => copyText('contactofabianramirez@gmail.com', 'zcorreo')}>
                          <div className="item-row-left">
                            <span className="item-row-label">Correo Zelle</span>
                            <span className="item-row-value" style={{ wordBreak: 'break-all' }}>contactofabianramirez@gmail.com</span>
                          </div>
                          <span className="item-copy-badge">{copiedKey === 'zcorreo' ? '✓ Copiado' : 'Copiar'}</span>
                        </div>
                        <div className="payment-item-row" onClick={() => copyText('Fabian Ramirez', 'ztitular')}>
                          <div className="item-row-left">
                            <span className="item-row-label">Titular de la cuenta</span>
                            <span className="item-row-value">Fabian Ramirez</span>
                          </div>
                          <span className="item-copy-badge">{copiedKey === 'ztitular' ? '✓ Copiado' : 'Copiar'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'binance' && (
                    <div className="single-payment-details">
                      <div className="single-payment-header">
                        <span className="method-tag">DATOS PARA BINANCE PAY</span>
                        <span className="method-rate-tag">Total a pagar: {grandTotalEUR.toFixed(2)} USDT</span>
                      </div>
                      <div className="payment-items-list">
                        <div className="payment-item-row" onClick={() => copyText('201174382', 'binance')}>
                          <div className="item-row-left">
                            <span className="item-row-label">Binance ID</span>
                            <span className="item-row-value">201174382</span>
                          </div>
                          <span className="item-copy-badge">{copiedKey === 'binance' ? '✓ Copiado' : 'Copiar'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="name">Nombre y Apellido</label>
                  <input 
                    type="text" 
                    id="name" 
                    name="name" 
                    placeholder="Ej. Carlos Pérez" 
                    value={clientInfo.name}
                    onChange={(e) => setClientInfo(prev => ({ ...prev, name: e.target.value }))}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Correo Electrónico (Para recibir las entradas)</label>
                  <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    placeholder="tu@correo.com" 
                    value={clientInfo.email}
                    onChange={(e) => setClientInfo(prev => ({ ...prev, email: e.target.value }))}
                    required 
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="cedula">Cédula de Identidad</label>
                    <div style={{display: 'flex', gap: '0.5rem'}}>
                      <select 
                        id="cedula-prefix" 
                        name="cedula-prefix" 
                        value={clientInfo.cedulaPrefix}
                        onChange={(e) => setClientInfo(prev => ({ ...prev, cedulaPrefix: e.target.value }))}
                        style={{width: '5.2rem', flexShrink: 0}}
                      >
                        <option value="V-">V</option>
                        <option value="E-">E</option>
                        <option value="J-">J</option>
                        <option value="P-">P</option>
                      </select>
                      <input 
                        type="text" 
                        id="cedula" 
                        name="cedula" 
                        placeholder="12345678" 
                        value={clientInfo.cedula}
                        onChange={(e) => setClientInfo(prev => ({ ...prev, cedula: e.target.value }))}
                        style={{flexGrow: 1}} 
                        required 
                        pattern="[0-9]*" 
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Teléfono de Contacto</label>
                    <input 
                      type="tel" 
                      id="phone" 
                      name="phone" 
                      value={clientInfo.phone}
                      onChange={(e) => setClientInfo(prev => ({ ...prev, phone: e.target.value }))}
                      required 
                      placeholder="04141234567" 
                      pattern="[0-9]*" 
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="bank">Método / Banco Emisor</label>
                    <select 
                      id="bank" 
                      name="bank" 
                      value={selectedBank}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedBank(val);
                        if (val === 'Zelle') setPaymentMethod('zelle');
                        else if (val === 'Binance') setPaymentMethod('binance');
                        else if (val !== '') setPaymentMethod('pagomovil');
                      }}
                      required
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="Provincial">Provincial (Pago Móvil)</option>
                      <option value="Banco de Venezuela (BDV)">Banco de Venezuela (BDV)</option>
                      <option value="Banesco">Banesco</option>
                      <option value="Mercantil">Mercantil</option>
                      <option value="Bancamiga">Bancamiga</option>
                      <option value="Otro">Otro / Pago Móvil</option>
                      <option value="Zelle">Zelle</option>
                      <option value="Binance">Binance</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="ref">Últimos 6 dígitos (Ref)</label>
                    <input 
                      type="text" 
                      id="ref" 
                      name="ref" 
                      placeholder="Ej. 948210" 
                      maxLength="6" 
                      value={clientInfo.ref}
                      onChange={(e) => setClientInfo(prev => ({ ...prev, ref: e.target.value }))}
                      required 
                    />
                  </div>
                </div>

                <div className="form-group file-upload">
                  <label htmlFor="receipt">Captura del Comprobante</label>
                  <input type="file" id="receipt" name="receipt" accept="image/*" required />
                </div>

                <button 
                  type="submit" 
                  className="btn-primary full-width" 
                  style={{marginTop: '0.5rem'}} 
                  disabled={loading || maxAvailableTickets <= 0}
                >
                  {loading ? 'ENVIANDO...' : (maxAvailableTickets <= 0 ? 'ENTRADAS AGOTADAS' : 'ENVIAR VERIFICACIÓN')}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="success-message" style={{textAlign: 'center', padding: '2.5rem 1rem', position: 'relative'}}>
            <button 
              type="button" 
              className="modal-close-btn" 
              onClick={handleModalClose} 
              aria-label="Cerrar modal"
              style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}
            >
              &times;
            </button>
            <div className="check-animation">
              <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none" />
                <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>
            <h3 style={{marginTop: '1.2rem', color: '#E0FF00', fontSize: '1.6rem'}}>¡Pago Enviado!</h3>
            <p style={{color: 'var(--text-secondary)', marginTop: '0.8rem', fontSize: '1rem'}}>Hemos recibido tu comprobante de pago.</p>
            <p style={{fontSize: '0.9rem', color: '#aaa', marginTop: '0.4rem'}}>Una vez verificado, te enviaremos tus entradas al correo.</p>

            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '1rem 1.2rem',
              margin: '1.8rem auto 0 auto',
              maxWidth: '460px',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-neon)', fontWeight: 'bold', fontSize: '0.88rem', marginBottom: '0.35rem' }}>
                <span>📬</span>
                <span>Al recibir tus entradas en el correo:</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#b8b8b8', lineHeight: '1.5' }}>
                Si en unos minutos no ves el correo en tu <strong>Bandeja Principal</strong>, revisa tu carpeta de <strong>Spam o Promociones</strong> y márcalo como <em>"No es spam"</em> para asegurar que siempre te lleguen directo.
              </p>
            </div>

            <button className="btn-primary" onClick={handleModalClose} style={{marginTop: '2rem', minWidth: '160px'}}>Cerrar</button>
          </div>
        )}

        {/* Custom In-App Alert Overlay */}
        {customAlert && (
          <div className="alert-overlay">
            <div className="alert-dialog-card">
              <div className="alert-dialog-icon-wrapper">
                ⚠️
              </div>
              <h3 className="alert-dialog-title">{customAlert.title || 'Aviso'}</h3>
              <p className="alert-dialog-message">{customAlert.message}</p>
              <div className="alert-dialog-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    if (customAlert.onAction) {
                      customAlert.onAction();
                    }
                    setCustomAlert(null);
                  }}
                >
                  {customAlert.actionText || 'Aceptar'}
                </button>
                {customAlert.onAction && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setCustomAlert(null)}
                  >
                    Cerrar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
