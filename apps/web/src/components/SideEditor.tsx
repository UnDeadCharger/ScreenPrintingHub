import type { PrintColor } from '@sph/shared';
import { useState, type ChangeEvent, type MouseEvent } from 'react';
import { api } from '../api';
import designs from '@sph/shared/designs.json';
import { printPrice, vnd } from '../pricing';
import { button, input } from '../ui';
import { COLORS, designById, mask, SidePreview } from './SidePreview';

export interface PrintDraft {
  key: number;
  design: string;
  color: PrintColor;
  position?: { x: number; y: number };
  /** Degrees clockwise. */
  rotation: number;
  notes: string;
  locked: boolean;
}

/** One side of a garment: a photo with any number of prints on it. */
export interface SideDraft {
  photo?: string;
  scale: number;
  prints: PrintDraft[];
}

// List keys. Not crypto.randomUUID(): that needs HTTPS, and the app is served over plain HTTP.
let nextKey = 0;
export const newKey = () => nextKey++;
/** After restoring a saved draft: make sure new keys do not collide with the restored ones. */
export const reserveKeys = (highest: number) => {
  nextKey = Math.max(nextKey, highest + 1);
};
export const newSide = (): SideDraft => ({ scale: 1, prints: [] });

const clamp = (n: number) => Math.min(1, Math.max(0, n));
interface Props {
  title: string;
  value: SideDraft;
  /** Functional update, so an upload that finishes late merges into the latest state. */
  onChange: (update: (side: SideDraft) => SideDraft) => void;
}

export function SideEditor({ title, value, onChange }: Props) {
  const [error, setError] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const { photo, scale, prints } = value;
  // The one print being placed. Only one is unlocked at a time.
  const active = prints.find((p) => !p.locked);

  const patchPrint = (key: number, patch: Partial<PrintDraft>) =>
    onChange((s) => ({
      ...s,
      prints: s.prints.map((p) => (p.key === key ? { ...p, ...patch } : p)),
    }));

  async function uploadPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(undefined);
    setUploading(true);
    try {
      const { path } = await api.uploadImage(file);
      onChange((s) => ({ ...s, photo: path }));
    } catch (err) {
      setError(String(err));
    } finally {
      setUploading(false);
    }
  }

  // Picking a design changes the print being placed, or starts a new one.
  function pickDesign(design: string) {
    if (active) return patchPrint(active.key, { design });
    onChange((s) => ({
      ...s,
      prints: [
        ...s.prints,
        { key: newKey(), design, color: 'black', rotation: 0, notes: '', locked: false },
      ],
    }));
  }

  // ponytail: tap/click only; add arrow-key nudging if keyboard placement is ever needed.
  function place(e: MouseEvent<HTMLDivElement>) {
    if (!active) return;
    const rect = e.currentTarget.getBoundingClientRect();
    patchPrint(active.key, {
      position: {
        x: clamp((e.clientX - rect.left) / rect.width),
        y: clamp((e.clientY - rect.top) / rect.height),
      },
    });
  }

  const hint = !active
    ? 'Pick a design to add a print.'
    : active.position
      ? 'Tap again to move it, then lock.'
      : 'Tap the photo where the design goes.';

  return (
    <fieldset className="grid gap-2 border border-zinc-300 p-2">
      <legend className="px-1">{title}</legend>
      <label>
        Photo
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={uploading}
          className={input}
          onChange={(e) => void uploadPhoto(e)}
        />
      </label>
      {uploading && <p role="status">Uploading...</p>}
      {error && <p className="text-red-700">{error}</p>}

      {photo && (
        <>
          {/* ponytail: tiles load the full-size files (2 MB in total); add thumbnails if the library grows. */}
          <div className="grid max-h-40 grid-cols-5 gap-1 overflow-y-auto border border-zinc-300 p-1 sm:grid-cols-8">
            {designs.map((d) => (
              <button
                key={d.id}
                type="button"
                title={`${d.name}, ${vnd(d.price)}`}
                aria-label={d.name}
                aria-pressed={d.id === active?.design}
                className={`aspect-square bg-zinc-200 p-1 ${
                  d.id === active?.design ? 'ring-2 ring-zinc-900' : ''
                }`}
                onClick={() => pickDesign(d.id)}
              >
                <div className="h-full w-full" style={mask(d.id, '#000000', 'contain')} />
              </button>
            ))}
          </div>

          <p className="text-zinc-600">{hint}</p>
          <SidePreview
            photo={photo}
            alt={`${title} photo`}
            scale={scale}
            prints={prints}
            active={active}
            onClick={place}
          />

          <label>
            Preview size (all designs on this photo)
            <input
              type="range"
              min={0.25}
              max={3}
              step={0.05}
              value={scale}
              className="block w-full max-w-sm"
              onChange={(e) => onChange((s) => ({ ...s, scale: Number(e.target.value) }))}
            />
          </label>

          {prints.map((p) => (
            <div
              key={p.key}
              className={`grid gap-1 border-t border-zinc-300 pt-2 ${
                p === active ? 'border-l-4 border-l-amber-500 bg-amber-50 pl-2' : ''
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{designById(p.design)?.name ?? p.design}</span>
                <span className="tabular-nums">{vnd(printPrice(p))}</span>
                <span className={p === active ? 'text-amber-700' : 'text-zinc-500'}>
                  {p === active ? 'Placing' : 'Locked'}
                </span>
                {(Object.keys(COLORS) as PrintColor[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    title={c}
                    aria-label={c}
                    aria-pressed={c === p.color}
                    className={`h-11 w-11 border border-zinc-500 ${
                      c === p.color ? 'ring-2 ring-zinc-900 ring-offset-1' : ''
                    }`}
                    style={{ backgroundColor: COLORS[c] }}
                    onClick={() => patchPrint(p.key, { color: c })}
                  />
                ))}
                <button
                  type="button"
                  className={button}
                  // Locking needs a position; unlocking waits until no other print is being placed.
                  disabled={p.locked ? !!active : !p.position}
                  onClick={() => patchPrint(p.key, { locked: !p.locked })}
                >
                  {p.locked ? 'Edit' : 'Lock'}
                </button>
                <button
                  type="button"
                  className={button}
                  onClick={() =>
                    onChange((s) => ({ ...s, prints: s.prints.filter((x) => x.key !== p.key) }))
                  }
                >
                  Remove
                </button>
              </div>
              <label className="flex max-w-sm items-center gap-2">
                Rotate
                <input
                  type="range"
                  min={-180}
                  max={180}
                  step={5}
                  value={p.rotation}
                  disabled={p.locked}
                  className="min-w-0 flex-1"
                  onChange={(e) => patchPrint(p.key, { rotation: Number(e.target.value) })}
                />
                <span className="w-10 text-right tabular-nums">{p.rotation}°</span>
              </label>
              <input
                value={p.notes}
                placeholder="Notes for this print"
                aria-label="Notes for this print"
                className={input}
                onChange={(e) => patchPrint(p.key, { notes: e.target.value })}
              />
            </div>
          ))}
        </>
      )}
    </fieldset>
  );
}
