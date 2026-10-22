package com.hospital.notification.listener;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import com.hospital.notification.config.RabbitMQConfig;
import com.hospital.notification.entity.Notification;
import com.hospital.notification.event.AppointmentCreatedEvent;
import com.hospital.notification.repository.NotificationRepository;

@Component
public class AppointmentNotificationListener {

    private final NotificationRepository notificationRepository;

    public AppointmentNotificationListener(
            NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @RabbitListener(queues = RabbitMQConfig.QUEUE)
    public void handleAppointmentCreated(
            AppointmentCreatedEvent event) {

        Notification notification = new Notification(
                event.getAppointmentId(),
                event.getPatientId(),
                event.getDoctorId(),
                event.getAppointmentDateTime(),
                event.getReason(),
                event.getStatus()
        );

        Notification savedNotification =
                notificationRepository.save(notification);

        System.out.println("================================");
        System.out.println(" APPOINTMENT NOTIFICATION SAVED");
        System.out.println("================================");
        System.out.println("Notification ID: " + savedNotification.getId());
        System.out.println("Appointment ID: " + savedNotification.getAppointmentId());
        System.out.println("Patient ID: " + savedNotification.getPatientId());
        System.out.println("Doctor ID: " + savedNotification.getDoctorId());
        System.out.println("Appointment Date: " + savedNotification.getAppointmentDateTime());
        System.out.println("Reason: " + savedNotification.getReason());
        System.out.println("Status: " + savedNotification.getStatus());
        System.out.println("Saved successfully to H2 database.");
        System.out.println("================================");
    }
}