
package com.hospital.patient.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hospital.patient.entity.Patient;

public interface PatientRepository extends JpaRepository<Patient, Long> {

    Optional<Patient> findByKeycloakUserId(String keycloakUserId);

	Optional<Patient> findByEmailIgnoreCase(String normalizedEmail);
}
