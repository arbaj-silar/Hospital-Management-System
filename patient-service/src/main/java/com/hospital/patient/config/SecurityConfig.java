
package com.hospital.patient.config;

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
        	.csrf(csrf -> csrf
        	    .ignoringRequestMatchers("/h2-console/**")
        	)

            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .headers(headers -> headers
            	    .frameOptions(frame -> frame.sameOrigin())
            )

            .authorizeHttpRequests(auth -> auth
            	.requestMatchers("/h2-console/**").permitAll()

                // Only ADMIN can view the complete patient list
                .requestMatchers(HttpMethod.GET, "/api/patients")
                    .hasRole("ADMIN")
                    
                .requestMatchers(HttpMethod.GET, "/api/patients/me")
                    .hasAnyRole("ADMIN", "PATIENT")

                // ADMIN and DOCTOR can view individual patient records
                .requestMatchers(HttpMethod.GET, "/api/patients/*")
                    .hasAnyRole("ADMIN", "DOCTOR")

                // Only ADMIN can register patients
                .requestMatchers(HttpMethod.POST, "/api/patients")
                    .hasRole("ADMIN")

                 // Only ADMIN can link Keycloak users to patient records
                .requestMatchers(
                     HttpMethod.PUT,
                     "/api/patients/*/keycloak-user/*"
                 ).hasRole("ADMIN")

                    // Only ADMIN can update patient records
                .requestMatchers(HttpMethod.PUT, "/api/patients/*")
                    .hasRole("ADMIN")

                .requestMatchers(HttpMethod.PATCH, "/api/patients/*")
                    .hasRole("ADMIN")

                // Only ADMIN can delete patients
                .requestMatchers(HttpMethod.DELETE, "/api/patients/*")
                    .hasRole("ADMIN")

                // Everything else requires authentication
                .anyRequest().authenticated()
            )

            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(
                        jwtAuthenticationConverter))
            );

        return http.build();
    }
}
