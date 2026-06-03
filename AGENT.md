# Fire Extinguisher Management System Using RESTful Microservices

## Project Description

**TZW LTD** is a company dedicated to managing, inspecting, and maintaining fire safety equipment, particularly fire extinguishers, across various commercial buildings and large facilities within the region.

Currently, the company's Fire Extinguisher Management System is built using a monolithic architecture. However, the system faces several challenges, including:

* Missed inspection deadlines
* Difficulty tracking maintenance history
* Compliance monitoring issues
* Limited scalability and maintainability

To improve operational efficiency and system functionality, TZW LTD intends to migrate its existing system to a **Microservices Architecture**.

The new system will enable users to:

* Check fire extinguisher status
* Schedule inspections
* Log maintenance activities
* Monitor compliance requirements
* Generate real-time reports

As a Full-Stack Developer, you have been hired to analyze, design, and implement a **RESTful Microservices-Based Fire Extinguisher Management System** that ensures scalability, maintainability, security, and high availability.

---

# Activity 1: Requirements Analysis and Design

## 1. Microservices Identification and API Design

Identify and define the required microservices and design RESTful API contracts using **Swagger/OpenAPI Documentation**.

Possible microservices include:

* User Management Service
* Authentication Service
* Fire Extinguisher Management Service
* Inspection & Maintenance Service
* Reporting Service
* Notification Service

## 2. Database Design

Define and design the database model, including:

* Entity Relationship Diagram (ERD)
* Database schema
* Table relationships
* Constraints and indexes

## 3. User Interface Design

Create UI mockups using **Figma** or any other design tool for:

* User Registration Form
* Login Form
* Dashboard
* Fire Extinguisher Management Pages
* Inspection Scheduling Pages
* Reports Pages

---

# Activity 2: User Management Service

## A. Define User Roles

### Admin

Responsible for:

* Managing users
* Managing system settings
* Maintaining data integrity
* Viewing reports and analytics

### Inspector

Responsible for:

* Conducting inspections
* Logging inspection results
* Recording maintenance activities
* Scheduling maintenance

### User

Responsible for:

* Viewing extinguisher status
* Scheduling inspections
* Viewing inspection history

---

## B. User Registration API

Implement an API endpoint for user registration.

### Required Fields

* First Name
* Last Name
* Email Address
* Password

The endpoint must:

* Validate input data
* Prevent duplicate registrations
* Store passwords securely using hashing

---

## C. Authentication and Authorization

Implement JWT-based authentication and role-based authorization.

### Features

* User Login
* User Logout
* Token Generation
* Token Validation
* Role-Based Access Control (RBAC)

The system should securely manage authentication tokens and user sessions.

---

## D. User Profile Management

Develop APIs that allow users to:

* View Profile
* Update Profile Information
* Change Password
* Recover Forgotten Password

---

# Activity 3: Fire Extinguisher Management Service

## A. Register New Fire Extinguisher

Create an API endpoint to register a new fire extinguisher.

### Required Information

* Serial Number
* Location
* Type

  * Water
  * CO₂
  * Foam
  * Dry Chemical
* Size

  * 1.5 lb
  * 5 lb
  * 9 lb
  * 12 lb
* Installation Date
* Expiry Date
* Status

---

## B. List All Fire Extinguishers

Create an API endpoint to retrieve all fire extinguisher records.

---

## C. View Fire Extinguisher Details

Create an API endpoint to retrieve extinguisher details by ID.

---

## D. Update Fire Extinguisher Information

Create an API endpoint to update extinguisher information.

---

## E. Delete Fire Extinguisher

Create an API endpoint to remove an extinguisher record.

---

## F. Inspection Scheduling

Develop an API that allows users to schedule inspections.

### Features

* Select Fire Extinguisher
* Choose Inspection Date
* Choose Inspection Time
* Notify Relevant Personnel

---

## G. Maintenance Logging

Develop an API that allows inspectors to log maintenance activities.

### Required Information

* Fire Extinguisher
* Action Taken
* Date of Maintenance
* Issues Identified
* Notes and Recommendations

---

# Activity 4: Reporting Service

## Real-Time Reports

Develop APIs and dashboards capable of generating real-time reports, including:

### Inventory Reports

* Total Number of Fire Extinguishers
* Daily Inventory Summary
* Monthly Inventory Summary
* Yearly Inventory Summary

### Inspection Reports

* Pending Inspections
* Completed Inspections
* Overdue Inspections

### Compliance Reports

* Expired Fire Extinguishers
* Upcoming Expirations
* Compliance Status

### Maintenance Reports

* Maintenance History
* Maintenance Frequency
* Recent Maintenance Activities

---

# Activity 5: API Testing and Deployment

## 1. API Testing and Documentation

* Test all RESTful APIs
* Validate functionality and security
* Document APIs using Swagger/OpenAPI

## 2. Database Export

* Export the database
* Provide backup scripts
* Push the project to the provided repository

## 3. Report Export Functionality

Implement report export features in:

* PDF Format
* CSV Format

## 4. Project Handover

Deliver the following:

* Source Code
* Swagger Documentation
* Database Export
* ERD
* UI Mockups
* Test Results
* Deployment Guide
* User Manual

Push the completed project to the provided repository.

---

# Repository Git Identity (required)

All commits in this repository must be authored by:

- **Name:** `0xJonaseb11`
- **Email:** `sebejaz99@gmail.com`

Do **not** commit as any other identity (including Cursor/agent defaults or other contributors).

## One-time setup (human developer)

From the repo root:

```bash
npm run setup:git
```

This sets repo-local `user.name`, `user.email`, and enables `.githooks/pre-commit` to block wrong authors.

## After rewriting history

If commit authors were corrected locally, update the remote with:

```bash
git push --force-with-lease origin main
```