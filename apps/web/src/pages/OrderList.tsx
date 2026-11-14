import type { Order, OrderStatus } from '@sph/shared';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api';

const cell = 'border border-zinc-300 px-2 py-1 text-left whitespace-nowrap';

const FILTERS: [OrderStatus | 'all', string][] = [
  ['all', 'All'],
  ['pending', 'Pending'],
  ['in_progress', 'In progress'],
  ['printed', 'Printed'],
  ['shipping', 'Shipping'],
  ['completed', 'Completed'],
  ['cancelled', 'Cancelled'],
];

// ponytail: loads every order and filters in the browser; filter and page in the API when the list gets long.
export function OrderList() {
  const [orders, setOrders] = useState<Order[]>();
  const [error, setError] = useState<string>();
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');

  useEffect(() => {
    api.listOrders().then(setOrders, (e: unknown) => setError(String(e)));
  }, []);

  if (error) return <p className="text-red-700">{error}</p>;
  if (!orders) return <p>Loading...</p>;
  if (!orders.length) return <p>No orders yet.</p>;

  const shown = orders.filter((o) => filter === 'all' || o.status === filter);

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-1">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            className={`min-h-11 border border-zinc-400 px-3 ${
              filter === value ? 'bg-zinc-800 text-white' : ''
            }`}
            onClick={() => setFilter(value)}
          >
            {label} (
            {value === 'all' ? orders.length : orders.filter((o) => o.status === value).length})
          </button>
        ))}
      </div>
      {!shown.length && <p>No orders with this status.</p>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-zinc-100">
            <tr>
              {['Recipient', 'Phone', 'Items', 'Pieces', 'Status', 'Created'].map((h) => (
                <th key={h} className={cell}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((o) => (
              <tr key={o._id}>
                <td className={cell}>
                  <Link to={`/orders/${o._id}`} className="underline">
                    {o.recipient.name}
                  </Link>
                </td>
                <td className={cell}>{o.recipient.phone}</td>
                <td className={cell}>
                  {o.items.map((it) => `${it.quantity} x ${it.productName}`).join(', ') || '-'}
                </td>
                <td className={cell}>{o.items.reduce((n, it) => n + it.quantity, 0)}</td>
                <td className={cell}>{o.status.replace('_', ' ')}</td>
                <td className={cell}>{new Date(o.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
