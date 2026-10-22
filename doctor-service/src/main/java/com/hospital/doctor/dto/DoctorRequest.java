package com.hospital.doctor.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.*;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DoctorRequest {

    @NotBlank
    private String firstName;

    @NotBlank
    private String lastName;

    @Email
    @NotBlank
    private String email;

    @NotBlank
    private String phone;

    @NotBlank
    private String specialization;

    @NotBlank
    private String department;

    @NotNull
    @DecimalMin("0.00")
    private BigDecimal consultationFee;

    private boolean available = true;
}