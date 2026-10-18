'use client';
import { CalendarDays, Clock3, ReceiptText, Stethoscope, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { Appointment, DashboardSummary, Doctor } from '@healthcare/types';
import { useCurrentUser } from '@/components/auth/AuthProvider';
import { ErrorBanner } from '@/components/ui/Feedback';
import { PersonCell } from '@/components/ui/Page';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api, errorMessage } from '@/lib/api-client';
import { formatDateTime, fullName } from '@/lib/format';
import { useList } from '@/lib/use-list';

function Stat({ icon, label, value, note, tone }: { icon: React.ReactNode; label: string; value: number | undefined; note: string; tone: string }) {
  if (value === undefined) return null;
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-note"><span /> {note}</div>
    </div>
  );
}

export default function OverviewPage() {
  const user = useCurrentUser();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState('');
  const upcomingQuery = useMemo(() => ({ limit: 5, from: new Date().toISOString(), status: undefined }), []);
  const upcoming = useList<Appointment>('/appointments', upcomingQuery);
  const doctors = useList<Doctor>('/doctors', { limit: 4 });

  useEffect(() => {
    api<DashboardSummary>('/dashboard/summary').then(setSummary).catch((failure) => setError(errorMessage(failure)));
  }, []);

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">HOSPITAL OVERVIEW</div>
          <h1>Welcome, {user.name.split(' ')[0]}</h1>
          <p>Here’s what’s happening at your hospital today.</p>
        </div>
      </div>
      <ErrorBanner message={error || upcoming.error} onDismiss={() => setError('')} />
      <div className="stats-grid">
        <Stat icon={<Users />} label="Total patients" value={summary?.patients} note="Registered patients" tone="blue" />
        <Stat icon={<Stethoscope />} label="Active doctors" value={summary?.doctors} note="Available specialists" tone="teal" />
        <Stat icon={<CalendarDays />} label="Appointments" value={summary?.appointments} note="All scheduled visits" tone="purple" />
        <Stat icon={<Clock3 />} label="Awaiting review" value={summary?.pendingAppointments} note="Pending appointments" tone="orange" />
        <Stat icon={<CalendarDays />} label="Upcoming" value={summary?.upcomingAppointments} note="Pending or confirmed, from now" tone="teal" />
        <Stat icon={<ReceiptText />} label="Outstanding invoices" value={summary?.outstandingInvoices} note="Unpaid or part-paid" tone="orange" />
      </div>
      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-head">
            <div><h3>Upcoming appointments</h3><p>The next visits on the schedule</p></div>
            <Link className="text-link" href="/appointments">View all <span>→</span></Link>
          </div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Patient</th><th>Doctor</th><th>When</th><th>Status</th></tr></thead>
              <tbody>
                {upcoming.items.filter((item) => item.status === 'PENDING' || item.status === 'CONFIRMED').map((item) => (
                  <tr key={item.id}>
                    <td><PersonCell name={fullName(item.patient)} tone="patient" /></td>
                    <td>Dr. {fullName(item.doctor)}<small className="sub-cell">{item.doctor?.specialty}</small></td>
                    <td>{formatDateTime(item.scheduledAt)}</td>
                    <td><StatusBadge value={item.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {upcoming.items.length === 0 && <div className="empty-small">{upcoming.loading ? 'Loading…' : 'No upcoming appointments.'}</div>}
          </div>
        </div>
        <div className="panel staff-panel">
          <div className="panel-head"><div><h3>Medical team</h3><p>Registered specialists</p></div></div>
          {doctors.items.map((doctor) => (
            <div className="staff-row" key={doctor.id}>
              <div className="avatar doctor-avatar">{`${doctor.firstName[0]}${doctor.lastName[0]}`}</div>
              <div className="staff-info"><b>Dr. {fullName(doctor)}</b><small>{doctor.specialty}</small></div>
              <span className="presence present" />
            </div>
          ))}
          {doctors.items.length === 0 && <p className="empty-small">{doctors.loading ? 'Loading…' : 'No doctors yet.'}</p>}
        </div>
      </div>
    </>
  );
}
