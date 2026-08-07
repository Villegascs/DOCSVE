"use client";

export default function AdminDashboard() {
  return (
    <>
      <div className="admin-header">
        <h1 className="admin-title">Dashboard</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Entradas Vendidas</h3>
          <div className="value">142</div>
        </div>
        <div className="stat-card">
          <h3>Ingresos Estimados (USDT)</h3>
          <div className="value">$426</div>
        </div>
        <div className="stat-card">
          <h3>Pagos Pendientes</h3>
          <div className="value" style={{color: '#fbbf24'}}>5</div>
        </div>
        <div className="stat-card">
          <h3>Entradas Escaneadas</h3>
          <div className="value" style={{color: '#34d399'}}>89</div>
        </div>
      </div>

      <div className="admin-header" style={{marginTop: '3rem'}}>
        <h2>Últimos Pagos</h2>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Entradas</th>
              <th>Banco / Ref</th>
              <th>Fecha</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Armando Rodriguez</td>
              <td>2</td>
              <td>BDV - 4589</td>
              <td>Hace 10 min</td>
              <td><span className="status-badge pending">Pendiente</span></td>
            </tr>
            <tr>
              <td>Carlos Perez</td>
              <td>1</td>
              <td>Binance - 1245</td>
              <td>Hace 1 hora</td>
              <td><span className="status-badge approved">Aprobado</span></td>
            </tr>
            <tr>
              <td>Maria Gomez</td>
              <td>4</td>
              <td>Mercantil - 9876</td>
              <td>Hace 2 horas</td>
              <td><span className="status-badge rejected">Rechazado</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
