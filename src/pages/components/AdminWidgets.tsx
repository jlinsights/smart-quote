import React from 'react';

const CustomerManagement = React.lazy(() => import('@/features/admin/components/CustomerManagement').then(m => ({ default: m.CustomerManagement })));
const FscRateWidget = React.lazy(() => import('@/features/admin/components/FscRateWidget').then(m => ({ default: m.FscRateWidget })));
const RateTableViewer = React.lazy(() => import('@/features/admin/components/RateTableViewer').then(m => ({ default: m.RateTableViewer })));
const UserManagementWidget = React.lazy(() => import('@/features/admin/components/UserManagementWidget').then(m => ({ default: m.UserManagementWidget })));
const AuditLogViewer = React.lazy(() => import('@/features/admin/components/AuditLogViewer').then(m => ({ default: m.AuditLogViewer })));
const TargetMarginRulesWidget = React.lazy(() => import('@/features/admin/components/TargetMarginRulesWidget').then(m => ({ default: m.TargetMarginRulesWidget })));
const SurchargeManagementWidget = React.lazy(() => import('@/features/admin/components/SurchargeManagementWidget').then(m => ({ default: m.SurchargeManagementWidget })));

export const AdminWidgets: React.FC = () => {
  return (
    <React.Suspense fallback={<div className="mt-8 space-y-6">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>}>
      <div className="mt-8 space-y-6">
        <CustomerManagement />
        <TargetMarginRulesWidget />
        <FscRateWidget />
        <SurchargeManagementWidget />
        <RateTableViewer />
        <UserManagementWidget />
        <AuditLogViewer />
      </div>
    </React.Suspense>
  );
};
