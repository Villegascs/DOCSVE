"use client";
import { useState, useEffect } from 'react';
import { Eye, Clock, CheckCircle, Filter } from 'lucide-react';

export default function AdminTickets() {
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
    const interval = setInterval(fetchData, 15000); // Auto-refresh every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const filteredTickets = selectedEventId === 'all' 
    ? tickets 
    : tickets.filter(t => t.event_id === selectedEventId);

  const totalTickets = filteredTickets.reduce((acc, t) => acc + Number(t.ticket_count || 0), 0);
  const scannedQRs = filteredTickets.reduce((acc, t) => acc + (t.qr_codes || []).filter(qr => qr.status === 'used').length, 0);

  return (
    <>
      <div className="admin-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="admin-title">Gestión de Entradas</h1>
        
        <div style={{display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#181818', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #2A2A2A'}}>
            <Filter size={16} color="#A0A0A0" />
            <select 
              value={selectedEventId} 
              onChange={(e) => setSelectedEventId(e.target.value)}
              style={{background: 'transparent', border: 'none', color: 'white', outline: 'none', cursor: 'pointer'}}
            >
              <option value="all">Todos los Eventos</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
              <option value="default_event">Evento por Defecto / Sin asignar</option>
            </select>
          </div>

          <div style={{background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)'}}>
            <p style={{fontSize: '0.8rem', color: '#888', margin: 0}}>Total Vendidas</p>
            <p style={{fontSize: '1.2rem', fontWeight: 'bold', margin: 0}}>{totalTickets}</p>
          </div>
          <div style={{background: 'rgba(52, 211, 153, 0.1)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(52, 211, 153, 0.2)'}}>
            <p style={{fontSize: '0.8rem', color: '#34d399', margin: 0}}>Ingresos</p>
            <p style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#34d399', margin: 0}}>{scannedQRs} / {totalTickets}</p>
          </div>
        </div>
      </div>

      <div className="admin-table-container">
        {loading ? (
          <div style={{padding: '2rem', textAlign: 'center', color: '#888'}}>Cargando entradas...</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Comprador</th>
                <th>Cédula</th>
                <th>Entradas</th>
                <th>Escaneadas</th>
                <th>Referencia</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{textAlign: 'center', padding: '2rem'}}>No hay entradas registradas para este filtro.</td>
                </tr>
              ) : (
                filteredTickets.map(ticket => {
                  const qrs = ticket.qr_codes || [];
                  const scannedCount = qrs.filter(qr => qr.status === 'used').length;
                  const date = ticket.created_at ? new Date(ticket.created_at).toLocaleDateString('es-VE', {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'}) : '-';
                  
                  return (
                    <tr key={ticket.id}>
                      <td>{ticket.name}</td>
                      <td>{ticket.cedula}</td>
                      <td>{ticket.ticket_count}x {ticket.ticket_type || 'General'}</td>
                      <td>
                        <span style={{color: scannedCount > 0 ? '#34d399' : '#888'}}>
                          {scannedCount} / {ticket.ticket_count}
                        </span>
                      </td>
                      <td>{ticket.banco} - {ticket.referencia}</td>
                      <td>
                        <span className={`status-badge ${ticket.status}`}>
                          {ticket.status === 'approved' ? 'Aprobado' : ticket.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                        </span>
                      </td>
                      <td>{date}</td>
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
