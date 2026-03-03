// api/rss.js
import Parser from "rss-parser";

const parser = new Parser({
  customFields: {
    item: [
      ["media:thumbnail", "mediaThumbnail"],
      ["media:content", "mediaContent"],
      ["enclosure", "enclosure"],
      ["image", "image"],
      ["content:encoded", "contentEncoded"],
    ],
  },
});

function pickThumbnail(item) {
  try {
    const c = [];
    if (item.enclosure?.url) c.push(item.enclosure.url);
    if (item.mediaContent?.$?.url) c.push(item.mediaContent.$.url);
    if (item.mediaThumbnail?.$?.url) c.push(item.mediaThumbnail.$.url);
    if (item.image?.url) c.push(item.image.url);

    const html = item.contentEncoded || item.content || "";
    const m = html.match(/<img[^"']+["']/i);
    if (!c.length && m) c.push(m[1]);

    return c[0] || null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const url = req.query.url;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "url is required" });
  }

  try {
    const feed = await parser.parseURL(url);

    const items = (feed.items || []).map((it) => ({
      title: it.title || "",
      link: it.link || "",
      pubDate: it.pubDate || it.isoDate || null,
      thumbnail: pickThumbnail(it),
    }));

    return res.status(200).json({
      feedTitle: feed.title || url,
      items,
    });
  } catch (e) {
    console.error("RSS fetch error:", e);
    return res.status(500).json({ error: "failed to fetch rss" });
  }
}
