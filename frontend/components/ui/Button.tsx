import Link from 'next/link';
import { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'outline' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  href?: string;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-burgundy text-white shadow-[0_12px_28px_rgba(124,40,54,0.18)] hover:bg-burgundy-dark',
  outline: 'border border-charcoal/20 bg-white/60 text-charcoal hover:border-burgundy hover:text-burgundy',
  ghost: 'text-charcoal hover:text-burgundy',
};

export function Button({ variant = 'primary', href, children, className = '', ...props }: ButtonProps) {
  const classes = `inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium tracking-[0.12em] uppercase transition-all duration-200 ease-out hover:-translate-y-0.5 ${VARIANT_CLASSES[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
