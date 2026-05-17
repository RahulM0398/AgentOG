import type { DocumentInfo } from "@moss-dev/moss";
import { MossClient } from "@moss-dev/moss";

const INDEX =
  process.env.MOSS_POLICY_INDEX?.trim() || "agentog-policies";

const DOCS: DocumentInfo[] = [
  {
    id: "p1",
    text: "User requires approval for all purchases over $25.",
  },
  {
    id: "p2",
    text: "For transportation, wheelchair assistance is mandatory.",
  },
  {
    id: "p3",
    text: "Never share medical diagnosis, SSN, insurance number, or raw payment card.",
  },
  {
    id: "p4",
    text: "Transportation budget limit is $50.",
  },
  {
    id: "p5",
    text: "Guardian approval is required for transportation, healthcare, purchases, form submissions, and sensitive data sharing.",
  },
  {
    id: "p6",
    text: "Guardian approval can happen by voice call or email.",
  },
];

async function main() {
  const projectId = process.env.MOSS_PROJECT_ID?.trim();
  const projectKey = process.env.MOSS_PROJECT_KEY?.trim();
  if (!projectId || !projectKey) {
    console.error("Set MOSS_PROJECT_ID and MOSS_PROJECT_KEY");
    process.exit(1);
  }
  const client = new MossClient(projectId, projectKey);
  console.log("Creating / refreshing index", INDEX, "…");
  await client.createIndex(INDEX, DOCS, { modelId: "moss-minilm" });
  await client.loadIndex(INDEX);
  const results = await client.query(
    INDEX,
    "What approval policies apply to booking wheelchair-assisted transportation under $50?",
    { topK: 3 },
  );
  console.log("Sample query:", results.docs?.[0]);
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
