import { useParams } from 'react-router';
import { Seo } from '../components/common/Seo';
import ReportStatus from '../features/clusters/components/ReportStatus';

export default function ReportStatusPage() {
  const { id = '' } = useParams();
  return (
    <div className="prose-container py-12">
      <Seo title="Report status" noindex />
      <h1 className="page-title mb-1">Report status</h1>
      <p className="mb-6 text-sm text-muted-foreground">Your reference: {id}</p>
      <ReportStatus reportId={id} />
    </div>
  );
}
