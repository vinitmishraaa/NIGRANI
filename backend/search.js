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

export async function reverseSearchImage(imageBuffer, mimeType = "image/jpeg") {
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

  // Run the dedicated Exact Matches search first. If no exact source exists,
  // broaden the search to Visual Matches and return the most relevant public sources.
  const [exactData, visualData] = await Promise.all([
    lensSearch(upload.image_id, apiKey, "exact_matches"),
    lensSearch(upload.image_id, apiKey, "visual_matches"),
  ]);

  const sourceItems = [
    ...(Array.isArray(exactData.exact_matches) ? exactData.exact_matches.map(item => ({ ...item, exact_matches: true })) : []),
    ...(Array.isArray(visualData.visual_matches) ? visualData.visual_matches : []),
    ...(Array.isArray(visualData.organic_results) ? visualData.organic_results : []),
    ...(Array.isArray(visualData.short_videos) ? visualData.short_videos : []),
  ];

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

  return {
    provider: "Google Lens via SerpApi",
    searchId: exactData.search_metadata?.id || visualData.search_metadata?.id || null,
    imageId: upload.image_id,
    exactMatchCount: Array.isArray(exactData.exact_matches) ? exactData.exact_matches.length : 0,
    results,
  };
}
