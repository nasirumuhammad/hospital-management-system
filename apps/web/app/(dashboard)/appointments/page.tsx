import { APPOINTMENT_STATUSES, type Appointment, type Paginated } from '@healthcare/types';
import { ListPanel, PageHeader } from '@/components/ui/Page';
import { oneOf, tableQuery, type PageSearchParams } from '@/lib/search-params';
import { serverApi } from '@/lib/server-api';
import { getSessionUser } from '@/lib/session';
import { AppointmentsTable } from './_components/appointments-table.client';
import { APPOINTMENT_SORTABLE, APPOINTMENT_DEFAULT_SORT } from './_components/appointments-table.config';
import { BookAppointmentButton } from './_components/book-appointment.client';

export default async function AppointmentsPage({ searchParams }: { searchParams: PageSearchParams }) {
  const user = await getSessionUser();
  if (!user) return null; // the dashboard layout is already refreshing the session

  const params = await searchParams;
  const { page, limit, q, sort, apiSort } = tableQuery(params, { sortable: APPOINTMENT_SORTABLE, defaultSort: APPOINTMENT_DEFAULT_SORT });
  const status = oneOf(params.status, APPOINTMENT_STATUSES);
  const data = await serverApi<Paginated<Appointment>>('/appointments', { query: { page, limit, q, status, ...apiSort } });

  return (
    <>
      <PageHeader title="Appointments" description="Schedule and track patient visits." extra={user.role !== 'DOCTOR' && <BookAppointmentButton />} />
      <ListPanel title="Appointment schedule" description={`${data.total.toLocaleString('en-US')} appointments`}>
        <AppointmentsTable data={data} sort={sort} role={user.role} />
      </ListPanel>
    </>
  );
}
