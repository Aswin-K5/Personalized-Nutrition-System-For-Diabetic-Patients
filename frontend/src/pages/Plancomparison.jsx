import { useEffect, useState } from 'react'
import { dietPlanApi } from '../api/dietplan'
import { Card, Spinner, Badge, EmptyState } from '../components/ui'
import { RiCompasses2Line, RiArrowRightLine } from 'react-icons/ri'
import clsx from 'clsx'

export default function PlanComparison() {
    const [plans, setPlans] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedOld, setSelectedOld] = useState(null)
    const [selectedNew, setSelectedNew] = useState(null)

    useEffect(() => {
        dietPlanApi.history()
            .then(res => {
                const items = res.data?.items || res.data || []
                setPlans(items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
                if (items.length >= 2) {
                    setSelectedNew(items[0])
                    setSelectedOld(items[1])
                }
            })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <Spinner size={28} />

    if (plans.length < 2) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div>
                    <h1 className="page-title">Compare Diet Plans</h1>
                    <p className="text-sm text-jazz mt-1">View side-by-side comparison of your old and new diet plans</p>
                </div>
                <EmptyState
                    icon={RiCompasses2Line}
                    title="Not enough plans to compare"
                    description="You need at least 2 diet plans to use comparison. Generate more plans as your health data updates."
                />
            </div>
        )
    }

    const MODULE_LABELS = [
        { key: 'low_gi_plan', label: 'Low Glycaemic', color: 'bg-blue-100 text-blue-700' },
        { key: 'anti_inflammatory_diet', label: 'Anti-Inflammatory', color: 'bg-emerald-100 text-emerald-700' },
        { key: 'time_restricted_eating', label: 'Timed Eating', color: 'bg-purple-100 text-purple-700' },
        { key: 'calorie_deficit_plan', label: 'Calorie Deficit', color: 'bg-amber-100 text-amber-700' },
        { key: 'omega3_emphasis', label: 'Omega-3', color: 'bg-cyan-100 text-cyan-700' },
        { key: 'mufa_emphasis', label: 'Healthy Fats', color: 'bg-lime-100 text-lime-700' },
        { key: 'soluble_fiber_emphasis', label: 'Soluble Fibre', color: 'bg-orange-100 text-orange-700' },
        { key: 'portion_control', label: 'Portion Control', color: 'bg-pink-100 text-pink-700' },
        { key: 'carb_distribution', label: 'Carb Distribution', color: 'bg-indigo-100 text-indigo-700' },
    ]

    const getActiveModules = (plan) => MODULE_LABELS.filter(m => plan?.[m.key])
    const oldModules = getActiveModules(selectedOld)
    const newModules = getActiveModules(selectedNew)

    const addedModules = newModules.filter(m => !oldModules.find(o => o.key === m.key))
    const removedModules = oldModules.filter(m => !newModules.find(n => n.key === m.key))
    const unchangedModules = newModules.filter(m => oldModules.find(o => o.key === m.key))

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="page-title">Compare Diet Plans</h1>
                <p className="text-sm text-jazz mt-1">
                    See what changed between your plans and understand why strategies were added or removed
                </p>
            </div>

            {/* Plan selectors */}
            <div className="grid sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-jazz uppercase tracking-wide mb-2">Old Plan</label>
                    <select value={selectedOld?.id || ''} onChange={e => setSelectedOld(plans.find(p => p.id == e.target.value))}
                        className="input-base w-full">
                        {plans.map(p => (
                            <option key={p.id} value={p.id}>
                                {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-jazz uppercase tracking-wide mb-2">New Plan</label>
                    <select value={selectedNew?.id || ''} onChange={e => setSelectedNew(plans.find(p => p.id == e.target.value))}
                        className="input-base w-full">
                        {plans.map(p => (
                            <option key={p.id} value={p.id}>
                                {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Changes summary */}
            {(addedModules.length > 0 || removedModules.length > 0) && (
                <div className="grid sm:grid-cols-2 gap-4">
                    {addedModules.length > 0 && (
                        <Card className="bg-emerald-50 border-emerald-200">
                            <p className="text-sm font-semibold text-emerald-700 mb-3">✓ Added Strategies ({addedModules.length})</p>
                            <div className="flex flex-wrap gap-1.5">
                                {addedModules.map(m => (
                                    <Badge key={m.key} className={clsx('text-[11px]', m.color)}>{m.label}</Badge>
                                ))}
                            </div>
                        </Card>
                    )}
                    {removedModules.length > 0 && (
                        <Card className="bg-red-50 border-red-200">
                            <p className="text-sm font-semibold text-red-700 mb-3">✗ Removed Strategies ({removedModules.length})</p>
                            <div className="flex flex-wrap gap-1.5">
                                {removedModules.map(m => (
                                    <Badge key={m.key} className={clsx('text-[11px]', m.color)}>{m.label}</Badge>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {/* Side-by-side comparison */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Old plan */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-steel">Old Plan</h3>
                        <span className="text-xs text-jazz">
                            {selectedOld && new Date(selectedOld.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                    </div>
                    {selectedOld && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Calories', value: selectedOld.target_calories?.toFixed(0), unit: 'kcal/day' },
                                    { label: 'Carbs', value: selectedOld.target_carb_percent?.toFixed(0), unit: '%' },
                                    { label: 'Protein', value: selectedOld.target_protein_percent?.toFixed(0), unit: '%' },
                                    { label: 'Fat', value: selectedOld.target_fat_percent?.toFixed(0), unit: '%' },
                                ].map(({ label, value, unit }) => (
                                    <div key={label} className="bg-whiteout rounded-lg p-2.5">
                                        <p className="text-[10px] text-jazz uppercase tracking-wide">{label}</p>
                                        <p className="text-sm font-semibold text-steel mt-0.5">
                                            {value} <span className="text-[10px] text-jazz">{unit}</span>
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-jazz uppercase tracking-wide mb-2">Active Strategies</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {oldModules.map(m => (
                                        <Badge key={m.key} className={clsx('text-[11px]', m.color)}>{m.label}</Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </Card>

                {/* New plan */}
                <Card className="ring-2 ring-corona">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-steel">New Plan (Current)</h3>
                        <span className="text-xs text-jazz">
                            {selectedNew && new Date(selectedNew.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                    </div>
                    {selectedNew && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Calories', value: selectedNew.target_calories?.toFixed(0), unit: 'kcal/day' },
                                    { label: 'Carbs', value: selectedNew.target_carb_percent?.toFixed(0), unit: '%' },
                                    { label: 'Protein', value: selectedNew.target_protein_percent?.toFixed(0), unit: '%' },
                                    { label: 'Fat', value: selectedNew.target_fat_percent?.toFixed(0), unit: '%' },
                                ].map(({ label, value, unit }) => (
                                    <div key={label} className="bg-whiteout rounded-lg p-2.5">
                                        <p className="text-[10px] text-jazz uppercase tracking-wide">{label}</p>
                                        <p className="text-sm font-semibold text-steel mt-0.5">
                                            {value} <span className="text-[10px] text-jazz">{unit}</span>
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-jazz uppercase tracking-wide mb-2">Active Strategies</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {newModules.map(m => (
                                        <Badge key={m.key} className={clsx('text-[11px]', m.color)}>{m.label}</Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Why changes happened */}
            {(addedModules.length > 0 || removedModules.length > 0) && (
                <Card className="bg-blue-50 border-blue-200">
                    <h3 className="font-semibold text-blue-700 mb-3">Why Did This Change?</h3>
                    <div className="space-y-2 text-sm text-blue-900">
                        {addedModules.length > 0 && (
                            <p>
                                <strong>New strategies added:</strong> Your latest clinical data or dietary recall triggered additional rules.
                                For example, if your recent recall showed high processed food intake, an anti-inflammatory strategy was added.
                            </p>
                        )}
                        {removedModules.length > 0 && (
                            <p>
                                <strong>Strategies removed:</strong> You've improved in certain areas! When your health markers improve
                                (e.g., triglycerides drop below 150 mg/dL), the corresponding dietary emphasis is no longer needed.
                            </p>
                        )}
                        <p className="text-xs text-blue-700 mt-3">
                            💡 Tip: Compare plans regularly to see your progress and understand how your health changes affect your dietary needs.
                        </p>
                    </div>
                </Card>
            )}
        </div>
    )
}