const SERPAPI_URL = "https://serpapi.com";

function requireKey() {
  const key = process.env.SERPAPI_API_KEY;
  if (!key) throw new Error("SERPAPI_API_KEY is not configured");
  return key;
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

  const params = new URLSearchParams({
    engine: "google_lens",
    image_id: upload.image_id,
    api_key: apiKey,
    hl: "en",
    safe: "active",
  });

  const searchRes = await fetch(`${SERPAPI_URL}/search.json?${params}`);
  const data = await searchRes.json();
  if (!searchRes.ok || data.error) {
    throw new Error(data.error || "Reverse image search failed");
  }

  const sourceItems = [
    ...(Array.isArray(data.visual_matches) ? data.visual_matches : []),
    ...(Array.isArray(data.organic_results) ? data.organic_results : []),
    ...(Array.isArray(data.short_videos) ? data.short_videos : []),
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
    });
    if (results.length >= 12) break;
  }

  return {
    provider: "Google Lens via SerpApi",
    searchId: data.search_metadata?.id || null,
    imageId: upload.image_id,
    results,
  };
}
