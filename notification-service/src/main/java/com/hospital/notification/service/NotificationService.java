
package com.hospital.notification.service;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import com.hospital.notification.entity.Notification;
import com.hospital.notification.repository.NotificationRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final RestTemplate restTemplate;

    @Value("${services.patient-url:http://localhost:8081}")
    private String patientUrl;

    @Value("${services.doctor-url:http://localhost:8082}")
    private String doctorUrl;

    public List<Notification> getAll(Jwt jwt) {
        requireRole(jwt, "ADMIN");
        return notificationRepository.findAll();
    }

    public List<Notification> getByPatientId(
            Long patientId, Jwt jwt) {

        if (hasRole(jwt, "ADMIN")) {
            return notificationRepository.findByPatientId(patientId);
        }

        if (hasRole(jwt, "PATIENT")) {
            Long currentPatientId = getProfileId(
                    patientUrl + "/api/patients/me", jwt);

            if (!currentPatientId.equals(patientId)) {
                throw forbidden("You can only view your own notifications");
            }

            return notificationRepository.findByPatientId(currentPatientId);
        }

        throw forbidden("Only patients and administrators can access these notifications");
    }

    public List<Notification> getByDoctorId(
            Long doctorId, Jwt jwt) {

        if (hasRole(jwt, "ADMIN")) {
            return notificationRepository.findByDoctorId(doctorId);
        }

        if (hasRole(jwt, "DOCTOR")) {
            Long currentDoctorId = getProfileId(
                    doctorUrl + "/api/doctors/me", jwt);

            if (!currentDoctorId.equals(doctorId)) {
                throw forbidden("You can only view your own notifications");
            }

            return notificationRepository.findByDoctorId(currentDoctorId);
        }

        throw forbidden("Only doctors and administrators can access these notifications");
    }

    private Long getProfileId(String url, Jwt jwt) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwt.getTokenValue());

        HttpEntity<Void> entity = new HttpEntity<>(headers);

        Map<?, ?> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                entity,
                Map.class
        ).getBody();

        if (response == null
                || !(response.get("id") instanceof Number id)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Could not retrieve the linked user profile");
        }

        return id.longValue();
    }

    private boolean hasRole(Jwt jwt, String role) {
        Map<String, Object> realmAccess =
                jwt.getClaimAsMap("realm_access");

        if (realmAccess == null
                || !(realmAccess.get("roles") instanceof List<?> roles)) {
            return false;
        }

        return roles.contains(role);
    }

    private void requireRole(Jwt jwt, String role) {
        if (!hasRole(jwt, role)) {
            throw forbidden("You do not have permission to perform this action");
        }
    }

    private ResponseStatusException forbidden(String message) {
        return new ResponseStatusException(
                HttpStatus.FORBIDDEN, message);
    }
}
