# Invoices Feature — Implementation Plan

## Background

The project is a Django physiotherapy clinic management system. It currently has apps for `clients` (with [Client](file:///Users/macbook/Desktop/kine_app/clients/models.py#7-67) and [Treatment](file:///Users/macbook/Desktop/kine_app/clients/models.py#68-260) models), `client_sessions`, [payments](file:///Users/macbook/Desktop/kine_app/payments/services.py#81-136), `app_settings` (with [AppOption](file:///Users/macbook/Desktop/kine_app/app_settings/models.py#3-32), [Holiday](file:///Users/macbook/Desktop/kine_app/app_settings/models.py#33-42), [ClinicClosedDay](file:///Users/macbook/Desktop/kine_app/app_settings/models.py#43-59), [ClinicClosureRange](file:///Users/macbook/Desktop/kine_app/app_settings/models.py#60-74)), `users`, `authentification`, and `permissions`.

The task is to build a new **`invoices`** Django app — an independent document-generation module linked to [Client](file:///Users/macbook/Desktop/kine_app/clients/models.py#7-67) but **not** coupled to [Treatment](file:///Users/macbook/Desktop/kine_app/clients/models.py#68-260) or [Payment](file:///Users/macbook/Desktop/kine_app/payments/models.py#8-61). The invoice is a snapshot document; once created, it is immutable from external data changes.

## Research Summary

### Scheduling logic (the critical refactoring target)

The scheduling/date-generation logic currently lives in **[clients/models.py](file:///Users/macbook/Desktop/kine_app/clients/models.py)** as private methods on the [Treatment](file:///Users/macbook/Desktop/kine_app/clients/models.py#68-260) model:

| Method | Purpose |
|--------|---------|
| [_rhythm_sessions_per_week()](file:///Users/macbook/Desktop/kine_app/clients/models.py#129-138) | Maps `session_rhythm.code` → int (1/2/3) |
| [_session_days_for_week()](file:///Users/macbook/Desktop/kine_app/clients/models.py#139-148) | Returns weekday ints for the rhythm |
| [_closed_weekdays()](file:///Users/macbook/Desktop/kine_app/clients/models.py#149-154) | Queries [ClinicClosedDay](file:///Users/macbook/Desktop/kine_app/app_settings/models.py#43-59) |
| [_holiday_dates()](file:///Users/macbook/Desktop/kine_app/client_sessions/models.py#48-53) | Queries [Holiday](file:///Users/macbook/Desktop/kine_app/app_settings/models.py#33-42) |
| [_is_in_closure_range(date)](file:///Users/macbook/Desktop/kine_app/client_sessions/models.py#53-59) | Queries [ClinicClosureRange](file:///Users/macbook/Desktop/kine_app/app_settings/models.py#60-74) |
| [_is_working_day(date)](file:///Users/macbook/Desktop/kine_app/clients/models.py#168-176) | Compound skip-logic |
| [_calculate_end_date()](file:///Users/macbook/Desktop/kine_app/clients/models.py#177-197) | Iterates from `start_date`, skips closed/holiday/closure days, counts sessions → returns [end_date](file:///Users/macbook/Desktop/kine_app/clients/models.py#177-197) |
| [generate_sessions()](file:///Users/macbook/Desktop/kine_app/clients/models.py#198-244) | Same iteration, but creates [Session](file:///Users/macbook/Desktop/kine_app/client_sessions/models.py#6-77) objects |

This logic must be **extracted** into a shared helper so `invoices` can reuse it. The [Treatment](file:///Users/macbook/Desktop/kine_app/clients/models.py#68-260) model will be updated to call the shared helper instead, preserving all existing behavior.

### AppOption infrastructure

- Model in [app_settings/models.py](file:///Users/macbook/Desktop/kine_app/app_settings/models.py)
- Category constants + `CATEGORY_CHOICES` list on the model
- Seed command in [seed_app_options.py](file:///Users/macbook/Desktop/kine_app/app_settings/management/commands/seed_app_options.py) using `update_or_create`

### URL mounting pattern

All apps are mounted in [app/urls.py](file:///Users/macbook/Desktop/kine_app/app/urls.py) under `api/` prefixes (e.g. `api/payments/`, `api/sessions/`).

### Serializer/ViewSet conventions

- DRF `ModelViewSet` or `viewsets.ModelViewSet`
- `DefaultRouter` for URL registration
- Separate list/detail serializers where needed
- `select_related` on querysets
- AppOption FK validation in serializers
- `IsAuthenticated` permission class
- Soft-delete pattern (no hard delete)

---

## Proposed Changes

### Component 1 — Shared Scheduling Helper

> [!IMPORTANT]
> This refactors scheduling logic out of [Treatment](file:///Users/macbook/Desktop/kine_app/clients/models.py#68-260) into a reusable module. The [Treatment](file:///Users/macbook/Desktop/kine_app/clients/models.py#68-260) model will be updated to delegate to this helper. **Existing behavior is preserved exactly** — the functions produce identical results.

#### [NEW] [scheduling.py](file:///Users/macbook/Desktop/kine_app/app_settings/scheduling.py)

New shared module in `app_settings` (since it uses [Holiday](file:///Users/macbook/Desktop/kine_app/app_settings/models.py#33-42), [ClinicClosedDay](file:///Users/macbook/Desktop/kine_app/app_settings/models.py#43-59), [ClinicClosureRange](file:///Users/macbook/Desktop/kine_app/app_settings/models.py#60-74) from this app). Contains:

- `get_sessions_per_week(rhythm_code: str) -> int | None` — maps rhythm code to sessions-per-week count
- `get_session_weekdays(rhythm_code: str) -> list[int]` — returns weekday indices for the rhythm
- `get_closed_weekdays() -> set[int]` — queries active [ClinicClosedDay](file:///Users/macbook/Desktop/kine_app/app_settings/models.py#43-59)
- `get_holiday_dates() -> set[date]` — queries active [Holiday](file:///Users/macbook/Desktop/kine_app/app_settings/models.py#33-42)
- [is_in_closure_range(date_value) -> bool](file:///Users/macbook/Desktop/kine_app/client_sessions/models.py#53-59) — queries active [ClinicClosureRange](file:///Users/macbook/Desktop/kine_app/app_settings/models.py#60-74)
- [is_working_day(date_value, closed_weekdays, holiday_dates) -> bool](file:///Users/macbook/Desktop/kine_app/clients/models.py#168-176) — composite check (takes pre-fetched sets to avoid N+1 queries)
- `generate_session_dates(start_date, num_sessions, rhythm_code) -> list[date]` — core scheduling: iterates days, skips non-working days, returns list of valid session dates
- [calculate_end_date(start_date, num_sessions, rhythm_code) -> date | None](file:///Users/macbook/Desktop/kine_app/clients/models.py#177-197) — returns the last date from `generate_session_dates`

---

#### [MODIFY] [models.py](file:///Users/macbook/Desktop/kine_app/clients/models.py) (Treatment class only)

- Replace [_rhythm_sessions_per_week](file:///Users/macbook/Desktop/kine_app/clients/models.py#129-138), [_session_days_for_week](file:///Users/macbook/Desktop/kine_app/clients/models.py#139-148), [_closed_weekdays](file:///Users/macbook/Desktop/kine_app/clients/models.py#149-154), [_holiday_dates](file:///Users/macbook/Desktop/kine_app/client_sessions/models.py#48-53), [_is_in_closure_range](file:///Users/macbook/Desktop/kine_app/client_sessions/models.py#53-59), [_is_working_day](file:///Users/macbook/Desktop/kine_app/clients/models.py#168-176), [_calculate_end_date](file:///Users/macbook/Desktop/kine_app/clients/models.py#177-197) with calls to the shared functions from `app_settings.scheduling`.
- [generate_sessions](file:///Users/macbook/Desktop/kine_app/clients/models.py#198-244) will use `generate_session_dates()` from the helper instead of its inline loop.
- All public behavior (end date calculation, session generation) remains identical.

---

### Component 2 — AppOption: Add `invoice_type` Category

#### [MODIFY] [models.py](file:///Users/macbook/Desktop/kine_app/app_settings/models.py)

- Add constant `CATEGORY_INVOICE_TYPE = "invoice_type"` to [AppOption](file:///Users/macbook/Desktop/kine_app/app_settings/models.py#3-32)
- Add [(CATEGORY_INVOICE_TYPE, "Invoice Type")](file:///Users/macbook/Desktop/kine_app/app_settings/views.py#50-61) to `CATEGORY_CHOICES`

#### [MODIFY] [seed_app_options.py](file:///Users/macbook/Desktop/kine_app/app_settings/management/commands/seed_app_options.py)

- Add `"invoice_type"` category with values: [("cnss", "CNSS")](file:///Users/macbook/Desktop/kine_app/app_settings/views.py#50-61), [("particulier", "Particulier")](file:///Users/macbook/Desktop/kine_app/app_settings/views.py#50-61)

---

### Component 3 — New `invoices` App

#### [NEW] [invoices/\_\_init\_\_.py](file:///Users/macbook/Desktop/kine_app/invoices/__init__.py)

Empty init file.

#### [NEW] [invoices/apps.py](file:///Users/macbook/Desktop/kine_app/invoices/apps.py)

Standard Django AppConfig for `invoices`.

#### [NEW] [invoices/models.py](file:///Users/macbook/Desktop/kine_app/invoices/models.py)

**`Invoice` model** — stores a complete snapshot:

| Field | Type | Notes |
|-------|------|-------|
| `client` | FK → [Client](file:///Users/macbook/Desktop/kine_app/clients/models.py#7-67) | `on_delete=CASCADE` |
| `invoice_type` | FK → [AppOption](file:///Users/macbook/Desktop/kine_app/app_settings/models.py#3-32) | `limit_choices_to={"category": "invoice_type"}` |
| `invoice_number` | `CharField(unique=True)` | Auto-generated: `INV-1`, `INV-2`, … |
| `issue_date` | `DateField` | Defaults to creation date |
| `client_full_name` | `CharField` | Snapshot of client name |
| `diagnosis` | `TextField(blank, null)` | Optional |
| `type_and_site` | `CharField(blank, null)` | Optional |
| `start_date` | `DateField` | Required input |
| [end_date](file:///Users/macbook/Desktop/kine_app/clients/models.py#177-197) | `DateField` | Auto-computed via scheduling logic |
| `number_of_sessions` | `PositiveIntegerField` | Required input |
| [session_rhythm](file:///Users/macbook/Desktop/kine_app/clients/serializers.py#92-96) | FK → [AppOption](file:///Users/macbook/Desktop/kine_app/app_settings/models.py#3-32) | Points to session rhythm option |
| `session_rhythm_text` | `CharField` | Snapshot of rhythm label |
| `invoice_type_text` | `CharField` | Snapshot of invoice type label |
| `unit_price` | `DecimalField` | Required input |
| `total_amount` | `DecimalField` | Auto-computed: `number_of_sessions * unit_price` |
| `notes` | `TextField(blank, null)` | Optional |
| `pdf_file` | `FileField(blank, null)` | For future PDF support |
| `created_at` | `DateTimeField(auto_now_add)` | |
| `updated_at` | `DateTimeField(auto_now)` | |

#### [NEW] [invoices/services.py](file:///Users/macbook/Desktop/kine_app/invoices/services.py)

Contains `create_invoice(validated_data) -> Invoice`:

1. Generates `invoice_number` (INV-{sequential})
2. Sets `issue_date` to today if not provided
3. Snapshots `client_full_name`, `session_rhythm_text`, `invoice_type_text`
4. Computes [end_date](file:///Users/macbook/Desktop/kine_app/clients/models.py#177-197) via `app_settings.scheduling.calculate_end_date()`
5. Computes `total_amount = number_of_sessions * unit_price`
6. Creates and returns the `Invoice` record

Also contains `generate_invoice_number() -> str`.

#### [NEW] [invoices/serializers.py](file:///Users/macbook/Desktop/kine_app/invoices/serializers.py)

- **`InvoiceCreateSerializer`** — write serializer for POST. Accepts required + optional inputs, validates:
  - `invoice_type` must be [AppOption](file:///Users/macbook/Desktop/kine_app/app_settings/models.py#3-32) with `category="invoice_type"`
  - [session_rhythm](file:///Users/macbook/Desktop/kine_app/clients/serializers.py#92-96) must be [AppOption](file:///Users/macbook/Desktop/kine_app/app_settings/models.py#3-32) with `category="session_rhythm"`
  - `number_of_sessions > 0`
  - `unit_price > 0`
  - `client` is required
  - `start_date` is required
  - Calls `services.create_invoice()` in its [create()](file:///Users/macbook/Desktop/kine_app/payments/views.py#37-42) method
- **`InvoiceListSerializer`** — lightweight read serializer for list endpoint
- **`InvoiceDetailSerializer`** — full read serializer for detail endpoint

#### [NEW] [invoices/views.py](file:///Users/macbook/Desktop/kine_app/invoices/views.py)

- **`InvoiceViewSet`** — `ModelViewSet` (thin), `IsAuthenticated` permission. Supports list, create, retrieve, partial_update.
  - [get_serializer_class()](file:///Users/macbook/Desktop/kine_app/clients/views.py#58-64) returns different serializers by action
  - [get_queryset()](file:///Users/macbook/Desktop/kine_app/clients/views.py#52-58) supports `?client_id=` and `?invoice_type=` filters
  - Disables hard delete (consistent with project convention)

#### [NEW] [invoices/urls.py](file:///Users/macbook/Desktop/kine_app/invoices/urls.py)

Uses `DefaultRouter` to register `InvoiceViewSet` at `"invoices"`.

#### [NEW] [invoices/admin.py](file:///Users/macbook/Desktop/kine_app/invoices/admin.py)

`InvoiceAdmin` with:
- `list_display`: invoice_number, client, invoice_type, issue_date, number_of_sessions, unit_price, total_amount, start_date, end_date
- `search_fields`: invoice_number, client__full_name
- `list_filter`: invoice_type, issue_date

#### [NEW] [invoices/migrations/0001_initial.py](file:///Users/macbook/Desktop/kine_app/invoices/migrations/0001_initial.py)

Auto-generated by `makemigrations`.

---

### Component 4 — Project Wiring

#### [MODIFY] [settings.py](file:///Users/macbook/Desktop/kine_app/app/settings.py)

Add `"invoices"` to `INSTALLED_APPS`.

#### [MODIFY] [urls.py](file:///Users/macbook/Desktop/kine_app/app/urls.py)

Add `path('api/invoices/', include('invoices.urls'))`.

---

## API Examples

### Create Invoice — `POST /api/invoices/`

**Request:**
```json
{
  "client": 1,
  "invoice_type": 12,
  "start_date": "2026-04-01",
  "number_of_sessions": 10,
  "session_rhythm": 5,
  "unit_price": "150.00",
  "diagnosis": "Lumbar disc herniation L4-L5",
  "type_and_site": "Physiotherapy - Lumbar spine",
  "notes": "CNSS coverage approved"
}
```

**Response (201):**
```json
{
  "id": 1,
  "invoice_number": "INV-1",
  "client": 1,
  "client_full_name": "Ahmed Bouziane",
  "invoice_type": 12,
  "invoice_type_text": "CNSS",
  "issue_date": "2026-03-16",
  "diagnosis": "Lumbar disc herniation L4-L5",
  "type_and_site": "Physiotherapy - Lumbar spine",
  "start_date": "2026-04-01",
  "end_date": "2026-05-06",
  "number_of_sessions": 10,
  "session_rhythm": 5,
  "session_rhythm_text": "3 per week",
  "unit_price": "150.00",
  "total_amount": "1500.00",
  "notes": "CNSS coverage approved",
  "pdf_file": null,
  "created_at": "2026-03-16T12:27:14Z",
  "updated_at": "2026-03-16T12:27:14Z"
}
```

---

## Future PDF Extension

The `pdf_file` `FileField` is already present and nullable. To add PDF generation later:
1. Add a PDF generation utility (e.g., using `weasyprint` or `reportlab`)
2. Call it from [services.py](file:///Users/macbook/Desktop/kine_app/payments/services.py) after invoice creation
3. Save the generated file to `pdf_file`
4. Optionally add a `GET /api/invoices/{id}/pdf/` endpoint for download

No over-engineering is done now — just the field and clean architecture.

---

## Verification Plan

### Automated Verification

1. **Run migrations and check for errors:**
   ```bash
   cd /Users/macbook/Desktop/kine_app && source venv/bin/activate && python manage.py makemigrations invoices && python manage.py migrate
   ```

2. **Seed the new `invoice_type` AppOption values:**
   ```bash
   cd /Users/macbook/Desktop/kine_app && source venv/bin/activate && python manage.py seed_app_options
   ```

3. **Django system check (validates models, admin, URLs):**
   ```bash
   cd /Users/macbook/Desktop/kine_app && source venv/bin/activate && python manage.py check
   ```

4. **Verify the existing Treatment scheduling still works** — create a quick smoke test script in `/tmp/test_scheduling.py`:
   - Import `generate_session_dates` and [calculate_end_date](file:///Users/macbook/Desktop/kine_app/clients/models.py#177-197) from the shared helper
   - Import [Treatment](file:///Users/macbook/Desktop/kine_app/clients/models.py#68-260) model
   - Compare that `Treatment._calculate_end_date()` returns the same result as [calculate_end_date()](file:///Users/macbook/Desktop/kine_app/clients/models.py#177-197) for the same inputs
   - Run with `python manage.py shell < /tmp/test_scheduling.py`

5. **Verify invoice creation via Django shell** — a script in `/tmp/test_invoice_api.py` that:
   - Creates or fetches a test client
   - Creates an invoice via the service layer
   - Asserts `invoice_number`, [end_date](file:///Users/macbook/Desktop/kine_app/clients/models.py#177-197), `total_amount` are correctly computed
   - Run with `python manage.py shell < /tmp/test_invoice_api.py`

6. **Start the dev server and test endpoints** using the browser tool or curl:
   - `GET /api/invoices/` → 200 with empty list
   - `POST /api/invoices/` → 201 with computed fields
   - `GET /api/invoices/1/` → 200 with full detail
   - `PATCH /api/invoices/1/` → 200 with updated notes
