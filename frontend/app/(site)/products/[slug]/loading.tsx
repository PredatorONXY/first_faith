function ProductDetailSkeleton() {
  return (
    <main className="site-shell product-page-loading" aria-busy="true" aria-label="Loading product">
      <div className="product-detail-layout">
        <div className="product-gallery-card">
          <div className="gallery-main product-skeleton-block" />
          <div className="gallery-thumbnails" aria-hidden="true">
            {Array.from({ length: 4 }, (_, index) => <div className="gallery-thumb-btn product-skeleton-block" key={index} />)}
          </div>
        </div>

        <div className="product-info-panel product-loading-info">
          <div className="product-skeleton-line product-skeleton-eyebrow" />
          <div className="product-skeleton-line product-skeleton-title" />
          <div className="product-skeleton-line product-skeleton-title short" />
          <div className="product-price-bar">
            <div className="product-skeleton-line product-skeleton-price" />
            <div className="product-skeleton-pill" />
          </div>
          <div className="product-skeleton-line product-skeleton-copy" />
          <div className="product-skeleton-line product-skeleton-copy short" />
          <div className="hero-ingredients" style={{ borderTop: 'none', paddingBottom: '0.5rem' }}>
            <div className="product-skeleton-line product-skeleton-ingredient-title" />
            <div className="hero-ingredient-list">
              {Array.from({ length: 2 }, (_, index) => (
                <div className="product-skeleton-pill" key={index} style={{ width: '8.5rem', height: '2.4rem' }} />
              ))}
            </div>
          </div>
          <div className="product-detail-actions">
            <div className="product-skeleton-cta" />
            <div className="product-skeleton-line product-skeleton-stock" />
          </div>
          <div className="ingredient-meta-section">
            <div className="product-skeleton-line product-skeleton-ingredient-title" />
            <div className="ingredient-chip-list">
              {Array.from({ length: 3 }, (_, index) => <div className="product-skeleton-pill" key={index} />)}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Loading() {
  return <ProductDetailSkeleton />;
}
