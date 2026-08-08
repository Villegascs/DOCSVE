"use client";
import { useState, useEffect } from 'react';

export default function AdminEvents() {
  const [showModal, setShowModal] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    id: null,
    title: '',
    date: '',
    location: '',
    description: '',
    status: 'active',
    isMainEvent: false,
    image_url: '',
    ticketLimit: 0
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/admin/events');
      const data = await res.json();
      if (data.success) {
        setEvents(data.events);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (event = null) => {
    if (event) {
      setFormData(event);
    } else {
      setFormData({
        id: null, title: '', date: '', location: '', description: '', status: 'active', isMainEvent: false, image_url: '', ticketLimit: 0
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = formData.id ? 'PUT' : 'POST';
    
    try {
      const res = await fetch('/api/admin/events', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (data.success) {
        setShowModal(false);
        fetchEvents();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error(error);
      alert('Error guardando evento');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro de eliminar este evento?')) {
      await fetch(`/api/admin/events?id=${id}`, { method: 'DELETE' });
      fetchEvents();
    }
  };

  return (
    <>
      <div className="admin-header">
        <h1 className="admin-title">Gestión de Eventos</h1>
        <button className="btn-primary" onClick={() => openModal()}>
          + Nuevo Evento
        </button>
      </div>

      <div className="admin-table-container">
        {loading ? (
          <p style={{padding: '2rem'}}>Cargando eventos...</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Imagen</th>
                <th>Título</th>
                <th>Fecha</th>
                <th>Locación</th>
                <th>Estado</th>
                <th>Principal</th>
                <th>Entradas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr><td colSpan="7" style={{textAlign: 'center', padding: '2rem'}}>No hay eventos creados.</td></tr>
              ) : events.map(event => (
                <tr key={event.id}>
                  <td>
                    <img src={event.image_url || "/Multimedia/photo_2026-05-21_17-54-29.jpg"} alt="Event" style={{width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px'}} />
                  </td>
                  <td>{event.title}</td>
                  <td>{new Date(event.date).toLocaleString()}</td>
                  <td>{event.location}</td>
                  <td>
                    <span className={`status-badge ${event.status === 'active' ? 'approved' : 'rejected'}`}>
                      {event.status === 'active' ? 'Activo' : (event.status === 'disabled' ? 'Agotado' : 'Archivado')}
                    </span>
                  </td>
                  <td>
                    {event.isMainEvent ? <strong style={{color: 'var(--primary-neon)'}}>★ Sí</strong> : <span style={{color: '#555'}}>No</span>}
                  </td>
                  <td>
                    {event.soldTickets || 0} / {event.ticketLimit || '∞'}
                  </td>
                  <td>
                    <button className="btn-secondary" style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem', marginRight: '0.5rem'}} onClick={() => openModal(event)}>Editar</button>
                    <button className="btn-secondary" style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: '#ff4444', borderColor: '#ff4444'}} onClick={() => handleDelete(event.id)}>Borrar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal active" onClick={(e) => { if (e.target.className.includes('modal active')) setShowModal(false); }}>
          <div className="modal-content admin-form" style={{maxWidth: '700px'}}>
            <span className="close-modal" onClick={() => setShowModal(false)}>&times;</span>
            <h2>{formData.id ? 'Editar Evento' : 'Crear Evento'}</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Título del Evento</label>
                  <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ej: DOCS | JUNIO 15" />
                </div>
                <div className="form-group">
                  <label>Fecha y Hora</label>
                  <input type="datetime-local" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
              </div>
              
              <div className="form-group">
                <label>Locación</label>
                <input type="text" required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="Ej: Quinta Bar, Caracas" />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Límite de Entradas</label>
                  <input type="number" required min="0" value={formData.ticketLimit || ''} onChange={e => setFormData({...formData, ticketLimit: e.target.value})} placeholder="Ej: 200 (0 para ilimitado)" />
                </div>
                <div className="form-group">
                  <label>URL de Imagen Personalizada</label>
                  <input type="text" value={formData.image_url || ''} onChange={e => setFormData({...formData, image_url: e.target.value})} placeholder="Ej: https://imgur.com/imagen.jpg" />
                </div>
              </div>

              <div className="form-group">
                <label>Descripción / Lineup</label>
                <textarea required rows="4" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{width: '100%', background: '#181818', border: '1px solid #2A2A2A', color: 'white', padding: '1rem', borderRadius: '4px'}}></textarea>
              </div>

              <div className="form-group">
                <label>Estado</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="active">Activo (En Venta)</option>
                  <option value="disabled">Agotado / Desactivado</option>
                  <option value="archived">Archivado</option>
                </select>
              </div>

              <div className="form-group" style={{flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', marginBottom: '1rem'}}>
                <input type="checkbox" id="isMain" checked={formData.isMainEvent} onChange={e => setFormData({...formData, isMainEvent: e.target.checked})} style={{width: 'auto'}} />
                <label htmlFor="isMain" style={{marginBottom: 0, cursor: 'pointer', color: 'white'}}>Establecer como Evento Principal (Para la cuenta regresiva)</label>
              </div>

              <button type="submit" className="btn-primary" style={{marginTop: '1rem'}}>{formData.id ? 'ACTUALIZAR EVENTO' : 'GUARDAR EVENTO'}</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
