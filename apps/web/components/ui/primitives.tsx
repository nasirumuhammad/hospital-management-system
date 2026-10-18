import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export function Button({ className, variant = 'primary', size = 'md', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={cn('ui-button', `ui-button--${variant}`, `ui-button--${size}`, className)} {...props} />;
}

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn('ui-card', className)} {...props} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('ui-input', className)} {...props} />;
}

export function SectionHeading({ eyebrow, title, description, action, className }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return <div className={cn('section-heading', className)}><div>{eyebrow && <p className="section-eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="section-description">{description}</p>}</div>{action && <div className="section-heading-action">{action}</div>}</div>;
}
