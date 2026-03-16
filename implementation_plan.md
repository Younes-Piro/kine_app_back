# Payment Module — Implementation Plan

A simplified, treatment-scoped payment system. Payments belong to a treatment. Session payment status is derived from active payment totals using an oldest-first distribution. No partial payments, no allocation tables.

---

## Proposed Changes

### 1. AppOption (app_settings)

#### [MODIFY] [models.py](file:///Users/macbook/Desktop/kine_app/app_settings/models.py)

Add two new category constants and choices:

```python
CATEGORY_PAYMENT_STATUS = "payment_status"
CATEGORY_PAYMENT_METHOD = "payment_method"
```

Add them to `CATEGORY_CHOICES`.

#### [MODIFY] [seed_app_options.py](file:///Users/macbook/Desktop/kine_app/app_settings/management/commands/seed_app_options.py)

Add seed data:

```python
"payment_status": [
    ("paid", "Paid"),
    ("unpaid", "Unpaid"),
],
"payment_method": [
    ("cash", "Cash"),
    ("card", "Card"),
    ("bank_transfer", "Bank Transfer"),
    ("check", "Check"),
],
```

> Migration needed: Yes (choice field updated)

---

### 2. Treatment Model (clients)

#### [MODIFY] [models.py](file:///Users/macbook/Desktop/kine_app/clients/models.py)

Add three fields to [Treatment](file:///Users/macbook/Desktop/kine_app/clients/models.py#67-228):

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `session_price` | `DecimalField(10,2)` | `0` | Price per session |
| `total_price` | `DecimalField(10,2)` | `0` | Auto-calculated |
| `balance` | `DecimalField(10,2)` | `0` | Leftover credit |

In [save()](file:///Users/macbook/Desktop/kine_app/clients/models.py#218-224), add: `self.total_price = self.prescribed_sessions * self.session_price`

#### [MODIFY] [serializers.py](file:///Users/macbook/Desktop/kine_app/clients/serializers.py)

Add `session_price`, `total_price`, `balance` to [TreatmentSerializer](file:///Users/macbook/Desktop/kine_app/clients/serializers.py#54-98), [TreatmentListSerializer](file:///Users/macbook/Desktop/kine_app/clients/serializers.py#113-133), and [TreatmentDetailSerializer](file:///Users/macbook/Desktop/kine_app/clients/serializers.py#134-167). Mark `total_price` and `balance` as read-only.

#### [MODIFY] [views.py](file:///Users/macbook/Desktop/kine_app/clients/views.py)

Add a `balance` detail action on [TreatmentViewSet](file:///Users/macbook/Desktop/kine_app/clients/views.py#34-64) that returns the treatment's financial summary plus its sessions with payment status.

---

### 3. Session Model (client_sessions)

#### [MODIFY] [models.py](file:///Users/macbook/Desktop/kine_app/client_sessions/models.py)

Add `payment_status` FK to [AppOption](file:///Users/macbook/Desktop/kine_app/app_settings/models.py#3-28) with `limit_choices_to` for `payment_status` category. Default: reference the "unpaid" option (nullable FK, set in save).

#### [MODIFY] [serializers.py](file:///Users/macbook/Desktop/kine_app/client_sessions/serializers.py)

Add `payment_status` and `payment_status_label` to [SessionSerializer](file:///Users/macbook/Desktop/kine_app/client_sessions/serializers.py#5-50).

#### [MODIFY] [signals.py](file:///Users/macbook/Desktop/kine_app/client_sessions/signals.py)

After a session status changes to "completed", trigger payment recalculation for the treatment so the balance/paid status stays consistent.

---

### 4. Payments App (NEW)

#### [NEW] [payments/](file:///Users/macbook/Desktop/kine_app/payments/)

New Django app with:

| File | Purpose |
|------|---------|
| [models.py](file:///Users/macbook/Desktop/kine_app/users/models.py) | `Payment` model (treatment FK, amount, payment_date, payment_method FK, notes, is_active, timestamps) |
| [serializers.py](file:///Users/macbook/Desktop/kine_app/users/serializers.py) | `PaymentSerializer` with validation (amount > 0, treatment required) |
| [views.py](file:///Users/macbook/Desktop/kine_app/users/views.py) | `PaymentViewSet` — CRUD with soft-delete on [destroy](file:///Users/macbook/Desktop/kine_app/clients/views.py#22-27), filter by `?treatment=<id>` |
| [urls.py](file:///Users/macbook/Desktop/kine_app/app/urls.py) | Router registration |
| [admin.py](file:///Users/macbook/Desktop/kine_app/users/admin.py) | `PaymentAdmin` with list display + filters |
| `services.py` | Core payment distribution logic |
| [signals.py](file:///Users/macbook/Desktop/kine_app/users/signals.py) | Auto-trigger recalculation on Payment save/delete |
| [apps.py](file:///Users/macbook/Desktop/kine_app/users/apps.py) | App config with [ready()](file:///Users/macbook/Desktop/kine_app/client_sessions/apps.py#8-10) to load signals |

#### Service Logic (`services.py`)

```
def recalculate_treatment_payments(treatment):
    1. Sum all active Payment.amount for this treatment
    2. Get completed, unpaid-eligible sessions ordered by (session_date ASC, id ASC)
    3. Walk through sessions oldest-first, marking "paid" while total >= session_price
    4. Any remaining completed sessions → "unpaid"
    5. Leftover amount < session_price → save to treatment.balance
```

The source of truth is **total active paid money**. Session `payment_status` and `treatment.balance` are *derived*.

---

### 5. Wiring

#### [MODIFY] [settings.py](file:///Users/macbook/Desktop/kine_app/app/settings.py)

Add `"payments.apps.PaymentsConfig"` to `INSTALLED_APPS`.

#### [MODIFY] [urls.py](file:///Users/macbook/Desktop/kine_app/app/urls.py)

Add `path('api/payments/', include('payments.urls'))`.

---

### 6. Endpoints Summary

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/payments/?treatment=<id>` | List payments for a treatment |
| `POST` | `/api/payments/` | Create a payment (triggers recalc) |
| `GET` | `/api/payments/<id>/` | Payment detail |
| `PATCH` | `/api/payments/<id>/` | Update payment (triggers recalc) |
| `DELETE` | `/api/payments/<id>/` | Soft-delete (set `is_active=False`, triggers recalc) |
| `GET` | `/api/treatments/<id>/balance/` | Treatment financial summary + session list |

---

## Verification Plan

### Automated

1. **Migrations**: Run `python manage.py makemigrations` and `python manage.py migrate` — must complete with no errors
2. **Seed**: Run `python manage.py seed_app_options` — must seed new `payment_status` and `payment_method` categories
3. **Server Start**: Run `python manage.py runserver` — must start without import/config errors
4. **Django Check**: Run `python manage.py check` — must report no issues

### Manual (by user)

After the implementation, you can test with these steps:

1. Create a treatment via `POST /api/treatments/` with a `session_price`
2. Mark some sessions as completed via `PATCH /api/sessions/<id>/mark_completed/`
3. Create a payment via `POST /api/payments/` and verify sessions get marked as paid
4. Check `GET /api/treatments/<id>/balance/` for the financial summary
5. Delete a payment and confirm sessions revert to unpaid
