import Link from 'next/link';
import { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'outline' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  href?: string;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-burgundy text-white hover:bg-burgundy-dark',
  outline: 'border border-charcoal text-charcoal hover:border-burgundy hover:text-burgundy',
  ghost: 'text-charcoal hover:text-burgundy',
};

export function Button({ variant = 'primary', href, children, className = '', ...props }: ButtonProps) {
  const classes = `inline-flex items-center justify-center rounded-sm px-6 py-3 text-sm font-medium transition-colors duration-150 ${VARIANT_CLASSES[variant]} ${className}`;

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
