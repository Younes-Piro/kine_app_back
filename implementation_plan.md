# Delete Behavior Optimization — Implementation Plan

## Current State

| Module | `DELETE` | Deactivation | `is_active` | Problem |
|--------|---------|-------------|------------|---------|
| Clients | 405 | [deactivate](file:///Users/macbook/Desktop/kine_app/clients/views.py#92-101) action | ✅ | No cascade |
| Treatments | 405 | [deactivate](file:///Users/macbook/Desktop/kine_app/clients/views.py#92-101) action | ✅ | No cascade |
| Users | 405 | [deactivate](file:///Users/macbook/Desktop/kine_app/clients/views.py#92-101) action | ✅ | ✅ OK |
| Payments | Soft-delete in [destroy()](file:///Users/macbook/Desktop/kine_app/client_sessions/views.py#36-41) | — | ✅ | ⚠️ Inconsistent |
| Sessions | 405 | ❌ None | ❌ No field | ✅ OK (status-managed) |
| Invoices | 405 | ❌ None | ❌ No field | ✅ OK (immutable) |
| Settings | Hard delete allowed | ❌ None | ✅ | ⚠️ Dangerous |

## Three-Tier Strategy

| Tier | Modules | `DELETE` | Deactivation |
|------|---------|---------|-------------|
| **Immutable** | Invoices | 405 | None — legal documents |
| **Soft-deactivatable** | Clients, Treatments, Payments, Users, Settings | 405 | `PATCH .../deactivate/` |
| **Status-managed** | Sessions | 405 | None — use [status](file:///Users/macbook/Desktop/kine_app/clients/serializers.py#46-50) field |

---

## Proposed Changes

### Component 1 — Standardize Payments

#### [MODIFY] [payments/views.py](file:///Users/macbook/Desktop/kine_app/payments/views.py)

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

Update `permission_map`: replace `"destroy": "payment:update"` with `"deactivate": "payment:update"`.

---

### Component 2 — Standardize Settings

#### [MODIFY] [app_settings/views.py](file:///Users/macbook/Desktop/kine_app/app_settings/views.py)

Add to all 4 ViewSets ([AppOptionViewSet](file:///Users/macbook/Desktop/kine_app/app_settings/views.py#41-52), [HolidayViewSet](file:///Users/macbook/Desktop/kine_app/app_settings/views.py#53-58), [ClinicClosedDayViewSet](file:///Users/macbook/Desktop/kine_app/app_settings/views.py#59-64), [ClinicClosureRangeViewSet](file:///Users/macbook/Desktop/kine_app/app_settings/views.py#65-70)):

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

Update `SETTINGS_PERMISSION_MAP`: replace `"destroy": "settings:update"` with `"deactivate": "settings:update"`.

---

### Component 3 — Cascade: Treatment Deactivation

#### [MODIFY] [clients/views.py](file:///Users/macbook/Desktop/kine_app/clients/views.py) — TreatmentViewSet.deactivate

When deactivating a treatment:
1. Set `treatment.is_active = False`
2. Cancel all **scheduled** sessions (change [status](file:///Users/macbook/Desktop/kine_app/clients/serializers.py#46-50) to `cancelled` AppOption)
3. Deactivate all **active** payments

```python
@action(detail=True, methods=["patch"])
def deactivate(self, request, pk=None):
    treatment = self.get_object()
    treatment.is_active = False
    treatment.save()

    # Cancel scheduled sessions
    cancelled_status = AppOption.objects.filter(
        category=AppOption.CATEGORY_SESSION_STATUS,
        code="cancelled",
        is_active=True,
    ).first()
    if cancelled_status:
        treatment.sessions.filter(
            status__code="scheduled",
        ).update(status=cancelled_status)

    # Deactivate active payments
    treatment.payments.filter(is_active=True).update(is_active=False)

    return Response({"detail": "Treatment, scheduled sessions, and payments deactivated successfully."})
```

---

### Component 4 — Cascade: Client Deactivation

#### [MODIFY] [clients/views.py](file:///Users/macbook/Desktop/kine_app/clients/views.py) — ClientViewSet.deactivate

When deactivating a client:
1. Set `client.is_active = False`
2. For each active treatment → run the same cascade logic (deactivate treatment + cancel sessions + deactivate payments)

```python
@action(detail=True, methods=["patch"])
def deactivate(self, request, pk=None):
    client = self.get_object()
    client.is_active = False
    client.save()

    # Cascade to treatments
    active_treatments = client.treatments.filter(is_active=True)

    cancelled_status = AppOption.objects.filter(
        category=AppOption.CATEGORY_SESSION_STATUS,
        code="cancelled",
        is_active=True,
    ).first()

    for treatment in active_treatments:
        treatment.is_active = False
        treatment.save(update_fields=["is_active", "updated_at"])

        if cancelled_status:
            treatment.sessions.filter(
                status__code="scheduled",
            ).update(status=cancelled_status)

        treatment.payments.filter(is_active=True).update(is_active=False)

    return Response({"detail": "Client and all related records deactivated successfully."})
```

---

### No Changes Needed

| Module | Reason |
|--------|--------|
| **Invoices** | Immutable — 405 correct, no deactivate |
| **Sessions** | Status-managed — no `is_active`, lifecycle via [status](file:///Users/macbook/Desktop/kine_app/clients/serializers.py#46-50) |
| **Users** | Already correct — 405 + deactivate |

---

## Verification Plan

1. `python manage.py check` — no errors
2. `DELETE /api/payments/1/` → **405** (was 200)
3. `PATCH /api/payments/1/deactivate/` → **200**
4. `DELETE /api/settings/options/1/` → **405** (was allowed)
5. `PATCH /api/settings/options/1/deactivate/` → **200**
6. Deactivate a treatment → verify scheduled sessions → `cancelled`, payments → `is_active=False`
7. Deactivate a client → verify treatments deactivated → sessions cancelled → payments deactivated
