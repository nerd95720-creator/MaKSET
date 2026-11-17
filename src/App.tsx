import React from 'react';
import { LayoutShell } from './components/LayoutShell';
import { CreatorAdminScreen, MoreScreen, StaffAccessScreen } from './screens/AdminAndMoreScreens';
import { EncounterFormScreen, SelectEncounterScreen } from './screens/EncounterScreens';
import { HomeScreen } from './screens/HomeScreen';
import {
  HistoryScreen,
  ProfileScreen,
  RegisterScreen,
  SearchScreen,
  ShareHistoryScreen,
  VerifyScreen,
} from './screens/PatientsScreens';
import {
  CaseNotificationScreen,
  DashboardsScreen,
  ReferralNoteScreen,
  ReferralOutcomeScreen,
  ReferralsListScreen,
  ReferPatientScreen,
  ReportsScreen,
  SurveillanceScreen,
} from './screens/ReferralsAndReportsScreens';
import { LoginScreen, SplashScreen } from './screens/SplashAndLogin';
import { NotificationsScreen, TaskDetailScreen, TasksScreen } from './screens/TasksAndNotifScreens';
import { CareSyncProvider, useCareSync } from './store/useCareSyncStore';

const ScreenRouter: React.FC = () => {
  const { currentScreen } = useCareSync();

  switch (currentScreen) {
    case 'splash':
      return <SplashScreen />;
    case 'login':
      return <LoginScreen />;
    case 'home':
      return <HomeScreen />;
    case 'search':
      return <SearchScreen />;
    case 'register':
      return <RegisterScreen />;
    case 'verify':
      return <VerifyScreen />;
    case 'profile':
      return <ProfileScreen />;
    case 'hist':
    case 'encs':
      return <HistoryScreen />;
    case 'shr':
      return <ShareHistoryScreen />;
    case 'sel':
      return <SelectEncounterScreen />;
    case 'opd':
      return <EncounterFormScreen forcedType="OPD" />;
    case 'gen':
      return <EncounterFormScreen />;
    case 'imm':
      return <EncounterFormScreen forcedType="Immunization" />;
    case 'tasks':
      return <TasksScreen />;
    case 'tdet':
      return <TaskDetailScreen />;
    case 'notif':
      return <NotificationsScreen />;
    case 'ref':
      return <ReferPatientScreen />;
    case 'note':
      return <ReferralNoteScreen />;
    case 'refs':
      return <ReferralsListScreen />;
    case 'rfo':
      return <ReferralOutcomeScreen />;
    case 'reports':
      return <ReportsScreen />;
    case 'dash':
      return <DashboardsScreen />;
    case 'surv':
      return <SurveillanceScreen />;
    case 'cs':
      return <CaseNotificationScreen />;
    case 'stf':
      return <StaffAccessScreen />;
    case 'adm':
      return <CreatorAdminScreen />;
    case 'more':
      return <MoreScreen />;
    default:
      return <HomeScreen />;
  }
};

export default function App() {
  return (
    <CareSyncProvider>
      <LayoutShell>
        <ScreenRouter />
      </LayoutShell>
    </CareSyncProvider>
  );
}
