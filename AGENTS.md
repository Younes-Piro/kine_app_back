# Gemini Repository Guide

This repository is a Django backend application.

Gemini should use this document to understand project architecture.

---

## Project Overview

The system manages clients, sessions, permissions, invoices and payments.

Core features include:

- client management
- session tracking
- payment processing
- authentication and permissions
- API endpoints for frontend applications
- invoice management

---

## Technology Stack

- Python
- Django
- Django REST Framework
- SQLite (development)
- JWT authentication

---

## Project Structure

kine_app/

app_settings/
global project settings

authentication/
login, registration, tokens

clients/
client models and APIs

client_sessions/
session tracking and session status

permissions/
role-based permissions

invoices/
invoice models and APIs

users/
user management

manage.py
Django CLI entry point

requirements.txt
Python dependencies

---

## Development Rules

When modifying the project:

1. Follow Django best practices
2. Separate models, serializers, views, and services
3. Use migrations for schema changes
4. Keep APIs RESTful
5. Avoid breaking existing endpoints

---

## API Design

Typical pattern:

models.py
data models

serializers.py
API serialization

views.py
API endpoints

urls.py
route definitions

---

## Database Changes

If a model changes:

1. update models.py
2. run makemigrations
3. run migrate
4. update serializers
5. update API views
6. add tests

---

## Testing

All new features should include:

- API tests
- edge cases
- migration safety