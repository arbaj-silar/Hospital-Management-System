package com.hospital.appointment.dto;

import java.time.LocalDateTime;

import jakarta.validation.constraints.*;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AppointmentRequest {

    @NotNull
    @Positive
    private Long patientId;

    @NotNull
    @Positive
    private Long doctorId;

    @NotNull
    @Future
    private LocalDateTime appointmentDateTime;

    @NotBlank
    private String reason;
}