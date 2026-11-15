import type { ItemSide, Order, OrderStatus, PaymentStatus } from '@sph/shared';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../api';
import { designById, SidePreview } from '../components/SidePreview';
import { orderTotal, PAYMENT_LABEL, printPrice, unitPrice, vnd } from '../pricing';
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

// The normal forward path. completed is reached via api.completeOrder (sets completedAt);
// cancelled is reached via api.cancelOrder from any step before completed, not shown here.
const FLOW: Exclude<OrderStatus, 'cancelled'>[] = [
  'pending',
  'in_progress',
  'printed',
  'shipping',
  'completed',
];
const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  in_progress: 'Start',
  printed: 'Mark printed',
  shipping: 'Mark shipped',
  completed: 'Complete',
};
const FINAL: OrderStatus[] = ['completed', 'cancelled'];

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
              vnd(printPrice(p)),
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
  const payment = order.paymentStatus ?? 'unpaid';
  // status may be 'cancelled', which is not in FLOW (indexOf -1 -> next = FLOW[0]); that value is
  // never used, since the button bar below is hidden for every status in FINAL, cancelled included.
  const next = FLOW[FLOW.indexOf(status as Exclude<OrderStatus, 'cancelled'>) + 1];
  return (
    <div className="grid max-w-3xl gap-3">
      <div>
        <h1 className="font-semibold">Order for {recipient.name}</h1>
        <p className="text-zinc-600">
          {status.replace('_', ' ')} · created {new Date(order.createdAt).toLocaleString()}
          {order.completedAt && ` · completed ${new Date(order.completedAt).toLocaleString()}`}
        </p>
        <p className="text-base font-semibold tabular-nums">
          Total: {vnd(orderTotal(order.items))}
        </p>
      </div>

      {/* Payment is separate from the order status and stays changeable on a final order. */}
      <div className="flex flex-wrap items-center gap-2">
        Payment
        {(Object.keys(PAYMENT_LABEL) as PaymentStatus[]).map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={p === payment}
            disabled={busy}
            className={`${button} ${p === payment ? 'bg-zinc-800 text-white' : ''}`}
            onClick={() => void run(() => api.setPayment(_id, p))}
          >
            {PAYMENT_LABEL[p]}
          </button>
        ))}
      </div>

      {/* A completed or cancelled order is read-only here. */}
      {!FINAL.includes(status) && (
        <div className="flex flex-wrap gap-2">
          {next && (
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={() => {
                const advance =
                  next === 'completed'
                    ? () => api.completeOrder(_id)
                    : () => api.updateOrder(_id, { status: next });
                if (
                  next !== 'completed' ||
                  confirm('Mark this order as completed? It can no longer be edited.')
                )
                  void run(advance);
              }}
            >
              {NEXT_LABEL[next]}
            </button>
          )}
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={() => {
              if (confirm('Cancel this order? It can no longer be edited.'))
                void run(() => api.cancelOrder(_id));
            }}
          >
            Cancel order
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
          <p className="tabular-nums">
            Prints: {vnd(unitPrice(item))} x {item.quantity} ={' '}
            <strong>{vnd(unitPrice(item) * item.quantity)}</strong>
          </p>
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
