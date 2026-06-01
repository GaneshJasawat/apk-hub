import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jexfdvkmabidbzdhulgv.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function run() {
  // Create storage buckets
  const buckets = ["icons", "screenshots", "videos", "apks"];
  for (const id of buckets) {
    const { data: existing } = await supabase.storage.getBucket(id);
    if (!existing) {
      const { error, data: newBucket } = await supabase.storage.createBucket(id, {
        public: true,
      });
      if (error && error.message !== "Duplicate") {
        console.log(`Bucket '${id}': error=${error.message}`);
      } else {
        console.log(`Bucket '${id}': created`);
      }
    } else {
      console.log(`Bucket '${id}': already exists`);
    }
  }

  // Verify
  const { data } = await supabase.storage.listBuckets();
  console.log("\nBuckets:", data?.map((b) => `${b.id} (public=${b.public})`));
}

run().catch(console.error);
