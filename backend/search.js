const SERPAPI_URL = "https://serpapi.com";

function requireKey() {
  const key = process.env.SERPAPI_API_KEY;
  if (!key) throw new Error("SERPAPI_API_KEY is not configured");
  return key;
}

async function lensSearch(imageId, apiKey, type) {
  const params = new URLSearchParams({
    engine: "google_lens",
    image_id: imageId,
    api_key: apiKey,
    hl: "en",
    country: "in",
    safe: "active",
    type,
  });
  const response = await fetch(`${SERPAPI_URL}/search.json?${params}`);
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error || `Google Lens ${type} search failed`);
  }
  return data;
}

function isNoResultsError(error) {
  return /no results|hasn't returned any results|did not return any results/i.test(error?.message || "");
}

async function safeLensSearch(imageId, apiKey, type) {
  try {
    return { data: await lensSearch(imageId, apiKey, type), error: null };
  } catch (error) {
    if (isNoResultsError(error)) {
      return { data: {}, error: error.message };
    }
    throw error;
  }
}

export async function reverseSearchImage(imageBuffer, mimeType = "image/jpeg", subjectType = "person") {
  const apiKey = requireKey();
  if (imageBuffer.length > 500 * 1024) {
    throw new Error("Image is larger than SerpApi's 500 KB upload limit. Use a smaller image.");
  }

  const form = new FormData();
  form.append("image", new Blob([imageBuffer], { type: mimeType }), "input-image");
  form.append("api_key", apiKey);

  const uploadRes = await fetch(`${SERPAPI_URL}/image`, { method: "POST", body: form });
  const upload = await uploadRes.json();
  if (!uploadRes.ok || upload.error) {
    throw new Error(upload.error || "Image upload to search provider failed");
  }

  // First ask Lens for exact copies and visual matches.
  // The fallback below is still image-derived: it asks Lens for its complete
  // image-search response and reuses only the returned visual_matches block.
  const [exact, visual] = await Promise.all([
    safeLensSearch(upload.image_id, apiKey, "exact_matches"),
    safeLensSearch(upload.image_id, apiKey, "visual_matches"),
  ]);

  let exactData = exact.data || {};
  let visualData = visual.data || {};

  // Some human/selfie images can return no dedicated visual_matches block even
  // though Google Lens has related visual results in its full image-search page.
  // Retry with type=all, but never construct a generic keyword query.
  let allData = {};
  let allError = null;
  if (!Array.isArray(visualData.visual_matches) || visualData.visual_matches.length === 0) {
    const all = await safeLensSearch(upload.image_id, apiKey, "all");
    allData = all.data || {};
    allError = all.error || null;
  }

  const exactItems = Array.isArray(exactData.exact_matches)
    ? exactData.exact_matches.map(item => ({ ...item, exact_matches: true }))
    : [];
  const directVisualItems = Array.isArray(visualData.visual_matches)
    ? visualData.visual_matches.map(item => ({ ...item, exact_matches: false }))
    : [];
  const fallbackVisualItems = Array.isArray(allData.visual_matches)
    ? allData.visual_matches.map(item => ({ ...item, exact_matches: false }))
    : [];

  // Keep exact matches first, then only visual results derived from the submitted
  // image. No generic Google Images/search fallback is used.
  const sourceItems = [...exactItems, ...directVisualItems, ...fallbackVisualItems];

  const seen = new Set();
  const results = [];
  for (const item of sourceItems) {
    const link = item.link || item.url;
    if (!link || seen.has(link)) continue;
    seen.add(link);
    results.push({
      title: item.title || "Untitled result",
      link,
      source: item.source || item.profile_name || "Web",
      thumbnail: item.thumbnail || item.image || null,
      snippet: item.snippet || null,
      date: item.date || null,
      exactMatch: Boolean(item.exact_matches),
      matchType: item.exact_matches ? "Exact match" : "Relevant visual match",
    });
    if (results.length >= 12) break;
  }

  const exactMatchCount = exactItems.length;
  const relevantCount = results.filter(item => !item.exactMatch).length;

  return {
    provider: "Google Lens via SerpApi",
    searchId: exactData.search_metadata?.id || visualData.search_metadata?.id || allData.search_metadata?.id || null,
    imageId: upload.image_id,
    subjectType,
    exactMatchCount,
    relevantCount,
    results,
    exactSearchError: exact.error || null,
    visualSearchError: visual.error || null,
    allSearchError: allError,
  };
}
