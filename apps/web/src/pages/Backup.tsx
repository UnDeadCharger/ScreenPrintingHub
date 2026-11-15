import type { ImportResult } from '@sph/shared';
import { useState, type ChangeEvent } from 'react';
import { api } from '../api';
import { button, input } from '../ui';

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;

export function Backup() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult>();
  const [error, setError] = useState<string>();

  async function importFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // so picking the same file again triggers another import
    if (!file) return;
    setBusy(true);
    setResult(undefined);
    setError(undefined);
    try {
      setResult(await api.importBackup(file));
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid max-w-xl gap-4">
      <section className="grid gap-2">
        <h1 className="font-semibold">Export</h1>
        <p>Downloads one .tar file with every order and every photo. Keep it somewhere safe.</p>
        {/* A plain link: the browser streams the download, however large it is. */}
        <a href="/api/backup" download className={`${button} flex w-fit items-center`}>
          Export everything
        </a>
      </section>

      <section className="grid gap-2">
        <h2 className="font-semibold">Import</h2>
        <p>
          Adds the orders and photos from an export that are missing here. Nothing that already
          exists is changed or removed, so importing the same file twice is safe.
        </p>
        <label>
          Backup file
          <input
            type="file"
            accept=".tar,application/x-tar"
            disabled={busy}
            className={input}
            onChange={(e) => void importFile(e)}
          />
        </label>
        {busy && <p role="status">Importing...</p>}
        {error && <p className="text-red-700">{error}</p>}
        {result && (
          <p role="status">
            Added {count(result.ordersAdded, 'order')} and {count(result.photosAdded, 'photo')}.{' '}
            {count(result.ordersSkipped, 'order')} and {count(result.photosSkipped, 'photo')} were
            already here.
          </p>
        )}
      </section>
    </div>
  );
}
