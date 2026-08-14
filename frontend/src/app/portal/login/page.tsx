import { redirect } from 'next/navigation';

export default function PortalLoginRedirect() {
    redirect('/client/login');
}
