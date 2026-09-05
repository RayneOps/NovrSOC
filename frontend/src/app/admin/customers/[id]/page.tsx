import { CustomerDetail } from '@/components/features/CustomerDetail';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <CustomerDetail orgId={id} />;
}
