import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { patientApi } from '../api/patient'
import { dietaryApi } from '../api/dietary'
import { dietPlanApi } from '../api/dietplan'
import { useAuthStore } from '../stores/authStore'
import { Card, StatCard, RiskBadge, Badge, Spinner, EmptyState } from '../components/ui'
import client from '../api/client'
import toast from 'react-hot-toast'
import {
    RiUser3Line, RiRestaurantLine, RiHeartPulseLine, RiFileListLine,
    RiArrowRightLine, RiLeafLine, RiFireLine, RiDropLine,
    RiScales3Line, RiAlertLine, RiDownloadLine,
} from 'react-icons/ri'

export default function Dashboard() {
    const { user } = useAuthStore()
    const [summary, setSummary] = useState(null)
    const [recalls, setRecalls] = useState([])
    const [plan, setPlan] = useState(null)
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)

    const handleExport = async () => {
        setExporting(true)
        try {
            const res = await client.get('/api/v1/patients/export', { responseType: 'blob' })
            const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
            const a = document.createElement('a')
            a.href = url
            a.download = `my-health-data-${new Date().toISOString().slice(0, 10)}.csv`
            a.click()
            URL.revokeObjectURL(url)
            toast.success('Personal data downloaded successfully')
        } catch { toast.error('Export failed. Make sure you have created your profile.') }
        finally { setExporting(false) }
    }

    useEffect(() => {
        Promise.allSettled([
            patientApi.getSummary(),
            dietaryApi.listRecalls({ limit: 3 }),
            dietPlanApi.history({ limit: 1 }),
        ]).then(([s, r, p]) => {
            if (s.status === 'fulfilled') setSummary(s.value.data)
            if (r.status === 'fulfilled') setRecalls(r.value.data?.items || r.value.data || [])
            if (p.status === 'fulfilled') {
                const items = p.value.data?.items || p.value.data || []
                if (items.length > 0) setPlan(items[0])
            }
        }).finally(() => setLoading(false))
    }, [])

    const quickActions = [
        { to: '/profile', icon: RiUser3Line, label: 'Update Profile', color: 'bg-primary-light text-corona' },
        { to: '/dietary-recall', icon: RiRestaurantLine, label: 'Log Today\'s Meals', color: 'bg-emerald-100 text-emerald-600' },
        { to: '/diet-plan', icon: RiHeartPulseLine, label: 'Generate Plan', color: 'bg-amber-100 text-amber-600' },
        { to: '/ffq', icon: RiFileListLine, label: 'Submit FFQ', color: 'bg-blue-100 text-blue-600' },
    ]

    if (loading) return <Spinner size={28} />

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="page-title">
                    Good {getTimeOfDay()},{' '}
                    <span className="text-gradient">{user?.full_name?.split(' ')[0] || 'there'}</span>
                </h1>
                <p className="text-sm text-jazz mt-1">Here's your metabolic health overview</p>
            </div>

            {/* No profile banner */}
            {!summary && (
                <div className="flex items-start gap-4 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <RiAlertLine className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                        <p className="text-sm font-semibold text-amber-800">Complete your clinical profile</p>
                        <p className="text-xs text-amber-700 mt-0.5">Enter your lab values and anthropometric data to unlock personalised recommendations.</p>
                    </div>
                    <Link to="/profile" className="btn-primary text-xs px-3 py-1.5 ml-auto flex-shrink-0">
                        Setup <RiArrowRightLine size={12} />
                    </Link>
                </div>
            )}

            {/* Metric cards */}
            {summary && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="BMI" value={summary.bmi?.toFixed(1)} unit="kg/m²" icon={RiScales3Line} color="purple" trend={summary.bmi_category} />
                    <StatCard label="Calorie Target" value={summary.estimated_calorie_req?.toFixed(0)} unit="kcal/day" icon={RiFireLine} color="amber" />
                    <StatCard label="Risk Category" value={null} icon={RiHeartPulseLine} color={riskColor(summary.metabolic_risk_category)}
                        trend={<RiskBadge category={summary.metabolic_risk_category} />} />
                    <StatCard label="Risk Factors" value={`${summary.metabolic_syndrome_components}/5`}
                        icon={RiDropLine} color={summary.metabolic_syndrome_present ? 'red' : 'green'}
                        trend={summary.metabolic_syndrome_present ? '⚠ Metabolic Syndrome' : '✓ No Metabolic Syndrome'} />
                </div>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Quick actions */}
                <div className="lg:col-span-1">
                    <h2 className="font-semibold text-steel mb-4 text-sm uppercase tracking-wide">Quick Actions</h2>
                    <div className="space-y-2.5">
                        {quickActions.map(({ to, icon: Icon, label, color }) => (
                            <Link key={to} to={to}
                                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-jazz/10 hover:border-corona/30 hover:shadow-card transition-all duration-200 group">
                                <div className={`p-2 rounded-lg flex-shrink-0 ${color}`}>
                                    <Icon size={16} />
                                </div>
                                <span className="text-sm font-medium text-night">{label}</span>
                                <RiArrowRightLine className="ml-auto text-jazz group-hover:text-corona transition-colors" size={16} />
                            </Link>
                        ))}
                        {/* Export button */}
                        <button onClick={handleExport} disabled={exporting}
                            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-jazz/10 hover:border-corona/30 hover:shadow-card transition-all duration-200 group w-full text-left disabled:opacity-60">
                            <div className="p-2 rounded-lg flex-shrink-0 bg-purple-100 text-purple-600">
                                <RiDownloadLine size={16} />
                            </div>
                            <span className="text-sm font-medium text-night">
                                {exporting ? 'Preparing…' : 'Export My Data'}
                            </span>
                            <RiArrowRightLine className="ml-auto text-jazz group-hover:text-corona transition-colors" size={16} />
                        </button>
                    </div>
                </div>

                {/* Recent recalls */}
                <div className="lg:col-span-2">
                    <h2 className="font-semibold text-steel mb-4 text-sm uppercase tracking-wide">Recent Dietary Recalls</h2>
                    {recalls.length === 0 ? (
                        <Card>
                            <EmptyState
                                icon={RiRestaurantLine}
                                title="No recalls logged yet"
                                description="Log your first 24-hour dietary recall to see your scores here."
                                action={<Link to="/dietary-recall" className="btn-primary text-xs">Log Recall</Link>}
                            />
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {recalls.slice(0, 3).map((rec) => (
                                <Card key={rec.id} className="hover:shadow-card-md transition-shadow">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div>
                                            <p className="font-semibold text-steel text-sm">{rec.recall_date}</p>
                                            <p className="text-xs text-jazz mt-0.5">
                                                {rec.total_calories?.toFixed(0) || '—'} kcal · {rec.food_items?.length || 0} foods
                                            </p>
                                        </div>
                                        <div className="flex gap-2 flex-wrap">
                                            {rec.dietary_inflammatory_score && (
                                                <Badge color={disColor(rec.dietary_inflammatory_score)}>
                                                    {rec.dietary_inflammatory_score} Diet
                                                </Badge>
                                            )}
                                            {rec.diet_quality_score != null && (
                                                <Badge color="default">Quality: {rec.diet_quality_score?.toFixed(0)}/100</Badge>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                            <Link to="/dietary-recall" className="btn-ghost text-xs mt-1">
                                View all recalls <RiArrowRightLine size={13} />
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Latest plan */}
            {plan && (
                <div>
                    <h2 className="font-semibold text-steel mb-4 text-sm uppercase tracking-wide">Latest Diet Plan</h2>
                    <div className="card-dark rounded-2xl">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <RiLeafLine size={16} className="text-corona" />
                                    <span className="text-xs text-jazz uppercase tracking-wide font-semibold">
                                        {plan.source?.replace('_', ' ')} · {new Date(plan.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-whiteout font-medium text-sm leading-relaxed max-w-lg">
                                    {plan.summary || 'Personalised plan generated from your clinical profile and dietary recall.'}
                                </p>
                            </div>
                            <Link to="/diet-plan" className="btn-primary flex-shrink-0 text-xs">
                                View Full Plan <RiArrowRightLine size={13} />
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                            {[
                                { label: 'Calories', value: plan.target_calories?.toFixed(0), unit: 'kcal' },
                                { label: 'Carbs', value: plan.target_carb_percent?.toFixed(0), unit: '%' },
                                { label: 'Protein', value: plan.target_protein_percent?.toFixed(0), unit: '%' },
                                { label: 'Fiber', value: plan.target_fiber_g?.toFixed(0), unit: 'g/day' },
                            ].map(({ label, value, unit }) => (
                                <div key={label} className="bg-white/5 rounded-xl p-3">
                                    <p className="text-[10px] text-jazz uppercase tracking-wide">{label}</p>
                                    <p className="font-display text-lg text-whiteout">{value ?? '—'}
                                        <span className="text-xs font-body text-jazz ml-1">{unit}</span>
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function getTimeOfDay() {
    const h = new Date().getHours()
    if (h < 12) return 'morning'
    if (h < 17) return 'afternoon'
    return 'evening'
}

function riskColor(cat) {
    return { 'Low Risk': 'green', Mild: 'amber', Moderate: 'orange', Severe: 'red' }[cat] || 'purple'
}

function disColor(dis) {
    if (dis?.includes('Anti')) return 'green'
    if (dis?.includes('Pro')) return 'red'
    return 'default'
}