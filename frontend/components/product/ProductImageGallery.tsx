'use client';

import Image, { type StaticImageData } from 'next/image';
import { useState } from 'react';

export type GalleryImage = {
  src: string | StaticImageData;
  alt: string;
};

export function ProductImageGallery({ images, productName }: { images: GalleryImage[]; productName: string }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!images.length) {
    return (
      <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-blush-soft">
        <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.18em] text-charcoal-soft">
          Product image coming soon
        </div>
      </div>
    );
  }

  const selectedImage = images[selectedIndex] ?? images[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-blush-soft">
        <div className="absolute left-5 top-5 z-10 border border-white/60 bg-white/75 px-3 py-2 text-[0.6rem] uppercase tracking-[0.16em] text-burgundy backdrop-blur-sm">
          First Faith
        </div>
        <Image
          src={selectedImage.src}
          alt={selectedImage.alt}
          fill
          priority
          className="object-cover"
          sizes="(min-width: 768px) 55vw, 100vw"
        />
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {images.map((image, index) => (
            <button
              key={`${image.alt}-${index}`}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={`relative aspect-[4/5] overflow-hidden rounded-xl border transition-all ${
                selectedIndex === index ? 'border-burgundy shadow-sm ring-1 ring-burgundy/30' : 'border-stone hover:border-burgundy/50'
              }`}
              aria-label={`View ${productName} image ${index + 1}`}
            >
              <Image
                src={image.src}
                alt={`${productName} view ${index + 1}`}
                fill
                className="object-cover"
                sizes="(min-width: 768px) 12vw, 20vw"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
