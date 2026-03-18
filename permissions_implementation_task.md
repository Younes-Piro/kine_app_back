# 🔑 Permissions — Implementation Task

## Overview

Permission management: view catalog, check current user's permissions, assign/clear staff permissions. Admin users implicitly have all permissions.

**Depends on:** Foundation, Auth, Users

---

## API Endpoints

| Method | Endpoint                              | Auth           | Description                     |
|--------|---------------------------------------|----------------|---------------------------------|
| GET    | `/api/permissions/`                   | Admin only     | List all available permissions  |
| GET    | `/api/permissions/me/`                | Authenticated  | Current user's permissions & role|
| GET    | `/api/permissions/users/{user_id}/`   | Admin only     | Get a user's permissions        |
| PATCH  | `/api/permissions/users/{user_id}/`   | Admin only     | Assign permissions to user      |
| DELETE | `/api/permissions/users/{user_id}/`   | Admin only     | Clear all permissions for user  |

---

## TypeScript Types

```typescript
export interface Permission {
  id: number;
  code: string;
  label: string;
}

export interface MyPermissionsResponse {
  role: "admin" | "staff";
  permissions: string[];
}

export interface UserPermissionsResponse {
  user_id: number;
  role: "admin" | "staff";
  permissions: Permission[] | "all";
}

export interface AssignPermissionsRequest {
  permission_ids: number[];
}
```

---

## Pages & Routes

| Route                    | Component             |
|--------------------------|-----------------------|
| `/users/:id/permissions` | `UserPermissionsPage` |

---

## Hook: `usePermissions()`

- Fetches `/api/permissions/me/` on mount
- Returns: `role`, `permissions[]`, `hasPermission(code)`, `isAdmin`, `isLoading`
- Admin: `hasPermission()` always returns `true`
- Used by `<ProtectedRoute>`, sidebar, and button visibility

---

## Components

### UserPermissionsPage
- Admin users → "Admin users have all permissions" message
- Staff users → checkboxes grouped by module (clients, treatments, sessions, payments, invoices, settings)
- Save → PATCH with `permission_ids`, Clear All → DELETE

### ProtectedRoute
- Wraps route, checks `hasPermission()`, redirects if denied

---

## Permission Codes

```
client:view   client:create   client:update   client:delete
treatment:view treatment:create treatment:update treatment:delete
session:view  session:create  session:update  session:delete
payment:view  payment:create  payment:update  payment:delete
invoice:view  invoice:create  invoice:update  invoice:delete
settings:view settings:update settings:delete
```

> `settings:create` does not exist — creation uses `settings:update`.

---

## React Query Keys

```typescript
permissions: {
  catalog: ['permissions'],
  me: ['permissions', 'me'],
  user: (id: number) => ['permissions', 'users', id]
}
```

---

## Implementation Checklist

- [ ] `api/permissions.ts` — catalog, me, userPermissions, assign, clear
- [ ] `hooks/usePermissions.ts` — hook with hasPermission()
- [ ] `features/permissions/UserPermissionsPage.tsx` — checkbox UI
- [ ] `components/shared/ProtectedRoute.tsx` — route guard
- [ ] Sidebar: hide items based on permissions
- [ ] Buttons: hide create/edit/delete based on permissions
- [ ] After login: auto-fetch permissions
