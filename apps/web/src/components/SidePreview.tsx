import type { PrintColor } from '@sph/shared';
import type { CSSProperties, MouseEvent } from 'react';
import { api } from '../api';
import designs from '../designs.json';

export const COLORS: Record<PrintColor, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#dc2626',
  blue: '#2563eb',
};

/** Pixel width of a full design sheet. Design widths are measured against it. */
const SHEET_WIDTH = 2079;
/** How much of the photo's width a full sheet covers at scale 1, in percent. */
const SHEET_ON_PHOTO = 70;

export const designById = (id: string) => designs.find((d) => d.id === id);

/** The design files are alpha masks, so one file can be shown in any ink colour. */
export function mask(id: string, color: string, size: string): CSSProperties {
  const image = `url(/designs/${id}.png)`;
  return {
    backgroundColor: color,
    maskImage: image,
    WebkitMaskImage: image,
    maskSize: size,
    WebkitMaskSize: size,
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    maskPosition: 'center',
    WebkitMaskPosition: 'center',
  };
}

interface PreviewPrint {
  design: string;
  color: PrintColor;
  position?: { x: number; y: number };
  rotation?: number;
}

interface Props {
  photo: string;
  alt: string;
  scale: number;
  prints: PreviewPrint[];
  /** The print being placed, outlined. Also makes the photo look tappable. */
  active?: PreviewPrint;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
}

/** A garment photo with its prints drawn on top. */
export function SidePreview({ photo, alt, scale, prints, active, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={`relative w-full max-w-sm touch-manipulation overflow-hidden ${
        active ? 'cursor-crosshair' : ''
      }`}
    >
      <img src={api.imageUrl(photo)} alt={alt} className="block w-full" />
      {prints.map((p, i) => {
        const design = designById(p.design);
        return (
          design &&
          p.position && (
            <div
              key={i}
              role="img"
              aria-label={`${design.name} in ${p.color}`}
              className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 ${
                // Outline on the wrapper: the mask would clip it on the design itself.
                p === active ? 'outline-2 outline-offset-2 outline-amber-500 outline-dashed' : ''
              }`}
              style={{
                left: `${p.position.x * 100}%`,
                top: `${p.position.y * 100}%`,
                rotate: `${p.rotation ?? 0}deg`,
                // Designs keep their sizes relative to each other; `scale` sizes them all.
                width: `${(design.width / SHEET_WIDTH) * SHEET_ON_PHOTO * scale}%`,
                aspectRatio: `${design.width} / ${design.height}`,
              }}
            >
              <div
                className="h-full w-full"
                style={mask(design.id, COLORS[p.color], '100% 100%')}
              />
            </div>
          )
        );
      })}
    </div>
  );
}
