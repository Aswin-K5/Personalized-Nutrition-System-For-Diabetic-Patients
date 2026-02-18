import { useEffect, useState, useRef } from 'react'
import { dietaryApi } from '../api/dietary'
import { Card, Button, Badge, SectionTitle, EmptyState, Spinner } from '../components/ui'
import toast from 'react-hot-toast'
import {
    RiAddLine, RiDeleteBinLine, RiSearchLine, RiRestaurantLine,
    RiCheckLine, RiArrowDownSLine,
} from 'react-icons/ri'
import clsx from 'clsx'

const MEALS = ['breakfast', 'mid_morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'late_night']
const MEAL_LABELS = {
    breakfast: 'Breakfast', mid_morning_snack: 'Mid-Morning', lunch: 'Lunch',
    afternoon_snack: 'Afternoon Snack', dinner: 'Dinner', late_night: 'Late Night'
}

function today() { return new Date().toISOString().split('T')[0] }

function RecallHistoryCard({ rec, onDelete }) {
    const [expanded, setExpanded] = useState(false)
    const [detail, setDetail] = useState(null)
    const [loading, setLoading] = useState(false)

    const loadDetail = async () => {
        if (detail) { setExpanded(v => !v); return }
        setLoading(true)
        try {
            const res = await dietaryApi.getRecall(rec.id)
            setDetail(res.data)
            setExpanded(true)
        } catch { toast.error('Could not load food details') }
        finally { setLoading(false) }
    }

    return (
        <Card className="hover:shadow-card-md transition-shadow">
            {/* Header row */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <p className="font-semibold text-steel">{rec.recall_date}</p>
                    <p className="text-xs text-jazz mt-0.5">
                        {rec.food_items?.length || 0} foods · {rec.total_calories?.toFixed(0) || '—'} kcal
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {rec.dietary_inflammatory_score && (
                        <Badge color={rec.dietary_inflammatory_score.includes('Anti') ? 'green' : rec.dietary_inflammatory_score.includes('Pro') ? 'red' : 'default'}>
                            {rec.dietary_inflammatory_score}
                        </Badge>
                    )}
                    {rec.diet_quality_score != null && <Badge color="purple">Quality: {rec.diet_quality_score?.toFixed(0)}/100</Badge>}
                    {rec.chrononutrition_score != null && <Badge color="blue">Eating Pattern: {rec.chrononutrition_score?.toFixed(1)}/10</Badge>}
                    <button onClick={() => onDelete(rec.id)} className="text-jazz hover:text-red-500 transition-colors p-1">
                        <RiDeleteBinLine size={15} />
                    </button>
                </div>
            </div>

            {/* Macros row */}
            <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-jazz/10">
                {[
                    { label: 'Carbs', value: rec.carb_percent?.toFixed(0), unit: '%' },
                    { label: 'Protein', value: rec.protein_percent?.toFixed(0), unit: '%' },
                    { label: 'Fat', value: rec.fat_percent?.toFixed(0), unit: '%' },
                    { label: 'Fiber', value: rec.fiber_g?.toFixed(1), unit: 'g' },
                ].map(({ label, value, unit }) => (
                    <div key={label} className="text-center">
                        <p className="text-xs text-jazz">{label}</p>
                        <p className="font-semibold text-steel text-sm">{value ?? '—'}<span className="text-xs text-jazz ml-0.5">{unit}</span></p>
                    </div>
                ))}
            </div>

            {/* View foods toggle */}
            <button
                onClick={loadDetail}
                className="flex items-center gap-1.5 mt-3 pt-3 border-t border-jazz/10 text-xs font-medium text-corona hover:text-primary-hover transition-colors w-full"
            >
                {loading ? (
                    <span className="flex items-center gap-1.5"><div className="w-3 h-3 border-2 border-corona border-t-transparent rounded-full animate-spin" /> Loading foods…</span>
                ) : (
                    <><RiArrowDownSLine size={15} style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                        {expanded ? 'Hide' : 'Show'} food details</>
                )}
            </button>

            {/* Food list */}
            {expanded && detail?.food_items?.length > 0 && (
                <div className="mt-3 space-y-1.5 animate-slide-up">
                    {/* Group by meal */}
                    {MEALS.map(mealType => {
                        const foods = detail.food_items.filter(f => f.meal_type === mealType)
                        if (!foods.length) return null
                        return (
                            <div key={mealType}>
                                <p className="text-[10px] font-semibold text-jazz uppercase tracking-widest mt-2 mb-1.5 px-1">
                                    {MEAL_LABELS[mealType]}
                                </p>
                                {foods.map(food => (
                                    <div key={food.id} className="flex items-center gap-3 bg-whiteout rounded-lg px-3 py-2 border border-jazz/10">
                                        <RiRestaurantLine className="text-jazz flex-shrink-0" size={13} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-steel font-medium truncate">{food.food_description}</p>
                                            <p className="text-xs text-jazz">{food.quantity_grams}g
                                                {food.calories ? ` · ${food.calories.toFixed(0)} kcal` : ''}
                                                {food.meal_time ? ` · ${food.meal_time.slice(0, 5)}` : ''}
                                            </p>
                                        </div>
                                        <div className="flex gap-1 flex-shrink-0">
                                            {food.is_ultra_processed && <span className="text-[10px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">Processed</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    })}
                </div>
            )}
        </Card>
    )
}

export default function DietaryRecall() {
    const [tab, setTab] = useState('log')
    const [recalls, setRecalls] = useState([])
    const [loadingRecalls, setLoadingRecalls] = useState(false)

    // Log form state
    const [recallDate, setRecallDate] = useState(today())
    const [items, setItems] = useState([])
    const [winStart, setWinStart] = useState('')
    const [winEnd, setWinEnd] = useState('')
    const [skipBreakfast, setSkipBreakfast] = useState(false)
    const [lateNight, setLateNight] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Food search state
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [searching, setSearching] = useState(false)
    const [selected, setSelected] = useState(null)
    const [qty, setQty] = useState(100)
    const [meal, setMeal] = useState('lunch')
    const [mealTime, setMealTime] = useState('')
    const searchTimer = useRef(null)

    useEffect(() => {
        if (tab === 'history') loadRecalls()
    }, [tab])

    const loadRecalls = async () => {
        setLoadingRecalls(true)
        try {
            const res = await dietaryApi.listRecalls()
            setRecalls(res.data?.items || res.data || [])
        } catch { toast.error('Could not load recalls') }
        finally { setLoadingRecalls(false) }
    }

    const handleSearch = (q) => {
        setQuery(q)
        clearTimeout(searchTimer.current)
        if (q.length < 2) { setResults([]); return }
        searchTimer.current = setTimeout(async () => {
            setSearching(true)
            try { setResults((await dietaryApi.searchFoods(q)).data || []) }
            catch { setResults([]) }
            finally { setSearching(false) }
        }, 350)
    }

    const addItem = () => {
        if (!selected) { toast.error('Select a food first'); return }
        if (!qty || qty <= 0) { toast.error('Enter a valid quantity'); return }
        setItems(prev => [...prev, {
            food_code: selected.food_code,
            food_description: selected.main_description,
            quantity_grams: Number(qty),
            meal_type: meal,
            meal_time: mealTime || null,
            _id: Date.now(),
        }])
        setSelected(null); setQuery(''); setResults([]); setQty(100); setMealTime('')
        toast.success('Food added')
    }

    const removeItem = (id) => setItems(prev => prev.filter(i => i._id !== id))

    const handleSubmit = async () => {
        if (!items.length) { toast.error('Add at least one food item'); return }
        setSubmitting(true)
        try {
            await dietaryApi.createRecall({
                recall_date: recallDate,
                food_items: items.map(({ _id, ...i }) => i),
                eating_window_start: winStart || null,
                eating_window_end: winEnd || null,
                skipped_breakfast: skipBreakfast,
                late_night_eating: lateNight,
            })
            toast.success('24-hour recall submitted!')
            setItems([]); setWinStart(''); setWinEnd(''); setSkipBreakfast(false); setLateNight(false)
            setTab('history'); loadRecalls()
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to submit recall')
        } finally { setSubmitting(false) }
    }

    const deleteRecall = async (id) => {
        try {
            await dietaryApi.deleteRecall(id)
            setRecalls(prev => prev.filter(r => r.id !== id))
            toast.success('Recall deleted')
        } catch { toast.error('Failed to delete') }
    }

    return (
        <div className="max-w-4xl space-y-6 animate-fade-in">
            <div>
                <h1 className="page-title">Dietary Recall</h1>
                <p className="text-sm text-jazz mt-1">Log your 24-hour food intake to generate personalised scores</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-jazz/10 rounded-xl w-fit">
                {['log', 'history'].map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={clsx('px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize',
                            tab === t ? 'bg-white text-corona shadow-card' : 'text-jazz hover:text-night')}>
                        {t === 'log' ? 'Log Recall' : 'History'}
                    </button>
                ))}
            </div>

            {/* LOG TAB */}
            {tab === 'log' && (
                <div className="space-y-6">
                    <Card>
                        <SectionTitle>Recall Details</SectionTitle>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-night uppercase tracking-wide">Date</label>
                                <input type="date" value={recallDate} max={today()} onChange={e => setRecallDate(e.target.value)} className="input-base" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-night uppercase tracking-wide">Eating Start</label>
                                <input type="time" value={winStart} onChange={e => setWinStart(e.target.value)} className="input-base" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-night uppercase tracking-wide">Eating End</label>
                                <input type="time" value={winEnd} onChange={e => setWinEnd(e.target.value)} className="input-base" />
                            </div>
                            <div className="flex flex-col gap-3 justify-end pb-0.5">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={skipBreakfast} onChange={e => setSkipBreakfast(e.target.checked)} className="accent-corona w-4 h-4" />
                                    <span className="text-sm text-night">Skipped Breakfast</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={lateNight} onChange={e => setLateNight(e.target.checked)} className="accent-corona w-4 h-4" />
                                    <span className="text-sm text-night">Late Night Eating</span>
                                </label>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <SectionTitle>Search & Add Foods</SectionTitle>
                        <div className="space-y-4">
                            <div className="relative">
                                <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-jazz" size={16} />
                                <input type="text" placeholder="Search foods (e.g. salmon, lentils, oats, rice)…"
                                    value={query} onChange={e => handleSearch(e.target.value)} className="input-base pl-10" />
                                {searching && <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-corona border-t-transparent rounded-full animate-spin" />}
                            </div>

                            {results.length > 0 && (
                                <div className="border border-jazz/15 rounded-xl overflow-hidden shadow-card-md max-h-60 overflow-y-auto">
                                    {results.map(food => (
                                        <button key={food.food_code} onClick={() => { setSelected(food); setResults([]) }}
                                            className={clsx('w-full text-left px-4 py-3 text-sm hover:bg-primary-light transition-colors border-b border-jazz/10 last:border-0 flex items-start gap-3',
                                                selected?.food_code === food.food_code && 'bg-primary-light')}>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-steel truncate">{food.main_description}</p>
                                                <p className="text-xs text-jazz mt-0.5">{food.wweia_category_description}</p>
                                            </div>
                                            <div className="flex gap-1 flex-wrap justify-end flex-shrink-0 mt-0.5">
                                                {food.is_anti_inflammatory && <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full">Anti-inflam</span>}
                                                {food.is_omega3_rich && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">Omega-3</span>}
                                                {food.is_low_gi && <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">Low-GI</span>}
                                                {food.is_ultra_processed && <span className="text-[10px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">Processed</span>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {selected && (
                                <div className="bg-primary-light border border-corona/20 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <RiCheckLine className="text-corona" size={16} />
                                        <span className="text-sm font-semibold text-corona">{selected.main_description}</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-semibold text-night uppercase tracking-wide">Quantity (g)</label>
                                            <input type="number" min={1} value={qty} onChange={e => setQty(e.target.value)} className="input-base" />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-semibold text-night uppercase tracking-wide">Meal</label>
                                            <select value={meal} onChange={e => setMeal(e.target.value)} className="input-base">
                                                {MEALS.map(m => <option key={m} value={m}>{MEAL_LABELS[m]}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-semibold text-night uppercase tracking-wide">Time (optional)</label>
                                            <input type="time" value={mealTime} onChange={e => setMealTime(e.target.value)} className="input-base" />
                                        </div>
                                        <div className="flex items-end">
                                            <Button onClick={addItem} className="w-full"><RiAddLine size={16} /> Add Food</Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {items.length > 0 && (
                        <Card>
                            <SectionTitle>{items.length} Food{items.length !== 1 ? 's' : ''} Added</SectionTitle>
                            <div className="space-y-2">
                                {items.map(item => (
                                    <div key={item._id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-whiteout border border-jazz/10">
                                        <RiRestaurantLine className="text-jazz flex-shrink-0" size={15} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-steel truncate">{item.food_description}</p>
                                            <p className="text-xs text-jazz">{item.quantity_grams}g · {MEAL_LABELS[item.meal_type]}{item.meal_time ? ` · ${item.meal_time}` : ''}</p>
                                        </div>
                                        <button onClick={() => removeItem(item._id)} className="text-jazz hover:text-red-500 transition-colors p-1 flex-shrink-0">
                                            <RiDeleteBinLine size={15} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end mt-4 pt-4 border-t border-jazz/10">
                                <Button onClick={handleSubmit} loading={submitting} size="lg">Submit 24-Hour Recall</Button>
                            </div>
                        </Card>
                    )}

                    {!items.length && !selected && query.length < 2 && (
                        <EmptyState icon={RiRestaurantLine} title="No foods added yet" description="Search for foods above and add them to your recall" />
                    )}
                </div>
            )}

            {/* HISTORY TAB */}
            {tab === 'history' && (
                <div className="space-y-4">
                    {loadingRecalls ? <Spinner /> : recalls.length === 0 ? (
                        <EmptyState icon={RiRestaurantLine} title="No recalls yet"
                            description="Your submitted recalls will appear here with full food details."
                            action={<Button onClick={() => setTab('log')}>Log Your First Recall</Button>} />
                    ) : recalls.map(rec => (
                        <RecallHistoryCard key={rec.id} rec={rec} onDelete={deleteRecall} />
                    ))}
                </div>
            )}
        </div>
    )
}