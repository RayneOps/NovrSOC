import { redirect } from 'next/navigation';

export default function PortalIncidentsRedirect() {
    redirect('/security-operations/incidents');
}
