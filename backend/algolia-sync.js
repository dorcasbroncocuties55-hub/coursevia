import "dotenv/config";
import algoliasearch from "algoliasearch";
import { createClient } from "@supabase/supabase-js";

// Configuration
const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID || "";
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_KEY || "";
const ALGOLIA_INDEX_NAME = process.env.ALGOLIA_INDEX_NAME || "courses";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Initialize clients
const algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
const algoliaIndex = algoliaClient.initIndex(ALGOLIA_INDEX_NAME);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Transform course data for Algolia
const transformCourse = (course) => {
  const price = Number(course.price || 0);
  
  return {
    objectID: course.id,
    title: course.title || "",
    description: course.description || "",
    short_description: course.short_description || "",
    category: course.category || "Uncategorized",
    tags: course.tags || [],
    price: price,
    price_range: price === 0 ? "free" : "paid",
    level: course.level || "beginner",
    rating: Number(course.rating || 5),
    total_students: Number(course.total_students || 0),
    thumbnail_url: course.thumbnail_url || "",
    slug: course.slug || "",
    is_published: course.is_published || false,
    created_at: new Date(course.created_at).getTime(),
  };
};

// Sync all courses to Algolia
const syncCourses = async () => {
  try {
    console.log("🔄 Starting Algolia sync...");

    // Fetch all published courses from content_items
    const { data: contentItems, error: contentError } = await supabase
      .from("content_items")
      .select("*")
      .eq("content_type", "course")
      .eq("is_published", true);

    if (contentError) {
      console.error("Error fetching content_items:", contentError);
    }

    // Fetch from courses table as fallback
    const { data: courses, error: coursesError } = await supabase
      .from("courses")
      .select("*")
      .eq("status", "published");

    if (coursesError) {
      console.error("Error fetching courses:", coursesError);
    }

    // Combine both sources
    const allCourses = [
      ...(contentItems || []),
      ...(courses || []).filter(
        (c) => !contentItems?.some((ci) => ci.id === c.id)
      ),
    ];

    if (allCourses.length === 0) {
      console.log("⚠️  No courses found to sync");
      return;
    }

    console.log(`📚 Found ${allCourses.length} courses to sync`);

    // Transform courses for Algolia
    const records = allCourses.map(transformCourse);

    // Save to Algolia
    const { objectIDs } = await algoliaIndex.saveObjects(records);

    console.log(`✅ Successfully synced ${objectIDs.length} courses to Algolia`);
    console.log(`📊 Index: ${ALGOLIA_INDEX_NAME}`);

    // Configure index settings
    await algoliaIndex.setSettings({
      searchableAttributes: [
        "title",
        "description",
        "short_description",
        "category",
        "tags",
      ],
      attributesForFaceting: [
        "category",
        "price_range",
        "level",
        "filterOnly(rating)",
      ],
      customRanking: ["desc(rating)", "desc(total_students)", "desc(created_at)"],
      ranking: [
        "typo",
        "geo",
        "words",
        "filters",
        "proximity",
        "attribute",
        "exact",
        "custom",
      ],
    });

    console.log("⚙️  Index settings configured");
    console.log("🎉 Sync complete!");
  } catch (error) {
    console.error("❌ Sync failed:", error);
    process.exit(1);
  }
};

// Clear index
const clearIndex = async () => {
  try {
    console.log("🗑️  Clearing Algolia index...");
    await algoliaIndex.clearObjects();
    console.log("✅ Index cleared");
  } catch (error) {
    console.error("❌ Clear failed:", error);
    process.exit(1);
  }
};

// Main
const main = async () => {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) {
    console.error("❌ Algolia credentials not found in environment variables");
    console.error("Please set ALGOLIA_APP_ID and ALGOLIA_ADMIN_KEY in backend/.env");
    process.exit(1);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Supabase credentials not found in environment variables");
    process.exit(1);
  }

  switch (command) {
    case "clear":
      await clearIndex();
      break;
    case "sync":
    default:
      await syncCourses();
      break;
  }

  process.exit(0);
};

main();
