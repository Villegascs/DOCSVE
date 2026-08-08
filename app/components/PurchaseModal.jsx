"use client";
import { useState, useEffect } from 'react';

export default function PurchaseModal({ event, onClose }) {
  const [ticketCount, setTicketCount] = useState(1);
  const [selectedTicketType, setSelectedTicketType] = useState(() => {
    if (event.ticketTypes && event.ticketTypes.length > 0) {
      // Default to first available ticket type
      const availableType = event.ticketTypes.find(t => !t.limit || (event.soldTicketsByType && (event.soldTicketsByType[t.name] || 0) < t.limit));
      return availableType || event.ticketTypes[0];
    }
    return null;
  });
  const [selectedDrinkPacks, setSelectedDrinkPacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [currentRateEUR, setCurrentRateEUR] = useState(0);
  const [copiedKey, setCopiedKey] = useState(null);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);
    formData.append('ticketCount', ticketCount);
    formData.append('totalBs', totalBs);
    formData.append('totalEur', grandTotalEUR);
    formData.append('eventId', event.id);
    formData.append('ticketTypeName', selectedTicketType ? selectedTicketType.name : 'Entrada General');
    if (selectedDrinkPacks.length > 0) {
      formData.append('drinkPacks', selectedDrinkPacks.join(', '));
    }

    try {
      const response = await fetch('/api/tickets/request', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al procesar el pago');
      }

      setSuccess(true);
    } catch (error) {
      console.error(error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal active" onClick={(e) => { if (e.target.className.includes('modal active')) onClose(); }}>
      <div className="modal-content custom-modal">
        <span className="close-modal" onClick={onClose}>&times;</span>
        
        {!success ? (
          <>
            <h2 className="modal-main-title">VERIFICACIÓN DE PAGO</h2>
            <p className="modal-subtitle">Para asegurar tus entradas a <strong>{event.title}</strong>, realiza el pago vía Pago Móvil, Zelle o Binance y envía el comprobante.</p>
            
            {event.ticketTypes && event.ticketTypes.length > 0 && (
              <div className="ticket-types-container" style={{marginBottom: '2rem'}}>
                <h4 style={{marginBottom: '1rem', color: 'var(--text-secondary)'}}>Selecciona el Tipo de Entrada:</h4>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.8rem'}}>
                  {event.ticketTypes.map((type, index) => {
                    const isSoldOut = type.limit > 0 && event.soldTicketsByType && (event.soldTicketsByType[type.name] || 0) >= type.limit;
                    return (
                    <label key={index} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                      background: selectedTicketType?.name === type.name ? 'rgba(255,255,255,0.1)' : 'rgba(10,10,10,0.5)', 
                      padding: '1rem 1.5rem', borderRadius: '8px', border: `1px solid ${selectedTicketType?.name === type.name ? 'var(--primary-neon)' : '#222'}`,
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
                          {type.name} {isSoldOut && <span style={{color: '#ff4444', fontSize: '0.8rem', marginLeft: '0.5rem'}}>(Agotado)</span>}
                        </span>
                      </div>
                      <span style={{fontWeight: 'bold', color: 'var(--primary-neon)'}}>€{type.price}</span>
                    </label>
                  )})}
                </div>
              </div>
            )}

            {event.drinkPacks && event.drinkPacks.length > 0 && (
              <div className="ticket-types-container" style={{marginBottom: '2rem'}}>
                <h4 style={{marginBottom: '1rem', color: 'var(--text-secondary)'}}>Combos de Bebidas (Opcional):</h4>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.8rem'}}>
                  {event.drinkPacks.map((pack, index) => {
                    const isSelected = selectedDrinkPacks.includes(pack.name);
                    return (
                      <label key={index} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                        background: isSelected ? 'rgba(255,255,255,0.1)' : 'rgba(10,10,10,0.5)', 
                        padding: '1rem 1.5rem', borderRadius: '8px', border: `1px solid ${isSelected ? 'var(--primary-neon)' : '#222'}`,
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
            
            <div className="payment-info">
              <div className="bank-col">
                <div className="bank-details">
                  <h4>PAGO MÓVIL</h4>
                  <p className="copyable" onClick={() => copyText('0172', 'banco')}>Banco: Bancamiga (0172) {copiedKey === 'banco' && <span style={{color: 'var(--primary-neon)', marginLeft: '0.5rem'}}>✓</span>}</p>
                  <p className="copyable" onClick={() => copyText('31253699', 'cedula')}>Cédula: 31253699 {copiedKey === 'cedula' && <span style={{color: 'var(--primary-neon)', marginLeft: '0.5rem'}}>✓</span>}</p>
                  <p className="copyable" onClick={() => copyText('04247509224', 'telefono')}>Teléfono: 0424-7509224 {copiedKey === 'telefono' && <span style={{color: 'var(--primary-neon)', marginLeft: '0.5rem'}}>✓</span>}</p>
                  <p>Monto: <strong style={{color: 'white'}}>Bs. {totalBs}</strong> <span style={{fontSize: '0.8rem', color: '#888'}}>(Tasa BCV EUR: Bs. {currentRateEUR})</span></p>
                </div>
                <div className="bank-details" style={{marginTop: '1.5rem'}}>
                  <h4>BINANCE (USDT)</h4>
                  <p className="copyable" onClick={() => copyText('zbcaj33@gmail.com', 'binance')}>Correo (Binance Pay): zbcaj33@gmail.com {copiedKey === 'binance' && <span style={{color: 'var(--primary-neon)', marginLeft: '0.5rem'}}>✓</span>}</p>
                </div>
              </div>
              
              <div className="bank-col">
                <div className="bank-details">
                  <h4>ZELLE</h4>
                  <p className="copyable" onClick={() => copyText('contactofabianramirez@gmail.com', 'zcorreo')}>Correo: contactofabianramirez@gmail.com {copiedKey === 'zcorreo' && <span style={{color: 'var(--primary-neon)', marginLeft: '0.5rem'}}>✓</span>}</p>
                  <p className="copyable" onClick={() => copyText('Fabian Ramirez', 'ztitular')}>Titular: Fabian Ramirez {copiedKey === 'ztitular' && <span style={{color: 'var(--primary-neon)', marginLeft: '0.5rem'}}>✓</span>}</p>
                </div>
              </div>
            </div>

            <form className="payment-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="ticketCount">Número de Entradas</label>
                <input 
                  type="number" 
                  id="ticketCount" 
                  name="ticketCount"
                  min="1" max="20" 
                  value={ticketCount} 
                  onChange={(e) => setTicketCount(Number(e.target.value))}
                  required 
                />
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
                    <select id="cedula-prefix" name="cedula-prefix" style={{width: '5rem', flexShrink: 0}}>
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
                  <select id="bank" name="bank" required>
                    <option value="">Selecciona una opción</option>
                    <option value="Zelle">Zelle</option>
                    <option value="Binance">Binance</option>
                    <option value="Banco de Venezuela (BDV)">Banco de Venezuela (BDV)</option>
                    <option value="Bancamiga">Bancamiga</option>
                    <option value="Mercantil">Mercantil</option>
                    <option value="Provincial">Provincial</option>
                    <option value="Banesco">Banesco</option>
                    <option value="Otro">Otro / Pago Móvil</option>
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

              <button type="submit" className="btn-primary full-width" style={{marginTop: '0.5rem'}} disabled={loading}>
                {loading ? 'ENVIANDO...' : 'ENVIAR VERIFICACIÓN'}
              </button>
            </form>
          </>
        ) : (
          <div className="success-message" style={{textAlign: 'center', padding: '2rem 0'}}>
            <div className="check-animation">
              <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none" />
                <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>
            <h3 style={{marginTop: '1rem', color: '#E0FF00'}}>¡Pago Enviado!</h3>
            <p style={{color: 'var(--text-secondary)', marginTop: '1rem'}}>Hemos recibido tu comprobante de pago.</p>
            <p style={{fontSize: '0.9rem'}}>Una vez verificado, te enviaremos tus entradas al correo.</p>
            <button className="btn-primary" onClick={onClose} style={{marginTop: '2rem'}}>Cerrar</button>
          </div>
        )}
      </div>
    </div>
  );
}
