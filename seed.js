require("dotenv").config();
const { MongoClient } = require("mongodb");
const { computeEndDate, DAY_MS } = require("./lib/trials");

const daysAgo = (n) => new Date(Date.now() - n * DAY_MS);

const samples = [
  {
    service: "StreamFlix",
    startDate: daysAgo(6),
    trialLengthDays: 7,
    priceAfterTrial: 15.49,
    cancelUrl: "https://example.com/streamflix/cancel",
  },
  {
    service: "CloudNotes Pro",
    startDate: daysAgo(12),
    trialLengthDays: 14,
    priceAfterTrial: 9.99,
    cancelUrl: "https://example.com/cloudnotes/billing",
  },
  {
    service: "FitCoach App",
    startDate: daysAgo(3),
    trialLengthDays: 30,
    priceAfterTrial: 29.0,
  },
  {
    service: "Design Suite",
    startDate: daysAgo(10),
    trialLengthDays: 7,
    priceAfterTrial: 54.99,
  },
  {
    service: "Audiobooks+",
    startDate: daysAgo(20),
    trialLengthDays: 30,
    priceAfterTrial: 14.95,
    status: "canceled",
  },
].map((t) => ({
  status: "active",
  ...t,
  endDate: computeEndDate(t.startDate, t.trialLengthDays),
  createdAt: new Date(),
}));

async function seed() {
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  try {
    const trials = client
      .db(process.env.DB_NAME || "trial-tracker")
      .collection("trials");
    await trials.deleteMany({});
    const result = await trials.insertMany(samples);
    console.log(`Seeded ${result.insertedCount} trials`);
  } finally {
    await client.close();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
