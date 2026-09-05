import Link from 'next/link';
import { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'outline' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  href?: string;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-burgundy text-white shadow-[0_10px_22px_rgba(95,28,41,0.16)] hover:bg-burgundy-dark',
  outline: 'border border-charcoal/20 bg-white/30 text-charcoal hover:border-burgundy hover:text-burgundy',
  ghost: 'px-0 text-charcoal hover:text-burgundy',
};

export function Button({ variant = 'primary', href, children, className = '', ...props }: ButtonProps) {
  const classes = `inline-flex items-center justify-center rounded-sm px-6 py-3 text-[0.68rem] font-semibold tracking-[0.18em] uppercase transition-all duration-300 ease-out hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-burgundy ${VARIANT_CLASSES[variant]} ${className}`;

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
