"use client";
import { useState, useEffect } from 'react';

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

  const [selectedTicketType, setSelectedTicketType] = useState(() => {
    if (initialEvent.ticketTypes && initialEvent.ticketTypes.length > 0) {
      // Default to first available ticket type with stock
      const availableType = initialEvent.ticketTypes.find(t => calculateAvailableForType(t) > 0);
      return availableType || initialEvent.ticketTypes[0];
    }
    return null;
  });

  const maxAvailableTickets = calculateAvailableForType(selectedTicketType);

  const [ticketCount, setTicketCount] = useState(() => {
    const available = calculateAvailableForType(
      initialEvent.ticketTypes && initialEvent.ticketTypes.length > 0 
        ? (initialEvent.ticketTypes.find(t => calculateAvailableForType(t) > 0) || initialEvent.ticketTypes[0])
        : null
    );
    return available > 0 ? 1 : 0;
  });

  const [selectedDrinkPacks, setSelectedDrinkPacks] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('pagomovil');
  const [selectedBank, setSelectedBank] = useState('');
  const [customAlert, setCustomAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [currentRateEUR, setCurrentRateEUR] = useState(0);
  const [copiedKey, setCopiedKey] = useState(null);

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
    setCurrentStep(2);
    const modalEl = document.querySelector('.modal');
    if (modalEl) modalEl.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToStep1 = () => {
    setCurrentStep(1);
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
    <div className="modal active" onClick={(e) => { if (e.target.className.includes('modal active')) onClose(); }}>
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
                  <span className="step-full">Entradas y Servicios</span>
                  <span className="step-short">Entradas</span>
                </button>

                <div className={`stepper-divider ${currentStep === 2 ? 'completed' : ''}`} />

                <button 
                  type="button" 
                  className={`stepper-step ${currentStep === 2 ? 'active' : ''}`}
                  onClick={() => {
                    if (maxAvailableTickets > 0 && ticketCount > 0) {
                      handleContinueToPayment();
                    }
                  }}
                  style={{ cursor: (maxAvailableTickets > 0 && ticketCount > 0) ? 'pointer' : 'not-allowed' }}
                >
                  <span className="step-number">2.</span>
                  <span className="step-full">Verificación de Pago</span>
                  <span className="step-short">Pago</span>
                </button>
              </div>

              <button 
                type="button" 
                className="modal-close-btn" 
                onClick={onClose} 
                aria-label="Cerrar modal"
              >
                &times;
              </button>
            </div>

            <form className="payment-form" onSubmit={handleSubmit}>
              {/* ================= PASO 1: SELECCIÓN DE ENTRADAS Y SERVICIOS ================= */}
              <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
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

              {/* ================= PASO 2: VERIFICACIÓN DE PAGO Y DATOS ================= */}
              <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
                <div className="step-nav-header">
                  <button 
                    type="button" 
                    className="btn-back-step" 
                    onClick={handleBackToStep1}
                  >
                    ← Volver a cambiar selección
                  </button>
                </div>

                <h2 className="modal-main-title">VERIFICACIÓN DE PAGO</h2>
                <p className="modal-subtitle">Para asegurar tus entradas a <strong>{event.title}</strong>, realiza el pago vía Pago Móvil, Zelle o Binance y adjunta tu comprobante.</p>

                {/* Resumen compacto del pedido */}
                <div className="step2-order-badge">
                  <div className="order-badge-info">
                    <div className="order-badge-title">
                      <span>TU SELECCIÓN</span>
                      <button type="button" className="btn-edit-selection" onClick={handleBackToStep1}>
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
                  <input type="text" id="name" name="name" placeholder="Ej. Carlos Pérez" required />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Correo Electrónico (Para recibir las entradas)</label>
                  <input type="email" id="email" name="email" placeholder="tu@correo.com" required />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="cedula">Cédula de Identidad</label>
                    <div style={{display: 'flex', gap: '0.5rem'}}>
                      <select id="cedula-prefix" name="cedula-prefix" style={{width: '5.2rem', flexShrink: 0}}>
                        <option value="V-">V</option>
                        <option value="E-">E</option>
                        <option value="J-">J</option>
                        <option value="P-">P</option>
                      </select>
                      <input type="text" id="cedula" name="cedula" placeholder="12345678" style={{flexGrow: 1}} required pattern="[0-9]*" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Teléfono de Contacto</label>
                    <input type="tel" id="phone" name="phone" required placeholder="04141234567" pattern="[0-9]*" />
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
                    <input type="text" id="ref" name="ref" placeholder="Ej. 948210" maxLength="6" required />
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
              onClick={onClose} 
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

            <button className="btn-primary" onClick={onClose} style={{marginTop: '2rem', minWidth: '160px'}}>Cerrar</button>
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
