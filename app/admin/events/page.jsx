"use client";
import { useState, useEffect } from 'react';
import { Ticket, Plus, Trash2, Check, Loader2, Wine } from 'lucide-react';

export default function AdminEvents() {
  const [showModal, setShowModal] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  
  const [formData, setFormData] = useState({
    id: null,
    title: '',
    date: '',
    location: '',
    lineup: '',
    description: '',
    status: 'active',
    isMainEvent: false,
    image_url: '',
    ticketLimit: 0,
    ticketTypes: [],
    drinkPacks: []
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
      setFormData({
        ...event,
        lineup: event.lineup || '',
        description: event.description || '',
        ticketTypes: event.ticketTypes || [],
        drinkPacks: event.drinkPacks || []
      });
    } else {
      setFormData({
        id: null, title: '', date: '', location: '', lineup: '', description: '', status: 'active', isMainEvent: false, image_url: '', ticketLimit: 0, ticketTypes: [], drinkPacks: []
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const method = formData.id ? 'PUT' : 'POST';
    
    try {
      const res = await fetch('/api/admin/events', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (data.success) {
        setIsSaved(true);
        setTimeout(() => {
          setShowModal(false);
          setIsSaving(false);
          setIsSaved(false);
          fetchEvents();
          setToastMessage(formData.id ? '✓ Evento actualizado correctamente' : '✓ Evento creado con éxito');
          setTimeout(() => setToastMessage(null), 3000);
        }, 850);
      } else {
        setIsSaving(false);
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error(error);
      setIsSaving(false);
      alert('Error guardando evento');
    }
  };

  const handleDeleteClick = (id) => {
    setEventToDelete(id);
  };

  const handleSetGetTickets = async (event) => {
    try {
      const res = await fetch('/api/admin/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...event, isMainEvent: true })
      });
      const data = await res.json();
      if (data.success) {
        fetchEvents();
        setToastMessage(`✓ "${event.title}" asignado a GET TICKETS`);
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const confirmDelete = async () => {
    if (eventToDelete) {
      await fetch(`/api/admin/events?id=${eventToDelete}`, { method: 'DELETE' });
      setEventToDelete(null);
      fetchEvents();
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Verificar si es mayor a 900KB para evitar el límite de Firestore de 1MB
    if (file.size > 900 * 1024) {
      alert('⚠️ La imagen es muy pesada (más de 900KB). Para mantener la calidad original, súbela a un host externo (como Imgur) y pega el enlace en el campo "URL", o comprímela un poco antes de subirla.');
      e.target.value = ''; // Reset input
      return;
    }

    setUploadingImage(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      // Guardar el string base64 crudo con calidad 100% original
      const base64String = event.target.result;
      setFormData({ ...formData, image_url: base64String });
      setUploadingImage(false);
    };
    reader.onerror = () => {
      alert('Error leyendo el archivo');
      setUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const addTicketType = () => {
    setFormData({
      ...formData,
      ticketTypes: [...(formData.ticketTypes || []), { name: '', price: 0, limit: 0 }]
    });
  };

  const removeTicketType = (index) => {
    const newTypes = [...formData.ticketTypes];
    newTypes.splice(index, 1);
    setFormData({ ...formData, ticketTypes: newTypes });
  };

  const updateTicketType = (index, field, value) => {
    const newTypes = [...formData.ticketTypes];
    newTypes[index][field] = value;
    setFormData({ ...formData, ticketTypes: newTypes });
  };

  const addDrinkPack = () => {
    setFormData({
      ...formData,
      drinkPacks: [...(formData.drinkPacks || []), { name: '', price: 0 }]
    });
  };

  const removeDrinkPack = (index) => {
    const newPacks = [...formData.drinkPacks];
    newPacks.splice(index, 1);
    setFormData({ ...formData, drinkPacks: newPacks });
  };

  const updateDrinkPack = (index, field, value) => {
    const newPacks = [...formData.drinkPacks];
    newPacks[index][field] = value;
    setFormData({ ...formData, drinkPacks: newPacks });
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
                <th>Opción GET TICKETS</th>
                <th>Entradas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr><td colSpan="8" style={{textAlign: 'center', padding: '2rem'}}>No hay eventos creados.</td></tr>
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
                    {event.isMainEvent ? (
                      <span style={{
                        background: 'rgba(255, 255, 255, 0.15)', 
                        color: '#ffffff', 
                        border: '1px solid #ffffff', 
                        padding: '0.3rem 0.65rem', 
                        borderRadius: '4px', 
                        fontWeight: 800, 
                        fontSize: '0.78rem', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.35rem'
                      }}>
                        ★ GET TICKETS
                      </span>
                    ) : (
                      <button 
                        type="button" 
                        onClick={() => handleSetGetTickets(event)} 
                        className="btn-secondary"
                        style={{padding: '0.25rem 0.6rem', fontSize: '0.75rem', borderColor: '#444', color: '#bbb'}}
                        title="Asignar este evento al botón GET TICKETS"
                      >
                        Asignar
                      </button>
                    )}
                  </td>
                  <td>
                    {event.soldTickets || 0} / {event.ticketLimit || '∞'}
                  </td>
                  <td>
                    <button className="btn-secondary" style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem', marginRight: '0.5rem'}} onClick={() => openModal(event)}>Editar</button>
                    <button className="btn-secondary" style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: '#ff4444', borderColor: '#ff4444'}} onClick={() => handleDeleteClick(event.id)}>Borrar</button>
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
                  <label>Imagen del Evento (Sube desde tu galería)</label>
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{padding: '0.5rem'}} />
                  {uploadingImage && <span style={{fontSize: '0.8rem', color: 'var(--primary-neon)'}}>Procesando imagen HD...</span>}
                  
                  <label style={{marginTop: '0.5rem', display: 'block', fontSize: '0.8rem', color: '#666'}}>
                    Opcional: Si prefieres la máxima calidad sin compresión, pega un enlace directo (URL):
                  </label>
                  <input type="text" value={formData.image_url || ''} onChange={e => setFormData({...formData, image_url: e.target.value})} placeholder="Ej: https://imgur.com/foto.jpg" />

                  {formData.image_url && (
                    <div style={{marginTop: '0.5rem'}}>
                      <p style={{fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem'}}>Vista previa:</p>
                      <img src={formData.image_url} alt="Preview" style={{width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #333'}} />
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Lineup / Artistas</label>
                <input 
                  type="text" 
                  value={formData.lineup} 
                  onChange={e => setFormData({...formData, lineup: e.target.value})} 
                  placeholder="Ej: DJ Name 1, DJ Name 2, Special Guest (separados por coma o texto)" 
                />
              </div>

              <div className="form-group">
                <label>Descripción de la fiesta</label>
                <textarea 
                  rows="3" 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="Breve reseña sobre la experiencia, música y vibra de la fiesta..." 
                  style={{width: '100%', background: '#181818', border: '1px solid #2A2A2A', color: 'white', padding: '1rem', borderRadius: '4px'}}
                ></textarea>
              </div>

              <div className="form-group">
                <label>Estado</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="active">Activo (En Venta)</option>
                  <option value="disabled">Agotado / Desactivado</option>
                  <option value="archived">Archivado</option>
                </select>
              </div>

              <div className="form-group" style={{
                background: 'rgba(255, 255, 255, 0.04)', 
                padding: '1.1rem', 
                borderRadius: '8px', 
                border: '1px solid rgba(255, 255, 255, 0.15)', 
                marginTop: '1.2rem', 
                marginBottom: '1.2rem'
              }}>
                <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                  <input 
                    type="checkbox" 
                    id="isMain" 
                    checked={formData.isMainEvent} 
                    onChange={e => setFormData({...formData, isMainEvent: e.target.checked})} 
                    style={{width: '20px', height: '20px', accentColor: '#ffffff', cursor: 'pointer'}} 
                  />
                  <label htmlFor="isMain" style={{marginBottom: 0, cursor: 'pointer', color: 'white', fontWeight: 800, fontSize: '0.95rem'}}>
                    ★ Activar opción GET TICKETS (Válido solo para 1 evento a la vez)
                  </label>
                </div>
                <p style={{fontSize: '0.82rem', color: '#aaa', margin: '0.5rem 0 0 2rem', lineHeight: 1.4}}>
                  Al marcar este evento, cuando un visitante presione el botón <strong>GET TICKETS</strong> en la web, se abrirá automáticamente el panel de compra directa para este evento.
                </p>
              </div>

              {/* Dynamic Ticket Types Section */}
              <div className="dynamic-section-card">
                <div className="dynamic-section-header">
                  <div style={{display: 'flex', alignItems: 'center', gap: '0.6rem'}}>
                    <Ticket size={20} color="var(--primary-neon)" />
                    <h3 style={{fontSize: '1.05rem', margin: 0, fontWeight: 800, color: 'white', letterSpacing: '0.5px'}}>
                      TIPOS DE ENTRADAS / FASES
                    </h3>
                  </div>
                  <button 
                    type="button" 
                    onClick={addTicketType} 
                    className="btn-secondary" 
                    style={{padding: '0.45rem 0.9rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700}}
                  >
                    <Plus size={15} /> Añadir Tipo
                  </button>
                </div>
                
                {(!formData.ticketTypes || formData.ticketTypes.length === 0) ? (
                  <p style={{fontSize: '0.88rem', color: '#777', margin: 0, padding: '0.5rem 0'}}>
                    No hay tipos de entradas configurados. Pulsa "+ Añadir Tipo" para agregar fases de venta.
                  </p>
                ) : (
                  formData.ticketTypes.map((type, index) => (
                    <div key={index} className="dynamic-item-card">
                      <div className="dynamic-item-card-header">
                        <div className="item-badge">
                          <Ticket size={13} />
                          <span>Opción #{index + 1}</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => removeTicketType(index)} 
                          className="btn-remove-item"
                          title="Eliminar este tipo de entrada"
                        >
                          <Trash2 size={13} />
                          <span>Eliminar</span>
                        </button>
                      </div>

                      <div className="dynamic-row-grid-tickets" style={{display: 'grid', gridTemplateColumns: '1.8fr 1.1fr 1.1fr', gap: '1rem'}}>
                        <div className="dynamic-field-group">
                          <label className="dynamic-field-label">Nombre entrada:</label>
                          <input 
                            type="text" 
                            className="dynamic-input"
                            placeholder="Ej. General / VIP / Preventa" 
                            required 
                            value={type.name} 
                            onChange={(e) => updateTicketType(index, 'name', e.target.value)} 
                          />
                        </div>
                        <div className="dynamic-field-group">
                          <label className="dynamic-field-label">
                            Límite de Entradas: <span className="sub-label">(0 = ∞)</span>
                          </label>
                          <input 
                            type="number" 
                            min="0" 
                            className="dynamic-input"
                            placeholder="Ej: 100" 
                            required 
                            value={type.limit !== undefined ? type.limit : 0} 
                            onChange={(e) => updateTicketType(index, 'limit', Number(e.target.value))} 
                          />
                        </div>
                        <div className="dynamic-field-group">
                          <label className="dynamic-field-label">Precio (€ / $):</label>
                          <input 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            className="dynamic-input"
                            placeholder="Ej: 5.00" 
                            required 
                            value={type.price} 
                            onChange={(e) => updateTicketType(index, 'price', Number(e.target.value))} 
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Dynamic Drink Packs Section */}
              <div className="dynamic-section-card">
                <div className="dynamic-section-header">
                  <div style={{display: 'flex', alignItems: 'center', gap: '0.6rem'}}>
                    <Wine size={20} color="var(--primary-neon)" />
                    <h3 style={{fontSize: '1.05rem', margin: 0, fontWeight: 800, color: 'white', letterSpacing: '0.5px'}}>
                      COMBOS DE BEBIDAS (DRINK PACKS)
                    </h3>
                  </div>
                  <button 
                    type="button" 
                    onClick={addDrinkPack} 
                    className="btn-secondary" 
                    style={{padding: '0.45rem 0.9rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700}}
                  >
                    <Plus size={15} /> Añadir Combo
                  </button>
                </div>
                
                {(!formData.drinkPacks || formData.drinkPacks.length === 0) ? (
                  <p style={{fontSize: '0.88rem', color: '#777', margin: 0, padding: '0.5rem 0'}}>
                    Sin combos configurados para este evento.
                  </p>
                ) : (
                  formData.drinkPacks.map((pack, index) => (
                    <div key={index} className="dynamic-item-card">
                      <div className="dynamic-item-card-header">
                        <div className="item-badge">
                          <Wine size={13} />
                          <span>Combo #{index + 1}</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => removeDrinkPack(index)} 
                          className="btn-remove-item"
                          title="Eliminar este combo"
                        >
                          <Trash2 size={13} />
                          <span>Eliminar</span>
                        </button>
                      </div>

                      <div className="dynamic-row-grid-drinks" style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem'}}>
                        <div className="dynamic-field-group">
                          <label className="dynamic-field-label">Nombre del Combo:</label>
                          <input 
                            type="text" 
                            className="dynamic-input"
                            placeholder="Ej: 3 Red Bulls / Pack Cervezas" 
                            required 
                            value={pack.name} 
                            onChange={(e) => updateDrinkPack(index, 'name', e.target.value)} 
                          />
                        </div>
                        <div className="dynamic-field-group">
                          <label className="dynamic-field-label">Precio (€ / $):</label>
                          <input 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            className="dynamic-input"
                            placeholder="Ej: 15.00" 
                            required 
                            value={pack.price} 
                            onChange={(e) => updateDrinkPack(index, 'price', Number(e.target.value))} 
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                style={{
                  marginTop: '1.5rem', 
                  width: '100%',
                  padding: '1.1rem',
                  fontSize: '1rem',
                  fontWeight: '900',
                  letterSpacing: '1px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  background: isSaved ? '#10b981' : (isSaving ? '#262626' : 'var(--primary-neon)'),
                  color: isSaved ? '#ffffff' : (isSaving ? '#aaaaaa' : '#000000'),
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                disabled={isSaving || isSaved}
              >
                {isSaved ? (
                  <>
                    <Check size={22} strokeWidth={3} className="check-anim" />
                    ¡ACTUALIZADO CON ÉXITO!
                  </>
                ) : isSaving ? (
                  <>
                    <Loader2 size={19} className="spin-anim" />
                    GUARDANDO CAMBIOS...
                  </>
                ) : (
                  formData.id ? 'ACTUALIZAR EVENTO' : 'GUARDAR EVENTO'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {eventToDelete && (
        <div className="modal active" onClick={(e) => { if (e.target.className.includes('modal active')) setEventToDelete(null); }}>
          <div className="modal-content admin-form" style={{maxWidth: '400px', textAlign: 'center'}}>
            <h2 style={{color: '#ff4444', marginBottom: '1rem'}}>Eliminar Evento</h2>
            <p style={{color: '#A0A0A0', marginBottom: '2rem'}}>¿Estás completamente seguro de que deseas eliminar este evento? Esta acción no se puede deshacer.</p>
            <div style={{display: 'flex', gap: '1rem', justifyContent: 'center'}}>
              <button className="btn-secondary" onClick={() => setEventToDelete(null)}>Cancelar</button>
              <button className="btn-primary" style={{backgroundColor: '#ff4444', color: 'white'}} onClick={confirmDelete}>Sí, Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="admin-toast">
          <Check size={18} strokeWidth={3} />
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
}
