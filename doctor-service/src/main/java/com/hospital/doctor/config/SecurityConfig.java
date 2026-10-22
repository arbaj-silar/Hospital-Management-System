
package com.hospital.doctor.config;

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
    public org.springframework.security.web.SecurityFilterChain
            securityFilterChain(
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
            		
            	.requestMatchers(HttpMethod.GET, "/api/doctors/me")
            	    .hasAnyRole("ADMIN", "DOCTOR")

                // View doctor records
                .requestMatchers(HttpMethod.GET, "/api/doctors/**")
                    .hasAnyRole("ADMIN", "DOCTOR", "PATIENT")

                // Create, update, and delete doctor records
                .requestMatchers(HttpMethod.POST, "/api/doctors/**")
                    .hasRole("ADMIN")

                 // Only ADMIN can link Keycloak users to doctor records
                    .requestMatchers(
                        HttpMethod.PUT,
                        "/api/doctors/*/keycloak-user/*"
                    ).hasRole("ADMIN")

                    // Only ADMIN can update doctor records
                    .requestMatchers(HttpMethod.PUT, "/api/doctors/**")
                        .hasRole("ADMIN")

                .requestMatchers(HttpMethod.PATCH, "/api/doctors/**")
                    .hasRole("ADMIN")

                .requestMatchers(HttpMethod.DELETE, "/api/doctors/**")
                    .hasRole("ADMIN")

                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(
                        jwtAuthenticationConverter))
            );

        return http.build();
    }
}
