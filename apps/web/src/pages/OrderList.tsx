import type { Order } from '@sph/shared';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api';

const cell = 'border border-zinc-300 px-2 py-1 text-left whitespace-nowrap';

// Read-only table; each row opens the order. No filtering or sorting yet.
export function OrderList() {
  const [orders, setOrders] = useState<Order[]>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    api.listOrders().then(setOrders, (e: unknown) => setError(String(e)));
  }, []);

  if (error) return <p className="text-red-700">{error}</p>;
  if (!orders) return <p>Loading...</p>;
  if (!orders.length) return <p>No orders yet.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead className="bg-zinc-100">
          <tr>
            {['Recipient', 'Phone', 'Items', 'Status', 'Created'].map((h) => (
              <th key={h} className={cell}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o._id}>
              <td className={cell}>
                <Link to={`/orders/${o._id}`} className="underline">
                  {o.recipient.name}
                </Link>
              </td>
              <td className={cell}>{o.recipient.phone}</td>
              <td className={cell}>{o.items.length}</td>
              <td className={cell}>{o.status}</td>
              <td className={cell}>{new Date(o.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
