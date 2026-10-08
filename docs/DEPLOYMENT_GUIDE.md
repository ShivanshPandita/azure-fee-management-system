# Cloud-Native Student Fee Management System
## Step-by-Step Azure Deployment Guide

This guide walks you through deploying the complete solution to Microsoft Azure.

---

## 1. Prerequisites
- An active **Azure Subscription**.
- **Azure CLI** installed (`az --version`) or Azure Portal access.
- **Node.js** (v18+) and **Azure Functions Core Tools** (`func`).

---

## 2. Step 1: Azure SQL Database Setup

1. In the [Azure Portal](https://portal.azure.com), navigate to **SQL Databases** and create a new database:
   - **Database Name**: `FeeManagementDB`
   - **Server**: Create or use existing SQL Server (e.g. `sql-comp-service-shivansh`)
   - **Compute Tier**: Serverless (General Purpose) with *Auto-pause* enabled.
2. Go to your SQL Server -> **Networking**:
   - Check **"Allow Azure services and resources to access this server"**.
   - Add your client IP address.
3. Open **Query Editor (preview)** inside `FeeManagementDB`:
   - Run the script: `database/schema.sql` (Creates tables, constraints, indexes).
   - Run the script: `database/seed_data.sql` (Inserts 22 sample students and 3 admins).

---

## 3. Step 2: Deploy Azure Functions App

### Option A: Using VS Code Azure Functions Extension
1. Open the `api` folder in VS Code.
2. Click the **Azure** icon in the left activity bar -> **Functions** -> **Deploy to Function App...**
3. Select **+ Create new Function App in Azure**:
   - Runtime: **Node.js 20 LTS**
   - Plan: **Consumption (Serverless)**
   - Region: Same region as your Azure SQL database.
4. After deployment, navigate to the Function App in Azure Portal:
   - Go to **Settings** -> **Environment variables** (App Settings).
   - Add:
     - `SqlConnectionString`: Your Azure SQL connection string.
     - `SENDGRID_API_KEY`: *(Optional)* Your SendGrid API key if sending real emails.
     - `NOTIFICATION_FROM_EMAIL`: `fees@university.edu`

### Option B: Using Azure CLI & Core Tools
```bash
# 1. Login to Azure
az login

# 2. Create Storage Account & Function App
az storage account create --name safeemgmt$RANDOM --resource-group rg-feemanagement-prod --location eastus --sku Standard_LRS
az functionapp create --resource-group rg-feemanagement-prod --consumption-plan-location eastus --runtime node --runtime-version 20 --functions-version 4 --name func-feemanagement-$RANDOM --storage-account <storage_name>

# 3. Publish from local api directory
cd api
func azure functionapp publish <function_app_name>
```

---

## 4. Step 3: Azure API Management (APIM) Setup

1. In the Azure Portal, search for **API Management services** -> **Create**:
   - **Tier**: **Consumption** (Serverless, pay-per-call, ideal for cost-free management).
2. Once provisioned, go to **APIs** -> **+ Add API** -> select **Function App**:
   - Browse and select your deployed Function App.
   - All endpoints (`getFeeStatus`, `updateFeeRecord`, `sendFeeReminders`) will import automatically.
3. Apply Policies:
   - Select **All operations** -> In the **Inbound processing** tile, click the `</>` (Code view) icon.
   - Replace the policy with the contents of `apim/policy.xml`.
   - Click **Save**.
4. Retrieve Subscription Key:
   - Go to **Subscriptions** -> **Built-in all-access subscription** -> click `...` -> **Show keys**.
   - Copy the `Ocp-Apim-Subscription-Key` for client requests.

---

## 5. Step 4: Azure Logic App Deployment (Automation)

1. In Azure Portal, search for **Logic Apps** -> **+ Add**:
   - Plan: **Consumption** (Serverless).
   - Name: `logic-fee-reminder-daily`.
2. Go to **Logic App Designer**:
   - Switch to **Code view** (top bar).
   - Paste the JSON definition from `logic-apps/workflow.json`.
   - Update the `functionAppUrl` parameter to point to your live Function App URL.
   - Click **Save**.
3. Test Run:
   - Click **Run Trigger** -> **Run** to execute the workflow on demand and verify the run history.

---

## 6. Step 5: Application Insights & Monitoring Verification

1. In the Azure Portal, open the **Application Insights** resource linked to your Function App.
2. In the left menu:
   - **Live Metrics**: Monitor live traffic, request duration, and CPU consumption in real-time.
   - **Failures / Performance**: Inspect HTTP response codes, p95 latencies, and SQL queries.
   - **Logs (KQL)**: Run queries to inspect fee reminders:
     ```kql
     traces
     | where message contains "AUTOMATION" or message contains "ADMIN"
     | project timestamp, message, severityLevel
     | order by timestamp desc
     ```
