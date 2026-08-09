import { redirect } from 'next/navigation';

export default function PortalScanRedirect() {
    redirect('/threat-intelligence/url-scan');
}
