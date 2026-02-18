import { useEffect, useState } from 'react'
import client from '../api/client'
import { Card, Spinner } from '../components/ui'
import toast from 'react-hot-toast'
import { RiFocusLine, RiAddLine, RiDeleteBinLine, RiTrophyLine } from 'react-icons/ri'
import clsx from 'clsx'

const GOAL_TYPES = [
    { value: 'bmi', label: 'BMI', unit: 'kg/m²', recommended: 'Target: 18.5-24.9' },
    { value: 'glucose', label: 'Fasting Glucose', unit: 'mg/dL', recommended: 'Target: < 100' },
    { value: 'weight', label: 'Weight', unit: 'kg', recommended: '' },
    { value: 'triglycerides', label: 'Triglycerides', unit: 'mg/dL', recommended: 'Target: < 150' },
    { value: 'hdl', label: 'HDL Cholesterol', unit: 'mg/dL', recommended: 'Target: ≥ 40 (M) / 50 (F)' },
]

export default function Goals() {
    const [goals, setGoals] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [newGoal, setNewGoal] = useState({ goal_type: 'bmi', target_value: '', deadline: '' })
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        fetchGoals()
    }, [])

    const fetchGoals = () => {
        client.get('/api/v1/goals')
            .then(res => setGoals(res.data || []))
            .catch(() => { })
            .finally(() => setLoading(false))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!newGoal.target_value) {
            toast.error('Please enter a target value')
            return
        }
        setSubmitting(true)
        try {
            await client.post('/api/v1/goals', {
                goal_type: newGoal.goal_type,
                target_value: parseFloat(newGoal.target_value),
                deadline: newGoal.deadline || null,
            })
            toast.success('Goal created successfully!')
            setNewGoal({ goal_type: 'bmi', target_value: '', deadline: '' })
            setShowForm(false)
            fetchGoals()
        } catch { toast.error('Failed to create goal') }
        finally { setSubmitting(false) }
    }

    const handleDelete = async (id) => {
        try {
            await client.delete(`/api/v1/goals/${id}`)
            toast.success('Goal deleted')
            fetchGoals()
        } catch { toast.error('Failed to delete goal') }
    }

    if (loading) return <Spinner size={28} />

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="page-title">Health Goals</h1>
                    <p className="text-sm text-jazz mt-1">
                        Set personal targets and track your progress toward better health
                    </p>
                </div>
                <button onClick={() => setShowForm(!showForm)}
                    className="btn-primary flex items-center gap-2">
                    <RiAddLine size={16} />
                    {showForm ? 'Cancel' : 'New Goal'}
                </button>
            </div>

            {/* Create goal form */}
            {showForm && (
                <Card className="bg-blue-50 border-blue-200">
                    <h3 className="font-semibold text-blue-700 mb-4">Create New Goal</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-jazz uppercase tracking-wide mb-2">
                                    Goal Type
                                </label>
                                <select value={newGoal.goal_type} onChange={e => setNewGoal({ ...newGoal, goal_type: e.target.value })}
                                    className="input-base w-full">
                                    {GOAL_TYPES.map(g => (
                                        <option key={g.value} value={g.value}>{g.label}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-jazz mt-1">
                                    {GOAL_TYPES.find(g => g.value === newGoal.goal_type)?.recommended}
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-jazz uppercase tracking-wide mb-2">
                                    Target Value
                                </label>
                                <div className="relative">
                                    <input type="number" step="0.1" value={newGoal.target_value}
                                        onChange={e => setNewGoal({ ...newGoal, target_value: e.target.value })}
                                        placeholder="e.g. 24.9"
                                        className="input-base w-full" />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-jazz">
                                        {GOAL_TYPES.find(g => g.value === newGoal.goal_type)?.unit}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-jazz uppercase tracking-wide mb-2">
                                    Deadline (Optional)
                                </label>
                                <input type="date" value={newGoal.deadline}
                                    onChange={e => setNewGoal({ ...newGoal, deadline: e.target.value })}
                                    className="input-base w-full" />
                            </div>
                        </div>
                        <button type="submit" disabled={submitting}
                            className="btn-primary w-full sm:w-auto disabled:opacity-60">
                            {submitting ? 'Creating…' : 'Create Goal'}
                        </button>
                    </form>
                </Card>
            )}

            {/* Goals list */}
            {goals.length === 0 ? (
                <Card className="text-center py-12">
                    <RiFocusLine className="mx-auto text-jazz mb-3" size={32} />
                    <p className="font-semibold text-night">No health goals set yet</p>
                    <p className="text-sm text-jazz mt-1">Create your first goal to start tracking progress</p>
                </Card>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {goals.map(goal => {
                        const goalType = GOAL_TYPES.find(g => g.value === goal.goal_type)
                        const progress = goal.progress_percent || 0
                        const isAchieved = goal.is_achieved || progress >= 100

                        return (
                            <Card key={goal.id} className={clsx(
                                'relative',
                                isAchieved && 'bg-emerald-50 border-emerald-200'
                            )}>
                                {isAchieved && (
                                    <div className="absolute top-3 right-3">
                                        <RiTrophyLine className="text-emerald-500" size={20} />
                                    </div>
                                )}
                                <div className="mb-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="font-semibold text-steel">{goalType?.label}</p>
                                            <p className="text-xs text-jazz mt-0.5">
                                                Target: {goal.target_value} {goalType?.unit}
                                            </p>
                                        </div>
                                    </div>

                                    {goal.current_value != null && (
                                        <div className="space-y-2 mt-3">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-jazz">Current: {goal.current_value?.toFixed(1)} {goalType?.unit}</span>
                                                <span className={clsx('font-semibold',
                                                    progress >= 100 ? 'text-emerald-600' :
                                                        progress >= 50 ? 'text-amber-600' :
                                                            'text-red-600'
                                                )}>
                                                    {progress.toFixed(0)}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-jazz/10 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className={clsx('h-full transition-all duration-500 rounded-full',
                                                        progress >= 100 ? 'bg-emerald-500' :
                                                            progress >= 50 ? 'bg-amber-500' :
                                                                'bg-red-500'
                                                    )}
                                                    style={{ width: `${Math.min(100, progress)}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {goal.deadline && (
                                        <p className="text-[10px] text-jazz mt-2">
                                            Deadline: {new Date(goal.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                    )}
                                </div>

                                <button onClick={() => handleDelete(goal.id)}
                                    className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 transition-colors">
                                    <RiDeleteBinLine size={13} />
                                    Delete Goal
                                </button>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}