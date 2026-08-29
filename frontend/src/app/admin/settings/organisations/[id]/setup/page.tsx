import { OrgSetupWizard } from '@/components/features/OrgSetupWizard';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <OrgSetupWizard orgId={id} />;
}
