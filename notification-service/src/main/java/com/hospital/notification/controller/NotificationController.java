
package com.hospital.notification.controller;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hospital.notification.entity.Notification;
import com.hospital.notification.service.NotificationService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public List<Notification> getAll(
            @AuthenticationPrincipal Jwt jwt) {
        return notificationService.getAll(jwt);
    }

    @GetMapping("/patient/{patientId}")
    public List<Notification> getByPatientId(
            @PathVariable Long patientId,
            @AuthenticationPrincipal Jwt jwt) {
        return notificationService.getByPatientId(patientId, jwt);
    }

    @GetMapping("/doctor/{doctorId}")
    public List<Notification> getByDoctorId(
            @PathVariable Long doctorId,
            @AuthenticationPrincipal Jwt jwt) {
        return notificationService.getByDoctorId(doctorId, jwt);
    }
}
