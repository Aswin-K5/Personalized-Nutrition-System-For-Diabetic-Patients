import { useEffect, useState } from 'react'
import { dietPlanApi } from '../api/dietplan'
import { Card, Button, SectionTitle, EmptyState, Spinner } from '../components/ui'
import toast from 'react-hot-toast'
import {
    RiHeartPulseLine, RiLeafLine, RiRefreshLine, RiCheckLine,
    RiTimeLine, RiDropLine, RiFireLine, RiAlertLine, RiCalendarLine,
} from 'react-icons/ri'
import clsx from 'clsx'

const MODULE_LABELS = [
    { key: 'low_gi_plan', label: 'Low Glycaemic Foods', color: 'bg-blue-100 text-blue-700' },
    { key: 'calorie_deficit_plan', label: 'Calorie Management', color: 'bg-amber-100 text-amber-700' },
    { key: 'anti_inflammatory_diet', label: 'Anti-Inflammatory Foods', color: 'bg-emerald-100 text-emerald-700' },
    { key: 'omega3_emphasis', label: 'Omega-3 Rich Foods', color: 'bg-cyan-100 text-cyan-700' },
    { key: 'mufa_emphasis', label: 'Healthy Fats (MUFA)', color: 'bg-lime-100 text-lime-700' },
    { key: 'soluble_fiber_emphasis', label: 'Soluble Fibre Boost', color: 'bg-green-100 text-green-700' },
    { key: 'time_restricted_eating', label: 'Timed Eating Window', color: 'bg-purple-100 text-purple-700' },
    { key: 'portion_control', label: 'Portion Awareness', color: 'bg-orange-100 text-orange-700' },
    { key: 'carb_distribution', label: 'Carb Timing Strategy', color: 'bg-indigo-100 text-indigo-700' },
]

const ACTION_STYLE = {
    increase: 'bg-emerald-50 border-emerald-200',
    avoid: 'bg-red-50 border-red-200',
    strategy: 'bg-amber-50 border-amber-200',
    reduce: 'bg-orange-50 border-orange-200',
}
const ACTION_BADGE = {
    increase: 'bg-emerald-100 text-emerald-700',
    avoid: 'bg-red-100 text-red-600',
    strategy: 'bg-amber-100 text-amber-700',
    reduce: 'bg-orange-100 text-orange-700',
}

export default function DietPlan() {
    const [plan, setPlan] = useState(null)
    const [history, setHistory] = useState([])
    const [generating, setGenerating] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const [loadingHistory, setLoadingHistory] = useState(false)

    useEffect(() => { loadLatestPlan() }, [])

    const loadLatestPlan = async () => {
        try {
            const res = await dietPlanApi.history({ limit: 1 })
            const items = res.data?.items || res.data || []
            if (items.length > 0) setPlan(items[0])
        } catch { }
    }

    const loadHistory = async () => {
        setLoadingHistory(true)
        try {
            const res = await dietPlanApi.history({ limit: 10 })
            setHistory(res.data?.items || res.data || [])
        } catch { toast.error('Could not load history') }
        finally { setLoadingHistory(false) }
    }

    const generatePlan = async () => {
        setGenerating(true)
        try {
            const res = await dietPlanApi.generate({ source: 'combined' })
            setPlan(res.data)
            setShowHistory(false)
            toast.success('Your personalised plan is ready!')
        } catch (err) {
            toast.error(
                err.response?.status === 404
                    ? 'Please complete your profile and log a dietary recall first.'
                    : err.response?.data?.detail || 'Could not generate plan. Ensure profile and dietary recall are complete.'
            )
        } finally { setGenerating(false) }
    }

    const toggleHistory = () => {
        if (!showHistory) loadHistory()
        setShowHistory(v => !v)
    }

    const activeModules = plan ? MODULE_LABELS.filter(m => plan[m.key]) : []

    return (
        <div className="max-w-3xl space-y-6 animate-fade-in">
            <div>
                <h1 className="page-title">My Diet Plan</h1>
                <p className="text-sm text-jazz mt-1">Evidence-based dietary recommendations personalised to your health profile</p>
            </div>

            {/* Generate card */}
            <Card>
                <div className="flex items-start gap-4 flex-wrap">
                    <div className="flex-1">
                        <h2 className="font-semibold text-steel mb-1">Get Your Personalised Plan</h2>
                        <p className="text-sm text-jazz leading-relaxed">
                            Based on your health profile, lab values, and dietary intake, we create recommendations
                            aligned with clinical guidelines for diabetes and metabolic syndrome.
                        </p>
                    </div>
                    <div className="flex gap-3 flex-shrink-0 flex-wrap">
                        <Button onClick={toggleHistory} variant="secondary" size="sm">
                            <RiCalendarLine size={14} />
                            {showHistory ? 'Hide History' : 'Past Plans'}
                        </Button>
                        <Button onClick={generatePlan} loading={generating}>
                            <RiRefreshLine size={15} />
                            {plan ? 'Regenerate' : 'Get My Plan'}
                        </Button>
                    </div>
                </div>
                {!plan && !generating && (
                    <div className="flex items-start gap-3 mt-4 pt-4 border-t border-jazz/10">
                        <RiAlertLine className="text-amber-500 flex-shrink-0 mt-0.5" size={16} />
                        <p className="text-sm text-jazz">
                            Complete your <strong className="text-night">clinical profile</strong> and log at least one <strong className="text-night">dietary recall</strong> before generating.
                        </p>
                    </div>
                )}
            </Card>

            {/* Past plans */}
            {showHistory && (
                <div className="space-y-3 animate-slide-up">
                    <h3 className="font-semibold text-steel text-sm uppercase tracking-wide">Past Plans</h3>
                    {loadingHistory ? <Spinner /> : history.length === 0 ? (
                        <p className="text-sm text-jazz py-4">No previous plans found.</p>
                    ) : history.map(p => (
                        <button key={p.id} onClick={() => { setPlan(p); setShowHistory(false) }}
                            className="w-full text-left card hover:shadow-card-md hover:border-corona/30 transition-all">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                <div>
                                    <p className="font-semibold text-steel text-sm">
                                        {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                    <p className="text-xs text-jazz mt-0.5">{p.target_calories?.toFixed(0)} kcal/day target</p>
                                </div>
                                <div className="flex gap-1.5 flex-wrap">
                                    {MODULE_LABELS.filter(m => p[m.key]).slice(0, 3).map(m => (
                                        <span key={m.key} className={clsx('badge text-[11px]', m.color)}>{m.label}</span>
                                    ))}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Plan output */}
            {plan && !showHistory && (
                <div className="space-y-5 animate-slide-up">
                    <p className="text-xs text-jazz flex items-center gap-1.5">
                        <RiTimeLine size={13} />
                        Generated on {new Date(plan.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>

                    {/* Clinical summary */}
                    {plan.summary && (
                        <Card className="border-l-4 border-l-corona bg-primary-light/30">
                            <p className="text-sm text-night leading-relaxed">{plan.summary}</p>
                        </Card>
                    )}

                    {/* Daily targets */}
                    <Card dark>
                        <p className="text-xs text-jazz uppercase tracking-widest font-semibold mb-4">Your Daily Nutrition Targets</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                                { label: 'Total Calories', value: plan.target_calories?.toFixed(0), unit: 'kcal/day' },
                                { label: 'Carbohydrates', value: plan.target_carb_percent?.toFixed(0), unit: '%' },
                                { label: 'Protein', value: plan.target_protein_percent?.toFixed(0), unit: '%' },
                                { label: 'Fat', value: plan.target_fat_percent?.toFixed(0), unit: '%' },
                                { label: 'Dietary Fibre', value: plan.target_fiber_g?.toFixed(0), unit: 'g/day' },
                                { label: 'Sodium', value: plan.target_sodium_mg?.toFixed(0), unit: 'mg/day' },
                                { label: 'Added Sugar', value: plan.target_added_sugar_g?.toFixed(0), unit: 'g/day max' },
                            ].filter(t => t.value).map(({ label, value, unit }) => (
                                <div key={label} className="bg-white/5 rounded-xl p-3">
                                    <p className="text-[10px] text-jazz uppercase tracking-wide mb-1">{label}</p>
                                    <p className="font-display text-xl text-whiteout">
                                        {value}<span className="text-xs font-body text-jazz ml-1">{unit}</span>
                                    </p>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Active strategies */}
                    {activeModules.length > 0 && (
                        <Card>
                            <SectionTitle>Your Personalised Dietary Strategies</SectionTitle>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {activeModules.map(({ key, label, color }) => (
                                    <div key={key} className={clsx('flex items-center gap-2.5 rounded-xl px-4 py-3 border', color.includes('emerald') ? 'border-emerald-200' : color.includes('blue') ? 'border-blue-200' : color.includes('amber') ? 'border-amber-200' : 'border-jazz/15', color)}>
                                        <RiCheckLine size={14} className="flex-shrink-0" />
                                        <span className="text-sm font-medium">{label}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Food recommendations */}
                    {plan.food_recommendations?.length > 0 && (
                        <Card>
                            <SectionTitle>Food Recommendations</SectionTitle>
                            <div className="space-y-3">
                                {plan.food_recommendations.map((rec, i) => (
                                    <div key={i} className={clsx('rounded-xl border px-4 py-3.5', ACTION_STYLE[rec.action] || 'bg-whiteout border-jazz/20')}>
                                        <div className="flex items-start gap-3">
                                            <span className={clsx('badge text-[11px] flex-shrink-0 mt-0.5 capitalize font-bold', ACTION_BADGE[rec.action] || 'bg-jazz/10 text-jazz')}>
                                                {rec.action}
                                            </span>
                                            <div>
                                                <p className="font-semibold text-steel text-sm">{rec.category}</p>
                                                {rec.foods?.length > 0 && (
                                                    <p className="text-xs text-night/70 mt-0.5">e.g. {rec.foods.join(' · ')}</p>
                                                )}
                                                {rec.reason && (
                                                    <p className="text-xs text-jazz mt-1 leading-relaxed">{rec.reason}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Lifestyle reminders */}
                    {plan.lifestyle_reminders?.length > 0 && (
                        <Card>
                            <SectionTitle>Lifestyle Recommendations</SectionTitle>
                            <ul className="space-y-2.5">
                                {plan.lifestyle_reminders.map((r, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-night">
                                        <span className="w-5 h-5 rounded-full bg-primary-light text-corona flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold">
                                            {i + 1}
                                        </span>
                                        {r}
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-jazz/10">
                        <p className="text-xs text-jazz">Update your dietary recall and regenerate for a refreshed plan.</p>
                        <Button onClick={generatePlan} loading={generating} variant="secondary" size="sm">
                            <RiRefreshLine size={14} /> Regenerate
                        </Button>
                    </div>
                </div>
            )}

            {!plan && !generating && (
                <EmptyState icon={RiHeartPulseLine} title="No plan yet"
                    description="Click 'Get My Plan' above to receive your personalised dietary recommendations." />
            )}
        </div>
    )
}