import { useEffect, useState } from "react";
import keycloak from "./auth/keycloak.js";
import api from "./api/api.js";

import Sidebar from "./components/Sidebar.jsx";
import Topbar from "./components/Topbar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Doctors from "./pages/Doctors.jsx";
import Patients from "./pages/Patients.jsx";
import Appointments from "./pages/Appointments.jsx";
import Notifications from "./pages/Notifications.jsx";

function App({ authenticated }) {
  const [activePage, setActivePage] = useState("Dashboard");
  const [patientLinkReady, setPatientLinkReady] = useState(false);
  const [patientLinkError, setPatientLinkError] = useState("");

  const roles = keycloak.tokenParsed?.realm_access?.roles || [];
  const isAdmin = roles.includes("ADMIN");
  const isPatient = roles.includes("PATIENT");

  const username =
    keycloak.tokenParsed?.preferred_username ||
    keycloak.tokenParsed?.name ||
    "Hospital User";

  useEffect(() => {
    if (!authenticated || !keycloak.authenticated) {
      setPatientLinkReady(false);
      setPatientLinkError("");
      return;
    }

    // Only patient accounts need patient-profile linking.
    if (!isPatient) {
      setPatientLinkReady(true);
      setPatientLinkError("");
      return;
    }

    let cancelled = false;

    async function linkPatientProfile() {
      setPatientLinkReady(false);
      setPatientLinkError("");

      try {
        // First, check whether this Keycloak account is already linked.
        try {
          await api.get("/api/patients/me");
          console.log("Patient profile is already linked.");
        } catch (error) {
          // Only a 404 should trigger the automatic linking request.
          if (error.response?.status !== 404) {
            throw error;
          }

          // Link the existing administrator-created profile by verified email.
          const response = await api.post("/api/patients/me/link");
          console.log("Patient profile linked successfully:", response.data);
        }
      } catch (error) {
        console.error("Patient profile check/link failed:", error);

        const message =
          error.response?.data?.detail ||
          error.response?.data?.message ||
          error.message ||
          "Unable to check your patient profile.";

        if (!cancelled) {
          setPatientLinkError(message);
        }
      } finally {
        if (!cancelled) {
          setPatientLinkReady(true);
        }
      }
    }

    linkPatientProfile();

    return () => {
      cancelled = true;
    };
  }, [authenticated, isPatient]);

  function handleLogin() {
    keycloak.login();
  }

  function handleLogout() {
    keycloak.logout({
      redirectUri: window.location.origin,
    });
  }

  if (!authenticated || !keycloak.authenticated) {
    return (
      <main className="login-screen">
        <div className="login-card">
          <div className="login-logo">✚</div>
          <h1>CarePoint</h1>
          <p>Hospital Management System</p>

          <button className="primary-button" onClick={handleLogin}>
            Sign in with Keycloak
          </button>

          <span className="secure-note">
            Secure authentication powered by Keycloak
          </span>
        </div>
      </main>
    );
  }

  // Show a loading screen only while the patient profile check is running.
  if (isPatient && !patientLinkReady) {
    return (
      <main className="login-screen">
        <div className="login-card">
          <div className="login-logo">✚</div>
          <h1>CarePoint</h1>
          <p>Checking your patient profile...</p>
        </div>
      </main>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        onLogout={handleLogout}
      />

      <main className="main-area">
        <Topbar activePage={activePage} username={username} />

        {isPatient && patientLinkError && (
          <div className="error-message" role="alert">
            <strong>Patient profile issue</strong>
            <p>{patientLinkError}</p>
            <p>
              You are signed in, but your patient profile could not be linked.
              Check that your administrator-created patient record uses your
              verified Keycloak email.
            </p>
          </div>
        )}

        {activePage === "Doctors" ? (
          <Doctors isAdmin={isAdmin} />
        ) : activePage === "Patients" ? (
          <Patients isAdmin={isAdmin} />
        ) : activePage === "Appointments" ? (
          <Appointments />
        ) : activePage === "Notifications" ? (
          <Notifications roles={roles} />
        ) : (
          <Dashboard activePage={activePage} />
        )}
      </main>
    </div>
  );
}

export default App;