# Delete Behavior Optimization — Implementation Plan

## Current State Audit

| Module | [destroy()](file:///Users/macbook/Desktop/kine_app/users/views.py#25-30) | Deactivation | `is_active` field | Inconsistency |
|--------|-------------|-------------|-------------------|---------------|
| **Clients** | 405 | [deactivate](file:///Users/macbook/Desktop/kine_app/users/views.py#30-38) action | ✅ Yes | — |
| **Treatments** | 405 | [deactivate](file:///Users/macbook/Desktop/kine_app/users/views.py#30-38) action | ✅ Yes | — |
| **Users** | 405 | [deactivate](file:///Users/macbook/Desktop/kine_app/users/views.py#30-38) action | ✅ Yes | — |
| **Payments** | Soft delete in [destroy()](file:///Users/macbook/Desktop/kine_app/users/views.py#25-30) | Via [destroy()](file:///Users/macbook/Desktop/kine_app/users/views.py#25-30) | ✅ Yes | ⚠️ Different pattern |
| **Sessions** | 405 | ❌ None | ❌ No field | ⚠️ No deactivation path |
| **Invoices** | 405 | ❌ None | ❌ No field | ✅ Correct — immutable |
| **AppSettings** | Allowed (DRF default) | ❌ None | ✅ Yes (on models) | ⚠️ Hard delete exposed |

## Proposed Strategy: Three Tiers

### Tier 1 — Immutable Records (no delete, no deactivate)
**Invoices** — Legal snapshot documents. Once created, they must persist. Current behavior (405, no deactivate) is **correct**. No changes needed.

### Tier 2 — Soft-Deactivatable Records
**Clients, Treatments, Payments, Users** — Business records that should never be hard deleted but can be deactivated.

Standardized pattern:
- [destroy()](file:///Users/macbook/Desktop/kine_app/users/views.py#25-30) → returns **405** with message pointing to [deactivate](file:///Users/macbook/Desktop/kine_app/users/views.py#30-38)
- [deactivate](file:///Users/macbook/Desktop/kine_app/users/views.py#30-38) → custom PATCH action, sets `is_active = False`
- List querysets optionally filter out inactive records

### Tier 3 — Status-Managed Records (no delete, status-driven)
**Sessions** — Lifecycle managed via [status](file:///Users/macbook/Desktop/kine_app/clients/serializers.py#46-50) field (scheduled → completed / cancelled / missed). Sessions should not be deleted or deactivated; they change status instead. Current behavior (405, no deactivate) is **correct**. No changes needed.

### Settings — Admin-Controlled
**AppOption, Holiday, ClinicClosedDay, ClinicClosureRange** — These already have `is_active` fields. Block hard delete, add deactivate via the `is_active` field.

---

## Proposed Changes

### Component 1 — Standardize Payments (fix the inconsistency)

#### [MODIFY] [payments/views.py](file:///Users/macbook/Desktop/kine_app/payments/views.py)

Change [destroy()](file:///Users/macbook/Desktop/kine_app/users/views.py#25-30) from soft-delete to 405, add a [deactivate](file:///Users/macbook/Desktop/kine_app/users/views.py#30-38) action:

```diff
  def destroy(self, request, *args, **kwargs):
-     """Soft delete: set is_active = False instead of hard delete."""
-     payment = self.get_object()
-     payment.is_active = False
-     payment.save()
-     return Response(
-         {"detail": "Payment deactivated successfully."},
-         status=status.HTTP_200_OK,
-     )
+     return Response(
+         {"detail": "Hard delete is disabled. Use deactivate instead."},
+         status=status.HTTP_405_METHOD_NOT_ALLOWED,
+     )
+
+ @action(detail=True, methods=["patch"])
+ def deactivate(self, request, pk=None):
+     payment = self.get_object()
+     payment.is_active = False
+     payment.save()
+     return Response({"detail": "Payment deactivated successfully."})
```

Update `permission_map`:
```diff
- "destroy": "payment:update",
+ "deactivate": "payment:update",
```

---

### Component 2 — Standardize Settings (block hard delete, add deactivate)

#### [MODIFY] [app_settings/views.py](file:///Users/macbook/Desktop/kine_app/app_settings/views.py)

For all 4 settings ViewSets, override [destroy()](file:///Users/macbook/Desktop/kine_app/users/views.py#25-30) to block hard delete and add [deactivate](file:///Users/macbook/Desktop/kine_app/users/views.py#30-38):

```python
def destroy(self, request, *args, **kwargs):
    return Response(
        {"detail": "Hard delete is disabled. Use deactivate instead."},
        status=status.HTTP_405_METHOD_NOT_ALLOWED,
    )

@action(detail=True, methods=["patch"])
def deactivate(self, request, pk=None):
    obj = self.get_object()
    obj.is_active = False
    obj.save()
    return Response({"detail": "Deactivated successfully."})
```

Update `SETTINGS_PERMISSION_MAP`:
```diff
- "destroy": "settings:update",
+ "deactivate": "settings:update",
```

---

### Component 3 — Cascade Deactivation Logic

> [!IMPORTANT]
> When a parent record is deactivated, related child records should also be deactivated to maintain data consistency.

#### [MODIFY] [clients/views.py](file:///Users/macbook/Desktop/kine_app/clients/views.py) — ClientViewSet.deactivate

When deactivating a client, also deactivate all their active treatments:

```python
@action(detail=True, methods=["patch"])
def deactivate(self, request, pk=None):
    client = self.get_object()
    client.is_active = False
    client.save()
    # Cascade: deactivate all active treatments
    client.treatments.filter(is_active=True).update(is_active=False)
    return Response({"detail": "Client and related treatments deactivated successfully."})
```

#### [MODIFY] [clients/views.py](file:///Users/macbook/Desktop/kine_app/clients/views.py) — TreatmentViewSet.deactivate

When deactivating a treatment, also deactivate all related active payments:

```python
@action(detail=True, methods=["patch"])
def deactivate(self, request, pk=None):
    treatment = self.get_object()
    treatment.is_active = False
    treatment.save()
    # Cascade: deactivate related active payments
    treatment.payments.filter(is_active=True).update(is_active=False)
    return Response({"detail": "Treatment and related payments deactivated successfully."})
```

---

### No Changes Needed

| Module | Reason |
|--------|--------|
| **Invoices** | ✅ Immutable — 405 is correct, no deactivate needed |
| **Sessions** | ✅ Status-managed — lifecycle via [status](file:///Users/macbook/Desktop/kine_app/clients/serializers.py#46-50) field, no deactivate needed |
| **Users** | ✅ Already correct — 405 + deactivate |

---

## Final Standardized Matrix

| Module | `DELETE` | [deactivate](file:///Users/macbook/Desktop/kine_app/users/views.py#30-38) | Cascade |
|--------|---------|-------------|---------|
| Clients | 405 | ✅ sets `is_active=False` | → deactivates treatments |
| Treatments | 405 | ✅ sets `is_active=False` | → deactivates payments |
| Payments | 405 *(changed)* | ✅ *(new)* | — |
| Users | 405 | ✅ already exists | — |
| Sessions | 405 | ❌ not applicable | — |
| Invoices | 405 | ❌ not applicable | — |
| Settings | 405 *(changed)* | ✅ *(new)* | — |

---

## Verification Plan

1. **`manage.py check`** — No Django errors
2. **Payments**: `DELETE /api/payments/1/` → 405 (was 200). `PATCH /api/payments/1/deactivate/` → 200
3. **Settings**: `DELETE /api/settings/options/1/` → 405 (was allowed). `PATCH /api/settings/options/1/deactivate/` → 200
4. **Cascade**: Deactivate a client → verify its treatments are also deactivated
5. **Cascade**: Deactivate a treatment → verify its payments are also deactivated
