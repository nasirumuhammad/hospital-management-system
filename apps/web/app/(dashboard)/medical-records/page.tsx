import type { MedicalRecord, Paginated } from '@healthcare/types';
import { EmptyState } from '@/components/ui/Feedback';
import { LinkPagination } from '@/components/ui/LinkPagination';
import { ListPanel, PageHeader, PersonCell } from '@/components/ui/Page';
import { formatDate, fullName } from '@/lib/format';
import { DEFAULT_PAGE_SIZE, hrefBuilder, pageNumber, type PageSearchParams } from '@/lib/search-params';
import { serverApi } from '@/lib/server-api';
import { getSessionUser } from '@/lib/session';
import { NewRecordButton, RecordRowActions } from './_components/record-actions.client';

export default async function MedicalRecordsPage({ searchParams }: { searchParams: PageSearchParams }) {
  const user = await getSessionUser();
  if (!user) return null;
  const isDoctor = user.role === 'DOCTOR';

  const params = await searchParams;
  const data = await serverApi<Paginated<MedicalRecord>>('/medical-records', { query: { page: pageNumber(params.page), limit: DEFAULT_PAGE_SIZE } });

  return (
    <>
      <PageHeader title="Medical records" description="Clinical notes and treatment plans." extra={isDoctor && <NewRecordButton />} />
      <ListPanel title="Records" description={`${data.total} records you have access to`}>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Patient</th><th>Diagnosis</th><th>Doctor</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {data.items.map((record) => (
                <tr key={record.id}>
                  <td><PersonCell name={fullName(record.patient)} tone="patient" /></td>
                  <td>{record.diagnosis}</td>
                  <td>Dr. {fullName(record.doctor)}<small className="sub-cell">{record.doctor?.specialty}</small></td>
                  <td>{formatDate(record.createdAt)}</td>
                  <td><RecordRowActions record={record} canEdit={isDoctor} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.items.length === 0 && <EmptyState loading={false} label="medical records" />}
        </div>
        <LinkPagination data={data} hrefFor={hrefBuilder({})} />
      </ListPanel>
    </>
  );
}
