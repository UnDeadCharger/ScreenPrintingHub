import type { ItemSide, Order } from '@sph/shared';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../api';
import { designById, SidePreview } from '../components/SidePreview';
import { button } from '../ui';

/** Loads one order by the `:id` route param. */
export function useOrder() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (id) api.getOrder(id).then(setOrder, (e: unknown) => setError(String(e)));
  }, [id]);
  return { order, setOrder, error, setError };
}

function Side({ title, side }: { title: string; side?: ItemSide }) {
  if (!side) return null;
  return (
    <section className="grid content-start gap-1">
      <h3 className="font-semibold">{title}</h3>
      <SidePreview
        photo={side.photo}
        alt={`${title} photo`}
        scale={side.scale ?? 1}
        prints={side.prints}
      />
      {side.prints.length === 0 && <p className="text-zinc-600">No prints.</p>}
      <ul>
        {side.prints.map((p, i) => (
          <li key={i}>
            {[
              designById(p.design)?.name ?? p.design,
              p.color,
              p.rotation ? `rotated ${p.rotation}°` : '',
              p.notes,
            ]
              .filter(Boolean)
              .join(' · ')}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function OrderDetail() {
  const { order, setOrder, error, setError } = useOrder();
  const [busy, setBusy] = useState(false);

  if (!order) return error ? <p className="text-red-700">{error}</p> : <p>Loading...</p>;

  async function run(action: () => Promise<Order>) {
    setBusy(true);
    setError(undefined);
    try {
      setOrder(await action());
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  const { _id, recipient, status } = order;
  return (
    <div className="grid max-w-3xl gap-3">
      <div>
        <h1 className="font-semibold">Order for {recipient.name}</h1>
        <p className="text-zinc-600">
          {status.replace('_', ' ')} · created {new Date(order.createdAt).toLocaleString()}
          {order.completedAt && ` · completed ${new Date(order.completedAt).toLocaleString()}`}
        </p>
      </div>

      {/* A completed order is read-only here. */}
      {status !== 'completed' && (
        <div className="flex flex-wrap gap-2">
          {status === 'pending' && (
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={() => void run(() => api.updateOrder(_id, { status: 'in_progress' }))}
            >
              Start
            </button>
          )}
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={() => {
              if (confirm('Mark this order as completed? It can no longer be edited.'))
                void run(() => api.completeOrder(_id));
            }}
          >
            Complete
          </button>
          <Link to={`/orders/${_id}/edit`} className={`${button} flex items-center`}>
            Edit
          </Link>
        </div>
      )}
      {error && <p className="text-red-700">{error}</p>}

      <dl className="grid grid-cols-[5rem_1fr] gap-x-2">
        <dt className="text-zinc-600">Phone</dt>
        <dd>{recipient.phone ?? '-'}</dd>
        <dt className="text-zinc-600">Address</dt>
        <dd>{recipient.address ?? '-'}</dd>
        <dt className="text-zinc-600">Notes</dt>
        <dd className="whitespace-pre-wrap">{recipient.notes ?? '-'}</dd>
      </dl>

      {order.items.length === 0 && <p className="text-zinc-600">No items.</p>}
      {order.items.map((item, i) => (
        <section key={i} className="grid gap-2 border border-zinc-400 bg-zinc-50 p-2">
          <h2 className="font-semibold">
            {item.quantity} x {item.productName}
            {item.productType && ` (${item.productType})`}
          </h2>
          {!item.front && !item.back && <p className="text-zinc-600">No photos.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Side title="Front" side={item.front} />
            <Side title="Back" side={item.back} />
          </div>
        </section>
      ))}
    </div>
  );
}
