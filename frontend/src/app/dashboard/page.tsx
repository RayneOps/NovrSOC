'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { DashboardSelector } from '@/components/layout/DashboardSelector';
import { RightRail } from '@/components/layout/RightRail';
import { getPortalContext } from '@/lib/portal-context';
import { isAdminAuthenticated } from '@/lib/admin-auth';

import { GeneralDashboard } from '@/components/dashboards/GeneralDashboard';
import { PortalDashboard } from '@/components/dashboards/PortalDashboard';
import { ExecutiveDashboard } from '@/components/dashboards/ExecutiveDashboard';
import { ManagerDashboard } from '@/components/dashboards/ManagerDashboard';
import { AnalystDashboard } from '@/components/dashboards/AnalystDashboard';

import {
  ComplianceDashboard,
  SoarDashboard,
  ReportingDashboard,
  CustomerDashboard,
  NovrAiCommandCenter
} from '@/components/dashboards/PlatformDashboards';

export default function DashboardPage() {
  const router = useRouter();
  const [activeDashboard, setActiveDashboard] = useState<string>('General');
  const [isPortal, setIsPortal] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const portal = getPortalContext();
    if (!portal.isPortal && !isAdminAuthenticated()) {
      router.replace('/login');
      return;
    }
    setIsPortal(portal.isPortal);
    setAuthChecked(true);
  }, [router]);

  const renderDashboard = () => {
    switch (activeDashboard) {
      case 'General':                return <GeneralDashboard />;
      case 'Executive':              return <ExecutiveDashboard />;
      case 'SOC Manager':            return <ManagerDashboard />;
      case 'SOC Analyst':            return <AnalystDashboard />;
      case 'Compliance':             return <ComplianceDashboard />;
      case 'SOAR Platform':          return <SoarDashboard />;
      case 'Reporting Center':       return <ReportingDashboard />;
      case 'Customer Multi-Tenant':  return <CustomerDashboard />;
      case 'NovrAI Command Center':  return <NovrAiCommandCenter />;
      default:                       return <GeneralDashboard />;
    }
  };

  if (!authChecked) return null;

  return (
    <div className="min-h-screen bg-surface text-foreground flex font-sans antialiased">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Header currentDashboard={isPortal ? 'Dashboard' : activeDashboard} />
        {!isPortal && <DashboardSelector value={activeDashboard} onChange={setActiveDashboard} />}
        <div className="p-8 flex-1 overflow-y-auto">
          {isPortal ? <PortalDashboard /> : renderDashboard()}
        </div>
      </div>
      <RightRail />
    </div>
  );
}
