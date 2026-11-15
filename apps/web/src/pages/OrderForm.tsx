import type { ItemSide, Order, OrderItem } from '@sph/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../api';
import { newKey, newSide, reserveKeys, SideEditor, type SideDraft } from '../components/SideEditor';
import { orderTotal, unitPrice, vnd } from '../pricing';
import { button, input } from '../ui';
import { useOrder } from './OrderDetail';

const SIDES = ['front', 'back'] as const;
type Side = (typeof SIDES)[number];

interface ItemDraft {
  key: number;
  productName: string;
  productType: string;
  /** Kept as text so the field can be cleared while typing. */
  quantity: string;
  front: SideDraft;
  back: SideDraft;
}

const newItem = (): ItemDraft => ({
  key: newKey(),
  productName: '',
  productType: '',
  quantity: '1',
  front: newSide(),
  back: newSide(),
});

const emptyRecipient = { name: '', phone: '', address: '', notes: '' };

interface Draft {
  recipient: typeof emptyRecipient;
  items: ItemDraft[];
}

const newDraft = (): Draft => ({ recipient: emptyRecipient, items: [newItem()] });

// ponytail: the draft is trusted as-is. Bump the version whenever the Draft shape changes,
// so a draft saved by an older build is ignored instead of crashing the form.
// ponytail: an edit draft is not checked against the order changing elsewhere meanwhile; it only
// lives in this tab's session, and "Discard changes" reloads the saved order.
const draftKey = (order?: Order) =>
  order ? `sph.order-draft.v1.edit.${order._id}` : 'sph.order-draft.v1';

/** The in-progress order survives a reload or an evicted tab. Photos are already on the server. */
function loadDraft(key: string, fallback: () => Draft): Draft {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) ?? 'null') as Draft | null;
    if (!saved) return fallback();
    const keys = saved.items.flatMap((it) => [
      it.key,
      ...SIDES.flatMap((side) => it[side].prints.map((p) => p.key)),
    ]);
    reserveKeys(Math.max(-1, ...keys));
    return saved;
  } catch {
    return fallback(); // storage blocked, or the saved draft is unreadable
  }
}

/** A saved order as an editable draft, with every print locked where it was placed. */
function fromOrder(order: Order): Draft {
  const side = (s?: ItemSide): SideDraft =>
    s
      ? {
          photo: s.photo,
          scale: s.scale ?? 1,
          prints: s.prints.map((p) => ({
            key: newKey(),
            design: p.design,
            color: p.color,
            position: p.position,
            rotation: p.rotation ?? 0,
            notes: p.notes ?? '',
            locked: true,
          })),
        }
      : newSide();
  return {
    recipient: { ...emptyRecipient, ...order.recipient },
    items: order.items.map((it) => ({
      key: newKey(),
      productName: it.productName,
      productType: it.productType ?? '',
      quantity: String(it.quantity),
      front: side(it.front),
      back: side(it.back),
    })),
  };
}

/** Route wrapper: loads the order, then shows the form in edit mode. */
export function EditOrder() {
  const { order, error } = useOrder();
  if (!order) return error ? <p className="text-red-700">{error}</p> : <p>Loading...</p>;
  return <OrderForm key={order._id} order={order} />;
}

/** Creates an order, or edits `order` when one is given. */
export function OrderForm({ order }: { order?: Order }) {
  const navigate = useNavigate();
  const key = draftKey(order);
  const [initial] = useState(() => loadDraft(key, () => (order ? fromOrder(order) : newDraft())));
  const [recipient, setRecipient] = useState(initial.recipient);
  const [items, setItems] = useState(initial.items);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  // Functional updates, so an upload that finishes late merges into the latest state.
  const patchItem = (key: number, patch: (item: ItemDraft) => Partial<ItemDraft>) => {
    setError(undefined);
    setItems((all) => all.map((it) => (it.key === key ? { ...it, ...patch(it) } : it)));
  };

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify({ recipient, items } satisfies Draft));
    } catch {
      // Storage full or blocked: the form still works, it just will not survive a reload.
    }
  }, [key, recipient, items]);

  const recipientField = (name: keyof typeof emptyRecipient) => ({
    name,
    value: recipient[name],
    className: input,
    onChange: (e: { target: { value: string } }) =>
      setRecipient((r) => ({ ...r, [name]: e.target.value })),
  });

  function discard() {
    if (!confirm(order ? 'Discard your unsaved changes?' : 'Discard this order and start again?'))
      return;
    const fresh = order ? fromOrder(order) : newDraft();
    setRecipient(fresh.recipient);
    setItems(fresh.items);
    setError(undefined);
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const field = (name: keyof typeof emptyRecipient) => recipient[name].trim() || undefined;

    const orderItems: OrderItem[] = [];
    for (const [i, item] of items.entries()) {
      const sides: Partial<Record<Side, ItemSide>> = {};
      for (const side of SIDES) {
        const { photo, scale, prints } = item[side];
        if (!photo) continue;
        const placed = [];
        for (const p of prints) {
          if (!p.position || !p.locked) {
            setError(`Item ${i + 1}, ${side}: place and lock every design (or remove it).`);
            return;
          }
          placed.push({
            design: p.design,
            color: p.color,
            position: p.position,
            rotation: p.rotation,
            notes: p.notes.trim() || undefined,
          });
        }
        sides[side] = { photo, scale, prints: placed };
      }
      orderItems.push({
        productName: item.productName.trim(),
        productType: item.productType.trim() || undefined,
        quantity: Number(item.quantity),
        ...sides,
      });
    }

    setError(undefined);
    setSaving(true);
    try {
      const payload = {
        recipient: {
          name: field('name') ?? '',
          phone: field('phone'),
          address: field('address'),
          notes: field('notes'),
        },
        items: orderItems,
      };
      if (order) await api.updateOrder(order._id, payload);
      else await api.createOrder(payload);
      sessionStorage.removeItem(key);
      await navigate(order ? `/orders/${order._id}` : '/');
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid max-w-xl gap-2">
      <h1 className="font-semibold">{order ? 'Edit order' : 'New order'}</h1>
      <label>
        Recipient name
        <input required autoFocus {...recipientField('name')} />
      </label>
      <label>
        Phone
        <input type="tel" {...recipientField('phone')} />
      </label>
      <label>
        Address
        <input {...recipientField('address')} />
      </label>
      <label>
        Notes
        <textarea rows={2} {...recipientField('notes')} />
      </label>

      {items.map((item, i) => (
        <fieldset key={item.key} className="grid gap-2 border border-zinc-400 bg-zinc-50 p-2">
          <legend className="px-1 font-semibold">Item {i + 1}</legend>
          <div className="grid grid-cols-[1fr_1fr_5rem] gap-2">
            <label>
              Product
              <input
                required
                value={item.productName}
                className={input}
                onChange={(e) => patchItem(item.key, () => ({ productName: e.target.value }))}
              />
            </label>
            <label>
              Type
              <input
                value={item.productType}
                placeholder="e.g. hoodie"
                className={input}
                onChange={(e) => patchItem(item.key, () => ({ productType: e.target.value }))}
              />
            </label>
            <label>
              Qty
              <input
                required
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={item.quantity}
                className={input}
                onChange={(e) => patchItem(item.key, () => ({ quantity: e.target.value }))}
              />
            </label>
          </div>

          {SIDES.map((side) => (
            <SideEditor
              key={side}
              title={side === 'front' ? 'Front' : 'Back'}
              value={item[side]}
              onChange={(update) => patchItem(item.key, (it) => ({ [side]: update(it[side]) }))}
            />
          ))}

          <p className="tabular-nums">
            Prints: {vnd(unitPrice(item))} x {Number(item.quantity) || 0} ={' '}
            <strong>{vnd(unitPrice(item) * (Number(item.quantity) || 0))}</strong>
          </p>

          <button
            type="button"
            className={button}
            onClick={() => {
              if (confirm(`Remove item ${i + 1}?`))
                setItems((all) => all.filter((it) => it.key !== item.key));
            }}
          >
            Remove item
          </button>
        </fieldset>
      ))}

      <button
        type="button"
        className={button}
        onClick={() => setItems((all) => [...all, newItem()])}
      >
        Add item
      </button>

      <p className="border-t border-zinc-400 pt-2 text-base font-semibold tabular-nums">
        Order total:{' '}
        {vnd(orderTotal(items.map((it) => ({ ...it, quantity: Number(it.quantity) || 0 }))))}
      </p>

      {error && <p className="text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="min-h-11 bg-zinc-800 px-3 text-white disabled:opacity-40"
      >
        {saving ? 'Saving...' : order ? 'Save changes' : 'Create order'}
      </button>
      <button type="button" className={button} onClick={discard}>
        {order ? 'Discard changes' : 'Discard draft'}
      </button>
    </form>
  );
}
