import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'

// Layouts
import AppLayout from './components/layout/AppLayout'
import InvestigatorLayout from './components/layout/InvestigatorLayout'

// Public
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'

// Patient pages
import Dashboard from './pages/Dashboard'
import PatientProfile from './pages/PatientProfile'
import DietaryRecall from './pages/DietaryRecall'
import DietPlan from './pages/DietPlan'
import FFQ from './pages/FFQ'
import Progress from './pages/Progress'
import RecallCalendar from './pages/Recallcalendar'
import PlanComparison from './pages/Plancomparison'
import Goals from './pages/Goals'

// Investigator pages
import InvestigatorDashboard from './pages/Investigatordashboard'
import PatientOverview from './pages/Patientoverview'
import ResearchAnalytics from './pages/ResearchAnalytics'

function RequireAuth({ children }) {
  const token = useAuthStore(s => s.token)
  return token ? children : <Navigate to="/login" replace />
}

function RequireInvestigator({ children }) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (user?.role !== 'investigator') return <Navigate to="/dashboard" replace />
  return children
}

function RequirePatient({ children }) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (user?.role === 'investigator') return <Navigate to="/investigator" replace />
  return children
}

function PublicOnly({ children }) {
  const { token, user } = useAuthStore()
  if (!token) return children
  return <Navigate to={user?.role === 'investigator' ? '/investigator' : '/dashboard'} replace />
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />

      {/* Patient routes */}
      <Route element={<RequirePatient><AppLayout /></RequirePatient>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<PatientProfile />} />
        <Route path="/dietary-recall" element={<DietaryRecall />} />
        <Route path="/diet-plan" element={<DietPlan />} />
        <Route path="/ffq" element={<FFQ />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/recall-calendar" element={<RecallCalendar />} />
        <Route path="/plan-comparison" element={<PlanComparison />} />
        <Route path="/goals" element={<Goals />} />
      </Route>

      {/* Investigator routes */}
      <Route element={<RequireInvestigator><InvestigatorLayout /></RequireInvestigator>}>
        <Route path="/investigator" element={<InvestigatorDashboard />} />
        <Route path="/investigator/patients" element={<PatientOverview />} />
        <Route path="/investigator/analytics" element={<ResearchAnalytics />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}