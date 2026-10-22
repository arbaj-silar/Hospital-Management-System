
package com.hospital.patient.controller;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.server.ResponseStatusException;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import com.hospital.patient.dto.PatientRequest;
import com.hospital.patient.entity.Patient;
import com.hospital.patient.service.PatientService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/patients")
@RequiredArgsConstructor
public class PatientController {

    private final PatientService patientService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Patient createPatient(
            @Valid @RequestBody PatientRequest request) {
        return patientService.createPatient(request);
    }

    @PostMapping("/register/me")
    @ResponseStatus(HttpStatus.CREATED)
    public Patient registerCurrentPatient(
            @Valid @RequestBody PatientRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        return patientService.createPatientForUser(
                request, jwt.getSubject());
    }
    
    @GetMapping
    public List<Patient> getAllPatients() {
        return patientService.getAllPatients();
    }

    @GetMapping("/{id}")
    public Patient getPatientById(@PathVariable Long id) {
        return patientService.getPatientById(id);
    }

    @PutMapping("/{id}")
    public Patient updatePatient(
            @PathVariable Long id,
            @Valid @RequestBody PatientRequest request) {
        return patientService.updatePatient(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePatient(@PathVariable Long id) {
        patientService.deletePatient(id);
    }
	    
	
	@PutMapping("/{id}/keycloak-user/{userId}")
	public Patient linkKeycloakUser(
	        @PathVariable Long id,
	        @PathVariable String userId) {
	    return patientService.linkKeycloakUser(id, userId);
	}
	
	@GetMapping("/me")
	public Patient getCurrentPatient(
	        @AuthenticationPrincipal Jwt jwt) {
	    return patientService.getByKeycloakUserId(jwt.getSubject());
	}
	

	@PostMapping("/me/link")
	@PreAuthorize("hasRole('PATIENT')")
	public Patient linkCurrentPatient(@AuthenticationPrincipal Jwt jwt) {
	    Boolean emailVerified = jwt.getClaim("email_verified");
	
	    if (!Boolean.TRUE.equals(emailVerified)) {
	        throw new ResponseStatusException(
	                HttpStatus.FORBIDDEN,
	                "A verified Keycloak email is required");
	    }
	
	    String email = jwt.getClaimAsString("email");
	
	    if (email == null || email.isBlank()) {
	        throw new ResponseStatusException(
	                HttpStatus.BAD_REQUEST,
	                "Email is missing from the Keycloak token");
	    }
	
	    return patientService.linkCurrentPatient(jwt.getSubject(), email);
	}

	
}
