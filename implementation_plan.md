# Permission Enforcement System — Implementation Plan

## Background

The project already has a working permission infrastructure:

| Component | Location | Details |
|-----------|----------|---------|
| [Permission](file:///Users/macbook/Desktop/kine_app/permissions/models.py#4-9) model | [permissions/models.py](file:///Users/macbook/Desktop/kine_app/permissions/models.py) | `code` (unique), `label` |
| [ProfilePermission](file:///Users/macbook/Desktop/kine_app/permissions/models.py#10-25) | Same file | M2M join: `profile` → [permission](file:///Users/macbook/Desktop/kine_app/users/views.py#14-21) |
| [Profile](file:///Users/macbook/Desktop/kine_app/users/models.py#4-20) model | [users/models.py](file:///Users/macbook/Desktop/kine_app/users/models.py) | `role`: `"admin"` or `"staff"` |
| Permissions endpoint | [permissions/views.py](file:///Users/macbook/Desktop/kine_app/permissions/views.py) | `GET /api/permissions/me/` returns current user's codes |
| [IsAdminProfile](file:///Users/macbook/Desktop/kine_app/users/views.py#13-21) | Duplicated in 3 files | [permissions/views.py](file:///Users/macbook/Desktop/kine_app/permissions/views.py), [users/views.py](file:///Users/macbook/Desktop/kine_app/users/views.py), [app_settings/views.py](file:///Users/macbook/Desktop/kine_app/app_settings/views.py) |

**Current state**: All endpoints use only `IsAuthenticated`. Some admin-only endpoints also use a local [IsAdminProfile](file:///Users/macbook/Desktop/kine_app/users/views.py#13-21). No DB permission codes are enforced anywhere.

**Goal**: Add a reusable DRF permission class that checks DB permission codes on every action, with admin bypass.

---

## Proposed Changes

### Component 1 — Permission Service

#### [NEW] [services.py](file:///Users/macbook/Desktop/kine_app/permissions/services.py)

Centralized permission helper functions:

- **`get_user_permission_codes(user)`** — Returns a [set](file:///Users/macbook/Desktop/kine_app/client_sessions/views.py#17-26) of permission code strings assigned to the user's profile. If user is admin, returns all permission codes.
- **`user_has_permission(user, permission_code)`** — Returns `True` if the user is admin OR has the specific permission code assigned.

---

### Component 2 — DRF Permission Class

#### [NEW] [drf_permissions.py](file:///Users/macbook/Desktop/kine_app/permissions/drf_permissions.py)

Contains:

- **`HasPermission`** — A DRF `BasePermission` subclass that:
  1. Reads `view.permission_map` (a dict mapping action names to permission codes)
  2. Gets the current action from `view.action`
  3. Looks up the required permission code
  4. Calls `user_has_permission(request.user, code)`
  5. Returns `True` (allowed) or `False` (denied)
  6. If an action is not in the map → **deny by default**
  7. Admin users always pass (handled inside `user_has_permission`)

- **[IsAdminProfile](file:///Users/macbook/Desktop/kine_app/users/views.py#13-21)** — Consolidated version (moved here from the 3 duplicate locations)

---

### Component 3 — Apply to All ViewSets

Each ViewSet gets:
1. `permission_classes = [IsAuthenticated, HasPermission]`
2. A `permission_map` dict attribute

#### [MODIFY] [clients/views.py](file:///Users/macbook/Desktop/kine_app/clients/views.py)

```python
# ClientViewSet
permission_map = {
    "list": "client:view",
    "retrieve": "client:view",
    "create": "client:create",
    "update": "client:update",
    "partial_update": "client:update",
    "deactivate": "client:update",
}

# TreatmentViewSet
permission_map = {
    "list": "treatment:view",
    "retrieve": "treatment:view",
    "create": "treatment:create",
    "update": "treatment:update",
    "partial_update": "treatment:update",
    "deactivate": "treatment:update",
    "balance": "treatment:view",
}
```

---

#### [MODIFY] [client_sessions/views.py](file:///Users/macbook/Desktop/kine_app/client_sessions/views.py)

```python
permission_map = {
    "list": "session:view",
    "retrieve": "session:view",
    "create": "session:create",
    "update": "session:update",
    "partial_update": "session:update",
    "mark_completed": "session:update",
}
```

---

#### [MODIFY] [payments/views.py](file:///Users/macbook/Desktop/kine_app/payments/views.py)

```python
permission_map = {
    "list": "payment:view",
    "retrieve": "payment:view",
    "create": "payment:create",
    "update": "payment:update",
    "partial_update": "payment:update",
    "destroy": "payment:update",
}
```

---

#### [MODIFY] [invoices/views.py](file:///Users/macbook/Desktop/kine_app/invoices/views.py)

```python
permission_map = {
    "list": "invoice:view",
    "retrieve": "invoice:view",
    "create": "invoice:create",
    "update": "invoice:update",
    "partial_update": "invoice:update",
}
```

---

#### [MODIFY] [app_settings/views.py](file:///Users/macbook/Desktop/kine_app/app_settings/views.py)

- Remove local [IsAdminProfile](file:///Users/macbook/Desktop/kine_app/users/views.py#13-21) class
- Import `HasPermission` from `permissions.drf_permissions`
- Apply `permission_map` to all 4 ViewSets + dashboard:

```python
# All settings ViewSets
permission_map = {
    "list": "settings:view",
    "retrieve": "settings:view",
    "create": "settings:update",
    "update": "settings:update",
    "partial_update": "settings:update",
    "destroy": "settings:update",
}

# SettingsDashboardAPIView — use IsAdminProfile or a custom check
```

---

#### [MODIFY] [users/views.py](file:///Users/macbook/Desktop/kine_app/users/views.py)

- Remove local [IsAdminProfile](file:///Users/macbook/Desktop/kine_app/users/views.py#13-21)
- Import [IsAdminProfile](file:///Users/macbook/Desktop/kine_app/users/views.py#13-21) from `permissions.drf_permissions`
- Users management stays admin-only (not permission-map based), so it keeps using [IsAdminProfile](file:///Users/macbook/Desktop/kine_app/users/views.py#13-21)

---

#### [MODIFY] [permissions/views.py](file:///Users/macbook/Desktop/kine_app/permissions/views.py)

- Remove local [IsAdminProfile](file:///Users/macbook/Desktop/kine_app/users/views.py#13-21)
- Import from `permissions.drf_permissions`

---

### Component 4 — Frontend Support Endpoint

The existing `GET /api/permissions/me/` already returns the right data:

```json
{
  "role": "staff",
  "permissions": ["client:view", "treatment:create", ...]
}
```

> [!NOTE]
> No changes needed to this endpoint — it already works correctly via [my_permissions_view](file:///Users/macbook/Desktop/kine_app/permissions/views.py#27-45) in [permissions/views.py](file:///Users/macbook/Desktop/kine_app/permissions/views.py). The task description mentions `/api/auth/me/permissions/` but the existing endpoint at `/api/permissions/me/` serves the same purpose. We'll keep the existing URL.

---

## Permission Matrix Summary

| Module | list/retrieve | create | update/partial_update | custom actions |
|--------|--------------|--------|----------------------|---------------|
| Clients | `client:view` | `client:create` | `client:update` | deactivate → `client:update` |
| Treatments | `treatment:view` | `treatment:create` | `treatment:update` | deactivate/balance → same |
| Sessions | `session:view` | `session:create` | `session:update` | mark_completed → `session:update` |
| Payments | `payment:view` | `payment:create` | `payment:update` | destroy → `payment:update` |
| Invoices | `invoice:view` | `invoice:create` | `invoice:update` | — |
| Settings | `settings:view` | `settings:update` | `settings:update` | — |
| Users | admin-only | admin-only | admin-only | admin-only |

---

## Verification Plan

### Automated Tests

1. **`manage.py check`** — Ensure no Django errors after changes
2. **Shell smoke test** — Script that:
   - Creates an admin user and a staff user
   - Assigns `client:view` to staff
   - Calls `user_has_permission()` for both
   - Asserts admin passes all, staff passes `client:view` only
3. **API test via Django test client** — Scripts that:
   - Admin user → `GET /api/clients/` → 200
   - Staff with `client:view` → `GET /api/clients/` → 200
   - Staff without `client:view` → `GET /api/clients/` → 403
   - Staff with `client:view` → `POST /api/clients/` → 403 (missing `client:create`)
