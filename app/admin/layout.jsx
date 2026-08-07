"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarDays, Ticket, Settings, ScanLine, LogOut } from 'lucide-react';
import './admin.css';

export default function AdminLayout({ children }) {
  const pathname = usePathname();

  // Si estamos en la página de login, no mostrar el sidebar
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const menuItems = [
    { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={20} /> },
    { name: 'Eventos', path: '/admin/events', icon: <CalendarDays size={20} /> },
    { name: 'Entradas', path: '/admin/tickets', icon: <Ticket size={20} /> },
    { name: 'Escáner', path: '/admin/scanner', icon: <ScanLine size={20} /> },
    { name: 'Configuración', path: '/admin/settings', icon: <Settings size={20} /> },
  ];

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <h2>DÖCS ADMIN</h2>
        </div>
        <nav className="admin-nav">
          {menuItems.map((item) => (
            <Link 
              key={item.path} 
              href={item.path}
              className={`admin-nav-link ${pathname === item.path ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
        <div className="admin-logout">
          <button className="admin-nav-link" onClick={() => alert('Cerrar sesión (TODO)')}>
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}
