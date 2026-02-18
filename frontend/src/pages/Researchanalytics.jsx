import { useEffect, useState } from 'react'
import { researchApi } from '../api/research'
import { Card, Spinner, StatCard } from '../components/ui'
import toast from 'react-hot-toast'
import { RiDownloadLine, RiBarChart2Line, RiFileLine, RiAlertLine } from 'react-icons/ri'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
} from 'recharts'

const RISK_COLORS = { 'Low Risk': '#10b981', Mild: '#f59e0b', Moderate: '#f97316', Severe: '#ef4444' }
const DIS_COLORS = { 'Anti-inflammatory': '#10b981', Neutral: '#86819E', 'Pro-inflammatory': '#ef4444' }
const TOOLTIP_STYLE = {
    contentStyle: { borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, background: '#fff' },
}

export default function ResearchAnalytics() {
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(null)

    useEffect(() => {
        researchApi.getStats()
            .then(res => setStats(res.data))
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    const exportCSV = async (type) => {
        setExporting(type)
        try {
            const res = type === 'patients'
                ? await researchApi.exportPatients()
                : await researchApi.exportTimeseries()
            const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
            const a = document.createElement('a')
            a.href = url
            a.download = `${type === 'patients' ? 'patient-clinical-data' : 'dietary-timeseries'}-${new Date().toISOString().slice(0, 10)}.csv`
            a.click()
            URL.revokeObjectURL(url)
            toast.success('CSV downloaded successfully')
        } catch { toast.error('Export failed. Make sure there is data to export.') }
        finally { setExporting(null) }
    }

    if (loading) return <Spinner size={28} />

    const riskData = Object.entries(stats?.risk_distribution || {}).map(([name, value]) => ({ name, value }))
    const disData = Object.entries(stats?.dis_distribution || {}).map(([name, value]) => ({ name, value }))

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="page-title">Analytics & Export</h1>
                <p className="text-sm text-jazz mt-1">Population-level charts and CSV exports for research analysis</p>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <StatCard label="Total Patients" value={stats?.total_patients ?? '—'} color="purple" />
                <StatCard label="Total Recalls" value={stats?.total_recalls ?? '—'} color="amber" />
                <StatCard label="Plans Generated" value={stats?.total_plans ?? '—'} color="green" />
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-6">

                {/* Metabolic Risk Distribution */}
                <Card>
                    <h3 className="font-semibold text-steel mb-5">Metabolic Risk Distribution</h3>
                    {riskData.length === 0 ? (
                        <div className="flex items-center justify-center h-48 text-jazz/50 text-sm italic">No data yet</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={riskData} dataKey="value" nameKey="name"
                                    cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}
                                    labelLine={false}>
                                    {riskData.map(({ name }) => (
                                        <Cell key={name} fill={RISK_COLORS[name] || '#86819E'} />
                                    ))}
                                </Pie>
                                <Tooltip {...TOOLTIP_STYLE} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </Card>

                {/* Diet Quality Distribution */}
                <Card>
                    <h3 className="font-semibold text-steel mb-5">Dietary Inflammation Profile</h3>
                    {disData.length === 0 ? (
                        <div className="flex items-center justify-center h-48 text-jazz/50 text-sm italic">No data yet</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={disData} barCategoryGap="30%">
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                <Tooltip {...TOOLTIP_STYLE} />
                                <Bar dataKey="value" name="Patients" radius={[6, 6, 0, 0]}>
                                    {disData.map(({ name }) => (
                                        <Cell key={name} fill={DIS_COLORS[name] || '#86819E'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </Card>
            </div>

            {/* Population dietary averages */}
            {stats && (
                <Card>
                    <h3 className="font-semibold text-steel mb-5">Population Dietary Averages</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                        {[
                            { label: 'Daily Calories', value: stats.avg_total_calories?.toFixed(0), unit: 'kcal' },
                            { label: 'Fibre Intake', value: stats.avg_fiber_g?.toFixed(1), unit: 'g/day' },
                            { label: 'Sodium', value: stats.avg_sodium_mg?.toFixed(0), unit: 'mg/day' },
                            { label: 'Processed Food', value: stats.avg_ultra_processed_percent?.toFixed(1), unit: '% of calories' },
                            { label: 'Omega-3', value: stats.avg_omega3_g?.toFixed(2), unit: 'g/day' },
                            { label: 'Glycaemic Load', value: stats.avg_glycemic_load?.toFixed(1), unit: '/day' },
                            { label: 'Fruit & Veg', value: stats.avg_fruit_veg_servings?.toFixed(1), unit: 'servings/day' },
                            { label: 'Added Sugar', value: stats.avg_added_sugar_g?.toFixed(1), unit: 'g/day' },
                            { label: 'Diet Quality Score', value: stats.avg_diet_quality_score?.toFixed(1), unit: '/100' },
                        ].map(({ label, value, unit }) => (
                            <div key={label}>
                                <p className="text-[10px] text-jazz uppercase tracking-wide">{label}</p>
                                <p className="font-semibold text-steel text-lg mt-0.5">
                                    {value ?? '—'}
                                    <span className="text-xs text-jazz font-normal ml-1">{unit}</span>
                                </p>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* CSV Exports */}
            <div>
                <h2 className="font-semibold text-steel text-sm uppercase tracking-wide mb-4">Export Data</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                    {[
                        {
                            type: 'patients',
                            title: 'Patient Clinical Dataset',
                            desc: 'One row per patient — all clinical, anthropometric, and latest dietary variables. SPSS & R compatible.',
                            cols: 'patient_id · age · sex · BMI · waist · blood pressure · fasting glucose · triglycerides · HDL · hs-CRP · risk score · calorie target · activity · sleep · smoking · latest dietary recall data',
                        },
                        {
                            type: 'timeseries',
                            title: 'Dietary Time-Series',
                            desc: 'One row per recall date per patient — longitudinal data for repeated-measures analysis.',
                            cols: 'patient_id · recall_date · total calories · carbs % · protein % · fat % · fibre · sodium · omega-3 · processed food % · glycaemic load · diet quality score · eating window',
                        },
                    ].map(({ type, title, desc, cols }) => (
                        <Card key={type} className="flex flex-col gap-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2.5 rounded-xl bg-primary-light text-corona flex-shrink-0">
                                    <RiFileLine size={18} />
                                </div>
                                <div>
                                    <p className="font-semibold text-steel">{title}</p>
                                    <p className="text-sm text-jazz mt-1 leading-relaxed">{desc}</p>
                                </div>
                            </div>
                            <div className="bg-whiteout rounded-xl p-3 border border-jazz/10">
                                <p className="text-[10px] text-jazz font-mono leading-relaxed">{cols}</p>
                            </div>
                            <button onClick={() => exportCSV(type)} disabled={!!exporting}
                                className="btn-primary flex items-center justify-center gap-2 text-sm py-2.5 disabled:opacity-60">
                                <RiDownloadLine size={16} />
                                {exporting === type ? 'Preparing download…' : `Download ${title} CSV`}
                            </button>
                        </Card>
                    ))}
                </div>
            </div>

            {!stats && (
                <Card className="text-center py-12">
                    <RiAlertLine className="mx-auto text-jazz mb-3" size={28} />
                    <p className="font-semibold text-night">No population data yet</p>
                    <p className="text-sm text-jazz mt-1">Charts will appear once patients enrol and submit data.</p>
                </Card>
            )}
        </div>
    )
}