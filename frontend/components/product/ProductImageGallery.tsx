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
      <div className="product-gallery-card">
        <div className="gallery-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--ff-charcoal-soft)' }}>
            Product image coming soon
          </div>
        </div>
      </div>
    );
  }

  const selectedImage = images[selectedIndex] ?? images[0];

  return (
    <div className="product-gallery-card">
      <div className="gallery-main">
        <span className="gallery-badge">First Faith</span>
        <Image
          src={selectedImage.src}
          alt={selectedImage.alt}
          fill
          priority
          style={{ objectFit: 'cover' }}
          sizes="(min-width: 768px) 45vw, 100vw"
        />
      </div>

      {images.length > 1 && (
        <div className="gallery-thumbnails">
          {images.map((image, index) => (
            <button
              key={`${image.alt}-${index}`}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={`gallery-thumb-btn ${selectedIndex === index ? 'is-active' : ''}`}
              aria-label={`View ${productName} image ${index + 1}`}
            >
              <Image
                src={image.src}
                alt={`${productName} view ${index + 1}`}
                fill
                style={{ objectFit: 'cover' }}
                sizes="(min-width: 768px) 12vw, 22vw"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
