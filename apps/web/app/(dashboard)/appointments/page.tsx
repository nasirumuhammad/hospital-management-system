import {
  APPOINTMENT_STATUSES,
  type Appointment,
  type Paginated,
} from "@healthcare/types";
import { EmptyState } from "@/components/ui/Feedback";
import { LinkPagination } from "@/components/ui/LinkPagination";
import { ListPanel, PageHeader, PersonCell } from "@/components/ui/Page";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchFilter, SelectFilter } from "@/components/ui/UrlFilters";
import { formatDateTime, fullName, titleCase } from "@/lib/format";
import {
  DEFAULT_PAGE_SIZE,
  hrefBuilder,
  oneOf,
  pageNumber,
  searchTerm,
  type PageSearchParams,
} from "@/lib/search-params";
import { serverApi } from "@/lib/server-api";
import { getSessionUser } from "@/lib/session";
import { AppointmentRowActions } from "./_components/appointment-row-actions.client";
import { BookAppointmentButton } from "./_components/book-appointment.client";

const STATUS_OPTIONS = APPOINTMENT_STATUSES.map((value) => ({
  value,
  label: titleCase(value),
}));

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const user = await getSessionUser();
  if (!user) return null; // the dashboard layout is already refreshing the session

  const params = await searchParams;
  const q = searchTerm(params.q);
  const status = oneOf(params.status, APPOINTMENT_STATUSES);
  const data = await serverApi<Paginated<Appointment>>("/appointments", {
    query: {
      page: pageNumber(params.page),
      limit: DEFAULT_PAGE_SIZE,
      q,
      status,
      order: "desc",
    },
  });

  return (
    <>
      <PageHeader
        title="Appointments"
        description="Schedule and track patient visits."
        extra={user.role !== "DOCTOR" && <BookAppointmentButton />}
      />
      <ListPanel
        title="Appointment schedule"
        description={`${data.total} appointments`}
        toolbar={
          <>
            <SelectFilter
              param="status"
              label="Filter by status"
              allLabel="All statuses"
              options={STATUS_OPTIONS}
            />
            <SearchFilter />
          </>
        }
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Date & time</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <PersonCell name={fullName(item.patient)} tone="patient" />
                  </td>
                  <td>
                    Dr. {fullName(item.doctor)}
                    <small className="sub-cell">{item.doctor?.specialty}</small>
                  </td>
                  <td>{formatDateTime(item.scheduledAt)}</td>
                  <td>{item.reason || "—"}</td>
                  <td>
                    <StatusBadge value={item.status} />
                  </td>
                  <td>
                    <AppointmentRowActions
                      role={user.role}
                      appointment={{
                        id: item.id,
                        status: item.status,
                        scheduledAt: item.scheduledAt,
                        doctorName: fullName(item.doctor),
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.items.length === 0 && (
            <EmptyState loading={false} label="appointments" />
          )}
        </div>
        <LinkPagination data={data} hrefFor={hrefBuilder({ q, status })} />
      </ListPanel>
    </>
  );
}
