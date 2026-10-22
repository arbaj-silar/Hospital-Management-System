
package com.hospital.appointment.service;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import org.springframework.security.oauth2.jwt.Jwt;

import com.hospital.appointment.dto.AppointmentRequest;
import com.hospital.appointment.entity.Appointment;
import com.hospital.appointment.event.AppointmentCreatedEvent;
import com.hospital.appointment.event.AppointmentEventPublisher;
import com.hospital.appointment.repository.AppointmentRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentEventPublisher eventPublisher;
    private final AppointmentRepository appointmentRepository;
    private final RestTemplate restTemplate;

    @Value("${services.patient-url:http://localhost:8081}")
    private String patientUrl;

    @Value("${services.doctor-url:http://localhost:8082}")
    private String doctorUrl;

    public Appointment create(AppointmentRequest request, Jwt jwt) {
        Long patientId;

        if (hasRole(jwt, "ADMIN")) {
            patientId = request.getPatientId();
        } else if (hasRole(jwt, "PATIENT")) {
            patientId = getCurrentProfileId(
                    patientUrl + "/api/patients/me", jwt);
        } else {
            throw forbidden("Only patients and administrators can book appointments");
        }

        // Verify that the selected doctor exists.
        getCurrentProfileId(
                doctorUrl + "/api/doctors/" + request.getDoctorId(), jwt);

        Appointment appointment = new Appointment();
        appointment.setPatientId(patientId);
        appointment.setDoctorId(request.getDoctorId());
        appointment.setAppointmentDateTime(request.getAppointmentDateTime());
        appointment.setReason(request.getReason());
        appointment.setStatus("SCHEDULED");

        Appointment saved = appointmentRepository.save(appointment);

        AppointmentCreatedEvent event = new AppointmentCreatedEvent(
                saved.getId(),
                saved.getPatientId(),
                saved.getDoctorId(),
                saved.getAppointmentDateTime(),
                saved.getReason(),
                saved.getStatus());

        eventPublisher.publish(event);

        return saved;
    }

    public List<Appointment> getAll() {
        return appointmentRepository.findAll();
    }

    public Appointment getById(Long id, Jwt jwt) {
        Appointment appointment = findAppointment(id);
        checkCanView(appointment, jwt);
        return appointment;
    }

    public List<Appointment> getByPatientId(Long patientId, Jwt jwt) {
        if (hasRole(jwt, "ADMIN")) {
            return appointmentRepository.findByPatientId(patientId);
        }

        if (hasRole(jwt, "PATIENT")) {
            Long currentPatientId = getCurrentProfileId(
                    patientUrl + "/api/patients/me", jwt);

            if (!currentPatientId.equals(patientId)) {
                throw forbidden("You can only view your own appointments");
            }

            return appointmentRepository.findByPatientId(currentPatientId);
        }

        if (hasRole(jwt, "DOCTOR")) {
            Long doctorId = getCurrentProfileId(
                    doctorUrl + "/api/doctors/me", jwt);

            return appointmentRepository.findByPatientId(patientId)
                    .stream()
                    .filter(a -> a.getDoctorId().equals(doctorId))
                    .toList();
        }

        throw forbidden("Access denied");
    }

    public List<Appointment> getByDoctorId(Long doctorId, Jwt jwt) {
        if (hasRole(jwt, "ADMIN")) {
            return appointmentRepository.findByDoctorId(doctorId);
        }

        if (hasRole(jwt, "DOCTOR")) {
            Long currentDoctorId = getCurrentProfileId(
                    doctorUrl + "/api/doctors/me", jwt);

            if (!currentDoctorId.equals(doctorId)) {
                throw forbidden("You can only view your own appointments");
            }

            return appointmentRepository.findByDoctorId(currentDoctorId);
        }

        if (hasRole(jwt, "PATIENT")) {
            Long patientId = getCurrentProfileId(
                    patientUrl + "/api/patients/me", jwt);

            return appointmentRepository.findByDoctorId(doctorId)
                    .stream()
                    .filter(a -> a.getPatientId().equals(patientId))
                    .toList();
        }

        throw forbidden("Access denied");
    }

    public Appointment updateStatus(Long id, String status, Jwt jwt) {
        Appointment appointment = findAppointment(id);

        if (hasRole(jwt, "DOCTOR")) {
            Long doctorId = getCurrentProfileId(
                    doctorUrl + "/api/doctors/me", jwt);

            if (!appointment.getDoctorId().equals(doctorId)) {
                throw forbidden("You can only update your own appointments");
            }

            if (!List.of("CONFIRMED", "COMPLETED").contains(status)) {
                throw forbidden(
                        "Doctors can only confirm or complete appointments");
            }
        } else if (!hasRole(jwt, "ADMIN")) {
            throw forbidden("Only doctors and administrators can update status");
        }

        if (!List.of("SCHEDULED", "CONFIRMED",
                "COMPLETED", "CANCELLED").contains(status)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Invalid appointment status");
        }

        appointment.setStatus(status);
        return appointmentRepository.save(appointment);
    }

    public void delete(Long id, Jwt jwt) {
        Appointment appointment = findAppointment(id);

        if (hasRole(jwt, "ADMIN")) {
            appointmentRepository.delete(appointment);
            return;
        }

        if (hasRole(jwt, "PATIENT")) {
            Long patientId = getCurrentProfileId(
                    patientUrl + "/api/patients/me", jwt);

            if (!appointment.getPatientId().equals(patientId)) {
                throw forbidden("You can only cancel your own appointments");
            }

            if ("COMPLETED".equals(appointment.getStatus())) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Completed appointments cannot be cancelled");
            }

            appointment.setStatus("CANCELLED");
            appointmentRepository.save(appointment);
            return;
        }

        throw forbidden("Only patients and administrators can cancel appointments");
    }

    private Appointment findAppointment(Long id) {
        return appointmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Appointment not found"));
    }

    private void checkCanView(Appointment appointment, Jwt jwt) {
        if (hasRole(jwt, "ADMIN")) {
            return;
        }

        if (hasRole(jwt, "PATIENT")) {
            Long patientId = getCurrentProfileId(
                    patientUrl + "/api/patients/me", jwt);

            if (appointment.getPatientId().equals(patientId)) {
                return;
            }
        }

        if (hasRole(jwt, "DOCTOR")) {
            Long doctorId = getCurrentProfileId(
                    doctorUrl + "/api/doctors/me", jwt);

            if (appointment.getDoctorId().equals(doctorId)) {
                return;
            }
        }

        throw forbidden("You cannot access this appointment");
    }

    private Long getCurrentProfileId(String url, Jwt jwt) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwt.getTokenValue());

        HttpEntity<Void> entity = new HttpEntity<>(headers);

        Map<?, ?> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                entity,
                Map.class).getBody();

        if (response == null || !(response.get("id") instanceof Number id)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Could not retrieve the linked user profile");
        }

        return id.longValue();
    }

    private boolean hasRole(Jwt jwt, String role) {
        Map<String, Object> realmAccess =
                jwt.getClaimAsMap("realm_access");

        if (realmAccess == null || !(realmAccess.get("roles") instanceof List<?> roles)) {
            return false;
        }

        return roles.contains(role);
    }

    private ResponseStatusException forbidden(String message) {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, message);
    }
}
