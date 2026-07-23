import { useEffect, useMemo, useRef, useState } from "react";
import { createHttpClient } from "./api/httpClient";
import { createApi } from "./api/services";
import { AppProvider } from "./AppContext";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthLayout } from "./components/layout/AuthLayout";
import { StatusBanner } from "./components/common/StatusBanner";
import { RoomDetailPanel } from "./components/rooms/RoomDetailPanel";
import { AdminLoginPanel } from "./features/auth/AdminLoginPanel";
import { AuthPanel } from "./features/auth/AuthPanel";
import { BrowseView } from "./features/browse/BrowseView";
import { ListingView } from "./features/listing/ListingView";
import { InboxView } from "./features/inbox/InboxView";
import { ProfileView } from "./features/profile/ProfileView";
import { AdminView } from "./features/admin/AdminView";
import { CompareView } from "./features/compare/CompareView";
import { SavedSearchesView } from "./features/saved_searches/SavedSearchesView";
import { usePersistentState } from "./hooks/usePersistentState";
import { buildHash, parseHash, DEFAULT_VIEW } from "./utils/navigation";

function App() {
  const [apiBase, setApiBase] = usePersistentState("pgfinder_api_base", "http://127.0.0.1:8000");
  const [token, setToken] = usePersistentState("pgfinder_token", "");
  const [currentUser, setCurrentUser] = useState(null);
  const [sessionRole, setSessionRole] = usePersistentState("pgfinder_session_role", "");
  const [status, setStatus] = useState(null);
  const initialRoute = parseHash(window.location.hash);
  const [activeView, setActiveView] = useState(initialRoute.view || DEFAULT_VIEW);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const hasHydratedRouteRef = useRef(false);

  const httpClient = useMemo(
    () =>
      createHttpClient({
        getBaseUrl: () => apiBase,
        getToken: () => token,
      }),
    [apiBase, token]
  );
  const api = useMemo(() => createApi(httpClient), [httpClient]);

  useEffect(() => {
    if (!token || currentUser || sessionRole === "admin") return;
    loadCurrentUser("auth").catch((error) => {
      announce(`Stored session could not be restored: ${error.message}`, "error");
      setToken("");
      setSessionRole("");
    });
  }, [token, currentUser, sessionRole]);

  useEffect(() => {
    const syncFromHash = () => {
      const route = parseHash(window.location.hash);
      setActiveView(route.view || DEFAULT_VIEW);

      if (route.view !== "detail" || !route.roomId || !token) return;
      if (selectedRoom?.id === route.roomId) return;

      api.rooms
        .detail(route.roomId)
        .then((room) => {
          setSelectedRoom(room);
        })
        .catch(() => {});
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [api.rooms, token, selectedRoom?.id]);

  useEffect(() => {
    if (!token) return;

    const targetHash = buildHash(activeView, selectedRoom?.id);
    if (window.location.hash !== targetHash) {
      window.history.replaceState(null, "", targetHash);
    }
  }, [activeView, selectedRoom?.id, token]);

  useEffect(() => {
    if (hasHydratedRouteRef.current) return;
    hasHydratedRouteRef.current = true;

    if (initialRoute.view === "detail" && initialRoute.roomId) {
      setActiveView("detail");
    }
  }, [initialRoute.roomId, initialRoute.view]);

  useEffect(() => {
    if (activeView === "admin" && sessionRole !== "admin") {
      setActiveView(DEFAULT_VIEW);
      announce("Admin panel is restricted.", "error");
    }
  }, [activeView, sessionRole]);

  function announce(message, tone = "info") {
    setStatus({ message, tone, id: Date.now() });
  }

  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => {
        setStatus(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  async function loadCurrentUser(path = "auth") {
    const profile = path === "auth" ? await api.auth.me() : await api.users.me();
    setCurrentUser(profile);
    return profile;
  }

  const contextValue = {
    api,
    announce,
    token,
    setToken,
    sessionRole,
    setSessionRole,
    currentUser,
    setCurrentUser,
    loadCurrentUser
  };

  async function handleLogout() {
    try {
      if (token) {
        await api.auth.logout();
      }
    } catch (error) {
      announce(`Logout notice: ${error.message}`, "error");
    } finally {
      setToken("");
      setSessionRole("");
      setCurrentUser(null);
      setSelectedRoom(null);
      setActiveView(DEFAULT_VIEW);
      window.history.replaceState(null, "", window.location.pathname);
      announce("Signed out.");
    }
  }

  async function handleOpenRoom(roomId) {
    try {
      const room = await api.rooms.detail(roomId);
      setSelectedRoom(room);
      setActiveView("detail");
      try {
        await api.rooms.trackView(roomId);
      } catch (error) {
        announce(`Room opened, but view tracking skipped: ${error.message}`);
      }
      announce(`Opened ${room.title}.`);
    } catch (error) {
      announce(`Could not open room: ${error.message}`, "error");
    }
  }

  if (!token && activeView === "admin-login") {
    return (
      <AppProvider value={contextValue}>
        <AuthLayout apiBase={apiBase} setApiBase={setApiBase}>
          <AdminLoginPanel onSuccess={() => setActiveView("admin")} />
        </AuthLayout>
        <StatusBanner status={status} />
      </AppProvider>
    );
  }

  if (!token) {
    return (
      <AppProvider value={contextValue}>
        <AuthLayout apiBase={apiBase} setApiBase={setApiBase}>
          <AuthPanel />
        </AuthLayout>
        <StatusBanner status={status} />
      </AppProvider>
    );
  }

  return (
    <AppProvider value={contextValue}>
      <AppLayout
        activeView={activeView}
        setActiveView={setActiveView}
        currentUser={currentUser}
        onLogout={handleLogout}
      >
        <StatusBanner status={status} />
        {activeView === "browse" && (
          <BrowseView onOpenRoom={handleOpenRoom} />
        )}
        {activeView === "compare" && (
          <CompareView onOpenRoom={handleOpenRoom} />
        )}
        {activeView === "saved-searches" && (
          <SavedSearchesView />
        )}
        {activeView === "detail" && (
          <RoomDetailPanel
            room={selectedRoom}
            onInterestSent={() => setActiveView("inbox")}
            onBack={() => setActiveView("browse")}
          />
        )}
        {activeView === "listing" && (
          <ListingView />
        )}
        {activeView === "inbox" && (
          <InboxView />
        )}
        {activeView === "profile" && (
          <ProfileView />
        )}
        {activeView === "admin" && sessionRole === "admin" && (
          <AdminView />
        )}
      </AppLayout>
    </AppProvider>
  );
}

export default App;
