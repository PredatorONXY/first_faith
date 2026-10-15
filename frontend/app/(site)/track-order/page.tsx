'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { apiFetch, extractErrorMessage } from '../../../lib/api';
import { getPrimaryProductImage } from '../../../lib/productImages';

interface OrderItemSummary {
  id: string;
  productName: string;
  variantLabel: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  isFreeItem: boolean;
  slug: string | null;
  image: string | null;
}

interface OrderSummaryCard {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  grandTotal: number;
  itemCount: number;
  itemsSummary: OrderItemSummary[];
  trackingToken: string;
}

interface TimelineStage {
  key: string;
  label: string;
  description: string;
  state: 'COMPLETED' | 'CURRENT' | 'PENDING' | 'FAILED';
  timestamp?: string;
}

interface OrderDetailView {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotal: number;
  discountTotal: number;
  shippingFee: number;
  grandTotal: number;
  promotionName?: string | null;
  promotionDiscount?: number;
  promotionDetails?: {
    promotionId?: string;
    promotionName?: string;
    appliedOffers?: Array<{
      offerName?: string;
      buyProductName: string;
      buyQuantity: number;
      freeProductName: string;
      freeQuantity: number;
      discount: number;
    }>;
  } | null;
  taxableAmount: number;
  taxRate: number;
  taxTotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxDetails?: Record<string, unknown> | null;
  items: Array<{
    id: string;
    productName: string;
    variantLabel: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    isFreeItem: boolean;
    freeQuantity?: number;
    slug: string | null;
    image: string | null;
  }>;
  shippingAddress: {
    name: string;
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    phone: string;
    isMasked: boolean;
  } | null;
  timeline: {
    currentStatus: string;
    isTerminal: boolean;
    terminalStatus: string | null;
    terminalMessage: string | null;
    stages: TimelineStage[];
  };
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function getStatusBadgeStyle(status: string) {
  switch (status?.toUpperCase()) {
    case 'DELIVERED':
      return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', label: 'Delivered' };
    case 'SHIPPED':
      return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'Shipped' };
    case 'PROCESSING':
      return { bg: '#fef3c7', color: '#b45309', border: '#fde68a', label: 'Processing' };
    case 'PAID':
      return { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', label: 'Payment Confirmed' };
    case 'PENDING':
      return { bg: '#f3f4f6', color: '#4b5563', border: '#e5e7eb', label: 'Order Placed' };
    case 'CANCELLED':
      return { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', label: 'Cancelled' };
    case 'REFUNDED':
      return { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff', label: 'Refunded' };
    default:
      return { bg: '#f3f4f6', color: '#4b5563', border: '#e5e7eb', label: status || 'Pending' };
  }
}

function getPaymentBadgeStyle(status: string) {
  switch (status?.toUpperCase()) {
    case 'CAPTURED':
    case 'PAID':
      return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', label: 'Paid' };
    case 'FAILED':
      return { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', label: 'Payment Failed' };
    case 'REFUNDED':
      return { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff', label: 'Refunded' };
    default:
      return { bg: '#fffbeb', color: '#b45309', border: '#fef3c7', label: 'Pending' };
  }
}

export default function TrackOrderPage() {
  const [lookupType, setLookupType] = useState<'phone' | 'email'>('phone');
  const [contactValue, setContactValue] = useState('');
  const [orderNumberInput, setOrderNumberInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [searchedContact, setSearchedContact] = useState('');
  const [orders, setOrders] = useState<OrderSummaryCard[]>([]);

  // Detailed view state
  const [selectedOrder, setSelectedOrder] = useState<OrderDetailView | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedValue = contactValue.trim();
    if (!trimmedValue) {
      setError(
        lookupType === 'phone'
          ? 'Please enter your 10-digit Indian mobile number.'
          : 'Please enter your email address.',
      );
      return;
    }

    if (lookupType === 'phone') {
      const digits = trimmedValue.replace(/\D/g, '');
      const normalized =
        digits.length === 12 && digits.startsWith('91')
          ? digits.slice(2)
          : digits.length === 11 && digits.startsWith('0')
          ? digits.slice(1)
          : digits;

      if (!/^[6-9]\d{9}$/.test(normalized)) {
        setError('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).');
        return;
      }
    } else {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)) {
        setError('Please enter a valid email address (e.g. you@example.com).');
        return;
      }
    }

    setLoading(true);
    setSelectedOrder(null);
    setDetailError('');

    try {
      const response = await apiFetch<{
        success: boolean;
        count: number;
        orders: OrderSummaryCard[];
      }>('/orders/track', {
        method: 'POST',
        body: JSON.stringify({
          type: lookupType,
          value: trimmedValue,
          orderNumber: orderNumberInput.trim() || undefined,
        }),
      });

      setOrders(response.orders || []);
      setHasSearched(true);
      setSearchedContact(trimmedValue);
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'Unable to search orders. Please try again.');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (order: OrderSummaryCard) => {
    setDetailLoading(true);
    setDetailError('');

    try {
      const detail = await apiFetch<OrderDetailView>(
        `/orders/track/${order.id}?token=${encodeURIComponent(order.trackingToken)}`,
      );
      setSelectedOrder(detail);
      // Scroll to top of order view
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      const message = extractErrorMessage(
        err,
        'Unable to load order details. Your tracking session may have expired. Please search again.',
      );
      setDetailError(message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleResetSearch = () => {
    setHasSearched(false);
    setOrders([]);
    setSelectedOrder(null);
    setError('');
    setDetailError('');
  };

  return (
    <div className="site-shell" style={{ padding: '3.5rem 0 6rem', minHeight: '75vh' }}>
      {/* Breadcrumb / Top Navigation */}
      <nav style={{ marginBottom: '1.75rem', fontSize: '0.85rem', color: 'var(--ff-charcoal-soft)' }}>
        <Link href="/" style={{ color: 'var(--ff-charcoal)', textDecoration: 'none' }}>
          Home
        </Link>
        <span style={{ margin: '0 0.5rem', color: 'var(--ff-stone)' }}>/</span>
        <span style={{ color: 'var(--ff-burgundy)', fontWeight: 500 }}>Track Order</span>
      </nav>

      {/* VIEW 1: INDIVIDUAL ORDER DETAILS DASHBOARD */}
      {selectedOrder ? (
        <section aria-labelledby="order-detail-heading">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--ff-burgundy)',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: 0,
                  marginBottom: '0.5rem',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                Back to My Orders
              </button>
              <h1 id="order-detail-heading" className="display-title" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', margin: 0 }}>
                Order #{selectedOrder.orderNumber}
              </h1>
              <p style={{ margin: '0.35rem 0 0', color: 'var(--ff-charcoal-soft)', fontSize: '0.9rem' }}>
                Placed on {formatDate(selectedOrder.createdAt)}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {(() => {
                const sBadge = getStatusBadgeStyle(selectedOrder.status);
                const pBadge = getPaymentBadgeStyle(selectedOrder.paymentStatus);
                return (
                  <>
                    <span
                      style={{
                        background: sBadge.bg,
                        color: sBadge.color,
                        border: `1px solid ${sBadge.border}`,
                        padding: '0.35rem 0.85rem',
                        borderRadius: '999px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {sBadge.label}
                    </span>
                    <span
                      style={{
                        background: pBadge.bg,
                        color: pBadge.color,
                        border: `1px solid ${pBadge.border}`,
                        padding: '0.35rem 0.85rem',
                        borderRadius: '999px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {pBadge.label}
                    </span>
                  </>
                );
              })()}
            </div>
          </div>

          {/* ORDER STATUS PROGRESS TIMELINE */}
          <div
            style={{
              background: 'var(--ff-card-bg)',
              border: '1px solid var(--ff-card-border)',
              borderRadius: '16px',
              padding: 'clamp(1.5rem, 3vw, 2.25rem)',
              boxShadow: 'var(--ff-card-shadow)',
              marginBottom: '2rem',
            }}
          >
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', color: 'var(--ff-charcoal)' }}>
              Order Progress
            </h2>

            {/* Terminal State Alert (Cancelled or Refunded) */}
            {selectedOrder.timeline.isTerminal && (
              <div
                style={{
                  background: selectedOrder.timeline.terminalStatus === 'CANCELLED' ? '#fef2f2' : '#faf5ff',
                  border: `1.5px solid ${selectedOrder.timeline.terminalStatus === 'CANCELLED' ? '#fecaca' : '#e9d5ff'}`,
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                  marginBottom: '1.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                }}
              >
                <span style={{ fontSize: '1.3rem' }}>
                  {selectedOrder.timeline.terminalStatus === 'CANCELLED' ? '⛔' : '↩️'}
                </span>
                <div>
                  <strong style={{ color: selectedOrder.timeline.terminalStatus === 'CANCELLED' ? '#b91c1c' : '#7e22ce' }}>
                    {selectedOrder.timeline.terminalStatus === 'CANCELLED' ? 'Order Cancelled' : 'Order Refunded'}
                  </strong>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.86rem', color: 'var(--ff-charcoal-soft)' }}>
                    {selectedOrder.timeline.terminalMessage || 'This order is in a terminal state and will not progress further.'}
                  </p>
                </div>
              </div>
            )}

            {/* Visual Stepper */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1.25rem',
                position: 'relative',
              }}
            >
              {selectedOrder.timeline.stages.map((stage, idx) => {
                const isCompleted = stage.state === 'COMPLETED';
                const isCurrent = stage.state === 'CURRENT';
                const isFailed = stage.state === 'FAILED';

                return (
                  <div
                    key={stage.key}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      opacity: selectedOrder.timeline.isTerminal && !isCompleted ? 0.45 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          background: isCompleted
                            ? 'var(--ff-burgundy)'
                            : isCurrent
                            ? 'rgba(124, 40, 54, 0.12)'
                            : isFailed
                            ? '#fee2e2'
                            : 'rgba(32, 28, 27, 0.06)',
                          color: isCompleted
                            ? '#fff'
                            : isCurrent
                            ? 'var(--ff-burgundy)'
                            : isFailed
                            ? '#b91c1c'
                            : 'var(--ff-charcoal-soft)',
                          border: isCurrent
                            ? '2px solid var(--ff-burgundy)'
                            : isFailed
                            ? '2px solid #ef4444'
                            : 'none',
                          boxShadow: isCurrent ? '0 0 0 4px rgba(124, 40, 54, 0.15)' : 'none',
                        }}
                      >
                        {isCompleted ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : isFailed ? (
                          '✕'
                        ) : (
                          idx + 1
                        )}
                      </div>

                      <strong
                        style={{
                          fontSize: '0.92rem',
                          color: isCompleted || isCurrent ? 'var(--ff-charcoal)' : 'var(--ff-charcoal-soft)',
                          fontWeight: isCurrent ? 700 : 600,
                        }}
                      >
                        {stage.label}
                      </strong>
                    </div>

                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--ff-charcoal-soft)', lineHeight: 1.45 }}>
                      {stage.description}
                    </p>

                    {stage.timestamp && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--ff-burgundy)', fontWeight: 600 }}>
                        {formatDate(stage.timestamp)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* TWO COLUMN GRID: ITEMS ON LEFT, SUMMARY & ADDRESS ON RIGHT */}
          <div className="order-detail-grid" style={{ marginTop: '0' }}>
            {/* ITEMS PANEL */}
            <section className="order-detail-panel">
              <h2>Items Purchased ({selectedOrder.items.reduce((s, it) => s + it.quantity, 0)})</h2>

              {/* 1+1 Offer Banner */}
              {selectedOrder.promotionName && (
                <div
                  style={{
                    background: 'rgba(238, 216, 207, 0.45)',
                    border: '1px solid rgba(124, 40, 54, 0.25)',
                    borderRadius: '12px',
                    padding: '0.85rem 1rem',
                    margin: '1.25rem 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>🎁</span>
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--ff-burgundy)' }}>
                      {selectedOrder.promotionName} Applied
                    </strong>
                    {selectedOrder.promotionDiscount && selectedOrder.promotionDiscount > 0 ? (
                      <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--ff-charcoal-soft)' }}>
                        You saved ₹{selectedOrder.promotionDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} on companion rituals.
                      </p>
                    ) : null}
                  </div>
                </div>
              )}

              <div className="order-detail-items">
                {selectedOrder.items.map((item) => {
                  const mappedImage = item.slug ? getPrimaryProductImage(item.slug) : null;
                  const itemImgSrc = mappedImage?.src || item.image;

                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        padding: '1rem 0',
                        borderBottom: '1px solid var(--ff-border-soft)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div
                          style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '10px',
                            background: 'var(--ff-sand-soft)',
                            position: 'relative',
                            overflow: 'hidden',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {itemImgSrc ? (
                            <Image
                              src={itemImgSrc}
                              alt={item.productName}
                              fill
                              sizes="56px"
                              style={{ objectFit: 'contain', padding: '4px' }}
                            />
                          ) : (
                            <span style={{ fontSize: '0.7rem', color: 'var(--ff-burgundy)', fontWeight: 600 }}>
                              FF
                            </span>
                          )}
                        </div>

                        <div>
                          <strong style={{ display: 'block', fontSize: '0.94rem', color: 'var(--ff-charcoal)' }}>
                            {item.productName}
                          </strong>
                          <span style={{ fontSize: '0.82rem', color: 'var(--ff-charcoal-soft)' }}>
                            {item.variantLabel} × {item.quantity}
                          </span>
                          {item.isFreeItem && (
                            <span
                              style={{
                                display: 'inline-block',
                                marginLeft: '0.5rem',
                                background: '#ecfdf5',
                                color: '#047857',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                border: '1px solid #a7f3d0',
                              }}
                            >
                              1+1 FREE
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        {item.isFreeItem && (item.freeQuantity === undefined || item.freeQuantity === item.quantity) ? (
                          <strong style={{ color: '#047857', fontSize: '0.94rem' }}>FREE (₹0)</strong>
                        ) : (
                          <strong style={{ color: 'var(--ff-charcoal)', fontSize: '0.94rem' }}>
                            ₹{item.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </strong>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* INCLUSIVE GST & PRICING BREAKDOWN */}
              <div
                style={{
                  marginTop: '1.5rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid var(--ff-border-soft)',
                  display: 'grid',
                  gap: '0.5rem',
                  fontSize: '0.88rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ff-charcoal-soft)' }}>
                  <span>Product Subtotal (Incl. GST)</span>
                  <span>₹{selectedOrder.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                {selectedOrder.discountTotal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#047857', fontWeight: 600 }}>
                    <span>1+1 Offer Discount</span>
                    <span>-₹{selectedOrder.discountTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}

                {selectedOrder.taxableAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ff-charcoal-soft)' }}>
                    <span>Taxable Value</span>
                    <span>₹{selectedOrder.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}

                {selectedOrder.igst > 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ff-charcoal-soft)' }}>
                    <span>IGST Included ({selectedOrder.taxRate}%)</span>
                    <span>₹{selectedOrder.igst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                ) : selectedOrder.taxTotal > 0 ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ff-charcoal-soft)' }}>
                      <span>CGST Included ({selectedOrder.taxRate / 2}%)</span>
                      <span>₹{(selectedOrder.cgst || selectedOrder.taxTotal / 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ff-charcoal-soft)' }}>
                      <span>SGST Included ({selectedOrder.taxRate / 2}%)</span>
                      <span>₹{(selectedOrder.sgst || selectedOrder.taxTotal / 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </>
                ) : null}

                {selectedOrder.taxTotal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ff-burgundy)', fontWeight: 600 }}>
                    <span>Total GST Included ({selectedOrder.taxRate}%)</span>
                    <span>₹{selectedOrder.taxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ff-charcoal-soft)' }}>
                  <span>Delivery charges</span>
                  <span style={{ color: '#047857', fontWeight: 600 }}>FREE</span>
                </div>

                <div
                  className="order-detail-total"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    borderTop: '1px solid rgba(32, 28, 27, 0.1)',
                    marginTop: '0.65rem',
                    paddingTop: '0.85rem',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--ff-charcoal)' }}>
                    Final Amount
                  </span>
                  <strong style={{ fontSize: '1.4rem', color: 'var(--ff-burgundy)' }}>
                    ₹{selectedOrder.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>
            </section>

            {/* DELIVERY & PAYMENT DETAILS */}
            <section className="order-detail-panel">
              <h2>Delivery Details</h2>

              {selectedOrder.shippingAddress ? (
                <div style={{ marginTop: '1.25rem' }}>
                  <address style={{ fontStyle: 'normal', lineHeight: 1.6, fontSize: '0.92rem', color: 'var(--ff-charcoal)' }}>
                    <strong style={{ display: 'block', marginBottom: '0.25rem' }}>
                      {selectedOrder.shippingAddress.name}
                    </strong>
                    {selectedOrder.shippingAddress.line1 && <div>{selectedOrder.shippingAddress.line1}</div>}
                    <div>
                      {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}
                    </div>
                    <div>PIN: {selectedOrder.shippingAddress.postalCode}</div>
                    {selectedOrder.shippingAddress.phone && (
                      <div style={{ marginTop: '0.25rem', color: 'var(--ff-charcoal-soft)' }}>
                        Phone: {selectedOrder.shippingAddress.phone}
                      </div>
                    )}
                  </address>

                  <p
                    style={{
                      margin: '1.25rem 0 0',
                      fontSize: '0.78rem',
                      color: 'var(--ff-charcoal-soft)',
                      background: 'rgba(32, 28, 27, 0.04)',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <span>🔒</span>
                    <span>For your privacy and security, recipient and address details are partially masked.</span>
                  </p>
                </div>
              ) : (
                <p style={{ marginTop: '1rem', color: 'var(--ff-charcoal-soft)', fontSize: '0.9rem' }}>
                  Delivery address is unavailable for this order record.
                </p>
              )}

              <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--ff-border-soft)' }}>
                <h3 style={{ fontSize: '1.05rem', marginBottom: '0.75rem', color: 'var(--ff-charcoal)' }}>
                  Payment Information
                </h3>
                <p style={{ margin: '0.35rem 0', fontSize: '0.88rem', color: 'var(--ff-charcoal)' }}>
                  <strong>Method:</strong>{' '}
                  {selectedOrder.paymentMethod === 'COD' ? 'Cash on Delivery (Legacy)' : 'Razorpay Online Payment'}
                </p>
                <p style={{ margin: '0.35rem 0', fontSize: '0.88rem', color: 'var(--ff-charcoal)' }}>
                  <strong>Payment Status:</strong>{' '}
                  <span
                    style={{
                      fontWeight: 600,
                      color:
                        selectedOrder.paymentStatus === 'CAPTURED' || selectedOrder.paymentStatus === 'PAID'
                          ? '#047857'
                          : selectedOrder.paymentStatus === 'FAILED'
                          ? '#b91c1c'
                          : '#b45309',
                    }}
                  >
                    {selectedOrder.paymentStatus}
                  </span>
                </p>
              </div>
            </section>
          </div>
        </section>
      ) : hasSearched ? (
        /* VIEW 2: SEARCH RESULTS DASHBOARD (ALL MATCHING ORDERS) */
        <section aria-labelledby="tracking-results-heading">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <p className="eyebrow">Guest Order Tracking</p>
              <h1 id="tracking-results-heading" className="display-title" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', margin: 0 }}>
                My Orders
              </h1>
              <p style={{ margin: '0.5rem 0 0', color: 'var(--ff-charcoal-soft)', fontSize: '0.95rem' }}>
                Found <strong>{orders.length}</strong> {orders.length === 1 ? 'order' : 'orders'} for{' '}
                <span style={{ color: 'var(--ff-burgundy)', fontWeight: 600 }}>{searchedContact}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleResetSearch}
              className="btn btn-outline"
              style={{ fontSize: '0.88rem', padding: '0.65rem 1.25rem' }}
            >
              Search with Different Contact
            </button>
          </div>

          {detailError && (
            <div
              style={{
                background: '#fef2f2',
                border: '1.5px solid #fecaca',
                color: '#b91c1c',
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                marginBottom: '1.75rem',
                fontSize: '0.9rem',
              }}
              role="alert"
            >
              {detailError}
            </div>
          )}

          {orders.length === 0 ? (
            <div
              style={{
                background: 'var(--ff-card-bg)',
                border: '1px solid var(--ff-card-border)',
                borderRadius: '16px',
                padding: 'clamp(2.5rem, 5vw, 4rem) 1.5rem',
                textAlign: 'center',
                boxShadow: 'var(--ff-card-shadow)',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📦</div>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--ff-charcoal)', marginBottom: '0.5rem' }}>
                No Orders Found
              </h2>
              <p style={{ maxWidth: '28rem', margin: '0 auto 1.75rem', color: 'var(--ff-charcoal-soft)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                We couldn&apos;t find any orders matching <strong>{searchedContact}</strong>. Please check that you entered the same phone number or email address provided during checkout.
              </p>
              <button
                type="button"
                onClick={handleResetSearch}
                className="btn btn-primary"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              {orders.map((order) => {
                const sBadge = getStatusBadgeStyle(order.status);
                const pBadge = getPaymentBadgeStyle(order.paymentStatus);

                return (
                  <article
                    key={order.id}
                    style={{
                      background: 'var(--ff-card-bg)',
                      border: '1px solid var(--ff-card-border)',
                      borderRadius: '16px',
                      padding: 'clamp(1.25rem, 2.5vw, 1.75rem)',
                      boxShadow: 'var(--ff-card-shadow)',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        paddingBottom: '1.25rem',
                        borderBottom: '1px solid var(--ff-border-soft)',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '1.15rem', color: 'var(--ff-charcoal)' }}>
                            #{order.orderNumber}
                          </strong>
                          <span
                            style={{
                              background: sBadge.bg,
                              color: sBadge.color,
                              border: `1px solid ${sBadge.border}`,
                              padding: '0.2rem 0.65rem',
                              borderRadius: '999px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {sBadge.label}
                          </span>
                          <span
                            style={{
                              background: pBadge.bg,
                              color: pBadge.color,
                              border: `1px solid ${pBadge.border}`,
                              padding: '0.2rem 0.65rem',
                              borderRadius: '999px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {pBadge.label}
                          </span>
                        </div>
                        <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.84rem', color: 'var(--ff-charcoal-soft)' }}>
                          Placed on {formatDate(order.createdAt)}
                        </span>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--ff-charcoal-soft)' }}>
                          Total Amount
                        </span>
                        <strong style={{ fontSize: '1.25rem', color: 'var(--ff-burgundy)' }}>
                          ₹{order.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </div>
                    </div>

                    {/* ITEMS PREVIEW & ACTION */}
                    <div
                      style={{
                        paddingTop: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          {order.itemsSummary.slice(0, 3).map((item) => {
                            const mappedImage = item.slug ? getPrimaryProductImage(item.slug) : null;
                            const itemImgSrc = mappedImage?.src || item.image;

                            return (
                              <div
                                key={item.id}
                                style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '8px',
                                  background: 'var(--ff-sand-soft)',
                                  position: 'relative',
                                  overflow: 'hidden',
                                  border: '1px solid var(--ff-border-soft)',
                                }}
                                title={`${item.productName} (${item.quantity})`}
                              >
                                {itemImgSrc ? (
                                  <Image
                                    src={itemImgSrc}
                                    alt={item.productName}
                                    fill
                                    sizes="40px"
                                    style={{ objectFit: 'contain', padding: '2px' }}
                                  />
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.65rem', color: 'var(--ff-burgundy)' }}>
                                    FF
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <span style={{ fontSize: '0.88rem', color: 'var(--ff-charcoal)' }}>
                          {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                          {order.itemsSummary.some((i) => i.isFreeItem) && (
                            <span style={{ color: '#047857', fontWeight: 600, marginLeft: '0.4rem' }}>
                              (Includes 1+1 Free Item)
                            </span>
                          )}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleViewDetails(order)}
                        disabled={detailLoading}
                        className="btn btn-primary"
                        style={{ fontSize: '0.88rem', padding: '0.55rem 1.35rem' }}
                      >
                        {detailLoading ? 'Loading…' : 'View Details →'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        /* VIEW 3: INITIAL SEARCH FORM */
        <section aria-labelledby="track-order-heading" style={{ maxWidth: '38rem', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <p className="eyebrow">Instant Status Lookup</p>
            <h1 id="track-order-heading" className="display-title" style={{ fontSize: 'clamp(2.4rem, 5vw, 3.6rem)', marginTop: '0.4rem' }}>
              Track Your Order
            </h1>
            <p style={{ marginTop: '0.85rem', color: 'var(--ff-charcoal-soft)', fontSize: '1.05rem', lineHeight: 1.6 }}>
              Enter the phone number or email address you used during checkout to find your orders.
            </p>
          </div>

          <div
            style={{
              background: 'var(--ff-card-bg)',
              border: '1px solid var(--ff-card-border)',
              borderRadius: '20px',
              padding: 'clamp(1.75rem, 4vw, 2.75rem)',
              boxShadow: 'var(--ff-card-shadow)',
            }}
          >
            {/* LOOKUP TYPE SELECTOR TABS */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.5rem',
                background: 'rgba(32, 28, 27, 0.05)',
                padding: '0.35rem',
                borderRadius: '12px',
                marginBottom: '2rem',
              }}
              role="tablist"
              aria-label="Search method"
            >
              <button
                type="button"
                role="tab"
                aria-selected={lookupType === 'phone'}
                onClick={() => {
                  setLookupType('phone');
                  setContactValue('');
                  setError('');
                }}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: lookupType === 'phone' ? '#fff' : 'transparent',
                  color: lookupType === 'phone' ? 'var(--ff-burgundy)' : 'var(--ff-charcoal-soft)',
                  fontWeight: lookupType === 'phone' ? 700 : 500,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  boxShadow: lookupType === 'phone' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>📱</span>
                <span>Phone Number</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={lookupType === 'email'}
                onClick={() => {
                  setLookupType('email');
                  setContactValue('');
                  setError('');
                }}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: lookupType === 'email' ? '#fff' : 'transparent',
                  color: lookupType === 'email' ? 'var(--ff-burgundy)' : 'var(--ff-charcoal-soft)',
                  fontWeight: lookupType === 'email' ? 700 : 500,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  boxShadow: lookupType === 'email' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>✉️</span>
                <span>Email Address</span>
              </button>
            </div>

            {error && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1.5px solid #fecaca',
                  color: '#b91c1c',
                  padding: '0.85rem 1.15rem',
                  borderRadius: '10px',
                  marginBottom: '1.5rem',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
                role="alert"
              >
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSearch} noValidate>
              {lookupType === 'phone' ? (
                /* PHONE INPUT */
                <div style={{ marginBottom: '1.5rem' }}>
                  <label
                    htmlFor="track-phone"
                    style={{
                      display: 'block',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      color: 'var(--ff-charcoal)',
                      marginBottom: '0.45rem',
                    }}
                  >
                    Mobile Phone Number
                  </label>
                  <div style={{ position: 'relative', display: 'flex' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 0.85rem',
                        background: 'rgba(32, 28, 27, 0.05)',
                        border: '1px solid rgba(32, 28, 27, 0.18)',
                        borderRight: 'none',
                        borderRadius: '10px 0 0 10px',
                        fontSize: '0.92rem',
                        fontWeight: 600,
                        color: 'var(--ff-charcoal-soft)',
                      }}
                    >
                      +91
                    </span>
                    <input
                      id="track-phone"
                      type="tel"
                      value={contactValue}
                      onChange={(e) => setContactValue(e.target.value)}
                      placeholder="9876543210"
                      maxLength={15}
                      autoComplete="tel"
                      disabled={loading}
                      style={{
                        flex: 1,
                        padding: '0.85rem 1rem',
                        borderRadius: '0 10px 10px 0',
                        border: '1px solid rgba(32, 28, 27, 0.18)',
                        fontSize: '0.95rem',
                        outline: 'none',
                        background: '#fff',
                        color: 'var(--ff-charcoal)',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>
                  <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: 'var(--ff-charcoal-soft)' }}>
                    Enter the 10-digit mobile number used when placing your guest order.
                  </p>
                </div>
              ) : (
                /* EMAIL INPUT */
                <div style={{ marginBottom: '1.5rem' }}>
                  <label
                    htmlFor="track-email"
                    style={{
                      display: 'block',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      color: 'var(--ff-charcoal)',
                      marginBottom: '0.45rem',
                    }}
                  >
                    Email Address
                  </label>
                  <input
                    id="track-email"
                    type="email"
                    value={contactValue}
                    onChange={(e) => setContactValue(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      border: '1px solid rgba(32, 28, 27, 0.18)',
                      fontSize: '0.95rem',
                      outline: 'none',
                      background: '#fff',
                      color: 'var(--ff-charcoal)',
                      fontFamily: 'inherit',
                    }}
                  />
                  <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: 'var(--ff-charcoal-soft)' }}>
                    Enter the email address provided in your order checkout details.
                  </p>
                </div>
              )}

              {/* OPTIONAL SPECIFIC ORDER NUMBER */}
              <div style={{ marginBottom: '1.75rem' }}>
                <label
                  htmlFor="track-order-number"
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    color: 'var(--ff-charcoal-soft)',
                    marginBottom: '0.4rem',
                  }}
                >
                  Order Number <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>(Optional)</span>
                </label>
                <input
                  id="track-order-number"
                  type="text"
                  value={orderNumberInput}
                  onChange={(e) => setOrderNumberInput(e.target.value)}
                  placeholder="e.g. FF-12345678-001"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(32, 28, 27, 0.14)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    background: '#fff',
                    color: 'var(--ff-charcoal)',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '0.95rem 1.5rem',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.65rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.75 : 1,
                }}
              >
                {loading ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    <span>Searching orders…</span>
                  </>
                ) : (
                  <>
                    <span>Search Orders</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </form>

            <div
              style={{
                marginTop: '1.75rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid var(--ff-border-soft)',
                textAlign: 'center',
                fontSize: '0.82rem',
                color: 'var(--ff-charcoal-soft)',
              }}
            >
              <span>No account or password needed. Secure guest order lookup.</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
