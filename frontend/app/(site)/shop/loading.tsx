export default function ShopLoading() {
  return <main className="site-shell" style={{ padding: '5rem 0' }}><p className="eyebrow">The collection</p><h1 className="display-title">Your ritual,<br />beautifully considered.</h1><div className="loading-grid" aria-label="Loading products">{Array.from({ length: 4 }, (_, index) => <div className="loading-card" key={index} />)}</div></main>;
}
