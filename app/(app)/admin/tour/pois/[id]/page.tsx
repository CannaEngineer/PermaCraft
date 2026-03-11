import { TourAdminPoiEditor } from '@/components/tour/admin/tour-admin-poi-editor';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminTourPoiEditorPage({ params }: Props) {
  const { id } = await params;
  return <TourAdminPoiEditor poiId={id} />;
}
