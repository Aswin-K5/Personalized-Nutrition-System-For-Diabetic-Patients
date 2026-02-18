import { useEffect, useState } from 'react'
import { dietaryApi } from '../api/dietary'
import { Card, Spinner, Badge } from '../components/ui'
import { RiCalendarLine, RiArrowLeftSLine, RiArrowRightSLine, RiRestaurantLine } from 'react-icons/ri'
import clsx from 'clsx'

export default function RecallCalendar() {
    const [recalls, setRecalls] = useState([])
    const [loading, setLoading] = useState(true)
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedRecall, setSelectedRecall] = useState(null)

    useEffect(() => {
        dietaryApi.listRecalls()
            .then(res => setRecalls(res.data?.items || res.data || []))
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

    const monthName = currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

    // Map recalls by date (YYYY-MM-DD)
    const recallsByDate = recalls.reduce((acc, rec) => {
        acc[rec.recall_date] = rec
        return acc
    }, {})

    // Build calendar grid
    const calendarDays = []
    for (let i = 0; i < startingDayOfWeek; i++) {
        calendarDays.push(null) // Empty cells before month starts
    }
    for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push(day)
    }

    const getRecallForDay = (day) => {
        if (!day) return null
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        return recallsByDate[dateStr]
    }

    if (loading) return <Spinner size={28} />

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="page-title">Recall Calendar</h1>
                <p className="text-sm text-jazz mt-1">
                    View your dietary recall history by month — click any logged day to see details
                </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Calendar */}
                <Card className="lg:col-span-2">
                    {/* Month navigation */}
                    <div className="flex items-center justify-between mb-6">
                        <button onClick={prevMonth}
                            className="p-2 hover:bg-whiteout rounded-lg transition-colors">
                            <RiArrowLeftSLine size={20} className="text-jazz" />
                        </button>
                        <div className="flex items-center gap-2">
                            <RiCalendarLine size={18} className="text-corona" />
                            <h2 className="font-semibold text-steel">{monthName}</h2>
                        </div>
                        <button onClick={nextMonth}
                            className="p-2 hover:bg-whiteout rounded-lg transition-colors">
                            <RiArrowRightSLine size={20} className="text-jazz" />
                        </button>
                    </div>

                    {/* Day labels */}
                    <div className="grid grid-cols-7 gap-2 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="text-center text-[10px] font-semibold text-jazz uppercase tracking-wide py-1">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-2">
                        {calendarDays.map((day, idx) => {
                            const recall = getRecallForDay(day)
                            const isToday = day &&
                                day === new Date().getDate() &&
                                month === new Date().getMonth() &&
                                year === new Date().getFullYear()

                            return (
                                <button
                                    key={idx}
                                    onClick={() => recall && setSelectedRecall(recall)}
                                    disabled={!day}
                                    className={clsx(
                                        'aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all relative',
                                        !day && 'invisible',
                                        day && !recall && 'bg-whiteout text-jazz/50 hover:bg-jazz/5',
                                        day && recall && 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-medium',
                                        isToday && 'ring-2 ring-corona ring-offset-2',
                                        selectedRecall?.recall_date === recall?.recall_date && 'ring-2 ring-corona'
                                    )}
                                >
                                    {day}
                                    {recall && (
                                        <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    <div className="flex items-center gap-4 mt-6 text-xs text-jazz">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-emerald-50 border border-emerald-200 rounded" />
                            <span>Recall logged</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-whiteout rounded" />
                            <span>No recall</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 border-2 border-corona rounded" />
                            <span>Today</span>
                        </div>
                    </div>
                </Card>

                {/* Selected recall detail */}
                <Card className="lg:col-span-1">
                    <h3 className="font-semibold text-steel mb-4 flex items-center gap-2">
                        <RiRestaurantLine size={16} className="text-corona" />
                        {selectedRecall ? 'Recall Details' : 'Select a Day'}
                    </h3>

                    {!selectedRecall ? (
                        <p className="text-sm text-jazz/60 italic">Click a logged day on the calendar to view details</p>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <p className="font-semibold text-steel">{selectedRecall.recall_date}</p>
                                <div className="flex gap-1.5 flex-wrap mt-2">
                                    {selectedRecall.dietary_inflammatory_score && (
                                        <Badge className={clsx('text-[10px]',
                                            selectedRecall.dietary_inflammatory_score.includes('Anti') ? 'bg-emerald-100 text-emerald-700' :
                                                selectedRecall.dietary_inflammatory_score.includes('Pro') ? 'bg-red-100 text-red-600' :
                                                    'bg-jazz/10 text-jazz')}>
                                            {selectedRecall.dietary_inflammatory_score} Diet
                                        </Badge>
                                    )}
                                    {selectedRecall.diet_quality_score != null && (
                                        <Badge className="text-[10px] bg-primary-light text-corona">
                                            Quality {selectedRecall.diet_quality_score?.toFixed(0)}/100
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Calories', value: selectedRecall.total_calories?.toFixed(0), unit: 'kcal' },
                                    { label: 'Carbs', value: selectedRecall.carb_percent?.toFixed(0), unit: '%' },
                                    { label: 'Protein', value: selectedRecall.protein_percent?.toFixed(0), unit: '%' },
                                    { label: 'Fat', value: selectedRecall.fat_percent?.toFixed(0), unit: '%' },
                                    { label: 'Fibre', value: selectedRecall.fiber_g?.toFixed(1), unit: 'g' },
                                    { label: 'Sodium', value: selectedRecall.sodium_mg?.toFixed(0), unit: 'mg' },
                                ].map(({ label, value, unit }) => (
                                    <div key={label} className="bg-whiteout rounded-lg p-2.5 border border-jazz/10">
                                        <p className="text-[10px] text-jazz uppercase tracking-wide">{label}</p>
                                        <p className="text-sm font-semibold text-steel mt-0.5">
                                            {value ?? '—'}
                                            <span className="text-[10px] text-jazz ml-1">{unit}</span>
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {selectedRecall.eating_window_hours != null && (
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                                    <p className="text-xs font-medium text-blue-700">Eating Window</p>
                                    <p className="text-sm text-blue-600 mt-1">
                                        {selectedRecall.eating_window_hours?.toFixed(1)} hours
                                        {selectedRecall.eating_window_start && selectedRecall.eating_window_end && (
                                            <span className="text-xs ml-1">
                                                ({selectedRecall.eating_window_start.slice(0, 5)} - {selectedRecall.eating_window_end.slice(0, 5)})
                                            </span>
                                        )}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    )
}