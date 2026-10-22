
package com.hospital.appointment.config;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter =
                new JwtAuthenticationConverter();

        Converter<Jwt, Collection<GrantedAuthority>> rolesConverter =
                jwt -> {
                    Map<String, Object> realmAccess =
                            jwt.getClaimAsMap("realm_access");

                    if (realmAccess == null) {
                        return List.of();
                    }

                    Object rolesObject = realmAccess.get("roles");

                    if (!(rolesObject instanceof Collection<?> roles)) {
                        return List.of();
                    }

                    return roles.stream()
                            .filter(String.class::isInstance)
                            .map(String.class::cast)
                            .map(role -> new SimpleGrantedAuthority(
                                    "ROLE_" + role))
                            .collect(Collectors.toList());
                };

        converter.setJwtGrantedAuthoritiesConverter(rolesConverter);
        return converter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            JwtAuthenticationConverter jwtAuthenticationConverter)
            throws Exception {

        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authorizeHttpRequests(auth -> auth

                // Create: patients and administrators.
                .requestMatchers(HttpMethod.POST, "/api/appointments")
                    .hasAnyRole("PATIENT", "ADMIN")

                // View all: administrators only.
                .requestMatchers(HttpMethod.GET, "/api/appointments")
                    .hasRole("ADMIN")

                // View by patient or doctor, with ownership checks in service.
                .requestMatchers(HttpMethod.GET,
                        "/api/appointments/patient/**",
                        "/api/appointments/doctor/**")
                    .hasAnyRole("PATIENT", "DOCTOR", "ADMIN")

                // View one appointment, with ownership checks in service.
                .requestMatchers(HttpMethod.GET, "/api/appointments/*")
                    .hasAnyRole("PATIENT", "DOCTOR", "ADMIN")

                // Status updates: doctors and administrators.
                .requestMatchers(HttpMethod.PATCH,
                        "/api/appointments/*/status")
                    .hasAnyRole("DOCTOR", "ADMIN")

                // Cancel own appointment or delete as administrator.
                .requestMatchers(HttpMethod.DELETE, "/api/appointments/*")
                    .hasAnyRole("PATIENT", "ADMIN")

                .requestMatchers("/api/appointments/**")
                    .authenticated()

                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(
                        jwtAuthenticationConverter))
            );

        return http.build();
    }
}
