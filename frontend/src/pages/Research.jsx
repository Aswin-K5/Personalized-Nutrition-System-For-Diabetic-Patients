import { useEffect, useState } from 'react'
import { researchApi } from '../api/research'
import { Card, StatCard, SectionTitle, Badge, Spinner } from '../components/ui'
import toast from 'react-hot-toast'
import {
    RiBarChart2Line, RiDownloadLine, RiRobot2Line,
    RiGroupLine, RiHeartPulseLine, RiTestTubeLine, RiFireLine,
} from 'react-icons/ri'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const DIS_COLORS = { 'Anti-inflammatory': '#10b981', 'Neutral': '#86819E', 'Pro-inflammatory': '#ef4444' }
const RISK_COLORS = { 'Low Risk': '#10b981', 'Mild': '#f59e0b', 'Moderate': '#f97316', 'Severe': '#ef4444' }
const PLAN_COLORS = ['#594BA0', '#86819E', '#625D73', '#41394F', '#261F32']

export default function Research() {
    const [stats, setStats] = useState(null)
    const [mlPerf, setMlPerf] = useState(null)
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(null)

    useEffect(() => {
        Promise.allSettled([
            researchApi.getStats(),
            researchApi.getModelPerformance(),
        ]).then(([s, m]) => {
            if (s.status === 'fulfilled') setStats(s.value.data)
            if (m.status === 'fulfilled') setMlPerf(m.value.data)
        }).finally(() => setLoading(false))
    }, [])

    const exportCSV = async (type) => {
        setExporting(type)
        try {
            const res = type === 'patients'
                ? await researchApi.exportPatients()
                : await researchApi.exportTimeseries()
            const url = URL.createObjectURL(new Blob([res.data]))
            const a = document.createElement('a')
            a.href = url; a.download = `${type}-export.csv`; a.click()
            URL.revokeObjectURL(url)
            toast.success('CSV downloaded')
        } catch { toast.error('Export failed') }
        finally { setExporting(null) }
    }

    if (loading) return <Spinner size={28} />
    if (!stats) return <div className="text-jazz p-8 text-center">No research data available yet.</div>

    // Chart data prep
    const riskData = Object.entries(stats.risk_distribution || {}).map(([name, value]) => ({ name, value }))
    const disData = Object.entries(stats.dis_distribution || {}).map(([name, value]) => ({ name, value }))
    const planData = Object.entries(stats.plan_source_distribution || {}).map(([name, value]) => ({ name: name.replace('_', ' '), value }))

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h1 className="page-title">Research Dashboard</h1>
                    <p className="text-sm text-jazz mt-1">Population-level analytics · Investigator access only</p>
                </div>
                <div className="flex gap-3 flex-wrap">
                    <button onClick={() => exportCSV('patients')} disabled={exporting === 'patients'}
                        className="btn-secondary text-xs flex items-center gap-2">
                        <RiDownloadLine size={14} />
                        {exporting === 'patients' ? 'Exporting…' : 'Patient CSV (SPSS/R)'}
                    </button>
                    <button onClick={() => exportCSV('timeseries')} disabled={exporting === 'timeseries'}
                        className="btn-secondary text-xs flex items-center gap-2">
                        <RiDownloadLine size={14} />
                        {exporting === 'timeseries' ? 'Exporting…' : 'Time-Series CSV'}
                    </button>
                </div>
            </div>

            {/* Top metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Total Patients" value={stats.total_patients} icon={RiGroupLine} color="purple" />
                <StatCard label="Dietary Recalls" value={stats.total_recalls} icon={RiFireLine} color="amber" />
                <StatCard label="Plans Generated" value={stats.total_plans} icon={RiHeartPulseLine} color="green" />
                <StatCard label="ML Models Ready" value={stats.ml_model_ready ? 'Yes' : 'No'} icon={RiRobot2Line} color={stats.ml_model_ready ? 'green' : 'red'} />
            </div>

            {/* Average clinical markers */}
            <Card>
                <SectionTitle>Average Clinical Markers (Population)</SectionTitle>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    {[
                        { label: 'Avg BMI', value: stats.avg_bmi?.toFixed(1), unit: 'kg/m²' },
                        { label: 'Avg Fasting Glucose', value: stats.avg_fasting_glucose?.toFixed(1), unit: 'mg/dL' },
                        { label: 'Avg Triglycerides', value: stats.avg_triglycerides?.toFixed(1), unit: 'mg/dL' },
                        { label: 'Avg HDL', value: stats.avg_hdl?.toFixed(1), unit: 'mg/dL' },
                        { label: 'Avg Total Calories', value: stats.avg_total_calories?.toFixed(0), unit: 'kcal' },
                        { label: 'Avg Fiber', value: stats.avg_fiber_g?.toFixed(1), unit: 'g/day' },
                        { label: 'Avg Diet Quality', value: stats.avg_diet_quality_score?.toFixed(1), unit: '/100' },
                        { label: 'Avg UPF %', value: stats.avg_ultra_processed_percent?.toFixed(1), unit: '%' },
                    ].map(({ label, value, unit }) => (
                        <div key={label}>
                            <p className="stat-label">{label}</p>
                            <p className="font-display text-2xl text-steel">{value ?? '—'}
                                <span className="text-sm font-body text-jazz ml-1">{unit}</span>
                            </p>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Charts row */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Risk distribution */}
                <Card>
                    <SectionTitle>Risk Distribution</SectionTitle>
                    {riskData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                                    {riskData.map((entry) => (
                                        <Cell key={entry.name} fill={RISK_COLORS[entry.name] || '#86819E'} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <p className="text-jazz text-sm py-8 text-center">No data yet</p>}
                </Card>

                {/* DIS distribution */}
                <Card>
                    <SectionTitle>Dietary Inflammatory Score</SectionTitle>
                    {disData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={disData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#86819E' }} />
                                <YAxis tick={{ fontSize: 11, fill: '#86819E' }} />
                                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                    {disData.map((entry) => (
                                        <Cell key={entry.name} fill={DIS_COLORS[entry.name] || '#86819E'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <p className="text-jazz text-sm py-8 text-center">No data yet</p>}
                </Card>

                {/* Plan source breakdown */}
                <Card>
                    <SectionTitle>Plans by Source</SectionTitle>
                    {planData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={planData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#86819E' }} />
                                <YAxis tick={{ fontSize: 11, fill: '#86819E' }} />
                                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                                <Bar dataKey="value" fill="#594BA0" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <p className="text-jazz text-sm py-8 text-center">No data yet</p>}
                </Card>
            </div>

            {/* ML model performance */}
            {mlPerf && (
                <Card>
                    <SectionTitle>ML Model Performance</SectionTitle>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                        <div>
                            <p className="stat-label">Risk Model</p>
                            <p className="font-display text-2xl text-steel">{mlPerf.risk_model_loaded ? 'Loaded' : 'Not Loaded'}</p>
                        </div>
                        <div>
                            <p className="stat-label">Plan Model</p>
                            <p className="font-display text-2xl text-steel">{mlPerf.plan_model_loaded ? 'Loaded' : 'Not Loaded'}</p>
                        </div>
                        <div>
                            <p className="stat-label">ML Plans Generated</p>
                            <p className="font-display text-2xl text-steel">{mlPerf.ml_plans_generated ?? '—'}</p>
                        </div>
                        <div>
                            <p className="stat-label">Avg Confidence</p>
                            <p className="font-display text-2xl text-steel">
                                {mlPerf.avg_ml_confidence ? `${(mlPerf.avg_ml_confidence * 100).toFixed(1)}%` : '—'}
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Export info box */}
            <Card className="bg-primary-light border-corona/20">
                <div className="flex items-start gap-4">
                    <RiDownloadLine className="text-corona flex-shrink-0 mt-1" size={20} />
                    <div>
                        <p className="font-semibold text-corona mb-1">SPSS & R Compatible Exports</p>
                        <p className="text-sm text-luscious leading-relaxed">
                            <strong>Patient CSV</strong> includes all clinical, anthropometric and latest dietary variables per patient.
                            <strong> Time-Series CSV</strong> provides longitudinal dietary data ready for repeated-measures analysis.
                            Both files use consistent column naming compatible with SPSS and R import workflows.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    )
}