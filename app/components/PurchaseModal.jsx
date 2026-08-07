"use client";
import { useState, useEffect } from 'react';

export default function PurchaseModal({ event, onClose }) {
  const [ticketCount, setTicketCount] = useState(1);
  const [totalBs, setTotalBs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // En producción, obtener de la base de datos o API BCV
  const currentRateEUR = 42.5; 
  const ticketPriceEUR = 3;

  useEffect(() => {
    setTotalBs((currentRateEUR * ticketPriceEUR * ticketCount).toFixed(2));
  }, [ticketCount]);

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    alert('¡Copiado!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);
    formData.append('ticketCount', ticketCount);
    formData.append('totalBs', totalBs);
    formData.append('eventId', event.id);

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
      alert('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal active" onClick={(e) => { if (e.target.className.includes('modal active')) onClose(); }}>
      <div className="modal-content">
        <span className="close-modal" onClick={onClose}>&times;</span>
        
        {!success ? (
          <>
            <h2>Adquirir <span className="highlight">Entradas</span></h2>
            <p>Para {event?.title}</p>
            
            <div className="payment-info">
              <div className="bank-details">
                <h4>Pago Móvil (BDV)</h4>
                <p className="copyable" onClick={() => copyText('04141234567')}>0414-1234567 <i className="fas fa-copy"></i></p>
                <p className="copyable" onClick={() => copyText('12345678')}>V-12345678 <i className="fas fa-copy"></i></p>
                <p className="copyable" onClick={() => copyText('0102')}>Banco: 0102 <i className="fas fa-copy"></i></p>
              </div>
              
              <div className="bank-details">
                <h4>Binance Pay / Zinli</h4>
                <p>Monto: <b>{ticketPriceEUR * ticketCount} USDT</b></p>
                <p className="copyable" style={{fontSize: '0.7rem'}} onClick={() => copyText('docs.underground@gmail.com')}>docs.underground@gmail.com <i className="fas fa-copy"></i></p>
              </div>
            </div>

            <form className="payment-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="name">Nombre y Apellido *</label>
                  <input type="text" id="name" name="name" required />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Correo Electrónico *</label>
                  <input type="email" id="email" name="email" required />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="cedula">Cédula de Identidad *</label>
                  <div style={{display: 'flex', gap: '0.5rem'}}>
                    <select id="cedula-prefix" name="cedula-prefix" style={{width: '70px'}}>
                      <option value="V-">V-</option>
                      <option value="E-">E-</option>
                      <option value="J-">J-</option>
                    </select>
                    <input type="text" id="cedula" name="cedula" style={{flex: 1}} required pattern="[0-9]*" />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="phone">Teléfono (WhatsApp) *</label>
                  <input type="tel" id="phone" name="phone" required placeholder="Ej: 04141234567" />
                </div>
              </div>

              <div className="form-group">
                <label>Cantidad de Entradas</label>
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                  <input 
                    type="range" 
                    min="1" max="10" 
                    value={ticketCount} 
                    onChange={(e) => setTicketCount(Number(e.target.value))}
                    style={{flex: 1}}
                  />
                  <span style={{fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-neon)', width: '30px', textAlign: 'center'}}>{ticketCount}</span>
                </div>
              </div>

              <div className="form-group">
                <label>Total a Pagar (Bs.)</label>
                <div style={{fontSize: '1.5rem', fontWeight: 'bold'}}>
                  Bs. {totalBs} <span style={{fontSize:'0.75rem', color:'var(--text-secondary)', fontWeight:'normal'}}>(Tasa BCV EUR: Bs. {currentRateEUR})</span>
                </div>
              </div>

              <hr style={{borderColor: 'rgba(255,255,255,0.05)', margin: '0.5rem 0'}} />

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="bank">Banco Emisor del Pago *</label>
                  <select id="bank" name="bank" required>
                    <option value="">Seleccione...</option>
                    <option value="BDV">Banco de Venezuela (BDV)</option>
                    <option value="Banesco">Banesco</option>
                    <option value="Mercantil">Mercantil</option>
                    <option value="Provincial">Provincial</option>
                    <option value="Binance">Binance Pay (USDT)</option>
                    <option value="Zinli">Zinli</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="ref">N° de Referencia (Últimos 4 o 6 dígitos) *</label>
                  <input type="text" id="ref" name="ref" required />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="receipt">Captura / Comprobante de Pago *</label>
                <input type="file" id="receipt" name="receipt" accept="image/png, image/jpeg, image/jpg" required />
              </div>

              <button type="submit" className="btn-primary" style={{marginTop: '1rem'}} disabled={loading}>
                {loading ? 'ENVIANDO...' : 'ENVIAR VERIFICACIÓN'}
              </button>
            </form>
          </>
        ) : (
          <div style={{textAlign: 'center', padding: '2rem 0'}}>
            <i className="fas fa-check-circle" style={{fontSize: '4rem', color: 'var(--primary-neon)', marginBottom: '1rem'}}></i>
            <h2>¡Solicitud Recibida!</h2>
            <p style={{color: 'var(--text-secondary)'}}>Hemos recibido tu comprobante de pago.</p>
            <p>Una vez verificado, te enviaremos tus entradas con el código QR oficial al correo: <b>docs.underground@gmail.com</b></p>
            <p style={{marginTop: '2rem', fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Revisa tu bandeja de Spam por si acaso.</p>
            <button className="btn-primary" onClick={onClose} style={{marginTop: '2rem'}}>CERRAR</button>
          </div>
        )}
      </div>
    </div>
  );
}
