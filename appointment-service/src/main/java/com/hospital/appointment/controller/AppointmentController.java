
package com.hospital.appointment.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

import com.hospital.appointment.dto.AppointmentRequest;
import com.hospital.appointment.entity.Appointment;
import com.hospital.appointment.service.AppointmentService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Appointment create(
            @Valid @RequestBody AppointmentRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return appointmentService.create(request, jwt);
    }

    @GetMapping
    public List<Appointment> getAll() {
        return appointmentService.getAll();
    }

    @GetMapping("/{id}")
    public Appointment getById(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {
        return appointmentService.getById(id, jwt);
    }

    @GetMapping("/patient/{patientId}")
    public List<Appointment> getByPatientId(
            @PathVariable Long patientId,
            @AuthenticationPrincipal Jwt jwt) {
        return appointmentService.getByPatientId(patientId, jwt);
    }

    @GetMapping("/doctor/{doctorId}")
    public List<Appointment> getByDoctorId(
            @PathVariable Long doctorId,
            @AuthenticationPrincipal Jwt jwt) {
        return appointmentService.getByDoctorId(doctorId, jwt);
    }

    @PatchMapping("/{id}/status")
    public Appointment updateStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @AuthenticationPrincipal Jwt jwt) {
        return appointmentService.updateStatus(id, status, jwt);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {
        appointmentService.delete(id, jwt);
    }
}
