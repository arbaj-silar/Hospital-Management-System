package com.hospital.doctor.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.hospital.doctor.dto.DoctorRequest;
import com.hospital.doctor.entity.Doctor;
import com.hospital.doctor.repository.DoctorRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DoctorService {

    private final DoctorRepository doctorRepository;

    public Doctor createDoctor(DoctorRequest request) {
        Doctor doctor = new Doctor();
        copyRequest(request, doctor);
        return doctorRepository.save(doctor);
    }

    public List<Doctor> getAllDoctors() {
        return doctorRepository.findAll();
    }

    public Doctor getDoctorById(Long id) {
        return doctorRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Doctor not found"));
    }

    public Doctor updateDoctor(Long id, DoctorRequest request) {
        Doctor doctor = getDoctorById(id);
        copyRequest(request, doctor);
        return doctorRepository.save(doctor);
    }

    public void deleteDoctor(Long id) {
        Doctor doctor = getDoctorById(id);
        doctorRepository.delete(doctor);
    }
    

	public Doctor linkKeycloakUser(Long doctorId, String keycloakUserId) {
	    if (keycloakUserId == null || keycloakUserId.isBlank()) {
	        throw new ResponseStatusException(
	                HttpStatus.BAD_REQUEST, "Keycloak user ID is required");
	    }
	
	    Doctor doctor = getDoctorById(doctorId);
	    String userId = keycloakUserId.trim();
	
	    Doctor existing = doctorRepository
	            .findByKeycloakUserId(userId)
	            .orElse(null);
	
	    if (existing != null && !existing.getId().equals(doctorId)) {
	        throw new ResponseStatusException(
	                HttpStatus.CONFLICT,
	                "This Keycloak user is already linked to another doctor");
	    }
	
	    doctor.setKeycloakUserId(userId);
	    return doctorRepository.save(doctor);
	}
	
	public Doctor createDoctorForUser(
	        DoctorRequest request,
	        String keycloakUserId) {

	    if (keycloakUserId == null || keycloakUserId.isBlank()) {
	        throw new ResponseStatusException(
	                HttpStatus.BAD_REQUEST,
	                "Keycloak user ID is required");
	    }

	    String userId = keycloakUserId.trim();

	    if (doctorRepository.findByKeycloakUserId(userId).isPresent()) {
	        throw new ResponseStatusException(
	                HttpStatus.CONFLICT,
	                "This Keycloak user is already linked to a doctor");
	    }

	    Doctor doctor = new Doctor();
	    copyRequest(request, doctor);
	    doctor.setKeycloakUserId(userId);

	    return doctorRepository.save(doctor);
	}
	
	public Doctor getByKeycloakUserId(String keycloakUserId) {
	    return doctorRepository.findByKeycloakUserId(keycloakUserId)
	            .orElseThrow(() -> new ResponseStatusException(
	                    HttpStatus.NOT_FOUND,
	                    "No doctor record is linked to this Keycloak user"));
	}

	public Doctor linkCurrentDoctor(String keycloakUserId, String email) {
	    if (keycloakUserId == null || keycloakUserId.isBlank()
	            || email == null || email.isBlank()) {
	        throw new ResponseStatusException(
	                HttpStatus.BAD_REQUEST,
	                "Keycloak user ID and email are required"
	        );
	    }

	    Doctor doctor = doctorRepository.findByEmailIgnoreCase(email.trim())
	            .orElseThrow(() -> new ResponseStatusException(
	                    HttpStatus.NOT_FOUND,
	                    "No doctor profile matches your Keycloak email. Contact the administrator."
	            ));

	    Doctor existing = doctorRepository
	            .findByKeycloakUserId(keycloakUserId)
	            .orElse(null);

	    if (existing != null && !existing.getId().equals(doctor.getId())) {
	        throw new ResponseStatusException(
	                HttpStatus.CONFLICT,
	                "This Keycloak account is already linked to another doctor"
	        );
	    }

	    if (doctor.getKeycloakUserId() != null
	            && !doctor.getKeycloakUserId().equals(keycloakUserId)) {
	        throw new ResponseStatusException(
	                HttpStatus.CONFLICT,
	                "This doctor profile is already linked to another Keycloak account"
	        );
	    }

	    doctor.setKeycloakUserId(keycloakUserId);
	    return doctorRepository.save(doctor);
	}
	
    private void copyRequest(DoctorRequest request, Doctor doctor) {
        doctor.setFirstName(request.getFirstName());
        doctor.setLastName(request.getLastName());
        doctor.setEmail(request.getEmail());
        doctor.setPhone(request.getPhone());
        doctor.setSpecialization(request.getSpecialization());
        doctor.setDepartment(request.getDepartment());
        doctor.setConsultationFee(request.getConsultationFee());
        doctor.setAvailable(request.isAvailable());
    }
}