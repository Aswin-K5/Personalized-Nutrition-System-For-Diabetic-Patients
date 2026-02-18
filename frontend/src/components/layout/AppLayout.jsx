import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import clsx from 'clsx'
import {
    RiDashboardLine, RiUser3Line, RiRestaurantLine,
    RiHeartPulseLine, RiFileListLine, RiLineChartLine,
    RiCalendarLine, RiCompasses2Line, RiFocusLine,
    RiMenuLine, RiCloseLine, RiLogoutBoxLine, RiLeafLine,
} from 'react-icons/ri'

const navItems = [
    { to: '/dashboard', icon: RiDashboardLine, label: 'Dashboard' },
    { to: '/profile', icon: RiUser3Line, label: 'My Profile' },
    { to: '/dietary-recall', icon: RiRestaurantLine, label: 'Dietary Recall' },
    { to: '/diet-plan', icon: RiHeartPulseLine, label: 'My Diet Plan' },
    { to: '/ffq', icon: RiFileListLine, label: 'Food Frequency' },
    { to: '/progress', icon: RiLineChartLine, label: 'Progress' },
    { to: '/recall-calendar', icon: RiCalendarLine, label: 'Calendar' },
    { to: '/plan-comparison', icon: RiCompasses2Line, label: 'Compare Plans' },
    { to: '/goals', icon: RiFocusLine, label: 'My Goals' },
]

function SidebarContent({ onClose }) {
    const { user, logout } = useAuthStore()
    const navigate = useNavigate()

    return (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center gap-3 px-4 pt-6 pb-8">
                <div className="w-9 h-9 rounded-xl bg-corona flex items-center justify-center flex-shrink-0">
                    <RiLeafLine className="text-white" size={18} />
                </div>
                <div>
                    <span className="font-display text-lg text-whiteout leading-none block">DiabetesDiet</span>
                    <span className="text-[10px] text-jazz uppercase tracking-widest">Clinical Nutrition</span>
                </div>
                {onClose && (
                    <button onClick={onClose} className="ml-auto p-1 rounded-lg text-jazz hover:text-whiteout lg:hidden">
                        <RiCloseLine size={20} />
                    </button>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 space-y-0.5">
                <p className="px-3 mb-2 text-[10px] font-semibold text-jazz/50 uppercase tracking-widest">Menu</p>
                {navItems.map(({ to, icon: Icon, label }) => (
                    <NavLink key={to} to={to} onClick={onClose}
                        className={({ isActive }) => clsx('nav-link', isActive && 'active')}>
                        <Icon size={18} className="flex-shrink-0" />
                        <span>{label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* User */}
            <div className="p-3 mt-4 border-t border-white/5">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1">
                    <div className="w-8 h-8 rounded-full bg-corona/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-corona uppercase">
                            {user?.full_name?.charAt(0) || 'P'}
                        </span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-whiteout truncate">{user?.full_name || 'Patient'}</p>
                        <p className="text-[10px] text-jazz capitalize">Patient</p>
                    </div>
                </div>
                <button onClick={() => { logout(); navigate('/login') }}
                    className="nav-link w-full text-red-400 hover:bg-red-500/10 hover:text-red-300 mt-1">
                    <RiLogoutBoxLine size={18} />
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
    )
}

export default function AppLayout() {
    const [open, setOpen] = useState(false)
    return (
        <div className="flex h-screen bg-whiteout overflow-hidden">
            {open && <div className="fixed inset-0 bg-steel/50 z-20 lg:hidden" onClick={() => setOpen(false)} />}
            <aside className={clsx(
                'fixed lg:relative inset-y-0 left-0 z-30 w-64 bg-sidebar-gradient flex flex-col transition-transform duration-300',
                open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            )}>
                <SidebarContent onClose={() => setOpen(false)} />
            </aside>
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-14 flex items-center gap-3 px-4 md:px-6 bg-white border-b border-jazz/10 flex-shrink-0">
                    <button onClick={() => setOpen(true)} className="lg:hidden p-2 rounded-xl text-jazz hover:bg-whiteout transition-colors">
                        <RiMenuLine size={20} />
                    </button>
                    <div className="flex-1" />
                    <div className="flex items-center gap-2 text-sm text-jazz">
                        <span className="hidden sm:inline">ADA 2024 Guidelines</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-soft inline-block" />
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}