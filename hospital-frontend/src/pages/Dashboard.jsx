
import { useEffect, useMemo, useState } from "react";
import api from "../api/api.js";
import keycloak from "../auth/keycloak.js";
import StatCard from "../components/StatCard.jsx";

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Dashboard({ activePage }) {
  const roles = keycloak.tokenParsed?.realm_access?.roles || [];
  const isAdmin = roles.includes("ADMIN");
  const isDoctor = roles.includes("DOCTOR");
  const isPatient = roles.includes("PATIENT");

  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [profile, setProfile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        if (!isAdmin && !isDoctor && !isPatient) {
          throw new Error(
            "Your account does not have a supported hospital role."
          );
        }

        // The doctors endpoint permits authorized hospital users.
        const doctorRequest = api.get("/api/doctors");

        let doctorData = [];
        let patientData = [];
        let appointmentData = [];
        let profileData = null;

        if (isAdmin) {
          const [doctorResponse, patientResponse, appointmentResponse] =
            await Promise.all([
              doctorRequest,
              api.get("/api/patients"),
              api.get("/api/appointments"),
            ]);

          doctorData = Array.isArray(doctorResponse.data)
            ? doctorResponse.data
            : [];

          patientData = Array.isArray(patientResponse.data)
            ? patientResponse.data
            : [];

          appointmentData = Array.isArray(appointmentResponse.data)
            ? appointmentResponse.data
            : [];
        } else if (isDoctor) {
          const [doctorResponse, profileResponse] = await Promise.all([
            doctorRequest,
            api.get("/api/doctors/me"),
          ]);

          doctorData = Array.isArray(doctorResponse.data)
            ? doctorResponse.data
            : [];

          profileData = profileResponse.data;

          if (!profileData?.id) {
            throw new Error(
              "Your Keycloak account is not linked to a doctor profile."
            );
          }

          const appointmentResponse = await api.get(
            `/api/appointments/doctor/${profileData.id}`
          );

          appointmentData = Array.isArray(appointmentResponse.data)
            ? appointmentResponse.data
            : [];
        } else {
          const [doctorResponse, profileResponse] = await Promise.all([
            doctorRequest,
            api.get("/api/patients/me"),
          ]);

          doctorData = Array.isArray(doctorResponse.data)
            ? doctorResponse.data
            : [];

          profileData = profileResponse.data;

          if (!profileData?.id) {
            throw new Error(
              "Your Keycloak account is not linked to a patient profile."
            );
          }

          const appointmentResponse = await api.get(
            `/api/appointments/patient/${profileData.id}`
          );

          appointmentData = Array.isArray(appointmentResponse.data)
            ? appointmentResponse.data
            : [];
        }

        if (!cancelled) {
          setDoctors(doctorData);
          setPatients(patientData);
          setAppointments(appointmentData);
          setProfile(profileData);
        }
      } catch (err) {
        console.error("Unable to load dashboard:", err);

        if (!cancelled) {
          const status = err.response?.status;

          setError(
            status === 401
              ? "Your session has expired. Please sign in again."
              : status === 403
                ? "Your account does not have permission to retrieve this information."
                : err.response?.data?.message ||
                  err.response?.data?.detail ||
                  err.message ||
                  "Unable to load dashboard data."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [isAdmin, isDoctor, isPatient]);

  const availableDoctors = doctors.filter(
    (doctor) => doctor.available === true
  ).length;

  const appointmentCounts = useMemo(() => ({
    scheduled: appointments.filter(
      (appointment) => appointment.status === "SCHEDULED"
    ).length,
    confirmed: appointments.filter(
      (appointment) => appointment.status === "CONFIRMED"
    ).length,
    completed: appointments.filter(
      (appointment) => appointment.status === "COMPLETED"
    ).length,
    cancelled: appointments.filter(
      (appointment) => appointment.status === "CANCELLED"
    ).length,
  }), [appointments]);

  const recentAppointments = useMemo(() => {
    return [...appointments]
      .sort(
        (a, b) =>
          new Date(b.appointmentDateTime).getTime() -
          new Date(a.appointmentDateTime).getTime()
      )
      .slice(0, 5);
  }, [appointments]);

  if (activePage !== "Dashboard" && activePage !== "Doctors") {
    return (
      <section className="placeholder-page">
        <div className="placeholder-icon">✚</div>
        <h2>{activePage}</h2>
        <p>This module will be connected to your backend in a later step.</p>
      </section>
    );
  }

  const welcomeTitle = isAdmin
    ? "Hospital Administration"
    : isDoctor
      ? `Welcome, Dr. ${profile?.firstName || ""}`.trim()
      : `Welcome, ${profile?.firstName || "Patient"}`;

  return (
    <div className="dashboard-content">
      <section className="welcome-banner">
        <div>
          <p className="eyebrow">HOSPITAL OVERVIEW</p>
          <h2>{welcomeTitle}</h2>
          <p>
            {isAdmin
              ? "Monitor hospital resources, medical staff, and appointments."
              : isDoctor
                ? "Review your appointment schedule and medical team."
                : "Manage your visits and keep track of your appointments."}
          </p>
          <span className="dashboard-role">
            {isAdmin ? "ADMINISTRATOR" : isDoctor ? "DOCTOR" : "PATIENT"}
          </span>
        </div>

        <div className="welcome-symbol">✚</div>
      </section>

      {error && (
        <div className="error-message dashboard-error" role="alert">
          <strong>Dashboard data unavailable</strong>
          <p>{error}</p>
          <button
            className="refresh-button"
            onClick={() => window.location.reload()}
          >
            Reload dashboard
          </button>
        </div>
      )}

      <section className="stats-grid">
        <StatCard
          title="Total Doctors"
          value={loading ? "..." : doctors.length}
          description="Doctors returned by the service"
          icon="⚕"
          color="blue"
        />

        <StatCard
          title="Available Doctors"
          value={loading ? "..." : availableDoctors}
          description="Currently marked available"
          icon="✓"
          color="green"
        />

        <StatCard
          title={isAdmin ? "Total Patients" : isDoctor ? "Patients Seen" : "My Profile"}
          value={
            loading
              ? "..."
              : isAdmin
                ? patients.length
                : isDoctor
                  ? new Set(appointments.map((a) => a.patientId)).size
                  : profile?.id
                    ? "Active"
                    : "—"
          }
          description={
            isAdmin
              ? "Registered patient records"
              : isDoctor
                ? "Unique patients in your appointments"
                : profile?.id
                  ? `Patient ID: ${profile.id}`
                  : "Your linked patient profile"
          }
          icon="♙"
          color="purple"
        />

        <StatCard
          title={isAdmin ? "Total Appointments" : "My Appointments"}
          value={loading ? "..." : appointments.length}
          description={
            isAdmin
              ? "Hospital-wide appointment records"
              : "Appointments available to your account"
          }
          icon="▣"
          color="orange"
        />
      </section>

      <section className="stats-grid appointment-stat-grid">
        <StatCard
          title="Scheduled"
          value={loading ? "..." : appointmentCounts.scheduled}
          description="Awaiting confirmation"
          icon="◷"
          color="orange"
        />

        <StatCard
          title="Confirmed"
          value={loading ? "..." : appointmentCounts.confirmed}
          description="Confirmed appointments"
          icon="✓"
          color="blue"
        />

        <StatCard
          title="Completed"
          value={loading ? "..." : appointmentCounts.completed}
          description="Completed appointments"
          icon="✔"
          color="green"
        />

        <StatCard
          title="Cancelled"
          value={loading ? "..." : appointmentCounts.cancelled}
          description="Cancelled appointments"
          icon="×"
          color="purple"
        />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Recent Appointments</h2>
            <p>Latest appointments available to your account</p>
          </div>

          <span className="live-badge">
            <span className="live-dot"></span>
            Live API
          </span>
        </div>

        {loading && (
          <p className="state-message">Loading dashboard information...</p>
        )}

        {!loading && !error && recentAppointments.length === 0 && (
          <p className="state-message">
            No appointments are available yet.
          </p>
        )}

        {!loading && !error && recentAppointments.length > 0 && (
          <div className="table-wrapper">
            <table className="doctor-table">
              <thead>
                <tr>
                  <th>APPOINTMENT</th>
                  {isAdmin && <th>PATIENT ID</th>}
                  <th>DOCTOR ID</th>
                  <th>DATE &amp; TIME</th>
                  <th>REASON</th>
                  <th>STATUS</th>
                </tr>
              </thead>

              <tbody>
                {recentAppointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td>
                      <strong>#{appointment.id}</strong>
                    </td>

                    {isAdmin && <td>{appointment.patientId}</td>}

                    <td>{appointment.doctorId}</td>

                    <td>
                      {formatDateTime(appointment.appointmentDateTime)}
                    </td>

                    <td>{appointment.reason || "—"}</td>

                    <td>
                      <span
                        className={`status-badge appointment-status status-${(
                          appointment.status || "scheduled"
                        ).toLowerCase()}`}
                      >
                        {appointment.status || "UNKNOWN"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel dashboard-team-panel">
        <div className="panel-header">
          <div>
            <h2>Medical Team</h2>
            <p>Doctors currently registered in the system</p>
          </div>
        </div>

        {loading && <p className="state-message">Loading medical team...</p>}

        {!loading && !error && doctors.length === 0 && (
          <p className="state-message">No doctors were returned by the API.</p>
        )}

        {!loading && !error && doctors.length > 0 && (
          <div className="table-wrapper">
            <table className="doctor-table">
              <thead>
                <tr>
                  <th>DOCTOR</th>
                  <th>SPECIALIZATION</th>
                  <th>DEPARTMENT</th>
                  <th>CONSULTATION FEE</th>
                  <th>STATUS</th>
                </tr>
              </thead>

              <tbody>
                {doctors.map((doctor) => (
                  <tr key={doctor.id}>
                    <td>
                      <div className="doctor-cell">
                        <div className="doctor-avatar">
                          {(doctor.firstName || "D").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong>
                            Dr. {doctor.firstName} {doctor.lastName}
                          </strong>
                          <span>{doctor.email || "—"}</span>
                        </div>
                      </div>
                    </td>

                    <td>{doctor.specialization || "—"}</td>
                    <td>{doctor.department || "—"}</td>
                    <td>
                      {doctor.consultationFee != null
                        ? `₹${Number(doctor.consultationFee).toLocaleString("en-IN")}`
                        : "—"}
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          doctor.available
                            ? "status-available"
                            : "status-unavailable"
                        }`}
                      >
                        {doctor.available ? "Available" : "Unavailable"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default Dashboard;
