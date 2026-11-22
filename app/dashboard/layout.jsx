import DashboardShell from '../../components/DashboardShell';
import SessionGate from '../../components/SessionGate';
export const metadata = { robots: { index: false, follow: false } };
export default function DashboardLayout({ children }){ return <SessionGate mode="dashboard"><DashboardShell>{children}</DashboardShell></SessionGate>; }
