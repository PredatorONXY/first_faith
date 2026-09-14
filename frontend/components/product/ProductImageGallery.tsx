'use client';

import Image, { type StaticImageData } from 'next/image';
import { useRef, useState } from 'react';

export type GalleryImage = {
  src: string | StaticImageData;
  alt: string;
};

function ArrowLeftIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function ProductImageGallery({ images, productName }: { images: GalleryImage[]; productName: string }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

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
  const showPrevious = () => setSelectedIndex((index) => (index - 1 + images.length) % images.length);
  const showNext = () => setSelectedIndex((index) => (index + 1) % images.length);

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const distance = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(distance) < 36) return;
    if (distance > 0) showPrevious();
    else showNext();
  };

  return (
    <div className="product-gallery-card">
      <div
        className="gallery-main"
        onTouchStart={(event) => { touchStartX.current = event.touches[0].clientX; }}
        onTouchEnd={handleTouchEnd}
      >
        <span className="gallery-badge">First Faith</span>
        <div key={selectedIndex} className="gallery-main-image">
          <Image
            src={selectedImage.src}
            alt={selectedImage.alt}
            fill
            priority={selectedIndex === 0}
            quality={85}
            className="gallery-main-image-element"
            sizes="(min-width: 1024px) 480px, (min-width: 768px) 45vw, 92vw"
          />
        </div>
        {images.length > 1 && (
          <div className="gallery-navigation" aria-label="Product image navigation">
            <button
              type="button"
              className="gallery-nav-btn gallery-nav-prev"
              onClick={showPrevious}
              aria-label="Previous product image"
            >
              <ArrowLeftIcon />
            </button>
            <button
              type="button"
              className="gallery-nav-btn gallery-nav-next"
              onClick={showNext}
              aria-label="Next product image"
            >
              <ArrowRightIcon />
            </button>
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="gallery-thumbnails" role="tablist" aria-label="Product image thumbnails">
          {images.map((image, index) => (
            <button
              key={`${typeof image.src === 'string' ? image.src : image.src.src}-${index}`}
              type="button"
              role="tab"
              aria-selected={selectedIndex === index}
              onClick={() => setSelectedIndex(index)}
              className={`gallery-thumb-btn ${selectedIndex === index ? 'is-active' : ''}`}
              aria-label={`View ${productName} image ${index + 1}`}
            >
              <Image
                src={image.src}
                alt=""
                fill
                quality={65}
                loading="lazy"
                className="gallery-thumb-image"
                sizes="68px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
