# Cloud-Native Student Fee Management System (Azure)

An enterprise, cloud-native student fee management solution built on **Microsoft Azure Serverless & PaaS**. 

This system automates student fee collection reminders, provides secure REST APIs for students and administrators, enforces Role-Based Access Control (RBAC), and scales to handle 5,000+ student records efficiently.

---

## Solution Architecture

```
[Clients: Student / Admin / Postman]
               │
               ▼
   [Azure API Management (APIM)]  <--- Rate Limiting (20/min), API Keys, Retries
               │
               ▼
 [Azure Functions v4 (Serverless)] <--- Node.js Compute Engine
       ├── GET  /api/students/{id}/fee-status       (Fee Status Engine)
       ├── PATCH /api/manage/students/{id}/fee       (Admin Payment Updates + RBAC)
       └── POST /api/notifications/send-reminders   (Overdue Reminder Dispatch)
               │                             │
               ▼                             ▼
    [Azure SQL Database]           [Azure Logic Apps / Email]
   - Tables: Students, Admins     - Daily Recurrence Trigger (08:00 UTC)
   - Filtered Indexes for 5,000+  - Exponential backoff retries
   - Connection Pooling           - Idempotent delivery
               │
               ▼
   [Azure Application Insights]   <--- Distributed Tracing & Telemetry
```

---

## Repository Structure

```
├── api/                           # Serverless Azure Functions (Node.js v4 model)
│   ├── src/
│   │   ├── db.js                  # Singleton Azure SQL connection pool
│   │   ├── auth.js                # RBAC & identity validation middleware
│   │   ├── services/
│   │   │   └── emailService.js    # SendGrid & email notification dispatcher
│   │   └── functions/
│   │       ├── getFeeStatus.js    # Task 3: Fee Status calculation API
│   │       ├── updateFeeRecord.js # Task 4: Secure Admin payment & fee update API
│   │       └── sendFeeReminders.js# Task 2: Automated reminder engine
│   ├── host.json                  # Host & App Insights sampling configuration
│   └── package.json
├── database/                      # Task 1: Database Setup Scripts
│   ├── schema.sql                 # DDL: Tables, constraints, non-clustered indexes
│   └── seed_data.sql              # Seed: 22 students (mixed statuses) + 3 administrators
├── logic-apps/                    # Task 2: Automation
│   └── workflow.json              # Azure Logic App definition with retry policies
├── apim/                          # Task 3.2: API Management
│   └── policy.xml                 # Rate limiting (20/min), subscription keys, CORS
├── docs/                          # Comprehensive Documentation
│   ├── ARCHITECTURE.md            # In-depth architectural design & Mermaid diagrams
│   ├── DEPLOYMENT_GUIDE.md        # Step-by-step Azure deployment instructions
│   └── DEMO_SCRIPT.md             # 5–10 minute interview video recording script
└── postman_collection.json        # Pre-configured Postman test suite
```

---

## Live Cloud Endpoints

- **Base URL**: `https://func-fee-mgmt-shivansh-bvdpdefkhcemgdf0.southindia-01.azurewebsites.net`

### API Reference
| Method | Endpoint | Description | Auth / Security |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/students/{studentId}/fee-status` | Returns fee breakdown and calculated status (`Paid`, `Partially Paid`, `Overdue`). | APIM Subscription Key / Public |
| **PATCH** | `/api/manage/students/{studentId}/fee` | Records payments or updates fee records. | **RBAC Required**: `FinanceAdmin`, `SuperAdmin` |
| **POST** | `/api/notifications/send-reminders` | Detects overdue students and dispatches notices. | Internal / Logic App Trigger |

---

## Testing with Postman
Import `postman_collection.json` into Postman to test all scenarios:
1. **Fee Status (Overdue & Paid)**: Validates calculation logic.
2. **Security**: Verifies `401 Unauthorized` (no token) and `403 Forbidden` (unauthorized user).
3. **Admin Payment**: Verifies `200 OK` for authorized Finance Admin (`Sarah Jenkins`).
4. **Idempotency**: Verifies that running reminders twice avoids duplicate emails.

---

## 📄 License
MIT
