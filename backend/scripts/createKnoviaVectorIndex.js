// backend/scripts/createKnoviaVectorIndex.js
// Creates the Atlas Vector Search index used by Knovia. Run once: node scripts/createKnoviaVectorIndex.js
// REQUIRES MongoDB Atlas (M0+) — createSearchIndex is not supported on plain mongod.
// NOTE: not executed in the authoring sandbox (no Atlas access); verify in your cluster.
require("dotenv").config();
const mongoose = require("mongoose");
const { EMBEDDING_DIMENSIONS } = require("../config/aiConstants");
const { VECTOR_INDEX_NAME } = require("../config/knoviaConfig");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const col = mongoose.connection.collection("documentchunks");
  await col.createSearchIndex({
    name: VECTOR_INDEX_NAME,
    type: "vectorSearch",
    definition: {
      fields: [
        { type: "vector", path: "embedding", numDimensions: EMBEDDING_DIMENSIONS, similarity: "cosine" },
        { type: "filter", path: "owner" },
        { type: "filter", path: "document" },
      ],
    },
  });
  console.log(`Index "${VECTOR_INDEX_NAME}" requested (${EMBEDDING_DIMENSIONS} dims, cosine). It builds asynchronously in Atlas.`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
