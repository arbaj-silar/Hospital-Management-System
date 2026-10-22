# CarePoint — Hospital Management System

**CarePoint** is a full-stack hospital management project built with **React** and **Spring Boot microservices**. It demonstrates a modular backend architecture, centralized API routing, and Keycloak-based authentication for managing patient and doctor workflows.

## Highlights

- **Microservices architecture** — separates patient, doctor, appointment, and notification responsibilities.
- **Secure authentication** — Keycloak, JWT, and role-based access for `ADMIN`, `DOCTOR`, and `PATIENT` roles.
- **API Gateway** — a single entry point for frontend API requests.
- **Service discovery and configuration** — Eureka Server and Spring Cloud Config.
- **Asynchronous messaging** — RabbitMQ integration for notification workflows.
- **Modern frontend** — React, Vite, and Axios.
- **User-to-profile linking** — backend integration associates patient/doctor records with Keycloak user identities.

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React, JavaScript, Vite, Axios, CSS |
| Backend | Java, Spring Boot, Spring Web |
| Microservices | Spring Cloud Gateway, Eureka, Config Server |
| Security | Keycloak, OAuth 2.0 / OpenID Connect, JWT |
| Messaging | RabbitMQ |
| Database | H2 for current development services |

## Architecture

```text
React + Vite
     │
     ▼
API Gateway (:8085)
     │
     ├── Patient Service      (:8081)
     ├── Doctor Service       (:8082)
     ├── Appointment Service  (:8083)
     └── Notification Service(:8084)
                 │
                 ▼
              RabbitMQ

Supporting services:
Keycloak (:8080) · Eureka (:8761) · Config Server (:8888)
```

## Run Locally

**Prerequisites:** Java, Maven, Node.js/npm, Keycloak, and RabbitMQ (for notification messaging).

1. Start Keycloak and RabbitMQ.
2. Start Eureka Server and Config Server.
3. Start the Patient, Doctor, Appointment, and Notification services.
4. Start the API Gateway.
5. From the frontend directory, run:

   ```bash
   npm install
   npm run dev
   ```

6. Open `http://localhost:5173`.

Configure the Keycloak realm, clients, roles, and local environment variables before testing protected endpoints. Service ports may vary by configuration.

## Security

- Backend APIs validate Keycloak JWTs and enforce authorization.
- Backend secrets are supplied through environment variables.
- **Do not commit secrets, tokens, passwords, or real patient data.**

## Project Goal

This project explores how independently deployable Spring Boot services can work together behind an API Gateway, with centralized identity management and event-driven notification support.

---

*Built as a full-stack learning project. Features and deployment details should be verified against the current repository.*
