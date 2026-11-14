import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../api';

const input = 'w-full border border-zinc-400 px-2 py-1';

// Placeholder page: recipient fields only. Items, image upload and the
// tap-to-place print picker come in the next step.
export function OrderForm() {
  const navigate = useNavigate();
  const [error, setError] = useState<string>();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const field = (name: string) => (data.get(name) as string).trim() || undefined;
    try {
      await api.createOrder({
        recipient: {
          name: field('name') ?? '',
          phone: field('phone'),
          address: field('address'),
          notes: field('notes'),
        },
        items: [],
      });
      await navigate('/');
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <form onSubmit={submit} className="grid max-w-md gap-2">
      <h1 className="font-semibold">New order</h1>
      <label>
        Recipient name
        <input name="name" required autoFocus className={input} />
      </label>
      <label>
        Phone
        <input name="phone" type="tel" className={input} />
      </label>
      <label>
        Address
        <input name="address" className={input} />
      </label>
      <label>
        Notes
        <textarea name="notes" rows={2} className={input} />
      </label>
      <p className="border border-dashed border-zinc-400 p-2 text-zinc-500">
        Items and print placement: not implemented yet.
      </p>
      {error && <p className="text-red-700">{error}</p>}
      <button type="submit" className="bg-zinc-800 px-3 py-1.5 text-white">
        Create order
      </button>
    </form>
  );
}
