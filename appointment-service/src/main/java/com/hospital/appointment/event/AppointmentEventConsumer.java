package com.hospital.appointment.event;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import com.hospital.appointment.config.RabbitMQConfig;

@Component
public class AppointmentEventConsumer {

    @RabbitListener(queues = RabbitMQConfig.QUEUE)
    public void receive(AppointmentCreatedEvent event) {

        System.out.println("Appointment event received!");
        System.out.println("Appointment ID: "
                + event.getAppointmentId());
        System.out.println("Patient ID: "
                + event.getPatientId());
        System.out.println("Doctor ID: "
                + event.getDoctorId());
        System.out.println("Status: "
                + event.getStatus());
    }
}