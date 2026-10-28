# Free Trial Tracker

Free trials are easy to sign up for and easy to forget. This app keeps track of when each trial ends and shows how much money you'll be charged if you don't cancel in time.

### 🔗 [Open the live app on Render](https://trial-tracker-r6bg.onrender.com/)

![Free Trial Tracker dashboard] ((![alt text] image.png))

## Features

- **Full CRUD API** for free trials: create, read, update, and delete
- **Automatic end dates**, calculated from the start date and trial length
- **"Ending soon" endpoint** (`GET /trials/ending-soon?days=3`) that returns active trials ending within N days, plus a `moneyYoudLose` total
- **Dashboard** that highlights trials ending soon and totals the money at risk
- **One-click actions** to mark a trial canceled, reactivate it, or delete it
- **Input validation** with clear error messages (for example, cancel links must start with `http://` or `https://`)
- **Seed script** that loads sample data so the dashboard isn't empty on first run

## Tech Stack

| Tools     |
| --------- | ---------------------------------------- |
| Server    | Node.js, Express                         |
| Database  | MongoDB Atlas, official `mongodb` driver |
| Views     | EJS templates                            |
| Front end | JavaScript (`fetch`), CSS                |
| Config    | dotenv                                   |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- A free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

### Installation

1. Clone the repo:

```bash
   git clone https://github.com/kb122215/free-trial-tracker.git
   cd free-trial-tracker
```

2. Install dependencies:

```bash
   npm install
```

3. Create your environment file:

```bash
   cp .env.example .env
```

Open `.env` and paste your Atlas connection string (Atlas → Connect → Drivers):

```
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   DB_NAME=trial-tracker
   PORT=3000
```

4. In Atlas, go to **Network Access** and add your current IP address.
5. Optional: load sample data. This clears the `trials` collection first.

```bash
   npm run seed
```

6. Start the server:

```bash
   npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command        | What it does                                      |
| -------------- | ------------------------------------------------- |
| `npm start`    | Runs the server                                   |
| `npm run dev`  | Runs the server and restarts it when files change |
| `npm run seed` | Replaces all trials with 5 sample trials          |

### Examples

Create a trial:

```bash
curl -X POST http://localhost:3000/trials \
  -H "Content-Type: application/json" \
  -d '{"service":"Netflix","startDate":"2026-10-20","trialLengthDays":7,"priceAfterTrial":15.49,"cancelUrl":"https://www.netflix.com/cancelplan"}'
```

See what ends in the next 3 days:

```bash
curl "http://localhost:3000/trials/ending-soon?days=3"
```

```json
{
  "days": 3,
  "count": 2,
  "moneyYoudLose": 25.48,
  "trials": [
    { "service": "StreamFlix", "priceAfterTrial": 15.49, "daysLeft": 1 },
    { "service": "CloudNotes Pro", "priceAfterTrial": 9.99, "daysLeft": 2 }
  ]
}
```

(The `trials` entries are shortened here; the real response includes every field.)

Mark a trial canceled:

```bash
curl -X PUT http://localhost:3000/trials/<id> \
  -H "Content-Type: application/json" \
  -d '{"status":"canceled"}'
```

Delete a trial:

```bash
curl -X DELETE http://localhost:3000/trials/<id>
```

## How It Works

- **`endDate` is stored in the database, not just calculated.** That lets MongoDB find trials ending soon with a single date-range query (`$gte` / `$lte`), instead of loading every trial and filtering in JavaScript.
- **`/trials/ending-soon` is defined before `/trials/:id`.** Express matches routes in order, so otherwise `ending-soon` would be treated as an id.
- **Updates and deletes use each trial's `_id`.** That way, two trials with the same name can't be confused.
- **Changing the start date or trial length recalculates `endDate`**, so the deadline is always correct.
- **`POST /trials` serves both kinds of client.** A form submission redirects back to the dashboard; a JSON request (curl, Postman, fetch) gets a JSON response with status `201`.

## Created By

**Karimah** · [GitHub](https://github.com/kb122215)
