export default function IngredientsLoading() {
  return <main className="site-shell" style={{ padding: '5rem 0' }}><p className="eyebrow">Inside the formula</p><h1 className="display-title">The ingredients<br />with intention.</h1><div className="loading-grid" aria-label="Loading ingredients">{Array.from({ length: 6 }, (_, index) => <div className="loading-card" key={index} />)}</div></main>;
}
