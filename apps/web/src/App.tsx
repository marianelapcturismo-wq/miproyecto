import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { RoomTypesPage } from './pages/RoomTypesPage';
import { RoomsPage } from './pages/RoomsPage';
import { GuestsPage } from './pages/GuestsPage';
import { GuestDetailPage } from './pages/GuestDetailPage';
import { ReservationsPage } from './pages/ReservationsPage';
import { ReservationDetailPage } from './pages/ReservationDetailPage';
import { CalendarPage } from './pages/CalendarPage';
import { ServicesPage } from './pages/ServicesPage';
import { CashPage } from './pages/CashPage';
import { HousekeepingPage } from './pages/HousekeepingPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { RatesPage } from './pages/RatesPage';
import { ChannelsPage } from './pages/ChannelsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/reservations" element={<ReservationsPage />} />
          <Route path="/reservations/:id" element={<ReservationDetailPage />} />
          <Route path="/guests" element={<GuestsPage />} />
          <Route path="/guests/:id" element={<GuestDetailPage />} />
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/housekeeping" element={<HousekeepingPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/room-types" element={<RoomTypesPage />} />
          <Route path="/rates" element={<RatesPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/channels" element={<ChannelsPage />} />
          <Route path="/cash" element={<CashPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
