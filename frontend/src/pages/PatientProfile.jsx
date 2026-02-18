import { useEffect, useState } from 'react'
import { patientApi } from '../api/patient'
import { Card, Button, Input, Select, StatCard, SectionTitle, RiskBadge, Spinner } from '../components/ui'
import toast from 'react-hot-toast'
import { RiUser3Line, RiHeartPulseLine, RiTestTubeLine, RiScales3Line, RiSaveLine, RiEditLine } from 'react-icons/ri'

const ACTIVITY_OPTS = ['sedentary', 'light', 'moderate', 'active', 'very_active']
const SMOKING_OPTS = ['never', 'former', 'current']

const defaultForm = {
    age: '', sex: 'male', weight_kg: '', height_cm: '',
    waist_circumference_cm: '', bp_systolic: '', bp_diastolic: '',
    fasting_glucose_mg_dl: '', triglycerides_mg_dl: '', hdl_cholesterol_mg_dl: '',
    hs_crp_mg_l: '', medications: '',
    activity_level: 'sedentary', sleep_duration_hours: '', smoking_status: 'never',
}

function toPayload(f) {
    const num = (v) => v === '' ? undefined : Number(v)
    return {
        age: Number(f.age), sex: f.sex,
        weight_kg: num(f.weight_kg), height_cm: num(f.height_cm),
        waist_circumference_cm: num(f.waist_circumference_cm),
        bp_systolic: num(f.bp_systolic), bp_diastolic: num(f.bp_diastolic),
        fasting_glucose_mg_dl: num(f.fasting_glucose_mg_dl),
        triglycerides_mg_dl: num(f.triglycerides_mg_dl),
        hdl_cholesterol_mg_dl: num(f.hdl_cholesterol_mg_dl),
        hs_crp_mg_l: num(f.hs_crp_mg_l),
        medications: f.medications ? f.medications.split(',').map(m => m.trim()).filter(Boolean) : [],
        activity_level: f.activity_level, sleep_duration_hours: num(f.sleep_duration_hours),
        smoking_status: f.smoking_status,
    }
}

function fromProfile(p) {
    return {
        age: p.age ?? '', sex: p.sex ?? 'male',
        weight_kg: p.weight_kg ?? '', height_cm: p.height_cm ?? '',
        waist_circumference_cm: p.waist_circumference_cm ?? '',
        bp_systolic: p.bp_systolic ?? '', bp_diastolic: p.bp_diastolic ?? '',
        fasting_glucose_mg_dl: p.fasting_glucose_mg_dl ?? '',
        triglycerides_mg_dl: p.triglycerides_mg_dl ?? '',
        hdl_cholesterol_mg_dl: p.hdl_cholesterol_mg_dl ?? '',
        hs_crp_mg_l: p.hs_crp_mg_l ?? '',
        medications: (p.medications || []).join(', '),
        activity_level: p.activity_level ?? 'sedentary',
        sleep_duration_hours: p.sleep_duration_hours ?? '',
        smoking_status: p.smoking_status ?? 'never',
    }
}

export default function PatientProfile() {
    const [form, setForm] = useState(defaultForm)
    const [summary, setSummary] = useState(null)
    const [hasProfile, setHasProfile] = useState(false)
    const [editing, setEditing] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

    useEffect(() => {
        patientApi.getProfile()
            .then(res => { setForm(fromProfile(res.data)); setHasProfile(true) })
            .catch(() => setEditing(true))
            .finally(() => {
                patientApi.getSummary().then(r => setSummary(r.data)).catch(() => { })
                setLoading(false)
            })
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.age || !form.weight_kg || !form.height_cm) { toast.error('Age, weight and height are required'); return }
        setSaving(true)
        try {
            const payload = toPayload(form)
            const res = hasProfile
                ? await patientApi.updateProfile(payload)
                : await patientApi.createProfile(payload)
            setHasProfile(true)
            setEditing(false)
            const s = await patientApi.getSummary()
            setSummary(s.data)
            toast.success('Profile saved successfully!')
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to save profile')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <Spinner size={28} />

    return (
        <div className="space-y-6 max-w-4xl animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title">Clinical Profile</h1>
                    <p className="text-sm text-jazz mt-1">Your anthropometric and lab data drives all recommendations</p>
                </div>
                {hasProfile && !editing && (
                    <Button variant="secondary" onClick={() => setEditing(true)}>
                        <RiEditLine size={15} /> Edit Profile
                    </Button>
                )}
            </div>

            {/* Summary metrics (read only) */}
            {summary && !editing && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard label="BMI" value={summary.bmi?.toFixed(1)} unit="kg/m²" icon={RiScales3Line} color="purple" trend={summary.bmi_category} />
                    <StatCard label="Waist-Height Ratio" value={summary.waist_height_ratio?.toFixed(3)} icon={RiUser3Line} color={summary.waist_height_ratio > 0.5 ? 'red' : 'green'} trend={summary.waist_height_ratio > 0.5 ? '⚠ Elevated' : '✓ Healthy'} />
                    <StatCard label="Risk Factors Met" value={`${summary.metabolic_syndrome_components}/5`} icon={RiHeartPulseLine} color={summary.metabolic_syndrome_present ? 'red' : 'green'} />
                    <StatCard label="Risk Category" value="" icon={RiTestTubeLine} color={riskColor(summary.metabolic_risk_category)}
                        trend={<RiskBadge category={summary.metabolic_risk_category} />} />
                </div>
            )}

            {/* Form */}
            {(editing || !hasProfile) && (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Demographics */}
                    <Card>
                        <SectionTitle icon={RiUser3Line}>Demographics</SectionTitle>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <Input label="Age (years)" type="number" min={18} max={120} value={form.age} onChange={e => set('age', e.target.value)} placeholder="45" />
                            <Select label="Sex" value={form.sex} onChange={e => set('sex', e.target.value)}>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </Select>
                            <Input label="Weight (kg)" type="number" step="0.1" value={form.weight_kg} onChange={e => set('weight_kg', e.target.value)} placeholder="75.0" />
                            <Input label="Height (cm)" type="number" step="0.1" value={form.height_cm} onChange={e => set('height_cm', e.target.value)} placeholder="170.0" />
                            <Input label="Waist Circumference (cm)" type="number" step="0.1" value={form.waist_circumference_cm} onChange={e => set('waist_circumference_cm', e.target.value)} placeholder="88.0" />
                        </div>
                    </Card>

                    {/* Vitals */}
                    <Card>
                        <SectionTitle>Blood Pressure</SectionTitle>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Systolic (mmHg)" type="number" value={form.bp_systolic} onChange={e => set('bp_systolic', e.target.value)} placeholder="120" />
                            <Input label="Diastolic (mmHg)" type="number" value={form.bp_diastolic} onChange={e => set('bp_diastolic', e.target.value)} placeholder="80" />
                        </div>
                    </Card>

                    {/* Labs */}
                    <Card>
                        <SectionTitle icon={RiTestTubeLine}>Laboratory Values</SectionTitle>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <Input label="Fasting Glucose (mg/dL)" type="number" step="0.1" value={form.fasting_glucose_mg_dl} onChange={e => set('fasting_glucose_mg_dl', e.target.value)} placeholder="95.0" hint="Normal: < 100" />
                            <Input label="Triglycerides (mg/dL)" type="number" step="0.1" value={form.triglycerides_mg_dl} onChange={e => set('triglycerides_mg_dl', e.target.value)} placeholder="120.0" hint="Normal: < 150" />
                            <Input label="HDL Cholesterol (mg/dL)" type="number" step="0.1" value={form.hdl_cholesterol_mg_dl} onChange={e => set('hdl_cholesterol_mg_dl', e.target.value)} placeholder="50.0" hint="M: > 40, F: > 50" />
                            <Input label="hs-CRP (mg/L)" type="number" step="0.01" value={form.hs_crp_mg_l} onChange={e => set('hs_crp_mg_l', e.target.value)} placeholder="1.5" hint="Optional — inflammation marker" />
                        </div>
                    </Card>

                    {/* Lifestyle */}
                    <Card>
                        <SectionTitle>Lifestyle</SectionTitle>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <Select label="Activity Level" value={form.activity_level} onChange={e => set('activity_level', e.target.value)}>
                                {ACTIVITY_OPTS.map(o => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
                            </Select>
                            <Select label="Smoking Status" value={form.smoking_status} onChange={e => set('smoking_status', e.target.value)}>
                                {SMOKING_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                            </Select>
                            <Input label="Sleep Duration (hrs/night)" type="number" step="0.5" value={form.sleep_duration_hours} onChange={e => set('sleep_duration_hours', e.target.value)} placeholder="7.0" />
                            <div className="col-span-full">
                                <Input label="Current Medications (comma-separated)" value={form.medications} onChange={e => set('medications', e.target.value)} placeholder="Metformin 500mg, Atorvastatin 20mg" />
                            </div>
                        </div>
                    </Card>

                    <div className="flex gap-3">
                        <Button type="submit" loading={saving}>
                            <RiSaveLine size={15} /> {hasProfile ? 'Save Changes' : 'Create Profile'}
                        </Button>
                        {hasProfile && (
                            <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
                        )}
                    </div>
                </form>
            )}

            {/* Read-only view when not editing */}
            {hasProfile && !editing && summary && (
                <Card>
                    <SectionTitle>Calorie Targets</SectionTitle>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div>
                            <p className="stat-label">Estimated Requirement</p>
                            <p className="stat-value">{summary.estimated_calorie_req?.toFixed(0)} <span className="text-sm font-body text-jazz">kcal/day</span></p>
                        </div>
                        {summary.calorie_deficit && (
                            <div>
                                <p className="stat-label">Recommended Target</p>
                                <p className="stat-value">{(summary.estimated_calorie_req - summary.calorie_deficit).toFixed(0)} <span className="text-sm font-body text-jazz">kcal/day</span></p>
                                <p className="text-xs text-jazz">{summary.calorie_deficit?.toFixed(0)} kcal deficit</p>
                            </div>
                        )}
                        <div>
                            <p className="stat-label">Risk Factor Summary</p>
                            <p className="font-semibold text-night mt-1">{summary.metabolic_syndrome_present ? '⚠️ Multiple risk factors present' : '✅ Risk factors within range'}</p>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    )
}

function riskColor(cat) {
    return { 'Low Risk': 'green', Mild: 'amber', Moderate: 'orange', Severe: 'red' }[cat] || 'purple'
}