import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, NavLink, Outlet, Route, Routes } from 'react-router';
import './index.css';
import { Backup } from './pages/Backup';
import { OrderDetail } from './pages/OrderDetail';
import { EditOrder, OrderForm } from './pages/OrderForm';
import { OrderList } from './pages/OrderList';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 items-center px-3 ${isActive ? 'bg-zinc-800 text-white' : 'text-zinc-700 hover:bg-zinc-200'}`;

function Layout() {
  return (
    <div className="min-h-dvh bg-white text-sm text-zinc-900">
      <header className="flex flex-wrap items-center gap-x-3 border-b border-zinc-300 bg-zinc-100 px-3">
        <span className="font-semibold">Screen Printing Hub</span>
        <nav className="flex gap-1">
          <NavLink to="/" end className={navClass}>
            Orders
          </NavLink>
          <NavLink to="/orders/new" className={navClass}>
            New order
          </NavLink>
          <NavLink to="/backup" className={navClass}>
            Backup
          </NavLink>
        </nav>
      </header>
      <main className="p-3">
        <Outlet />
      </main>
    </div>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<OrderList />} />
          <Route path="orders/new" element={<OrderForm />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="orders/:id/edit" element={<EditOrder />} />
          <Route path="backup" element={<Backup />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
