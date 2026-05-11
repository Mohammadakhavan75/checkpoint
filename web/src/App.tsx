import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";

import { AppShell } from "./components/AppShell";
import { AuthPage } from "./pages/AuthPage";
import { LifeIndexPage } from "./pages/LifeIndexPage";
import { MissionSnapshotPage } from "./pages/MissionSnapshotPage";
import { ParkingPage } from "./pages/ParkingPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StopCheckpointPage } from "./pages/StopCheckpointPage";
import { TodayPage } from "./pages/TodayPage";
import { useAuth } from "./lib/auth";

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="boot-screen">Checkpoint</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />
      <Route
        path="/"
        element={
          <Protected>
            <AppShell />
          </Protected>
        }
      >
        <Route index element={<Navigate to="/today" replace />} />
        <Route path="today" element={<TodayPage />} />
        <Route path="today/checkpoint" element={<StopCheckpointPage />} />
        <Route path="life-index" element={<LifeIndexPage />} />
        <Route path="missions/:missionId" element={<MissionSnapshotPage />} />
        <Route path="parking" element={<ParkingPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/today" replace />} />
    </Routes>
  );
}
