import type { Order, OrderStatus, PaymentStatus } from '@sph/shared';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api';
import { orderTotal, PAYMENT_LABEL, vnd } from '../pricing';
import { input } from '../ui';

const cell = 'border border-zinc-300 px-2 py-1 text-left whitespace-nowrap';

const STATUS_FILTERS: [OrderStatus | 'all', string][] = [
  ['all', 'All'],
  ['pending', 'Pending'],
  ['in_progress', 'In progress'],
  ['printed', 'Printed'],
  ['shipping', 'Shipping'],
  ['completed', 'Completed'],
  ['cancelled', 'Cancelled'],
];
const PAYMENT_FILTERS: [PaymentStatus | 'all', string][] = [
  ['all', 'Any payment'],
  ...(Object.entries(PAYMENT_LABEL) as [PaymentStatus, string][]),
];

const paymentOf = (o: Order) => o.paymentStatus ?? 'unpaid';

function Filters<T extends string>(props: {
  label: string;
  options: [T, string][];
  value: T;
  count: (value: T) => number;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={props.label} className="flex flex-wrap gap-1">
      {props.options.map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={props.value === value}
          className={`min-h-11 border border-zinc-400 px-3 ${
            props.value === value ? 'bg-zinc-800 text-white' : ''
          }`}
          onClick={() => props.onChange(value)}
        >
          {label} ({props.count(value)})
        </button>
      ))}
    </div>
  );
}

// ponytail: loads every order and filters in the browser; filter and page in the API when the list gets long.
export function OrderList() {
  const [orders, setOrders] = useState<Order[]>();
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [payment, setPayment] = useState<PaymentStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.listOrders().then(setOrders, (e: unknown) => setError(String(e)));
  }, []);

  if (error) return <p className="text-red-700">{error}</p>;
  if (!orders) return <p>Loading...</p>;
  if (!orders.length) return <p>No orders yet.</p>;

  const needle = search.trim().toLowerCase();
  const matches = (o: Order, s: OrderStatus | 'all', p: PaymentStatus | 'all') =>
    (s === 'all' || o.status === s) &&
    (p === 'all' || paymentOf(o) === p) &&
    (!needle ||
      [o.recipient.name, o.recipient.phone ?? '', ...o.items.map((it) => it.productName)].some(
        (text) => text.toLowerCase().includes(needle),
      ));
  const shown = orders.filter((o) => matches(o, status, payment));

  return (
    <div className="grid gap-2">
      <input
        type="search"
        value={search}
        placeholder="Search name, phone or product"
        aria-label="Search orders"
        className={`${input} max-w-md`}
        onChange={(e) => setSearch(e.target.value)}
      />
      {/* Each count shows what that button would list, given the search and the other filter. */}
      <Filters
        label="Order status"
        options={STATUS_FILTERS}
        value={status}
        count={(s) => orders.filter((o) => matches(o, s, payment)).length}
        onChange={setStatus}
      />
      <Filters
        label="Payment"
        options={PAYMENT_FILTERS}
        value={payment}
        count={(p) => orders.filter((o) => matches(o, status, p)).length}
        onChange={setPayment}
      />
      <p className="tabular-nums">
        {shown.length} order{shown.length === 1 ? '' : 's'} · total{' '}
        <strong>{vnd(shown.reduce((sum, o) => sum + orderTotal(o.items), 0))}</strong>
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-zinc-100">
            <tr>
              {[
                'Recipient',
                'Phone',
                'Items',
                'Pieces',
                'Total',
                'Payment',
                'Status',
                'Created',
              ].map((h) => (
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
                <td className={`${cell} tabular-nums`}>
                  {o.items.reduce((n, it) => n + it.quantity, 0)}
                </td>
                <td className={`${cell} text-right tabular-nums`}>{vnd(orderTotal(o.items))}</td>
                <td className={cell}>{PAYMENT_LABEL[paymentOf(o)]}</td>
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
