package com.hospital.doctor.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;
import jakarta.validation.Valid;

import com.hospital.doctor.dto.DoctorRequest;
import com.hospital.doctor.entity.Doctor;
import com.hospital.doctor.service.DoctorService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/doctors")
@RequiredArgsConstructor
public class DoctorController {

    private final DoctorService doctorService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Doctor createDoctor(
            @Valid @RequestBody DoctorRequest request) {
        return doctorService.createDoctor(request);
    }
    
    @PostMapping("/me/link")
    @PreAuthorize("hasRole('DOCTOR')")
    public Doctor linkCurrentDoctor(@AuthenticationPrincipal Jwt jwt) {
        Boolean emailVerified = jwt.getClaim("email_verified");

        if (!Boolean.TRUE.equals(emailVerified)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "A verified Keycloak email is required"
            );
        }

        String email = jwt.getClaimAsString("email");

        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Email is missing from the Keycloak token"
            );
        }

        return doctorService.linkCurrentDoctor(jwt.getSubject(), email);
    }
    
    @PostMapping("/register/me")
    @ResponseStatus(HttpStatus.CREATED)
    public Doctor registerCurrentDoctor(
            @Valid @RequestBody DoctorRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        return doctorService.createDoctorForUser(
                request, jwt.getSubject());
    }

    @GetMapping
    public List<Doctor> getAllDoctors() {
        return doctorService.getAllDoctors();
    }

    @GetMapping("/{id}")
    public Doctor getDoctorById(@PathVariable Long id) {
        return doctorService.getDoctorById(id);
    }
    
    @GetMapping("/me")
    public Doctor getCurrentDoctor(
            @AuthenticationPrincipal Jwt jwt) {
        return doctorService.getByKeycloakUserId(jwt.getSubject());
    }

    @PutMapping("/{id}")
    public Doctor updateDoctor(
            @PathVariable Long id,
            @Valid @RequestBody DoctorRequest request) {
        return doctorService.updateDoctor(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDoctor(@PathVariable Long id) {
        doctorService.deleteDoctor(id);
    }
    
	@PutMapping("/{id}/keycloak-user/{userId}")
	public Doctor linkKeycloakUser(
	        @PathVariable Long id,
	        @PathVariable String userId) {
	    return doctorService.linkKeycloakUser(id, userId);
	}

}