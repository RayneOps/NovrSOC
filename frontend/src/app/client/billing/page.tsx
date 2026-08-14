import { CreditCard } from 'lucide-react';
import { FeatureStub } from '@/components/shared/FeatureStub';

export default function Page() {
    return (
        <FeatureStub
            domain="Account"
            title="Billing & Subscription"
            description="Manage your subscription plan, payment methods, and invoices."
            icon={CreditCard}
            emptyTitle="No billing information yet"
            emptyDescription="Your subscription and billing details will appear here."
            actionLabel="Manage Subscription"
        />
    );
}
