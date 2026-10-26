const DAY_MS = 24 * 60 * 60 * 1000;

function isSafeURl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function buildTrial(input, { partial = false } = {}) {
  const errors = [];
  const trial = {};
  const has = (key) => input[key] !== undefined && input[key] !== "";
  if (has("service")) {
    trial.service = String(input.service).trim();
    if (!trial.service) errors.push("service cannot be blank");
  } else if (!partial) errors.push("service is required");

  if (has("startDate")) {
    const d = new Date(input.startDate);
    if (isNaN(d)) errors.push("startDate must be a valid date (YYYY-MM-DD)");
    else trial.startDate = d;
  } else if (!partial) errors.push("startDate is required");

  if (has("trialLengthDays")) {
    const n = Number(input.trialLengthDays);
    if (!Number.isInteger(n) || n < 1 || n > 365)
      errors.push("trialLengthDays must be a whole number from 1 to 365");
    else trial.trialLengthDays = n;
  } else if (!partial) errors.push("trialLengthDays is required");

  if (has("priceAfterTrial")) {
    const p = Number(input.priceAfterTrial);
    if (isNaN(p) || p < 0) errors.push("priceAfterTrial must be 0 or more");
    else trial.priceAfterTrial = Math.round(p * 100) / 100;
  } else if (!partial) errors.push("priceAfterTrial is required");

  if (has("cancelUrl")) {
    if (!isSafeURl(input.cancelUrl))
      errors.push("cancelUrl must start with http:// or https://");
    else trial.cancelUrl = input.cancelUrl;
  }

  if (has("status")) {
    if (!["active", "canceled"].includes(input.status))
      errors.push('status must be "active" or "canceled"');
    else trial.status = input.status;
  } else if (!partial) trial.status = "active";

  return errors.length ? { errors } : { trial };
}

function computeEndDate(startDate, trialLengthDays) {
  return new Date(new Date(startDate).getTime() + trialLengthDays * DAY_MS);
}

// Add daysleft for display. Negative means the trial ended.

function withDaysLeft(trial, now = new Date()) {
  const daysLeft = Math.ceil((new Date(trial.endDate) - now) / DAY_MS);
  return { ...trial, daysLeft };
}

// Adds up what will be charged if the subcription isn't canceled.
function totalAtRisk(trials) {
  const total = trials.reduce((sum, t) => sum + (t.priceAfterTrial || 0), 0);
  return Math.round(total * 100) / 100;
}

module.exports = {
  DAY_MS,
  buildTrial,
  computeEndDate,
  withDaysLeft,
  totalAtRisk,
  isSafeURl,
};
