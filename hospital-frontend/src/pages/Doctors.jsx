import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/api.js";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  specialization: "",
  department: "",
  consultationFee: "",
  available: true,
};

function Doctors({ isAdmin = false }) {
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState("");
  const [specialization, setSpecialization] = useState("All");
  const [availability, setAvailability] = useState("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const loadDoctors = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const response = await api.get("/api/doctors");

      if (!Array.isArray(response.data)) {
        throw new Error("The Doctor API did not return a list.");
      }

      setDoctors(response.data);
    } catch (err) {
      console.error("Unable to load doctors:", err);

      if (err.response?.status === 401) {
        setError("Your session has expired or is not authorized. Please sign in again.");
      } else if (err.response?.status === 403) {
        setError("You do not have permission to view doctors.");
      } else {
        setError(
          err.response?.data?.message ||
          err.message ||
          "Unable to load doctors. Check the API Gateway and Doctor Service."
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  const specializations = useMemo(
    () =>
      [
        ...new Set(
          doctors
            .map((doctor) => doctor.specialization)
            .filter((value) => typeof value === "string" && value.trim())
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [doctors]
  );

  const filteredDoctors = useMemo(() => {
    const term = search.trim().toLowerCase();

    return doctors.filter((doctor) => {
      const fullName =
        `${doctor.firstName || ""} ${doctor.lastName || ""}`.toLowerCase();

      const matchesSearch =
        !term ||
        fullName.includes(term) ||
        (doctor.email || "").toLowerCase().includes(term) ||
        (doctor.department || "").toLowerCase().includes(term) ||
        (doctor.specialization || "").toLowerCase().includes(term);

      const matchesSpecialization =
        specialization === "All" ||
        doctor.specialization === specialization;

      const matchesAvailability =
        availability === "All" ||
        (availability === "Available" && doctor.available === true) ||
        (availability === "Unavailable" && doctor.available === false);

      return matchesSearch && matchesSpecialization && matchesAvailability;
    });
  }, [doctors, search, specialization, availability]);

  const availableCount = doctors.filter(
    (doctor) => doctor.available === true
  ).length;

  function openAddForm() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setFormError("");
    setNotice("");
    setShowForm(true);
  }

  function openEditForm(doctor) {
    setEditingId(doctor.id);
    setForm({
      firstName: doctor.firstName || "",
      lastName: doctor.lastName || "",
      email: doctor.email || "",
      phone: doctor.phone || "",
      specialization: doctor.specialization || "",
      department: doctor.department || "",
      consultationFee: doctor.consultationFee ?? "",
      available: doctor.available ?? true,
    });
    setFormError("");
    setNotice("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
    setFormError("");
  }

  function handleFormChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setNotice("");

    const fee = Number(form.consultationFee);

    if (!Number.isFinite(fee) || fee < 0) {
      setFormError("Consultation fee must be a valid number greater than or equal to zero.");
      return;
    }

    const payload = {
      ...form,
      consultationFee: fee,
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await api.put(`/api/doctors/${editingId}`, payload);
        setNotice("Doctor updated successfully.");
      } else {
        await api.post("/api/doctors", payload);
        setNotice("Doctor added successfully.");
      }

      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });
      await loadDoctors(true);
    } catch (err) {
      console.error("Unable to save doctor:", err);

      if (err.response?.status === 401) {
        setFormError("Your session is not authorized. Please sign in again.");
      } else if (err.response?.status === 403) {
        setFormError("Access denied. Only an administrator can manage doctor records.");
      } else if (err.response?.status === 400) {
        setFormError(
          err.response?.data?.message ||
          "The submitted data is invalid. Check all required fields."
        );
      } else {
        setFormError(
          err.response?.data?.message ||
          "Unable to save the doctor. Please check the backend response."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(doctor) {
    const name =
      `${doctor.firstName || ""} ${doctor.lastName || ""}`.trim();

    if (
      !window.confirm(
        `Delete Dr. ${name || doctor.id}? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingId(doctor.id);
    setError("");
    setNotice("");

    try {
      await api.delete(`/api/doctors/${doctor.id}`);
      setNotice(`Dr. ${name || doctor.id} was deleted successfully.`);
      await loadDoctors(true);
    } catch (err) {
      console.error("Unable to delete doctor:", err);

      if (err.response?.status === 401) {
        setError("Your session is not authorized. Please sign in again.");
      } else if (err.response?.status === 403) {
        setError("Access denied. Only an administrator can delete doctors.");
      } else {
        setError(
          err.response?.data?.message ||
          "Unable to delete this doctor. Check whether the record is in use."
        );
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="dashboard-content doctors-page">
      <section className="doctors-heading">
        <div>
          <p className="eyebrow doctors-eyebrow">MEDICAL TEAM</p>
          <h2>Doctors Management</h2>
          <p className="doctors-subtitle">
            View and manage doctors registered in your hospital.
          </p>
        </div>

        <div className="doctors-heading-actions">
          {isAdmin && (
            <button
              className="primary-button"
              onClick={openAddForm}
              disabled={loading}
            >
              + Add Doctor
            </button>
          )}

          <button
            className="refresh-button"
            onClick={() => loadDoctors(true)}
            disabled={loading || refreshing}
          >
            <span>{refreshing ? "↻" : "⟳"}</span>
            {refreshing ? "Refreshing..." : "Refresh"}
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
          <span className="summary-label">Total doctors</span>
          <strong>{loading ? "—" : doctors.length}</strong>
          <span className="summary-detail">Records returned by the API</span>
        </article>

        <article className="doctor-summary-card">
          <span className="summary-label">Available doctors</span>
          <strong>{loading ? "—" : availableCount}</strong>
          <span className="summary-detail">Marked available in the database</span>
        </article>

        <article className="doctor-summary-card">
          <span className="summary-label">Specializations</span>
          <strong>{loading ? "—" : specializations.length}</strong>
          <span className="summary-detail">Distinct listed specializations</span>
        </article>
      </section>

      <section className="panel doctors-panel">
        <div className="panel-header doctors-panel-header">
          <div>
            <h2>Registered Doctors</h2>
            <p>
              {loading
                ? "Retrieving records..."
                : `Showing ${filteredDoctors.length} of ${doctors.length} doctors`}
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
              placeholder="Search name, email, department..."
              aria-label="Search doctors"
            />
          </label>

          <select
            value={specialization}
            onChange={(event) => setSpecialization(event.target.value)}
            aria-label="Filter by specialization"
          >
            <option value="All">All specializations</option>
            {specializations.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          <select
            value={availability}
            onChange={(event) => setAvailability(event.target.value)}
            aria-label="Filter by availability"
          >
            <option value="All">All statuses</option>
            <option value="Available">Available</option>
            <option value="Unavailable">Unavailable</option>
          </select>
        </div>

        {loading && (
          <p className="state-message">Loading doctors from the server...</p>
        )}

        {!loading && error && (
          <div className="error-message doctors-error" role="alert">
            <strong>Doctor operation failed</strong>
            <p>{error}</p>
            <button
              className="refresh-button"
              onClick={() => loadDoctors(true)}
              disabled={refreshing}
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && filteredDoctors.length === 0 && (
          <div className="doctors-empty">
            <div className="empty-icon">⌕</div>
            <strong>No matching doctors</strong>
            <p>
              {doctors.length === 0
                ? "The API returned no doctor records."
                : "Try changing your search or filters."}
            </p>
            {isAdmin && doctors.length === 0 && (
              <button className="primary-button" onClick={openAddForm}>
                + Add the first doctor
              </button>
            )}
            {(search || specialization !== "All" || availability !== "All") && (
              <button
                className="clear-filters-button"
                onClick={() => {
                  setSearch("");
                  setSpecialization("All");
                  setAvailability("All");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {!loading && !error && filteredDoctors.length > 0 && (
          <div className="table-wrapper">
            <table className="doctor-table">
              <thead>
                <tr>
                  <th>DOCTOR</th>
                  <th>SPECIALIZATION</th>
                  <th>DEPARTMENT</th>
                  <th>CONSULTATION FEE</th>
                  <th>STATUS</th>
                  {isAdmin && <th>ACTIONS</th>}
                </tr>
              </thead>

              <tbody>
                {filteredDoctors.map((doctor) => (
                  <tr key={doctor.id}>
                    <td>
                      <div className="doctor-cell">
                        <div className="doctor-avatar">
                          {(doctor.firstName || "D").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong>
                            Dr. {doctor.firstName || ""} {doctor.lastName || ""}
                          </strong>
                          <span>{doctor.email || "No email provided"}</span>
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
                        className={`status-badge ${doctor.available
                            ? "status-available"
                            : "status-unavailable"
                          }`}
                      >
                        {doctor.available ? "Available" : "Unavailable"}
                      </span>
                    </td>

                    {isAdmin && (
                      <td>
                        <div className="doctor-action-buttons">
                          <button
                            className="doctor-edit-button"
                            onClick={() => openEditForm(doctor)}
                            disabled={deletingId === doctor.id}
                          >
                            Edit
                          </button>
                          <button
                            className="doctor-delete-button"
                            onClick={() => handleDelete(doctor)}
                            disabled={deletingId === doctor.id}
                          >
                            {deletingId === doctor.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm && isAdmin && (
        <div
          className="doctor-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <section
            className="doctor-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="doctor-form-title"
          >
            <div className="doctor-modal-header">
              <div>
                <p className="eyebrow doctors-eyebrow">DOCTOR RECORD</p>
                <h2 id="doctor-form-title">
                  {editingId !== null ? "Edit Doctor" : "Add Doctor"}
                </h2>
              </div>
              <button
                className="doctor-modal-close"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            {formError && (
              <div className="error-message" role="alert">{formError}</div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="doctor-form-grid">
                <label>
                  First name *
                  <input
                    name="firstName"
                    value={form.firstName}
                    onChange={handleFormChange}
                    required
                    maxLength={100}
                  />
                </label>

                <label>
                  Last name *
                  <input
                    name="lastName"
                    value={form.lastName}
                    onChange={handleFormChange}
                    required
                    maxLength={100}
                  />
                </label>

                <label>
                  Email *
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleFormChange}
                    required
                  />
                </label>

                <label>
                  Phone *
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleFormChange}
                    required
                  />
                </label>

                <label>
                  Specialization *
                  <input
                    name="specialization"
                    value={form.specialization}
                    onChange={handleFormChange}
                    required
                  />
                </label>

                <label>
                  Department *
                  <input
                    name="department"
                    value={form.department}
                    onChange={handleFormChange}
                    required
                  />
                </label>

                <label>
                  Consultation fee (₹) *
                  <input
                    type="number"
                    name="consultationFee"
                    value={form.consultationFee}
                    onChange={handleFormChange}
                    min="0"
                    step="0.01"
                    required
                  />
                </label>

                <label className="doctor-availability-field">
                  <input
                    type="checkbox"
                    name="available"
                    checked={form.available}
                    onChange={handleFormChange}
                  />
                  Available for appointments
                </label>
              </div>

              <div className="doctor-form-actions">
                <button
                  type="button"
                  className="refresh-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId !== null
                      ? "Save Changes"
                      : "Create Doctor"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default Doctors;
