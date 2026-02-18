import { Link } from 'react-router-dom'
import { RiLeafLine, RiHeartPulseLine, RiRobot2Line, RiBarChart2Line, RiArrowRightLine, RiCheckLine } from 'react-icons/ri'

const features = [
    { icon: RiHeartPulseLine, title: 'Evidence-Based Recommendations', desc: 'Personalised dietary guidance aligned with ADA 2024 clinical guidelines for glucose, lipids, and weight.' },
    { icon: RiRobot2Line, title: 'Smart Health Analysis', desc: 'Your lab values, body measurements and dietary intake are combined to generate a plan built for you.' },
    { icon: RiBarChart2Line, title: 'Research & Analytics', desc: 'Population-level health tracking, diet quality scores, and CSV exports for clinical research teams.' },
    { icon: RiLeafLine, title: '5,400+ Verified Foods', desc: 'Comprehensive USDA food database with anti-inflammatory, low-GI, and omega-3 labels on every item.' },
]

const highlights = [
    'Personalised daily calorie targets',
    'Metabolic risk assessment',
    'Diet inflammation scoring',
    'Eating window & meal timing analysis',
    'Glycaemic load tracking',
    'Time-restricted eating guidance',
]

export default function Landing() {
    return (
        <div className="min-h-screen bg-whiteout font-body">
            {/* Nav */}
            <nav className="sticky top-0 z-50 glass border-b border-jazz/10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-corona flex items-center justify-center">
                            <RiLeafLine className="text-white" size={16} />
                        </div>
                        <span className="font-display text-lg text-steel">DiabetesDiet</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link to="/login" className="btn-ghost text-sm px-4 py-2">Sign In</Link>
                        <Link to="/register" className="btn-primary text-sm">Get Started</Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-corona/5 blur-3xl -translate-y-1/2 translate-x-1/3" />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-luscious/5 blur-3xl translate-y-1/2 -translate-x-1/3" />
                </div>

                <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
                    <div className="inline-flex items-center gap-2 bg-primary-light text-corona text-xs font-semibold px-4 py-1.5 rounded-full mb-8">
                        <span className="w-1.5 h-1.5 rounded-full bg-corona" />
                        ADA 2024 Clinical Guidelines
                    </div>

                    <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-steel leading-tight mb-6 max-w-3xl mx-auto">
                        Evidence-Based Nutrition for{' '}
                        <span className="text-gradient">Diabetes & Metabolic Syndrome</span>
                    </h1>

                    <p className="text-lg text-jazz max-w-2xl mx-auto mb-10 leading-relaxed">
                        Personalized dietary recommendations backed by clinical guidelines and advanced health analysis.
                        Complete your health profile, log your meals, and receive a plan built specifically for you.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/register" className="btn-primary px-8 py-3 text-base">
                            Create Free Account <RiArrowRightLine />
                        </Link>
                        <Link to="/login" className="btn-secondary px-8 py-3 text-base">
                            Sign In
                        </Link>
                    </div>
                </div>
            </section>

            {/* Feature cards */}
            <section className="bg-white border-y border-jazz/10 py-20">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="text-center mb-12">
                        <h2 className="font-display text-3xl text-steel mb-3">Clinical Intelligence, End to End</h2>
                        <p className="text-jazz max-w-lg mx-auto">Four integrated modules that work together from intake to recommendation.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map(({ icon: Icon, title, desc }) => (
                            <div key={title} className="card hover:shadow-card-md transition-shadow duration-300 group">
                                <div className="w-10 h-10 rounded-xl bg-primary-light text-corona flex items-center justify-center mb-4 group-hover:bg-corona group-hover:text-white transition-colors duration-300">
                                    <Icon size={20} />
                                </div>
                                <h3 className="font-semibold text-steel mb-1.5">{title}</h3>
                                <p className="text-sm text-jazz leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Highlights */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div>
                        <h2 className="font-display text-3xl text-steel mb-4">Built on Clinical Evidence</h2>
                        <p className="text-jazz mb-8 leading-relaxed">
                            Every recommendation traces back to peer-reviewed guidelines. No generic advice —
                            each rule is parameterized by your actual lab values, anthropometric data, and dietary patterns.
                        </p>
                        <ul className="space-y-3">
                            {highlights.map(h => (
                                <li key={h} className="flex items-center gap-3 text-sm text-night">
                                    <span className="w-5 h-5 rounded-full bg-primary-light text-corona flex items-center justify-center flex-shrink-0">
                                        <RiCheckLine size={12} />
                                    </span>
                                    {h}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Mock dashboard card */}
                    <div className="card-dark rounded-3xl p-8 space-y-4 shadow-card-lg">
                        <p className="text-xs text-jazz uppercase tracking-widest font-semibold">Metabolic Risk Profile</p>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'BMI', value: '29.4', unit: 'kg/m²' },
                                { label: 'Fasting Glucose', value: '118', unit: 'mg/dL' },
                                { label: 'Triglycerides', value: '185', unit: 'mg/dL' },
                                { label: 'HDL', value: '36', unit: 'mg/dL' },
                            ].map(({ label, value, unit }) => (
                                <div key={label} className="bg-white/5 rounded-xl p-3">
                                    <p className="text-[10px] text-jazz uppercase tracking-wide mb-1">{label}</p>
                                    <p className="font-display text-xl text-whiteout">{value}<span className="text-xs text-jazz ml-1 font-body font-normal">{unit}</span></p>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-white/10 pt-4">
                            <p className="text-xs text-jazz mb-2">Rules Triggered</p>
                            <div className="flex flex-wrap gap-2">
                                {['High TG', 'Low HDL', 'Prediabetes', 'Abdominal Obesity'].map(r => (
                                    <span key={r} className="text-xs bg-corona/30 text-corona px-2.5 py-0.5 rounded-full">{r}</span>
                                ))}
                            </div>
                        </div>
                        <div className="bg-corona/20 rounded-xl p-3 text-xs text-whiteout/90 leading-relaxed">
                            <span className="text-corona font-semibold">Plan Generated: </span>
                            Low-GI Mediterranean with Omega-3 emphasis. Target 1,720 kcal/day. 8-hour eating window recommended.
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="bg-steel py-20 text-center">
                <div className="max-w-2xl mx-auto px-4">
                    <h2 className="font-display text-3xl text-whiteout mb-4">Start Your Clinical Nutrition Journey</h2>
                    <p className="text-jazz mb-8">Free for patients and investigators. Your data, your plan, your health.</p>
                    <Link to="/register" className="btn-primary px-10 py-3 text-base">
                        Create Account <RiArrowRightLine />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-steel border-t border-white/5 py-8 text-center">
                <p className="text-xs text-jazz">© 2025 DiabetesDiet · Evidence-Based Clinical Nutrition</p>
            </footer>
        </div>
    )
}