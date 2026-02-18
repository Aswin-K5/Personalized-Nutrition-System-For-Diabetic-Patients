import { useEffect, useState } from 'react'
import { dietaryApi } from '../api/dietary'
import { Card, Button, SectionTitle, EmptyState, Spinner } from '../components/ui'
import toast from 'react-hot-toast'
import { RiFileListLine, RiSaveLine } from 'react-icons/ri'
import clsx from 'clsx'

const today = () => new Date().toISOString().split('T')[0]

const GROUPS = [
    {
        label: 'Protein Sources', fields: [
            { key: 'red_meat_servings_week', label: 'Red Meat', unit: 'servings/week', hint: 'Beef, lamb, pork' },
            { key: 'processed_meat_servings_week', label: 'Processed Meat', unit: 'servings/week', hint: 'Sausage, bacon, deli' },
            { key: 'fish_servings_week', label: 'Fish / Seafood', unit: 'servings/week', hint: 'Aim for ≥2 weekly' },
            { key: 'poultry_servings_week', label: 'Poultry', unit: 'servings/week', hint: 'Chicken, turkey' },
            { key: 'eggs_servings_week', label: 'Eggs', unit: 'servings/week' },
            { key: 'dairy_servings_week', label: 'Dairy', unit: 'servings/week', hint: 'Milk, yogurt, cheese' },
        ]
    },
    {
        label: 'Plant Foods', fields: [
            { key: 'legumes_servings_week', label: 'Legumes', unit: 'servings/week', hint: 'Lentils, chickpeas, beans' },
            { key: 'nuts_seeds_servings_week', label: 'Nuts & Seeds', unit: 'servings/week' },
            { key: 'whole_grains_servings_week', label: 'Whole Grains', unit: 'servings/week', hint: 'Oats, brown rice, quinoa' },
            { key: 'refined_grains_servings_week', label: 'Refined Grains', unit: 'servings/week', hint: 'White rice, bread, pasta' },
            { key: 'vegetables_servings_day', label: 'Vegetables', unit: 'servings/day', hint: 'Target ≥5' },
            { key: 'fruits_servings_day', label: 'Fruits', unit: 'servings/day', hint: 'Target ≥2' },
        ]
    },
    {
        label: 'Risk Foods', fields: [
            { key: 'fried_foods_servings_week', label: 'Fried Foods', unit: 'servings/week' },
            { key: 'sweets_servings_week', label: 'Sweets & Desserts', unit: 'servings/week' },
            { key: 'sugary_beverages_servings_day', label: 'Sugary Beverages', unit: 'servings/day', hint: 'Soda, juices, energy drinks' },
            { key: 'alcohol_servings_week', label: 'Alcohol', unit: 'servings/week' },
            { key: 'fast_food_servings_week', label: 'Fast Food', unit: 'servings/week' },
            { key: 'olive_oil_tbsp_day', label: 'Olive Oil', unit: 'tbsp/day', hint: 'Mediterranean staple' },
        ]
    },
]

const DEFAULT = Object.fromEntries(
    GROUPS.flatMap(g => g.fields).map(f => [f.key, 0])
)

export default function FFQ() {
    const [tab, setTab] = useState('form')
    const [form, setForm] = useState({ ...DEFAULT, assessment_date: today() })
    const [submissions, setSubmissions] = useState([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (tab === 'history') loadHistory()
    }, [tab])

    const loadHistory = async () => {
        setLoading(true)
        try {
            const res = await dietaryApi.listFFQ()
            setSubmissions(res.data?.items || res.data || [])
        } catch { toast.error('Could not load submissions') }
        finally { setLoading(false) }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const payload = { ...form }
            Object.keys(DEFAULT).forEach(k => { payload[k] = Number(payload[k]) || 0 })
            await dietaryApi.submitFFQ(payload)
            toast.success('FFQ submitted successfully!')
            setForm({ ...DEFAULT, assessment_date: today() })
            setTab('history'); loadHistory()
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to submit FFQ')
        } finally { setSaving(false) }
    }

    return (
        <div className="max-w-4xl space-y-6 animate-fade-in">
            <div>
                <h1 className="page-title">Food Frequency Questionnaire</h1>
                <p className="text-sm text-jazz mt-1">Report how often you eat each food group over a typical week</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-jazz/10 rounded-xl w-fit">
                {[{ id: 'form', label: 'Submit FFQ' }, { id: 'history', label: 'History' }].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={clsx('px-5 py-2 rounded-lg text-sm font-medium transition-all',
                            tab === t.id ? 'bg-white text-corona shadow-card' : 'text-jazz hover:text-night')}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'form' && (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-night uppercase tracking-wide">Assessment Date</label>
                            <input type="date" value={form.assessment_date} max={today()}
                                onChange={e => setForm(f => ({ ...f, assessment_date: e.target.value }))}
                                className="input-base max-w-xs" />
                        </div>
                    </Card>

                    {GROUPS.map(group => (
                        <Card key={group.label}>
                            <SectionTitle>{group.label}</SectionTitle>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {group.fields.map(({ key, label, unit, hint }) => (
                                    <div key={key} className="flex flex-col gap-1">
                                        <label className="text-xs font-semibold text-night uppercase tracking-wide">{label}</label>
                                        <div className="relative">
                                            <input
                                                type="number" min={0} max={99} step={0.5}
                                                value={form[key]}
                                                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                                className="input-base pr-20"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-jazz pointer-events-none whitespace-nowrap">{unit}</span>
                                        </div>
                                        {hint && <p className="text-[11px] text-jazz">{hint}</p>}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    ))}

                    <Button type="submit" loading={saving} size="lg">
                        <RiSaveLine size={16} /> Submit FFQ
                    </Button>
                </form>
            )}

            {tab === 'history' && (
                <div className="space-y-4">
                    {loading ? <Spinner /> : submissions.length === 0 ? (
                        <EmptyState icon={RiFileListLine} title="No FFQ submissions yet"
                            description="Submit your first food frequency questionnaire above."
                            action={<Button onClick={() => setTab('form')}>Fill Out FFQ</Button>} />
                    ) : submissions.map(sub => (
                        <Card key={sub.id} className="hover:shadow-card-md transition-shadow">
                            <p className="font-semibold text-steel mb-4">{sub.assessment_date}</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2">
                                {GROUPS.flatMap(g => g.fields).filter(f => sub[f.key] > 0).map(({ key, label, unit }) => (
                                    <div key={key} className="flex justify-between text-sm border-b border-jazz/10 py-1">
                                        <span className="text-jazz">{label}</span>
                                        <span className="font-medium text-steel">{sub[key]} <span className="text-xs text-jazz">{unit.split('/')[0]}</span></span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}