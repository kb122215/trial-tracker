require("dotenv").config();

const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const {
  buildTrial,
  computeEndDate,
  withDaysLeft,
  totalAtRisk,
  DAY_MS,
} = require("./lib/trials");

const app = express();
const PORT = process.env.PORT || 3000;
const connectionString = process.env.MONGODB_URI;
const dbName = process.env.DB_Name || "trial-tracker";

if (!connectionString) {
  console.error(
    "Missing MONGODB_URI. Copy .env.example to.env and add your Atlas connection string.",
  );
  process.exit(1);
}

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function toObjectId(id) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

MongoClient.connect(connectionString)
  .then((client) => {
    console.log("Connected to Database");
    const db = client.db(dbName);
    const trialsCollection = db.collection("trials");

    app.get("/", async (req, res) => {
      try {
        const now = new Date();
        const days = 3;
        const trials = (
          await trialsCollection.find().sort({ endDate: 1 }).toArray()
        ).map((t) => withDaysLeft(t, now));
        const active = trials.filter(
          (t) => t.status === "active" && t.daysLeft >= 0,
        );
        const endingSoon = active.filter((t) => t.daysLeft <= days);

        res.render("index.ejs", {
          trials,
          endingSoonCount: endingSoon.length,
          endingSoonTotal: totalAtRisk(endingSoon),
          activeTotal: totalAtRisk(active),
          days,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send("Something went wrong loading your trials.");
      }
    });

    //Routes go here
    app.post("/trials", async (req, res) => {
      const { errors, trial } = buildTrial(req.body);
      if (errors) {
        if (req.is("application/json")) return res.status(400).json({ errors });
        return res
          .status(400)
          .send(
            `Could not save trial: ${errors.join(", ")}. <a href="/">Go back</a>`,
          );
      }

      try {
        const doc = {
          ...trial,
          endDate: computeEndDate(trial.startDate, trial.trialLengthDays),
          createdAt: new Date(),
        };
        const result = await trialsCollection.insertOne(doc);

        if (req.is("application/json"))
          return res.status(201).json({ _id: result.insertedId, ...doc });
        res.redirect("/");
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Could not save trial" });
      }
    });

    app.get("/trials", async (req, res) => {
      try {
        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        const trials = await trialsCollection
          .find(filter)
          .sort({ endDate: 1 })
          .toArray();
        res.json(trials.map((t) => withDaysLeft(t)));
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Could not load trials" });
      }
    });

    app.get("/trials/ending-soon", async (req, res) => {
      const days = req.query.days === undefined ? 3 : Number(req.query.days);
      if (!Number.isInteger(days) || days < 0 || days > 365) {
        return res
          .status(400)
          .json({ error: "days must be a whole number from 0 to 365" });
      }

      try {
        const now = new Date();
        const cutoff = new Date(now.getTime() + days * DAY_MS);
        const trials = await trialsCollection
          .find({ status: "active", endDate: { $gte: now, $lte: cutoff } })
          .sort({ endDate: 1 })
          .toArray();

        res.json({
          days,
          count: trials.length,
          moneyYoudLose: totalAtRisk(trials),
          trials: trials.map((t) => withDaysLeft(t, now)),
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Could not load ending-soon trials" });
      }
    });

    app.get("/trials/:id", async (req, res) => {
      const _id = toObjectId(req.params.id);
      if (!_id) return res.status(400).json({ error: "Invalid id" });

      try {
        const trial = await trialsCollection.findOne({ _id });
        if (!trial) return res.status(404).json({ error: "Trial not found" });
        res.json(withDaysLeft(trial));
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Could not load trial" });
      }
    });

    app.put("/trials/:id", async (req, res) => {
      const _id = toObjectId(req.params.id);
      if (!_id) return res.status(400).json({ error: "Invalid id" });

      const { errors, trial: changes } = buildTrial(req.body, {
        partial: true,
      });
      if (errors) return res.status(400).json({ errors });
      if (Object.keys(changes).length === 0)
        return res.status(400).json({ error: "Nothing to update" });

      try {
        const existing = await trialsCollection.findOne({ _id });
        if (!existing)
          return res.status(404).json({ error: "Trial not found" });

        // If the start date or length changed, recompute the end date
        const merged = { ...existing, ...changes };
        changes.endDate = computeEndDate(
          merged.startDate,
          merged.trialLengthDays,
        );
        changes.updatedAt = new Date();

        const updated = await trialsCollection.findOneAndUpdate(
          { _id },
          { $set: changes },
          { returnDocument: "after" },
        );
        res.json(withDaysLeft(updated));
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Could not update trial" });
      }
    });

    app.delete("/trials/:id", async (req, res) => {
      const _id = toObjectId(req.params.id);
      if (!_id) return res.status(400).json({ error: "Invalid id" });

      try {
        const result = await trialsCollection.deleteOne({ _id });
        if (result.deletedCount === 0)
          return res.status(404).json({ error: "Trial not found" });
        res.json({ message: "Trial deleted" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Could not delete trial" });
      }
    });

    app.listen(PORT, () =>
      console.log("Listening on http://localhost:${PORT}"),
    );
  })
  .catch((error) => {
    console.error("Could not connect to MongoDB:", error.message);
    process.exit(1);
  });
