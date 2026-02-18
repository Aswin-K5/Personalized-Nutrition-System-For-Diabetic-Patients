import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'
import { RiLeafLine, RiUser3Line, RiMailLine, RiLockLine, RiEyeLine, RiEyeOffLine, RiStethoscopeLine } from 'react-icons/ri'
import clsx from 'clsx'

export default function Register() {
    const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'patient' })
    const [showPw, setShowPw] = useState(false)
    const [loading, setLoading] = useState(false)
    const { setAuth } = useAuthStore()
    const navigate = useNavigate()

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.full_name || !form.email || !form.password) { toast.error('All fields are required'); return }
        if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }
        setLoading(true)
        try {
            await authApi.register(form)
            const res = await authApi.login(form.email, form.password)
            const me = await authApi.me()
            setAuth(res.data.access_token, me.data)
            toast.success('Account created! Welcome 🎉')
            navigate(me.data.role === 'investigator' ? '/investigator' : '/dashboard')
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Registration failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-whiteout flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                <div className="flex items-center gap-2.5 mb-10">
                    <div className="w-9 h-9 rounded-xl bg-corona flex items-center justify-center">
                        <RiLeafLine className="text-white" size={18} />
                    </div>
                    <span className="font-display text-xl text-steel">DiabetesDiet</span>
                </div>

                <div className="card shadow-card-md">
                    <h1 className="font-display text-2xl text-steel mb-1">Create your account</h1>
                    <p className="text-sm text-jazz mb-6">Join the clinical nutrition platform</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Role selector */}
                        <div>
                            <label className="text-xs font-semibold text-night uppercase tracking-wide block mb-2">I am a</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    {
                                        value: 'patient', icon: RiUser3Line, label: 'Patient',
                                        desc: 'Get personalised dietary recommendations'
                                    },
                                    {
                                        value: 'investigator', icon: RiMicroscopeLine, label: 'Investigator',
                                        desc: 'Monitor population health & export data'
                                    },
                                ].map(({ value, icon: Icon, label, desc }) => (
                                    <button key={value} type="button" onClick={() => set('role', value)}
                                        className={clsx(
                                            'flex flex-col items-start gap-1 rounded-xl border-2 px-4 py-3 text-left transition-all',
                                            form.role === value
                                                ? 'border-corona bg-primary-light'
                                                : 'border-jazz/20 hover:border-jazz/40'
                                        )}>
                                        <div className="flex items-center gap-2">
                                            <Icon size={16} className={form.role === value ? 'text-corona' : 'text-jazz'} />
                                            <span className={clsx('text-sm font-semibold', form.role === value ? 'text-corona' : 'text-night')}>
                                                {label}
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-jazz leading-tight">{desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Full name */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-night uppercase tracking-wide">Full Name</label>
                            <div className="relative">
                                <RiUser3Line className="absolute left-3.5 top-1/2 -translate-y-1/2 text-jazz" size={16} />
                                <input type="text" placeholder="Priya Sharma" value={form.full_name}
                                    onChange={e => set('full_name', e.target.value)} className="input-base pl-10" />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-night uppercase tracking-wide">Email</label>
                            <div className="relative">
                                <RiMailLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-jazz" size={16} />
                                <input type="email" placeholder="you@example.com" value={form.email}
                                    onChange={e => set('email', e.target.value)} className="input-base pl-10" />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-night uppercase tracking-wide">Password</label>
                            <div className="relative">
                                <RiLockLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-jazz" size={16} />
                                <input type={showPw ? 'text' : 'password'} placeholder="Min. 8 characters"
                                    value={form.password} onChange={e => set('password', e.target.value)}
                                    className="input-base pl-10 pr-10" />
                                <button type="button" onClick={() => setShowPw(v => !v)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-jazz hover:text-night">
                                    {showPw ? <RiEyeOffLine size={16} /> : <RiEyeLine size={16} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-1">
                            {loading ? 'Creating account…' : 'Create Account'}
                        </button>
                    </form>

                    <p className="text-center text-sm text-jazz mt-5">
                        Already have an account?{' '}
                        <Link to="/login" className="text-corona font-semibold hover:underline">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}