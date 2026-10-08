# 5-10 Minute Interview Video Demo Walkthrough Script

Use this script to guide your screen recording or live presentation for the interview panel.

---

## ⏱️ Video Breakdown

| Time | Phase | Focus |
| :--- | :--- | :--- |
| **0:00 - 1:30** | **Architecture & Azure Overview** | High-level components: Azure SQL, Functions, Logic Apps, APIM, RBAC |
| **1:30 - 3:30** | **Task 3: Fee Status API** | Demonstrating Student status lookups (Paid vs. Overdue) |
| **3:30 - 6:00** | **Task 4: Secure Admin Operations & RBAC** | Demonstrating 401 Unauthorized, 403 Forbidden, and 200 OK |
| **6:00 - 8:00** | **Task 2: Automation & Fee Reminders** | Triggering overdue email reminders & showing idempotency |
| **8:00 - 10:00** | **Task 5: Scalability & Monitoring** | Database indexing, APIM policies, and Application Insights |

---

## 🎙️ Step-by-Step Recording Script & Talking Points

### 1. Introduction (0:00 - 1:30)
- **What to show on screen**: Show the Architecture Diagram in `docs/ARCHITECTURE.md` or the Azure Portal overview.
- **Talking points**:
  > *"Hello, today I'm presenting the Cloud-Native Student Fee Management System built on Microsoft Azure. The architecture is 100% serverless, designed for zero infrastructure overhead, high availability, and capable of handling 5,000+ student records. We use Azure SQL Database for relational consistency, Azure Functions for serverless compute, Azure API Management for rate limiting and API key security, Microsoft Entra ID with SQL-backed RBAC for administrative updates, and Azure Logic Apps with retry policies for automated daily fee reminders."*

---

### 2. Task 3 Demo: Student Fee Status API (1:30 - 3:30)
- **What to show on screen**: Terminal or Postman/Browser calling the API.
- **Demo Command 1 (Overdue Student)**:
  ```bash
  curl http://localhost:7071/api/students/STU-1001/fee-status
  ```
  - **Explain**: Shows `STU-1001` (Aarav Patel), total fee $5,000, paid $1,500, remaining balance $3,500, due date was in August -> status is calculated as **`Overdue`**.
- **Demo Command 2 (Paid Student)**:
  ```bash
  curl http://localhost:7071/api/students/STU-1015/fee-status
  ```
  - **Explain**: Shows `STU-1015` (Olivia Brown), paid amount matches total fee $5,000, remaining balance $0 -> status is **`Paid`**.

---

### 3. Task 4 Demo: Secure Admin Fee Updates & RBAC (3:30 - 6:00)
- **What to show on screen**: Demonstrate the 3 security layers.
- **Step 3A: No Authentication (Expected 401)**:
  ```bash
  curl -X PATCH http://localhost:7071/api/manage/students/STU-1001/fee \
    -H "Content-Type: application/json" \
    -d "{\"paymentAmount\": 500}"
  ```
  - **Explain**: *"Notice we receive an immediate 401 Unauthorized because no caller identity or Bearer token was provided."*
- **Step 3B: Unauthorized Identity (Expected 403 Forbidden)**:
  ```bash
  curl -X PATCH http://localhost:7071/api/manage/students/STU-1001/fee \
    -H "Content-Type: application/json" \
    -H "x-admin-email: aarav.patel@student.edu" \
    -d "{\"paymentAmount\": 500}"
  ```
  - **Explain**: *"Here, a student tries to modify their fee. Our RBAC middleware queries the Administrators table, verifies this identity lacks admin rights, and rejects the call with 403 Forbidden."*
- **Step 3C: Authorized Finance Admin (Expected 200 OK)**:
  ```bash
  curl -X PATCH http://localhost:7071/api/manage/students/STU-1001/fee \
    -H "Content-Type: application/json" \
    -H "x-admin-email: sarah.jenkins@university.edu" \
    -d "{\"paymentAmount\": 500}"
  ```
  - **Explain**: *"Sarah Jenkins is an active FinanceAdmin. The payment of $500 is recorded, the database is updated, the new balance is returned, and an audit trail is preserved."*

---

### 4. Task 2 Demo: Automated Overdue Fee Reminders (6:00 - 8:00)
- **What to show on screen**: Triggering the reminder workflow.
- **Demo Command**:
  ```bash
  curl -X POST http://localhost:7071/api/notifications/send-reminders
  ```
  - **Explain**:
    > *"This workflow checks Azure SQL for students with overdue balances whose reminders haven't been sent today. It immediately identified the 7 overdue students in our system, formatted personalized notices with their exact balance and due date, and updated `LastReminderSentUtc` in Azure SQL."*
- **Show Idempotency**:
  - Run the same command again immediately:
    > *"When triggered again, it safely reports 0 reminders sent. This prevents spamming students and ensures idempotency."*

---

### 5. Task 5 Demo: Scalability & Observability (8:00 - 10:00)
- **What to show on screen**: Show `apim/policy.xml`, `database/schema.sql` indexes, and Application Insights.
- **Explain**:
  - **Scalability**: *"To handle 5,000+ records, we implemented non-clustered filtered indexes on `(DueDate, PaidAmount, TotalFee)` in Azure SQL, turning table scans into index seeks under 3ms."*
  - **Resilience**: *"Our APIM policy enforces rate limiting (20 req/min) and exponential retries for transient 429/503 errors. The Logic App also includes an exponential backoff retry policy."*
  - **Monitoring**: *"Azure Application Insights provides end-to-end distributed tracing across every HTTP request and SQL query."*
