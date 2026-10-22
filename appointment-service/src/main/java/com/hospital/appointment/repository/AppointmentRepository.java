package com.hospital.appointment.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hospital.appointment.entity.Appointment;

public interface AppointmentRepository
        extends JpaRepository<Appointment, Long> {

    List<Appointment> findByPatientId(Long patientId);

    List<Appointment> findByDoctorId(Long doctorId);
}