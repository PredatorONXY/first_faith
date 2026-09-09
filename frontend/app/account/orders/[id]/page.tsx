'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch, getAccessToken } from '../../../../lib/api';

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: string;
  discountTotal: string;
  shippingFee: string;
  grandTotal: string;
  paymentMethod: string;
  createdAt: string;
  items: Array<{ id: string; productName: string; variantLabel: string; quantity: number; unitPrice: string; lineTotal: string }>;
  shippingAddress?: { line1?: string; line2?: string; city?: string; state?: string; postalCode?: string; country?: string; phone?: string } | null;
};

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    apiFetch<Order>(`/orders/${params.id}`, { next: { revalidate: 0 } })
      .then(setOrder)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load order'));
  }, [params.id, router]);

  if (error) return <main className="site-shell px-6 py-24 md:px-10"><p className="text-burgundy">{error}</p></main>;
  if (!order) return <main className="site-shell px-6 py-24 md:px-10"><p className="text-charcoal-soft">Loading order...</p></main>;

  return <main className="site-shell px-6 py-16 md:px-10 md:py-24"><div className="max-w-3xl"><p className="eyebrow">Order confirmed</p><h1 className="mt-3 font-display text-5xl text-charcoal">Thank you for your order.</h1><p className="mt-4 text-charcoal-soft">{order.orderNumber} · {new Date(order.createdAt).toLocaleDateString('en-IN')}</p><div className="mt-12 grid gap-8 md:grid-cols-2"><section className="border border-stone bg-white/60 p-6"><h2 className="font-display text-2xl">Items</h2><div className="mt-5 space-y-4">{order.items.map((item) => <div key={item.id} className="flex justify-between gap-4 text-sm"><span>{item.productName} · {item.variantLabel} × {item.quantity}</span><span>₹{Number(item.lineTotal).toLocaleString('en-IN')}</span></div>)}</div><div className="mt-6 flex justify-between border-t border-stone pt-5 font-medium"><span>Total</span><span>₹{Number(order.grandTotal).toLocaleString('en-IN')}</span></div></section><section className="border border-stone bg-white/60 p-6"><h2 className="font-display text-2xl">Delivery</h2><p className="mt-5 text-sm leading-7">{order.shippingAddress?.line1}<br />{order.shippingAddress?.line2 && <>{order.shippingAddress.line2}<br /></>}{order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.postalCode}<br />{order.shippingAddress?.country}</p><p className="mt-6 text-sm text-burgundy">{order.paymentMethod === 'COD' ? 'Cash on delivery' : order.paymentMethod} · {order.status}</p></section></div></div></main>;
}
