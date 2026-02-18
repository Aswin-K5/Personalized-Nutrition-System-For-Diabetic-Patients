import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { researchApi } from '../api/research'
import { useAuthStore } from '../stores/authStore'
import { Card, StatCard, Spinner } from '../components/ui'
import {
    RiGroupLine, RiHeartPulseLine, RiRestaurantLine, RiBarChart2Line,
    RiArrowRightLine, RiAlertLine, RiFileListLine, RiDownloadLine,
} from 'react-icons/ri'
import toast from 'react-hot-toast'

export default function InvestigatorDashboard() {
    const { user } = useAuthStore()
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)

    useEffect(() => {
        researchApi.getStats()
            .then(res => setStats(res.data))
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    const quickExport = async () => {
        setExporting(true)
        try {
            const res = await researchApi.exportPatients()
            const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
            const a = document.createElement('a')
            a.href = url
            a.download = `patient-data-${new Date().toISOString().slice(0, 10)}.csv`
            a.click()
            URL.revokeObjectURL(url)
            toast.success('CSV downloaded')
        } catch { toast.error('Export failed — no data available yet') }
        finally { setExporting(false) }
    }

    if (loading) return <Spinner size={28} />

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="page-title">Research Overview</h1>
                <p className="text-sm text-jazz mt-1">
                    Welcome, <span className="text-steel font-medium">{user?.full_name}</span> —
                    monitoring population dietary health across enrolled patients
                </p>
            </div>

            {/* What investigators can do */}
            <Card className="bg-luscious/5 border-luscious/20">
                <p className="font-semibold text-steel mb-3">What you can do as an Investigator</p>
                <div className="grid sm:grid-cols-2 gap-3 text-sm text-jazz">
                    {[
                        { icon: '👥', text: 'View all enrolled patients and their full clinical profiles' },
                        { icon: '🍽️', text: 'See every patient\'s dietary recalls with individual food items grouped by meal' },
                        { icon: '📋', text: 'Write clinical observation notes on any patient\'s record' },
                        { icon: '🚩', text: 'Flag patients for follow-up (Follow-up / Urgent / Resolved)' },
                        { icon: '📊', text: 'View population-level risk distribution and dietary quality charts' },
                        { icon: '📥', text: 'Export anonymised patient data and dietary time-series as CSV for SPSS/R' },
                    ].map(({ icon, text }) => (
                        <div key={text} className="flex items-start gap-2.5">
                            <span className="flex-shrink-0 mt-0.5">{icon}</span>
                            <span className="leading-relaxed">{text}</span>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Stats — no ML references */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard label="Enrolled Patients" value={stats?.total_patients ?? '—'} icon={RiGroupLine} color="purple" />
                <StatCard label="Dietary Recalls" value={stats?.total_recalls ?? '—'} icon={RiRestaurantLine} color="amber" />
                <StatCard label="Plans Generated" value={stats?.total_plans ?? '—'} icon={RiHeartPulseLine} color="green" />
            </div>

            {/* Quick actions */}
            <div>
                <h2 className="font-semibold text-steel text-sm uppercase tracking-wide mb-4">Quick Actions</h2>
                <div className="grid sm:grid-cols-3 gap-4">
                    <Link to="/investigator/patients"
                        className="card hover:shadow-card-md hover:border-corona/30 transition-all group flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-primary-light text-corona flex-shrink-0">
                            <RiGroupLine size={22} />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-steel mb-1">Patient Registry</p>
                            <p className="text-sm text-jazz">View, note, and flag patients</p>
                        </div>
                        <RiArrowRightLine className="text-jazz group-hover:text-corona transition-colors flex-shrink-0 mt-1" size={18} />
                    </Link>

                    <Link to="/investigator/analytics"
                        className="card hover:shadow-card-md hover:border-corona/30 transition-all group flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600 flex-shrink-0">
                            <RiBarChart2Line size={22} />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-steel mb-1">Analytics</p>
                            <p className="text-sm text-jazz">Charts and population trends</p>
                        </div>
                        <RiArrowRightLine className="text-jazz group-hover:text-corona transition-colors flex-shrink-0 mt-1" size={18} />
                    </Link>

                    <button onClick={quickExport} disabled={exporting}
                        className="card hover:shadow-card-md hover:border-corona/30 transition-all group flex items-start gap-4 text-left w-full">
                        <div className="p-3 rounded-xl bg-amber-100 text-amber-600 flex-shrink-0">
                            <RiDownloadLine size={22} />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-steel mb-1">Quick Export</p>
                            <p className="text-sm text-jazz">{exporting ? 'Preparing…' : 'Download patient CSV now'}</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* Population averages */}
            {stats && (
                <Card>
                    <h3 className="font-semibold text-steel mb-5">Population Clinical Averages</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                        {[
                            { label: 'Avg BMI', value: stats.avg_bmi?.toFixed(1), unit: 'kg/m²' },
                            { label: 'Avg Fasting Glucose', value: stats.avg_fasting_glucose?.toFixed(1), unit: 'mg/dL' },
                            { label: 'Avg Triglycerides', value: stats.avg_triglycerides?.toFixed(1), unit: 'mg/dL' },
                            { label: 'Avg HDL', value: stats.avg_hdl?.toFixed(1), unit: 'mg/dL' },
                            { label: 'Avg Daily Calories', value: stats.avg_total_calories?.toFixed(0), unit: 'kcal' },
                            { label: 'Avg Fibre Intake', value: stats.avg_fiber_g?.toFixed(1), unit: 'g/day' },
                            { label: 'Avg Diet Quality', value: stats.avg_diet_quality_score?.toFixed(1), unit: '/100' },
                            { label: 'Avg Processed Food', value: stats.avg_ultra_processed_percent?.toFixed(1), unit: '%' },
                        ].map(({ label, value, unit }) => (
                            <div key={label}>
                                <p className="stat-label">{label}</p>
                                <p className="font-display text-2xl text-steel mt-1">
                                    {value ?? '—'}
                                    <span className="text-sm font-body text-jazz ml-1">{unit}</span>
                                </p>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {!stats && (
                <Card className="text-center py-12">
                    <RiAlertLine className="mx-auto text-jazz mb-3" size={28} />
                    <p className="font-semibold text-night">No population data yet</p>
                    <p className="text-sm text-jazz mt-1">Data appears here as patients enrol and submit their profiles.</p>
                </Card>
            )}
        </div>
    )
}