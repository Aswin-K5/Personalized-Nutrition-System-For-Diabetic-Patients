import { useEffect, useState } from 'react'
import { patientApi } from '../api/patient'
import { dietaryApi } from '../api/dietary'
import { Card, Spinner, StatCard } from '../components/ui'
import { RiArrowRightUpLine, RiArrowRightDownLine, RiLineChartLine, RiArrowUpLine, RiArrowDownLine } from 'react-icons/ri'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function Progress() {
    const [profile, setProfile] = useState(null)
    const [recalls, setRecalls] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.allSettled([
            patientApi.getProfile(),
            dietaryApi.listRecalls(),
        ]).then(([p, r]) => {
            if (p.status === 'fulfilled') setProfile(p.value.data)
            if (r.status === 'fulfilled') setRecalls(r.value.data?.items || r.value.data || [])
        }).finally(() => setLoading(false))
    }, [])

    if (loading) return <Spinner size={28} />

    // Sort recalls by date
    const sortedRecalls = [...recalls].sort((a, b) =>
        new Date(a.recall_date) - new Date(b.recall_date)
    )

    // Prepare chart data
    const qualityData = sortedRecalls.filter(r => r.diet_quality_score != null).map(r => ({
        date: new Date(r.recall_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        score: r.diet_quality_score,
    }))

    const calorieData = sortedRecalls.filter(r => r.total_calories != null).map(r => ({
        date: new Date(r.recall_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        calories: r.total_calories,
    }))

    const upfData = sortedRecalls.filter(r => r.ultra_processed_percent != null).map(r => ({
        date: new Date(r.recall_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        upf: r.ultra_processed_percent,
    }))

    // Calculate improvements
    const firstRecall = sortedRecalls[0]
    const latestRecall = sortedRecalls[sortedRecalls.length - 1]

    const qualityImprovement = latestRecall && firstRecall && latestRecall.diet_quality_score && firstRecall.diet_quality_score
        ? ((latestRecall.diet_quality_score - firstRecall.diet_quality_score) / firstRecall.diet_quality_score * 100).toFixed(1)
        : null

    const upfReduction = latestRecall && firstRecall && latestRecall.ultra_processed_percent != null && firstRecall.ultra_processed_percent != null
        ? ((firstRecall.ultra_processed_percent - latestRecall.ultra_processed_percent) / firstRecall.ultra_processed_percent * 100).toFixed(1)
        : null

    const CHART_TOOLTIP = {
        contentStyle: { borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, background: '#fff' },
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="page-title">Progress Tracking</h1>
                <p className="text-sm text-jazz mt-1">
                    Track your health journey over time — see improvements in diet quality, calories, and inflammation
                </p>
            </div>

            {/* Summary stats */}
            {profile && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Current BMI" value={profile.bmi?.toFixed(1)} unit="kg/m²" color="purple"
                        trend={profile.bmi_category} />
                    <StatCard label="Fasting Glucose" value={profile.fasting_glucose_mg_dl?.toFixed(0)} unit="mg/dL" color="amber"
                        trend={profile.fasting_glucose_mg_dl >= 126 ? '⚠ Diabetic' : profile.fasting_glucose_mg_dl >= 100 ? '⚠ Prediabetes' : '✓ Normal'} />
                    <StatCard label="Total Recalls" value={recalls.length} color="green" />
                    <StatCard label="Risk Level" value={profile.metabolic_risk_category} color="red" />
                </div>
            )}

            {/* Progress cards */}
            {qualityImprovement != null && upfReduction != null && (
                <div className="grid sm:grid-cols-2 gap-4">
                    <Card className="bg-emerald-50 border-emerald-200">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-emerald-700 font-medium">Diet Quality Improvement</p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-3xl font-display text-emerald-600">{Math.abs(qualityImprovement)}%</span>
                                    {qualityImprovement > 0 ? (
                                        <RiArrowUpLine className="text-emerald-500" size={20} />
                                    ) : (
                                        <RiArrowDownLine className="text-red-500" size={20} />
                                    )}
                                </div>
                                <p className="text-xs text-emerald-600 mt-1">
                                    From {firstRecall?.diet_quality_score?.toFixed(0)} to {latestRecall?.diet_quality_score?.toFixed(0)}/100
                                </p>
                            </div>
                            <RiArrowRightUpLine className="text-emerald-400" size={32} />
                        </div>
                    </Card>

                    <Card className="bg-blue-50 border-blue-200">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-blue-700 font-medium">Processed Food Reduction</p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-3xl font-display text-blue-600">{Math.abs(upfReduction) || '0.0'}%</span>
                                    {upfReduction > 0 ? (
                                        <RiArrowRightDownLine className="text-blue-500" size={20} />
                                    ) : (
                                        <RiArrowRightUpLine className="text-red-500" size={20} />
                                    )}
                                </div>
                                <p className="text-xs text-blue-600 mt-1">
                                    From {firstRecall?.ultra_processed_percent?.toFixed(1)}% to {latestRecall?.ultra_processed_percent?.toFixed(1)}%
                                </p>
                            </div>
                            <RiArrowRightDownLine className="text-blue-400" size={32} />
                        </div>
                    </Card>
                </div>
            )}

            {/* Charts */}
            {sortedRecalls.length === 0 ? (
                <Card className="text-center py-12">
                    <RiLineChartLine className="mx-auto text-jazz mb-3" size={32} />
                    <p className="font-semibold text-night">No dietary data yet</p>
                    <p className="text-sm text-jazz mt-1">Log your first dietary recall to start tracking progress</p>
                </Card>
            ) : (
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Diet quality trend */}
                    {qualityData.length > 0 && (
                        <Card>
                            <h3 className="font-semibold text-steel mb-4">Diet Quality Score Over Time</h3>
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={qualityData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                                    <Tooltip {...CHART_TOOLTIP} />
                                    <Line type="monotone" dataKey="score" name="Quality Score" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </Card>
                    )}

                    {/* Calorie trend */}
                    {calorieData.length > 0 && (
                        <Card>
                            <h3 className="font-semibold text-steel mb-4">Daily Calorie Intake</h3>
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={calorieData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip {...CHART_TOOLTIP} />
                                    <Line type="monotone" dataKey="calories" name="Calories" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </Card>
                    )}

                    {/* Ultra-processed food trend */}
                    {upfData.length > 0 && (
                        <Card>
                            <h3 className="font-semibold text-steel mb-4">Processed Food Percentage</h3>
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={upfData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                                    <Tooltip {...CHART_TOOLTIP} />
                                    <Line type="monotone" dataKey="upf" name="UPF %" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </Card>
                    )}
                </div>
            )}
        </div>
    )
}