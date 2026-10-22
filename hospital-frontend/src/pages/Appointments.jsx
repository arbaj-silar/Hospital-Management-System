
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/api.js";
import keycloak from "../auth/keycloak.js";

const STATUSES = ["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED"];

const emptyForm = {
  patientId: "",
  doctorId: "",
  appointmentDateTime: "",
  reason: "",
};

function getErrorMessage(err, fallback) {
  if (err.response?.status === 401) {
    return "Your session has expired or is unauthorized. Please sign in again.";
  }

  if (err.response?.status === 403) {
    return err.response?.data?.message ||
      "Access denied. Your account cannot perform this action.";
  }

  return err.response?.data?.message ||
    err.response?.data?.detail ||
    err.message ||
    fallback;
}

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

function toLocalDateTimeInput(date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function Appointments() {
  const roles = keycloak.tokenParsed?.realm_access?.roles || [];
  const isAdmin = roles.includes("ADMIN");
  const isDoctor = roles.includes("DOCTOR");
  const isPatient = roles.includes("PATIENT");

  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [currentProfile, setCurrentProfile] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadAppointments = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      let appointmentResponse;
      const requests = [api.get("/api/doctors")];

      if (isAdmin) {
        requests.push(api.get("/api/patients"));
        requests.push(api.get("/api/appointments"));
      } else if (isDoctor) {
        requests.push(api.get("/api/doctors/me"));
      } else if (isPatient) {
        requests.push(api.get("/api/patients/me"));
      } else {
        throw new Error("Your account has no supported hospital role.");
      }

      const responses = await Promise.all(requests);
      setDoctors(Array.isArray(responses[0].data) ? responses[0].data : []);

      if (isAdmin) {
        setPatients(Array.isArray(responses[1].data) ? responses[1].data : []);
        appointmentResponse = responses[2];
        setCurrentProfile(null);
      } else {
        const profile = responses[1].data;
        setCurrentProfile(profile);

        if (!profile?.id) {
          throw new Error(
            "Your Keycloak account is not linked to a hospital profile. Contact an administrator."
          );
        }

        appointmentResponse = isDoctor
          ? await api.get(`/api/appointments/doctor/${profile.id}`)
          : await api.get(`/api/appointments/patient/${profile.id}`);

        setPatients([]);
      }

      if (!Array.isArray(appointmentResponse.data)) {
        throw new Error("The Appointment API did not return a list.");
      }

      setAppointments(appointmentResponse.data);
    } catch (err) {
      console.error("Unable to load appointments:", err);
      setAppointments([]);
      setError(
        getErrorMessage(
          err,
          "Unable to load appointments. Check the API Gateway and backend services."
        )
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, isDoctor, isPatient]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const filteredAppointments = useMemo(() => {
    const term = search.trim().toLowerCase();

    return appointments.filter((appointment) => {
      const matchesSearch =
        !term ||
        String(appointment.id ?? "").includes(term) ||
        String(appointment.patientId ?? "").includes(term) ||
        String(appointment.doctorId ?? "").includes(term) ||
        (appointment.reason || "").toLowerCase().includes(term) ||
        (appointment.status || "").toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "All" ||
        appointment.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [appointments, search, statusFilter]);

  const counts = useMemo(() => ({
    total: appointments.length,
    scheduled: appointments.filter((a) => a.status === "SCHEDULED").length,
    confirmed: appointments.filter((a) => a.status === "CONFIRMED").length,
    completed: appointments.filter((a) => a.status === "COMPLETED").length,
  }), [appointments]);

  function openBookingForm() {
    setForm({
      ...emptyForm,
      patientId: isPatient && currentProfile?.id
        ? String(currentProfile.id)
        : "",
      doctorId: "",
      appointmentDateTime: toLocalDateTimeInput(
        new Date(Date.now() + 60 * 60 * 1000)
      ),
    });
    setFormError("");
    setNotice("");
    setShowForm(true);
  }

  function closeBookingForm() {
    if (saving) return;
    setShowForm(false);
    setForm({ ...emptyForm });
    setFormError("");
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleBooking(event) {
    event.preventDefault();
    setFormError("");
    setNotice("");

    const patientId = isPatient
      ? currentProfile?.id
      : Number(form.patientId);

    const doctorId = Number(form.doctorId);

    if (!patientId || !doctorId || !form.appointmentDateTime ||
        !form.reason.trim()) {
      setFormError("Complete all required fields before booking.");
      return;
    }

    if (new Date(form.appointmentDateTime).getTime() <= Date.now()) {
      setFormError("Choose a future appointment date and time.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/api/appointments", {
        patientId: Number(patientId),
        doctorId,
        appointmentDateTime: form.appointmentDateTime,
        reason: form.reason.trim(),
      });

      setShowForm(false);
      setForm({ ...emptyForm });
      setNotice("Appointment booked successfully.");
      await loadAppointments(true);
    } catch (err) {
      console.error("Unable to book appointment:", err);
      setFormError(
        getErrorMessage(err, "Unable to book the appointment.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(appointment, status) {
    if (status === appointment.status) return;

    if (!isAdmin && !isDoctor) {
      setError("Your role cannot update appointment status.");
      return;
    }

    if (
      isDoctor &&
      !["CONFIRMED", "COMPLETED"].includes(status)
    ) {
      setError("Doctors can only confirm or complete appointments.");
      return;
    }

    setUpdatingId(appointment.id);
    setError("");
    setNotice("");

    try {
      await api.patch(
        `/api/appointments/${appointment.id}/status`,
        null,
        { params: { status } }
      );

      setNotice(`Appointment #${appointment.id} updated to ${status}.`);
      await loadAppointments(true);
    } catch (err) {
      console.error("Unable to update appointment status:", err);
      setError(
        getErrorMessage(err, "Unable to update appointment status.")
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleCancelOrDelete(appointment) {
    if (isDoctor || (!isAdmin && !isPatient)) return;

    const action = isAdmin ? "permanently delete" : "cancel";
    const confirmed = window.confirm(
      `Are you sure you want to ${action} appointment #${appointment.id}?`
    );

    if (!confirmed) return;

    setDeletingId(appointment.id);
    setError("");
    setNotice("");

    try {
      await api.delete(`/api/appointments/${appointment.id}`);

      setNotice(
        isAdmin
          ? `Appointment #${appointment.id} deleted.`
          : `Appointment #${appointment.id} cancelled.`
      );

      await loadAppointments(true);
    } catch (err) {
      console.error("Unable to cancel/delete appointment:", err);
      setError(
        getErrorMessage(err, "Unable to cancel or delete this appointment.")
      );
    } finally {
      setDeletingId(null);
    }
  }

  function availableStatusOptions(appointment) {
    if (isAdmin) return STATUSES;
    if (isDoctor) return ["CONFIRMED", "COMPLETED"];
    return [];
  }

  return (
    <div className="dashboard-content appointments-page">
      <section className="doctors-heading">
        <div>
          <p className="eyebrow doctors-eyebrow">CARE COORDINATION</p>
          <h2>Appointments Management</h2>
          <p className="doctors-subtitle">
            {isAdmin
              ? "Manage hospital appointments and their status."
              : isDoctor
                ? "Review and update appointments assigned to you."
                : "Book appointments and manage your upcoming visits."}
          </p>
        </div>

        <div className="doctors-heading-actions">
          {(isAdmin || isPatient) && (
            <button
              className="primary-button"
              onClick={openBookingForm}
              disabled={loading || (isPatient && !currentProfile?.id)}
            >
              + Book Appointment
            </button>
          )}

          <button
            className="refresh-button"
            onClick={() => loadAppointments(true)}
            disabled={loading || refreshing}
          >
            {refreshing ? "Refreshing..." : "⟳ Refresh"}
          </button>
        </div>
      </section>

      {notice && (
        <div className="doctor-notice" role="status">
          {notice}
          <button onClick={() => setNotice("")} aria-label="Dismiss message">
            ×
          </button>
        </div>
      )}

      <section className="doctor-summary-grid">
        <article className="doctor-summary-card">
          <span className="summary-label">Total appointments</span>
          <strong>{loading ? "—" : counts.total}</strong>
          <span className="summary-detail">Visible to your account</span>
        </article>
        <article className="doctor-summary-card">
          <span className="summary-label">Scheduled</span>
          <strong>{loading ? "—" : counts.scheduled}</strong>
          <span className="summary-detail">Awaiting confirmation</span>
        </article>
        <article className="doctor-summary-card">
          <span className="summary-label">Confirmed</span>
          <strong>{loading ? "—" : counts.confirmed}</strong>
          <span className="summary-detail">Confirmed visits</span>
        </article>
        <article className="doctor-summary-card">
          <span className="summary-label">Completed</span>
          <strong>{loading ? "—" : counts.completed}</strong>
          <span className="summary-detail">Completed visits</span>
        </article>
      </section>

      <section className="panel doctors-panel">
        <div className="panel-header doctors-panel-header">
          <div>
            <h2>Appointment Records</h2>
            <p>
              {loading
                ? "Retrieving appointments..."
                : `Showing ${filteredAppointments.length} of ${appointments.length} appointments`}
            </p>
          </div>
          <span className="live-badge">
            <span className="live-dot"></span>
            Live API
          </span>
        </div>

        <div className="doctor-filters">
          <label className="doctor-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search ID, patient, doctor, or reason..."
              aria-label="Search appointments"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by status"
          >
            <option value="All">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        {loading && (
          <p className="state-message">Loading appointments...</p>
        )}

        {!loading && error && (
          <div className="error-message doctors-error" role="alert">
            <strong>Appointments unavailable</strong>
            <p>{error}</p>
            <button
              className="refresh-button"
              onClick={() => loadAppointments(true)}
              disabled={refreshing}
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && filteredAppointments.length === 0 && (
          <div className="doctors-empty">
            <div className="empty-icon">▦</div>
            <strong>No appointments found</strong>
            <p>
              {appointments.length === 0
                ? "There are no appointments available for your account yet."
                : "Try a different search term or status filter."}
            </p>
            {(search || statusFilter !== "All") && (
              <button
                className="clear-filters-button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("All");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {!loading && !error && filteredAppointments.length > 0 && (
          <div className="table-wrapper">
            <table className="doctor-table appointment-table">
              <thead>
                <tr>
                  <th>ID</th>
                  {isAdmin && <th>PATIENT ID</th>}
                  <th>DOCTOR ID</th>
                  <th>DATE &amp; TIME</th>
                  <th>REASON</th>
                  <th>STATUS</th>
                  {(isAdmin || isDoctor || isPatient) && <th>ACTIONS</th>}
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((appointment) => {
                  const options = availableStatusOptions(appointment);
                  const canCancel =
                    (isAdmin || isPatient) &&
                    appointment.status !== "CANCELLED" &&
                    !(isPatient && appointment.status === "COMPLETED");

                  return (
                    <tr key={appointment.id}>
                      <td><strong>#{appointment.id}</strong></td>
                      {isAdmin && <td>{appointment.patientId}</td>}
                      <td>{appointment.doctorId}</td>
                      <td>{formatDateTime(appointment.appointmentDateTime)}</td>
                      <td className="appointment-reason">{appointment.reason}</td>
                      <td>
                        <span
                          className={`appointment-status status-${(
                            appointment.status || "scheduled"
                          ).toLowerCase()}`}
                        >
                          {appointment.status}
                        </span>
                      </td>
                      <td>
                        <div className="doctor-action-buttons appointment-actions">
                          {options.length > 0 && (
                            <select
                              aria-label={`Update status for appointment ${appointment.id}`}
                              value=""
                              onChange={(event) => {
                                const value = event.target.value;
                                if (value) handleStatusChange(appointment, value);
                              }}
                              disabled={
                                updatingId === appointment.id ||
                                deletingId === appointment.id
                              }
                            >
                              <option value="">
                                {updatingId === appointment.id
                                  ? "Updating..."
                                  : "Update status"}
                              </option>
                              {options
                                .filter((status) => status !== appointment.status)
                                .map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                            </select>
                          )}

                          {canCancel && (
                            <button
                              className="doctor-delete-button"
                              onClick={() => handleCancelOrDelete(appointment)}
                              disabled={
                                updatingId === appointment.id ||
                                deletingId === appointment.id
                              }
                            >
                              {deletingId === appointment.id
                                ? "Processing..."
                                : isAdmin
                                  ? "Delete"
                                  : "Cancel"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm && (isAdmin || isPatient) && (
        <div
          className="doctor-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeBookingForm();
          }}
        >
          <section
            className="doctor-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="appointment-form-title"
          >
            <div className="doctor-modal-header">
              <div>
                <p className="eyebrow doctors-eyebrow">CARE COORDINATION</p>
                <h2 id="appointment-form-title">Book Appointment</h2>
              </div>
              <button
                className="doctor-modal-close"
                onClick={closeBookingForm}
                disabled={saving}
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            {formError && (
              <div className="error-message" role="alert">{formError}</div>
            )}

            <form onSubmit={handleBooking}>
              <div className="doctor-form-grid">
                {isAdmin && (
                  <label>
                    Patient *
                    <select
                      name="patientId"
                      value={form.patientId}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="">Select patient</option>
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.firstName} {patient.lastName} (ID: {patient.id})
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {isPatient && (
                  <label>
                    Patient ID
                    <input value={currentProfile?.id ?? ""} readOnly />
                  </label>
                )}

                <label>
                  Doctor *
                  <select
                    name="doctorId"
                    value={form.doctorId}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">Select doctor</option>
                    {doctors
                      .filter((doctor) => doctor.available !== false)
                      .map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.firstName} {doctor.lastName}
                          {doctor.specialization
                            ? ` — ${doctor.specialization}`
                            : ""} (ID: {doctor.id})
                        </option>
                      ))}
                  </select>
                </label>

                <label>
                  Appointment date and time *
                  <input
                    type="datetime-local"
                    name="appointmentDateTime"
                    value={form.appointmentDateTime}
                    onChange={handleFormChange}
                    min={toLocalDateTimeInput(new Date())}
                    required
                  />
                </label>

                <label className="appointment-reason-field">
                  Reason for appointment *
                  <textarea
                    name="reason"
                    value={form.reason}
                    onChange={handleFormChange}
                    placeholder="Briefly describe the reason for your visit"
                    maxLength={1000}
                    rows={4}
                    required
                  />
                </label>
              </div>

              <div className="doctor-form-actions">
                <button
                  type="button"
                  className="refresh-button"
                  onClick={closeBookingForm}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving ? "Booking..." : "Confirm Booking"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default Appointments;
