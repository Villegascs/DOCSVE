"use client";

export default function AdminTickets() {
  return (
    <>
      <div className="admin-header">
        <h1 className="admin-title">Gestión de Entradas</h1>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID Compra</th>
              <th>Nombre</th>
              <th>Cédula</th>
              <th>Entradas</th>
              <th>Banco / Ref</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>#TKT-1023</td>
              <td>Armando Rodriguez</td>
              <td>V-12345678</td>
              <td>2</td>
              <td>BDV - 4589</td>
              <td><span className="status-badge pending">Pendiente</span></td>
              <td>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                  <button className="btn-secondary" style={{padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: '#34d399', borderColor: '#34d399'}}>Aprobar</button>
                  <button className="btn-secondary" style={{padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: '#f87171', borderColor: '#f87171'}}>Rechazar</button>
                </div>
              </td>
            </tr>
            <tr>
              <td>#TKT-1022</td>
              <td>Carlos Perez</td>
              <td>V-87654321</td>
              <td>1</td>
              <td>Binance - 1245</td>
              <td><span className="status-badge approved">Aprobado</span></td>
              <td>
                <button className="btn-secondary" style={{padding: '0.3rem 0.6rem', fontSize: '0.8rem'}}>Ver</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
