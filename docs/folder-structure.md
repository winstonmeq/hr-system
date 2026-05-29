# Recommended Folder Structure

This project uses the Next.js App Router. Keep route files inside `app` and shared server/domain code in root-level folders.

```txt
app/
  layout.tsx
  page.tsx
  api/
    ...route handlers
components/
  ui/
lib/
  db/
    mongoose.ts
  env.ts
models/
  AuditLog.ts
  Role.ts
  User.ts
scripts/
  seed-roles.ts
docs/
  folder-structure.md
```

Phase 1 intentionally includes only the shared foundation:

- MongoDB connection utility
- Environment variable validation
- User, Role, and AuditLog models
- Role seed script

Do not add Employee, Leave, Attendance, payroll, or performance modules until later phases define their workflows and data ownership.
