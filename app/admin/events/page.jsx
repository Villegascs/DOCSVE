"use client";
import { useState } from 'react';

export default function AdminEvents() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="admin-header">
        <h1 className="admin-title">Gestión de Eventos</h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + Nuevo Evento
        </button>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Imagen</th>
              <th>Título</th>
              <th>Fecha</th>
              <th>Locación</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <img src="/Multimedia/photo_2026-05-21_17-54-29.jpg" alt="Event" style={{width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px'}} />
              </td>
              <td>DOCS | MAYO 23</td>
              <td>23 MAY 2026</td>
              <td>Locación Secreta</td>
              <td><span className="status-badge approved">Activo</span></td>
              <td>
                <button className="btn-secondary" style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem'}}>Editar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal active" onClick={(e) => { if (e.target.className.includes('modal active')) setShowModal(false); }}>
          <div className="modal-content admin-form" style={{maxWidth: '700px'}}>
            <span className="close-modal" onClick={() => setShowModal(false)}>&times;</span>
            <h2>Crear Evento</h2>
            
            <form onSubmit={(e) => { e.preventDefault(); setShowModal(false); }}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Título del Evento</label>
                  <input type="text" required placeholder="Ej: DOCS | JUNIO 15" />
                </div>
                <div className="form-group">
                  <label>Fecha y Hora</label>
                  <input type="datetime-local" required />
                </div>
              </div>
              
              <div className="form-group">
                <label>Locación</label>
                <input type="text" required placeholder="Ej: Quinta Bar, Caracas" />
              </div>

              <div className="form-group">
                <label>Descripción / Lineup</label>
                <textarea required rows="4" style={{width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '1rem', borderRadius: '4px'}}></textarea>
              </div>

              <div className="form-group">
                <label>Imagen del Evento (Flyer)</label>
                <input type="file" accept="image/*" required />
              </div>

              <div className="form-group">
                <label>Estado</label>
                <select>
                  <option value="active">Activo (En Venta)</option>
                  <option value="disabled">Agotado / Desactivado</option>
                  <option value="archived">Archivado</option>
                </select>
              </div>

              <button type="submit" className="btn-primary" style={{marginTop: '1rem'}}>GUARDAR EVENTO</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
