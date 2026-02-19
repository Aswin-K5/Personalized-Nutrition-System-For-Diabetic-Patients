import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { authApi } from '../api/auth'
import toast from 'react-hot-toast'
import { RiLeafLine, RiMailLine, RiLockLine, RiEyeLine, RiEyeOffLine } from 'react-icons/ri'

export default function Login() {
    const [form, setForm] = useState({ email: '', password: '' })
    const [showPw, setShowPw] = useState(false)
    const [loading, setLoading] = useState(false)
    const { setAuth } = useAuthStore()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.email || !form.password) { toast.error('Fill in all fields'); return }
        setLoading(true)
        try {
            const res = await authApi.login(form.email, form.password)
            const token = res.data.access_token
            const me = await authApi.me(token)
            setAuth(token, me.data)
            toast.success(`Welcome back, ${me.data.full_name.split(' ')[0]}!`)
            navigate(me.data.role === 'investigator' ? '/investigator' : '/dashboard')
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Invalid credentials')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-whiteout flex">
            {/* Left panel */}
            <div className="hidden lg:flex lg:w-1/2 bg-sidebar-gradient flex-col justify-between p-12">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-corona flex items-center justify-center">
                        <RiLeafLine className="text-white" size={18} />
                    </div>
                    <span className="font-display text-xl text-whiteout">DiabetesDiet</span>
                </div>
                <div>
                    <blockquote className="font-display text-3xl text-whiteout leading-snug mb-6">
                        "Evidence-based nutrition,<br />personalised to your metabolism."
                    </blockquote>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { val: '5,400+', label: 'Verified Foods' },
                            { val: 'ADA 2024', label: 'Guidelines' },
                            { val: '4 Pillars', label: 'Health Focus' },
                            { val: 'Clinical', label: 'Evidence-Based' },
                        ].map(({ val, label }) => (
                            <div key={label} className="bg-white/5 rounded-xl p-4">
                                <p className="font-display text-2xl text-whiteout">{val}</p>
                                <p className="text-xs text-jazz mt-0.5">{label}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <p className="text-xs text-jazz">© 2025 DiabetesDiet · Clinical Nutrition Platform</p>
            </div>

            {/* Right panel */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-sm">
                    {/* Mobile logo */}
                    <div className="flex items-center gap-2.5 mb-10 lg:hidden">
                        <div className="w-8 h-8 rounded-lg bg-corona flex items-center justify-center">
                            <RiLeafLine className="text-white" size={16} />
                        </div>
                        <span className="font-display text-lg text-steel">DiabetesDiet</span>
                    </div>

                    <h1 className="font-display text-3xl text-steel mb-1">Welcome back</h1>
                    <p className="text-sm text-jazz mb-8">Sign in to your account</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-night uppercase tracking-wide">Email</label>
                            <div className="relative">
                                <RiMailLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-jazz" size={16} />
                                <input
                                    type="email"
                                    placeholder="you@example.com"
                                    value={form.email}
                                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    className="input-base pl-10"
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-night uppercase tracking-wide">Password</label>
                            <div className="relative">
                                <RiLockLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-jazz" size={16} />
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                    className="input-base pl-10 pr-10"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(v => !v)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-jazz hover:text-night transition-colors"
                                >
                                    {showPw ? <RiEyeOffLine size={16} /> : <RiEyeLine size={16} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-3 mt-2"
                        >
                            {loading ? 'Signing in…' : 'Sign In'}
                        </button>
                    </form>

                    <p className="text-center text-sm text-jazz mt-6">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-corona font-semibold hover:underline">Create one</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}