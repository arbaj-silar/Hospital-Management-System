
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/api.js";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
};

function Patients({ isAdmin = false }) {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadPatients = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      if (!isAdmin) {
        // Non-admin users can retrieve only their own profile.
        const response = await api.get("/api/patients/me");

        if (!response.data || response.data.id == null) {
          throw new Error("Your patient profile was not returned by the API.");
        }

        setPatients([response.data]);
        return;
      }

      // Admins can retrieve the complete patient list.
      const response = await api.get("/api/patients");

      if (!Array.isArray(response.data)) {
        throw new Error("The Patient API did not return a list.");
      }

      setPatients(response.data);
      if (!Array.isArray(response.data)) {
        throw new Error("The Patient API did not return a list.");
      }

      setPatients(response.data);
    } catch (err) {
      console.error("Unable to load patients:", err);

      if (err.response?.status === 401) {
        setError("Your session is not authorized. Please sign in again.");
      } else if (err.response?.status === 403) {
        setError("Access denied. Only administrators can view all patient records.");
      } else {
        setError(
          err.response?.data?.message ||
          err.message ||
          "Unable to load patients. Check the API Gateway and Patient Service."
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const filteredPatients = useMemo(() => {
    const term = search.trim().toLowerCase();

    return patients.filter((patient) => {
      const fullName =
        `${patient.firstName || ""} ${patient.lastName || ""}`.toLowerCase();

      const matchesSearch =
        !term ||
        fullName.includes(term) ||
        (patient.email || "").toLowerCase().includes(term) ||
        (patient.phone || "").toLowerCase().includes(term) ||
        String(patient.id ?? "").includes(term);

      const matchesGender =
        genderFilter === "All" || patient.gender === genderFilter;

      return matchesSearch && matchesGender;
    });
  }, [patients, search, genderFilter]);

  function openAddForm() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setFormError("");
    setNotice("");
    setShowForm(true);
  }

  function openEditForm(patient) {
    setEditingId(patient.id);
    setForm({
      firstName: patient.firstName || "",
      lastName: patient.lastName || "",
      email: patient.email || "",
      phone: patient.phone || "",
      dateOfBirth: patient.dateOfBirth || "",
      gender: patient.gender || "",
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

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setNotice("");

    if (!isAdmin) {
      setFormError("Only administrators can manage patient records.");
      return;
    }

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      dateOfBirth: form.dateOfBirth,
      gender: form.gender,
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await api.put(`/api/patients/${editingId}`, payload);
        setNotice("Patient updated successfully.");
      } else {
        await api.post("/api/patients", payload);
        setNotice("Patient registered successfully.");
      }

      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });
      await loadPatients(true);
    } catch (err) {
      console.error("Unable to save patient:", err);

      if (err.response?.status === 401) {
        setFormError("Your session is not authorized. Please sign in again.");
      } else if (err.response?.status === 403) {
        setFormError("Access denied. Only administrators can manage patient records.");
      } else if (err.response?.status === 400) {
        setFormError(
          err.response?.data?.message ||
          "The patient information is invalid. Check the required fields."
        );
      } else {
        setFormError(
          err.response?.data?.message ||
          "Unable to save the patient. Check the backend response."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(patient) {
    if (!isAdmin) return;

    const name =
      `${patient.firstName || ""} ${patient.lastName || ""}`.trim();

    if (
      !window.confirm(
        `Delete patient ${name || patient.id}? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingId(patient.id);
    setError("");
    setNotice("");

    try {
      await api.delete(`/api/patients/${patient.id}`);
      setNotice(`Patient ${name || patient.id} deleted successfully.`);
      await loadPatients(true);
    } catch (err) {
      console.error("Unable to delete patient:", err);

      if (err.response?.status === 401) {
        setError("Your session is not authorized. Please sign in again.");
      } else if (err.response?.status === 403) {
        setError("Access denied. Only administrators can delete patient records.");
      } else {
        setError(
          err.response?.data?.message ||
          "Unable to delete this patient. The record may be in use."
        );
      }
    } finally {
      setDeletingId(null);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="dashboard-content patients-page">
      <section className="doctors-heading">
        <div>
          <p className="eyebrow doctors-eyebrow">PATIENT CARE</p>
          <h2>Patients Management</h2>
          <p className="doctors-subtitle">
            Register and manage patient records securely.
          </p>
        </div>

        {isAdmin && (
          <div className="doctors-heading-actions">
            <button
              className="primary-button"
              onClick={openAddForm}
              disabled={loading}
            >
              + Register Patient
            </button>

            <button
              className="refresh-button"
              onClick={() => loadPatients(true)}
              disabled={loading || refreshing}
            >
              {refreshing ? "Refreshing..." : "⟳ Refresh"}
            </button>
          </div>
        )}
      </section>

      {notice && (
        <div className="doctor-notice" role="status">
          {notice}
          <button
            onClick={() => setNotice("")}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      <section className="doctor-summary-grid">
        <article className="doctor-summary-card">
          <span className="summary-label">Total patients</span>
          <strong>{loading ? "—" : patients.length}</strong>
          <span className="summary-detail">Registered patient records</span>
        </article>

        <article className="doctor-summary-card">
          <span className="summary-label">Matching records</span>
          <strong>{loading ? "—" : filteredPatients.length}</strong>
          <span className="summary-detail">Based on your current filters</span>
        </article>

        <article className="doctor-summary-card">
          <span className="summary-label">Access level</span>
          <strong>{isAdmin ? "Admin" : "Patient"}</strong>
          <span className="summary-detail">
            {isAdmin
              ? "Patient management enabled"
              : "Viewing your own profile"}
          </span>
        </article>
      </section>

      <section className="panel doctors-panel">
        <div className="panel-header doctors-panel-header">
          <div>
            <h2>Registered Patients</h2>
            <p>
              {loading
                ? "Retrieving patient records..."
                : `Showing ${filteredPatients.length} of ${patients.length} patients`}
            </p>
          </div>

          <span className="live-badge">
            <span className="live-dot"></span>
            Live API
          </span>
        </div>

        {isAdmin && (
          <div className="doctor-filters">
            <label className="doctor-search">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, phone, ID..."
                aria-label="Search patients"
              />
            </label>

            <select
              value={genderFilter}
              onChange={(event) => setGenderFilter(event.target.value)}
              aria-label="Filter by gender"
            >
              <option value="All">All genders</option>
              {[...new Set(
                patients
                  .map((patient) => patient.gender)
                  .filter(Boolean)
              )].sort().map((gender) => (
                <option key={gender} value={gender}>
                  {gender}
                </option>
              ))}
            </select>
          </div>
        )}

        {loading && (
          <p className="state-message">Loading patients from the server...</p>
        )}

        {!loading && error && (
          <div className="error-message doctors-error" role="alert">
            <strong>Patient records unavailable</strong>
            <p>{error}</p>
            {isAdmin && (
              <button
                className="refresh-button"
                onClick={() => loadPatients(true)}
                disabled={refreshing}
              >
                Try again
              </button>
            )}
          </div>
        )}

        {!loading && !error && filteredPatients.length === 0 && (
          <div className="doctors-empty">
            <div className="empty-icon">⌕</div>
            <strong>No patient records found</strong>
            <p>
              {patients.length === 0
                ? "No patients are currently returned by the API."
                : "Try changing your search or filters."}
            </p>
            {isAdmin && patients.length === 0 && (
              <button className="primary-button" onClick={openAddForm}>
                + Register the first patient
              </button>
            )}
            {(search || genderFilter !== "All") && (
              <button
                className="clear-filters-button"
                onClick={() => {
                  setSearch("");
                  setGenderFilter("All");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {!loading && !error && filteredPatients.length > 0 && (
          <div className="table-wrapper">
            <table className="doctor-table">
              <thead>
                <tr>
                  <th>PATIENT</th>
                  <th>PHONE</th>
                  <th>DATE OF BIRTH</th>
                  <th>GENDER</th>
                  {isAdmin && <th>ACTIONS</th>}
                </tr>
              </thead>

              <tbody>
                {filteredPatients.map((patient) => (
                  <tr key={patient.id}>
                    <td>
                      <div className="doctor-cell">
                        <div className="doctor-avatar">
                          {(patient.firstName || "P").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong>
                            {patient.firstName || ""} {patient.lastName || ""}
                          </strong>
                          <span>{patient.email || "No email provided"}</span>
                          <span>Patient ID: {patient.id}</span>
                        </div>
                      </div>
                    </td>

                    <td>{patient.phone || "—"}</td>
                    <td>{patient.dateOfBirth || "—"}</td>
                    <td>{patient.gender || "—"}</td>

                    {isAdmin && (
                      <td>
                        <div className="doctor-action-buttons">
                          <button
                            className="doctor-edit-button"
                            onClick={() => openEditForm(patient)}
                            disabled={deletingId === patient.id}
                          >
                            Edit
                          </button>
                          <button
                            className="doctor-delete-button"
                            onClick={() => handleDelete(patient)}
                            disabled={deletingId === patient.id}
                          >
                            {deletingId === patient.id ? "Deleting..." : "Delete"}
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
            aria-labelledby="patient-form-title"
          >
            <div className="doctor-modal-header">
              <div>
                <p className="eyebrow doctors-eyebrow">PATIENT RECORD</p>
                <h2 id="patient-form-title">
                  {editingId !== null ? "Edit Patient" : "Register Patient"}
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
              <div className="error-message" role="alert">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="doctor-form-grid">
                <label>
                  First name *
                  <input
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    maxLength={50}
                    required
                  />
                </label>

                <label>
                  Last name *
                  <input
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    maxLength={50}
                    required
                  />
                </label>

                <label>
                  Email *
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Phone *
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Date of birth *
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={form.dateOfBirth}
                    onChange={handleChange}
                    max={today}
                    required
                  />
                </label>

                <label>
                  Gender *
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
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
                      : "Register Patient"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default Patients;
