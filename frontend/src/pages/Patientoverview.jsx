import { useEffect, useState } from 'react'
import { researchApi } from '../api/research'
import client from '../api/client'
import { Card, Badge, RiskBadge, Spinner, EmptyState } from '../components/ui'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import {
    RiGroupLine, RiSearchLine, RiArrowDownSLine,
    RiRestaurantLine, RiAlertLine, RiFilterLine,
} from 'react-icons/ri'

const MEAL_LABELS = {
    breakfast: 'Breakfast', mid_morning_snack: 'Mid-Morning Snack',
    lunch: 'Lunch', afternoon_snack: 'Afternoon Snack',
    dinner: 'Dinner', late_night: 'Late Night',
}
const MEAL_ORDER = ['breakfast', 'mid_morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'late_night']

export default function PatientOverview() {
    const [patients, setPatients] = useState([])
    const [loading, setLoading] = useState(true)
    const [query, setQuery] = useState('')
    const [riskFilter, setRiskFilter] = useState('all')
    const [error, setError] = useState(null)

    useEffect(() => {
        researchApi.listPatients()
            .then(res => setPatients(res.data || []))
            .catch(() =>
                client.get('/api/v1/auth/users')
                    .then(res => setPatients((res.data || []).filter(u => u.role === 'patient')))
                    .catch(() => setError('Could not load patients. Check investigator access.'))
            )
            .finally(() => setLoading(false))
    }, [])

    const RISK_OPTIONS = ['all', 'Low Risk', 'Mild', 'Moderate', 'Severe']

    const filtered = patients.filter(p => {
        const matchesSearch = !query ||
            p.full_name?.toLowerCase().includes(query.toLowerCase()) ||
            p.email?.toLowerCase().includes(query.toLowerCase())
        const matchesRisk = riskFilter === 'all' || p.risk_category === riskFilter
        return matchesSearch && matchesRisk
    })

    if (loading) return <Spinner size={28} />

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="page-title">Patient Registry</h1>
                <p className="text-sm text-jazz mt-1">
                    {patients.length} enrolled patient{patients.length !== 1 ? 's' : ''} — click any row to view clinical data
                </p>
            </div>

            {error && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
                    <RiAlertLine className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* Search + Risk Filter */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-jazz" size={16} />
                    <input type="text" placeholder="Search by name or email…"
                        value={query} onChange={e => setQuery(e.target.value)}
                        className="input-base pl-10 w-full" />
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                    <RiFilterLine className="text-jazz" size={14} />
                    <span className="text-xs text-jazz">Risk:</span>
                    {RISK_OPTIONS.map(r => (
                        <button key={r} onClick={() => setRiskFilter(r)}
                            className={clsx('px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                                riskFilter === r ? 'bg-corona text-white' : 'bg-whiteout text-jazz hover:bg-jazz/10')}>
                            {r === 'all' ? 'All' : r}
                        </button>
                    ))}
                </div>
            </div>

            {/* Column headers */}
            {filtered.length > 0 && (
                <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-semibold text-jazz uppercase tracking-widest">
                    <div className="col-span-3">Patient</div>
                    <div className="col-span-2">Risk Level</div>
                    <div className="col-span-2">BMI</div>
                    <div className="col-span-2">Glucose</div>
                    <div className="col-span-2">Recalls</div>
                    <div className="col-span-1"></div>
                </div>
            )}

            {filtered.length === 0 ? (
                <EmptyState icon={RiGroupLine} title="No patients found"
                    description="No patients match the current filters." />
            ) : (
                <div className="space-y-3">
                    {filtered.map(p => <PatientRow key={p.id} patient={p} />)}
                </div>
            )}
        </div>
    )
}

/* ─── Patient Row ──────────────────────────────────────────────────────────── */
function PatientRow({ patient }) {
    const [expanded, setExpanded] = useState(false)
    const [summary, setSummary] = useState(patient.summary || null)
    const [recalls, setRecalls] = useState([])
    const [plans, setPlans] = useState([])
    const [loading, setLoading] = useState(false)
    const [tab, setTab] = useState('overview')

    const handleExpand = async () => {
        if (expanded) { setExpanded(false); return }
        if (summary) { setExpanded(true); return }
        setLoading(true)
        try {
            const [sumRes, recRes, planRes] = await Promise.allSettled([
                researchApi.getPatientSummary(patient.id),
                researchApi.getPatientRecalls(patient.id),
                researchApi.getPatientPlans(patient.id),
            ])
            if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data)
            if (recRes.status === 'fulfilled') setRecalls(recRes.value.data || [])
            if (planRes.status === 'fulfilled') setPlans(planRes.value.data || [])
            setExpanded(true)
        } catch { toast.error('Could not load patient details') }
        finally { setLoading(false) }
    }

    const riskCat = summary?.metabolic_risk_category || patient.risk_category

    return (
        <div className="bg-white rounded-2xl border border-jazz/10 shadow-card overflow-hidden">
            {/* Summary row */}
            <button onClick={handleExpand}
                className="w-full grid grid-cols-2 md:grid-cols-12 gap-4 px-4 py-4 text-left hover:bg-whiteout transition-colors">

                {/* Name */}
                <div className="col-span-2 md:col-span-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-corona uppercase">
                            {patient.full_name?.charAt(0) || 'P'}
                        </span>
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-steel text-sm truncate">{patient.full_name}</p>
                        <p className="text-xs text-jazz truncate">{patient.email}</p>
                    </div>
                </div>

                {/* Risk */}
                <div className="col-span-1 md:col-span-2 flex items-center">
                    {riskCat
                        ? <RiskBadge category={riskCat} />
                        : <span className="text-xs text-jazz/50 italic">No profile</span>}
                </div>

                {/* BMI */}
                <div className="hidden md:flex col-span-2 items-center">
                    <div>
                        <p className="font-semibold text-steel text-sm">{patient.bmi?.toFixed(1) || '—'}</p>
                        <p className="text-[10px] text-jazz">kg/m²</p>
                    </div>
                </div>

                {/* Glucose */}
                <div className="hidden md:flex col-span-2 items-center">
                    <div>
                        <p className="font-semibold text-steel text-sm">
                            {patient.fasting_glucose?.toFixed(0) || '—'}
                            <span className="text-[10px] text-jazz ml-1">mg/dL</span>
                        </p>
                        <p className="text-[10px] text-jazz">Fasting Glucose</p>
                    </div>
                </div>

                {/* Recalls */}
                <div className="hidden md:flex col-span-2 items-center">
                    <div>
                        <p className="font-semibold text-steel text-sm">{patient.total_recalls ?? '—'}</p>
                        <p className="text-[10px] text-jazz">Logged</p>
                    </div>
                </div>

                {/* Chevron */}
                <div className="hidden md:flex col-span-1 items-center justify-end">
                    {loading
                        ? <div className="w-4 h-4 border-2 border-corona border-t-transparent rounded-full animate-spin" />
                        : <RiArrowDownSLine size={18} className={clsx('text-jazz transition-transform duration-200', expanded && 'rotate-180')} />
                    }
                </div>
            </button>

            {/* Expanded detail */}
            {expanded && (
                <div className="border-t border-jazz/10">
                    {/* Tabs */}
                    <div className="flex items-center gap-2 px-4 pt-3 pb-0 flex-wrap">
                        {[
                            { id: 'overview', label: 'Clinical Overview' },
                            { id: 'recalls', label: `Dietary Recalls (${recalls.length})` },
                            { id: 'plans', label: `Diet Plans (${plans.length})` },
                        ].map(t => (
                            <button key={t.id} onClick={() => setTab(t.id)}
                                className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                    tab === t.id ? 'bg-corona text-white' : 'text-jazz hover:bg-whiteout hover:text-night')}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="p-4">

                        {/* ── CLINICAL OVERVIEW ── */}
                        {tab === 'overview' && (
                            summary ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {[
                                            { label: 'BMI', value: summary.bmi?.toFixed(1), unit: 'kg/m²', note: summary.bmi_category },
                                            { label: 'Waist-Height Ratio', value: summary.waist_height_ratio?.toFixed(3), unit: '', note: summary.waist_height_ratio > 0.5 ? '⚠ Elevated' : '✓ Normal' },
                                            { label: 'Fasting Glucose', value: summary.fasting_glucose_mg_dl?.toFixed(0), unit: 'mg/dL', note: summary.fasting_glucose_mg_dl >= 126 ? '⚠ Diabetic' : summary.fasting_glucose_mg_dl >= 100 ? '⚠ Prediabetes' : '✓ Normal' },
                                            { label: 'Triglycerides', value: summary.triglycerides_mg_dl?.toFixed(0), unit: 'mg/dL', note: summary.triglycerides_mg_dl > 150 ? '⚠ High' : '✓ Normal' },
                                            { label: 'HDL Cholesterol', value: summary.hdl_cholesterol_mg_dl?.toFixed(0), unit: 'mg/dL' },
                                            { label: 'Risk Factors Met', value: `${summary.metabolic_syndrome_components}/5`, unit: '' },
                                            { label: 'Calorie Target', value: summary.estimated_calorie_req?.toFixed(0), unit: 'kcal/day' },
                                            { label: 'hs-CRP', value: summary.hs_crp_mg_l?.toFixed(1), unit: 'mg/L', note: summary.hs_crp_mg_l > 3 ? '⚠ Elevated' : summary.hs_crp_mg_l ? '✓ Normal' : null },
                                        ].filter(m => m.value).map(({ label, value, unit, note }) => (
                                            <div key={label} className="bg-whiteout rounded-xl p-3 border border-jazz/10">
                                                <p className="text-[10px] text-jazz uppercase tracking-wide">{label}</p>
                                                <p className="font-semibold text-steel mt-0.5 text-sm">{value}
                                                    {unit && <span className="text-xs text-jazz ml-1">{unit}</span>}
                                                </p>
                                                {note && <p className={clsx('text-[10px] mt-0.5', note.includes('⚠') ? 'text-orange-500' : 'text-emerald-600')}>{note}</p>}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs text-jazz">
                                        {summary.activity_level && <span className="bg-whiteout border border-jazz/15 px-2.5 py-1 rounded-full capitalize">🏃 {summary.activity_level.replace('_', ' ')} activity</span>}
                                        {summary.sleep_duration_hours && <span className="bg-whiteout border border-jazz/15 px-2.5 py-1 rounded-full">😴 {summary.sleep_duration_hours}h sleep</span>}
                                        {summary.smoking_status && <span className="bg-whiteout border border-jazz/15 px-2.5 py-1 rounded-full capitalize">🚬 {summary.smoking_status}</span>}
                                        {summary.medications?.length > 0 && <span className="bg-whiteout border border-jazz/15 px-2.5 py-1 rounded-full">💊 {summary.medications.length} medication{summary.medications.length !== 1 ? 's' : ''}</span>}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-jazz/60 italic py-4">Patient hasn't completed their clinical profile yet.</p>
                            )
                        )}

                        {/* ── DIETARY RECALLS ── */}
                        {tab === 'recalls' && (
                            recalls.length === 0
                                ? <p className="text-sm text-jazz/60 italic py-4">No dietary recalls logged yet.</p>
                                : <div className="space-y-4">{recalls.map(rec => <RecallDetail key={rec.id} rec={rec} />)}</div>
                        )}

                        {/* ── DIET PLANS ── */}
                        {tab === 'plans' && (
                            plans.length === 0
                                ? <p className="text-sm text-jazz/60 italic py-4">No diet plans generated yet.</p>
                                : (
                                    <div className="space-y-3">
                                        {plans.map(p => (
                                            <div key={p.id} className="bg-whiteout rounded-xl border border-jazz/10 p-3">
                                                <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                                                    <div>
                                                        <p className="font-semibold text-steel text-sm">
                                                            {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </p>
                                                        <p className="text-xs text-jazz mt-0.5">{p.target_calories?.toFixed(0)} kcal/day target</p>
                                                    </div>
                                                    <div className="flex gap-1.5 flex-wrap">
                                                        {p.low_gi_plan && <span className="badge text-[10px] bg-blue-100 text-blue-700">Low Glycaemic</span>}
                                                        {p.anti_inflammatory_diet && <span className="badge text-[10px] bg-emerald-100 text-emerald-700">Anti-Inflammatory</span>}
                                                        {p.time_restricted_eating && <span className="badge text-[10px] bg-purple-100 text-purple-700">Timed Eating</span>}
                                                        {p.calorie_deficit_plan && <span className="badge text-[10px] bg-amber-100 text-amber-700">Calorie Deficit</span>}
                                                        {p.omega3_emphasis && <span className="badge text-[10px] bg-cyan-100 text-cyan-700">Omega-3</span>}
                                                    </div>
                                                </div>
                                                {p.summary && <p className="text-xs text-night/70 leading-relaxed">{p.summary}</p>}
                                            </div>
                                        ))}
                                    </div>
                                )
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

/* ─── Recall Detail with food items ───────────────────────────────────────── */
function RecallDetail({ rec }) {
    const [showFoods, setShowFoods] = useState(false)

    const byMeal = MEAL_ORDER.reduce((acc, meal) => {
        const items = (rec.food_items || []).filter(f => f.meal_type === meal)
        if (items.length) acc[meal] = items
        return acc
    }, {})
    const totalFoods = rec.food_items?.length || 0

    return (
        <div className="bg-whiteout rounded-xl border border-jazz/10 overflow-hidden">
            <div className="p-3">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                    <p className="font-semibold text-steel text-sm">{rec.recall_date}</p>
                    <div className="flex gap-1.5 flex-wrap">
                        {rec.dietary_inflammatory_score && (
                            <span className={clsx('badge text-[10px]',
                                rec.dietary_inflammatory_score.includes('Anti') ? 'bg-emerald-100 text-emerald-700' :
                                    rec.dietary_inflammatory_score.includes('Pro') ? 'bg-red-100 text-red-600' :
                                        'bg-jazz/10 text-jazz')}>
                                {rec.dietary_inflammatory_score} Diet
                            </span>
                        )}
                        {rec.diet_quality_score != null && (
                            <span className="badge text-[10px] bg-primary-light text-corona">
                                Quality {rec.diet_quality_score?.toFixed(0)}/100
                            </span>
                        )}
                        {rec.chrononutrition_score != null && (
                            <span className="badge text-[10px] bg-blue-100 text-blue-600">
                                Eating Pattern {rec.chrononutrition_score?.toFixed(1)}/10
                            </span>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-5 gap-2 text-center">
                    {[
                        { l: 'Calories', v: rec.total_calories?.toFixed(0), u: 'kcal' },
                        { l: 'Carbs', v: rec.carb_percent?.toFixed(0), u: '%' },
                        { l: 'Protein', v: rec.protein_percent?.toFixed(0), u: '%' },
                        { l: 'Fat', v: rec.fat_percent?.toFixed(0), u: '%' },
                        { l: 'Fibre', v: rec.fiber_g?.toFixed(1), u: 'g' },
                    ].map(({ l, v, u }) => (
                        <div key={l}>
                            <p className="text-[10px] text-jazz">{l}</p>
                            <p className="text-xs font-semibold text-steel">{v ?? '—'}<span className="text-[10px] text-jazz ml-0.5">{u}</span></p>
                        </div>
                    ))}
                </div>
                {totalFoods > 0 ? (
                    <button onClick={() => setShowFoods(v => !v)}
                        className="flex items-center gap-1.5 mt-3 pt-3 border-t border-jazz/10 text-xs font-medium text-corona hover:text-primary-hover transition-colors w-full">
                        <RiRestaurantLine size={13} />
                        {showFoods ? 'Hide' : 'Show'} {totalFoods} food item{totalFoods !== 1 ? 's' : ''}
                        <RiArrowDownSLine size={14} style={{ transform: showFoods ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </button>
                ) : (
                    <p className="text-xs text-jazz/50 mt-2 pt-2 border-t border-jazz/10 italic">No food items stored for this recall.</p>
                )}
            </div>

            {showFoods && (
                <div className="border-t border-jazz/10 bg-white px-3 pb-3 space-y-3 animate-fade-in">
                    {Object.entries(byMeal).map(([mealKey, foods]) => (
                        <div key={mealKey}>
                            <p className="text-[10px] font-bold text-jazz uppercase tracking-widest mt-3 mb-1.5 px-1">
                                {MEAL_LABELS[mealKey] || mealKey}
                            </p>
                            {foods.map(food => (
                                <div key={food.id} className="flex items-start gap-3 bg-whiteout rounded-lg px-3 py-2.5 mb-1 border border-jazz/10">
                                    <RiRestaurantLine className="text-jazz flex-shrink-0 mt-0.5" size={13} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-steel font-medium leading-snug">{food.food_description}</p>
                                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                                            <span className="text-[11px] text-jazz">{food.quantity_grams}g</span>
                                            {food.calories != null && <span className="text-[11px] text-jazz">{food.calories.toFixed(0)} kcal</span>}
                                            {food.carbs_g != null && <span className="text-[11px] text-jazz">Carbs {food.carbs_g.toFixed(1)}g</span>}
                                            {food.protein_g != null && <span className="text-[11px] text-jazz">Protein {food.protein_g.toFixed(1)}g</span>}
                                            {food.fat_g != null && <span className="text-[11px] text-jazz">Fat {food.fat_g.toFixed(1)}g</span>}
                                            {food.meal_time && <span className="text-[11px] text-jazz">{food.meal_time.slice(0, 5)}</span>}
                                        </div>
                                    </div>
                                    {food.is_ultra_processed && (
                                        <span className="text-[10px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full flex-shrink-0">Processed</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}