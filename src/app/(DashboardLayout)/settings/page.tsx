'use client';
import { Typography } from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import DashboardCard from '@/app/(DashboardLayout)/components/shared/DashboardCard';


const SamplePage = () => {
  return (
    <PageContainer title="Settings" description="this is Settings page">
      <DashboardCard title="Settings">
        <Typography>This is a settings page</Typography>
      </DashboardCard>
    </PageContainer>
  );
};

export default SamplePage;

