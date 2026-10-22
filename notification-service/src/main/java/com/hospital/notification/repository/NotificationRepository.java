
package com.hospital.notification.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hospital.notification.entity.Notification;

public interface NotificationRepository
        extends JpaRepository<Notification, Long> {

    List<Notification> findByPatientId(Long patientId);

    List<Notification> findByDoctorId(Long doctorId);
}
