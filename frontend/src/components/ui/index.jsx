import clsx from 'clsx'
import { ImSpinner8 } from 'react-icons/im'

// ── Button ──────────────────────────────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', loading, className, ...props }) {
    const base = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none'
    const variants = {
        primary: 'rounded-xl bg-corona text-white hover:bg-primary-hover shadow-sm',
        secondary: 'rounded-xl border border-jazz/25 bg-white text-night hover:border-corona/40 hover:bg-whiteout',
        ghost: 'rounded-xl text-jazz hover:bg-steel/5 hover:text-night',
        danger: 'rounded-xl bg-red-500 text-white hover:bg-red-600',
        outline: 'rounded-xl border-2 border-corona text-corona hover:bg-corona hover:text-white',
    }
    const sizes = {
        sm: 'px-3.5 py-1.5 text-xs',
        md: 'px-5 py-2.5 text-sm',
        lg: 'px-6 py-3 text-base',
    }
    return (
        <button
            className={clsx(base, variants[variant], sizes[size], className)}
            disabled={loading || props.disabled}
            {...props}
        >
            {loading && <ImSpinner8 className="animate-spin text-current" size={14} />}
            {children}
        </button>
    )
}

// ── Card ────────────────────────────────────────────────────────────────────
export function Card({ children, className, dark, ...props }) {
    return (
        <div
            className={clsx(
                dark
                    ? 'bg-night rounded-2xl p-6 text-whiteout'
                    : 'bg-white rounded-2xl shadow-card border border-jazz/10 p-6',
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

// ── Badge ───────────────────────────────────────────────────────────────────
export function Badge({ children, color = 'default', className }) {
    const colors = {
        default: 'bg-jazz/10 text-luscious',
        purple: 'bg-primary-light text-corona',
        green: 'bg-emerald-100 text-emerald-700',
        amber: 'bg-amber-100 text-amber-700',
        orange: 'bg-orange-100 text-orange-700',
        red: 'bg-red-100 text-red-700',
        blue: 'bg-blue-100 text-blue-700',
    }
    return (
        <span className={clsx('badge', colors[color], className)}>
            {children}
        </span>
    )
}

// ── Input ───────────────────────────────────────────────────────────────────
export function Input({ label, error, hint, className, ...props }) {
    return (
        <div className="flex flex-col gap-1">
            {label && <label className="text-xs font-semibold text-night uppercase tracking-wide">{label}</label>}
            <input className={clsx('input-base', error && 'border-red-400 focus:border-red-400 focus:ring-red-100', className)} {...props} />
            {error && <p className="text-xs text-red-500">{error}</p>}
            {hint && !error && <p className="text-xs text-jazz">{hint}</p>}
        </div>
    )
}

// ── Select ──────────────────────────────────────────────────────────────────
export function Select({ label, error, children, className, ...props }) {
    return (
        <div className="flex flex-col gap-1">
            {label && <label className="text-xs font-semibold text-night uppercase tracking-wide">{label}</label>}
            <select className={clsx('input-base', error && 'border-red-400', className)} {...props}>
                {children}
            </select>
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    )
}

// ── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 20 }) {
    return (
        <div className="flex items-center justify-center p-8">
            <ImSpinner8 className="animate-spin text-corona" size={size} />
        </div>
    )
}

// ── StatCard ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, unit, icon: Icon, color = 'purple', trend }) {
    const colors = {
        purple: 'bg-primary-light text-corona',
        green: 'bg-emerald-100 text-emerald-600',
        amber: 'bg-amber-100 text-amber-600',
        red: 'bg-red-100 text-red-600',
        blue: 'bg-blue-100 text-blue-600',
    }
    return (
        <Card className="flex items-start gap-4">
            {Icon && (
                <div className={clsx('p-2.5 rounded-xl flex-shrink-0', colors[color])}>
                    <Icon size={20} />
                </div>
            )}
            <div className="min-w-0">
                <p className="stat-label">{label}</p>
                <p className="stat-value">
                    {value ?? '—'}
                    {unit && <span className="text-sm font-body font-normal text-jazz ml-1">{unit}</span>}
                </p>
                {trend && <p className="text-xs text-jazz mt-0.5">{trend}</p>}
            </div>
        </Card>
    )
}

// ── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            {Icon && (
                <div className="p-4 rounded-2xl bg-primary-light text-corona mb-2">
                    <Icon size={28} />
                </div>
            )}
            <p className="font-semibold text-night">{title}</p>
            {description && <p className="text-sm text-jazz max-w-xs">{description}</p>}
            {action && <div className="mt-2">{action}</div>}
        </div>
    )
}

// ── RiskBadge ────────────────────────────────────────────────────────────────
export function RiskBadge({ category }) {
    const map = {
        'Low Risk': 'green',
        'Mild': 'amber',
        'Moderate': 'orange',
        'Severe': 'red',
    }
    return <Badge color={map[category] || 'default'}>{category || '—'}</Badge>
}

// ── SectionTitle ─────────────────────────────────────────────────────────────
export function SectionTitle({ children, subtitle, action }) {
    return (
        <div className="flex items-start justify-between gap-4 mb-6">
            <div>
                <h2 className="font-display text-xl text-steel">{children}</h2>
                {subtitle && <p className="text-sm text-jazz mt-0.5">{subtitle}</p>}
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
        </div>
    )
}