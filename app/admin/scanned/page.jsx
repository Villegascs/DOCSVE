"use client";
import { useState, useEffect } from 'react';
import { Filter, CheckCircle, Clock } from 'lucide-react';

export default function AdminScannedTickets() {
  const [tickets, setTickets] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState('all');

  const fetchData = async () => {
    try {
      const [resTickets, resEvents] = await Promise.all([
        fetch('/api/admin/tickets'),
        fetch('/api/admin/events')
      ]);
      const dataTickets = await resTickets.json();
      const dataEvents = await resEvents.json();
      
      if (dataTickets.success) setTickets(dataTickets.tickets);
      if (dataEvents.success) setEvents(dataEvents.events);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Filter only tickets that have at least one scanned QR code
  const scannedData = tickets.flatMap(ticket => {
    const qrs = ticket.qr_codes || [];
    const scannedQrs = qrs.filter(qr => qr.status === 'used');
    
    return scannedQrs.map(qr => ({
      ...qr,
      customerName: ticket.name,
      customerCedula: ticket.cedula,
      eventId: ticket.event_id || 'default_event'
    }));
  });

  // Filter by event
  const filteredScans = selectedEventId === 'all'
    ? scannedData
    : scannedData.filter(scan => scan.eventId === selectedEventId);

  // Sort by scan time descending
  filteredScans.sort((a, b) => (b.scanned_at || 0) - (a.scanned_at || 0));

  return (
    <>
      <div className="admin-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="admin-title">Entradas Escaneadas (Ingresos)</h1>
        
        <div style={{display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#181818', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #2A2A2A'}}>
            <Filter size={16} color="#A0A0A0" />
            <select 
              value={selectedEventId} 
              onChange={(e) => setSelectedEventId(e.target.value)}
              style={{background: 'transparent', border: 'none', color: 'white', outline: 'none', cursor: 'pointer'}}
            >
              <option value="all" style={{background: '#1a1a1a', color: 'white'}}>Todos los Eventos</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id} style={{background: '#1a1a1a', color: 'white'}}>{ev.title}</option>
              ))}
              <option value="default_event" style={{background: '#1a1a1a', color: 'white'}}>Evento por Defecto</option>
            </select>
          </div>

          <div style={{background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)'}}>
            <a href={`/api/admin/export/scanned?eventId=${selectedEventId}`} download target="_blank" style={{color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Exportar CSV
            </a>
          </div>

          <div style={{background: 'rgba(52, 211, 153, 0.1)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(52, 211, 153, 0.2)'}}>
            <p style={{fontSize: '0.8rem', color: '#34d399', margin: 0}}>Total Escaneadas</p>
            <p style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#34d399', margin: 0}}>
              {filteredScans.length}
            </p>
          </div>
        </div>
      </div>

      <div className="admin-table-container">
        {loading ? (
          <div style={{padding: '2rem', textAlign: 'center', color: '#888'}}>Cargando historial...</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Estado</th>
                <th>Comprador</th>
                <th>Cédula</th>
                <th>ID Ticket</th>
                <th>Hora de Escaneo</th>
                <th>Escaneada Por</th>
              </tr>
            </thead>
            <tbody>
              {filteredScans.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{textAlign: 'center', padding: '2rem'}}>No hay entradas escaneadas para este evento.</td>
                </tr>
              ) : (
                filteredScans.map(scan => {
                  const scanDate = scan.scanned_at 
                    ? new Date(scan.scanned_at).toLocaleTimeString('es-VE', {hour: '2-digit', minute: '2-digit', hour12: true})
                    : 'Desconocido';
                  
                  return (
                    <tr key={scan.id}>
                      <td>
                        <span style={{color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                          <CheckCircle size={16} /> Ingresó
                        </span>
                      </td>
                      <td>{scan.customerName}</td>
                      <td>{scan.customerCedula}</td>
                      <td style={{fontFamily: 'monospace', color: '#888'}}>{scan.id.substring(0, 8)}...</td>
                      <td>
                        <span style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                          <Clock size={16} color="#888" /> {scanDate}
                        </span>
                      </td>
                      <td style={{color: '#a3e635'}}>{scan.scanned_by || 'Desconocido'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
