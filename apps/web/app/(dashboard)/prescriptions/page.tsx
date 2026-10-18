import type { Paginated, Prescription } from '@healthcare/types';
import { EmptyState } from '@/components/ui/Feedback';
import { LinkPagination } from '@/components/ui/LinkPagination';
import { ListPanel, PageHeader, PersonCell } from '@/components/ui/Page';
import { formatDate, fullName } from '@/lib/format';
import { DEFAULT_PAGE_SIZE, hrefBuilder, pageNumber, type PageSearchParams } from '@/lib/search-params';
import { serverApi } from '@/lib/server-api';
import { getSessionUser } from '@/lib/session';
import { NewPrescriptionButton } from './_components/new-prescription.client';

export default async function PrescriptionsPage({ searchParams }: { searchParams: PageSearchParams }) {
  const user = await getSessionUser();
  if (!user) return null;

  const params = await searchParams;
  const data = await serverApi<Paginated<Prescription>>('/prescriptions', { query: { page: pageNumber(params.page), limit: DEFAULT_PAGE_SIZE } });

  return (
    <>
      <PageHeader title="Prescriptions" description="Medication orders." extra={user.role === 'DOCTOR' && <NewPrescriptionButton />} />
      <ListPanel title="Prescriptions" description={`${data.total} prescriptions`}>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Patient</th><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Prescribed by</th><th>Date</th></tr></thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td><PersonCell name={fullName(item.patient)} tone="patient" /></td>
                  <td><b>{item.medication}</b>{item.instructions && <small className="sub-cell">{item.instructions}</small>}</td>
                  <td>{item.dosage}</td><td>{item.frequency}</td><td>{item.duration}</td>
                  <td>Dr. {fullName(item.doctor)}</td><td>{formatDate(item.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.items.length === 0 && <EmptyState loading={false} label="prescriptions" />}
        </div>
        <LinkPagination data={data} hrefFor={hrefBuilder({})} />
      </ListPanel>
    </>
  );
}
