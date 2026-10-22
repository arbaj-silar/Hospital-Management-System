
package com.hospital.patient.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.hospital.patient.dto.PatientRequest;
import com.hospital.patient.entity.Patient;
import com.hospital.patient.repository.PatientRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PatientService {

	private final PatientRepository patientRepository;

    public Patient createPatient(PatientRequest request) {
        Patient patient = new Patient();
        copyRequest(request, patient);
        return patientRepository.save(patient);
    }
    
    public Patient createPatientForUser(
            PatientRequest request,
            String keycloakUserId) {

        if (keycloakUserId == null || keycloakUserId.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Keycloak user ID is required");
        }

        String userId = keycloakUserId.trim();

        if (patientRepository.findByKeycloakUserId(userId).isPresent()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This Keycloak user is already linked to a patient");
        }

        Patient patient = new Patient();
        copyRequest(request, patient);
        patient.setKeycloakUserId(userId);

        return patientRepository.save(patient);
    }

    public List<Patient> getAllPatients() {
        return patientRepository.findAll();
    }

    public Patient getPatientById(Long id) {
        return patientRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Patient not found with id: " + id));
    }

    public Patient updatePatient(Long id, PatientRequest request) {
        Patient patient = getPatientById(id);
        copyRequest(request, patient);
        return patientRepository.save(patient);
    }

    public void deletePatient(Long id) {
        Patient patient = getPatientById(id);
        patientRepository.delete(patient);
    }
    

	public Patient linkKeycloakUser(Long patientId, String keycloakUserId) {
	    if (keycloakUserId == null || keycloakUserId.isBlank()) {
	        throw new ResponseStatusException(
	                HttpStatus.BAD_REQUEST, "Keycloak user ID is required");
	    }
	
	    Patient patient = getPatientById(patientId);
	    String userId = keycloakUserId.trim();
	
	    Patient existing = patientRepository
	            .findByKeycloakUserId(userId)
	            .orElse(null);
	
	    if (existing != null && !existing.getId().equals(patientId)) {
	        throw new ResponseStatusException(
	                HttpStatus.CONFLICT,
	                "This Keycloak user is already linked to another patient");
	    }
	
	    patient.setKeycloakUserId(userId);
	    return patientRepository.save(patient);
	}

	public Patient getByKeycloakUserId(String keycloakUserId) {
	    return patientRepository.findByKeycloakUserId(keycloakUserId)
	            .orElseThrow(() -> new ResponseStatusException(
	                    HttpStatus.NOT_FOUND,
	                    "No patient record is linked to this Keycloak user"));
	}
	

	public Patient linkCurrentPatient(String keycloakUserId, String email) {
	    if (keycloakUserId == null || keycloakUserId.isBlank()
	            || email == null || email.isBlank()) {
	        throw new ResponseStatusException(
	                HttpStatus.BAD_REQUEST,
	                "Keycloak user ID and email are required");
	    }
	
	    String userId = keycloakUserId.trim();
	    String normalizedEmail = email.trim();
	
	    Patient patient = patientRepository
	            .findByEmailIgnoreCase(normalizedEmail)
	            .orElseThrow(() -> new ResponseStatusException(
	                    HttpStatus.NOT_FOUND,
	                    "No patient profile matches your Keycloak email. Contact the administrator."));
	
	    Patient existing = patientRepository
	            .findByKeycloakUserId(userId)
	            .orElse(null);
	
	    if (existing != null && !existing.getId().equals(patient.getId())) {
	        throw new ResponseStatusException(
	                HttpStatus.CONFLICT,
	                "This Keycloak account is already linked to another patient");
	    }
	
	    String linkedUserId = patient.getKeycloakUserId();
	
	    if (linkedUserId != null && !linkedUserId.isBlank()
	            && !linkedUserId.equals(userId)) {
	        throw new ResponseStatusException(
	                HttpStatus.CONFLICT,
	                "This patient profile is already linked to another Keycloak account");
	    }
	
	    patient.setKeycloakUserId(userId);
	    return patientRepository.save(patient);
	}


    private void copyRequest(PatientRequest request, Patient patient) {
        patient.setFirstName(request.getFirstName());
        patient.setLastName(request.getLastName());
        patient.setEmail(request.getEmail());
        patient.setPhone(request.getPhone());
        patient.setDateOfBirth(request.getDateOfBirth());
        patient.setGender(request.getGender());
    }
}
