interface BadgeProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success'
  className?: string
  children: React.ReactNode
}

const variantClasses: Record<string, string> = {
  default: 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]',
  secondary: 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]',
  destructive: 'bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]',
  outline: 'border border-[hsl(var(--border))] text-[hsl(var(--foreground))]',
  success: 'bg-emerald-100 text-emerald-800',
}

export function Badge({ variant = 'default', className = '', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
