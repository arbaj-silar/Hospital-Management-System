
import { useCallback, useEffect, useState } from "react";
import api from "../api/api.js";
import "./Notifications.css";

function Notifications({ roles = [] }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isAdmin = roles.includes("ADMIN");
  const isPatient = roles.includes("PATIENT");
  const isDoctor = roles.includes("DOCTOR");

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      let response;

      if (isAdmin) {
        // Administrators can view all notifications.
        response = await api.get("/api/notifications");
      } else if (isPatient) {
        // Retrieve the logged-in patient's profile.
        const profile = await api.get("/api/patients/me");
        const patientId = profile.data.id;

        response = await api.get(
          `/api/notifications/patient/${patientId}`
        );
      } else if (isDoctor) {
        // Retrieve the logged-in doctor's profile.
        const profile = await api.get("/api/doctors/me");
        const doctorId = profile.data.id;

        response = await api.get(
          `/api/notifications/doctor/${doctorId}`
        );
      } else {
        throw new Error("Your account has no supported hospital role.");
      }

      setNotifications(response.data);
    } catch (err) {
      console.error("Failed to load notifications:", err);

      if (err.response?.status === 401) {
        setError("Your session has expired. Please sign in again.");
      } else if (err.response?.status === 403) {
        setError("You are not authorized to view these notifications.");
      } else {
        setError(
          err.message ||
          "Unable to load notifications. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isPatient, isDoctor]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  if (loading) {
    return (
      <div className="notifications-page">
        Loading notifications...
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <div>
          <h1>Notifications</h1>
          <p>Appointment activity from CarePoint.</p>
        </div>

        <button onClick={loadNotifications}>
          Refresh
        </button>
      </div>

      {error && (
        <div className="notification-error" role="alert">
          <p>{error}</p>
          <button onClick={loadNotifications}>Try again</button>
        </div>
      )}

      {!error && notifications.length === 0 && (
        <div className="notification-empty">
          <h3>No notifications yet</h3>
          <p>
            Appointment notifications will appear here when
            available for your account.
          </p>
        </div>
      )}

      {!error && notifications.length > 0 && (
        <div className="notification-list">
          {notifications.map((notification) => (
            <article
              className="notification-card"
              key={notification.id}
            >
              <div className="notification-card-top">
                <h3>
                  Appointment #{notification.appointmentId}
                </h3>
                <span className="notification-status">
                  {notification.status}
                </span>
              </div>

              <p>
                <strong>Patient ID:</strong>{" "}
                {notification.patientId}
              </p>

              <p>
                <strong>Doctor ID:</strong>{" "}
                {notification.doctorId}
              </p>

              <p>
                <strong>Reason:</strong>{" "}
                {notification.reason || "Not provided"}
              </p>

              <p>
                <strong>Appointment date:</strong>{" "}
                {notification.appointmentDateTime
                  ? new Date(
                      notification.appointmentDateTime
                    ).toLocaleString()
                  : "Not available"}
              </p>

              <p className="notification-created">
                Recorded:{" "}
                {notification.createdAt
                  ? new Date(
                      notification.createdAt
                    ).toLocaleString()
                  : "Not available"}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default Notifications;
