// Usage: npm run seed:knowledge   (needs MONGO_URI and GOOGLE_AI_API_KEY in .env)
require("dotenv").config();
const mongoose = require("mongoose");
const { seedKnowledge } = require("../services/knowledgeSeeder");

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const result = await seedKnowledge({ force: true });
    console.log(result.skipped ? `Skipped: ${result.reason}` : `Seeded ${result.processed}/${result.total} chunks.`);
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err.message || err);
    process.exit(1);
  }
})();
