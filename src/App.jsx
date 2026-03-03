import { useEffect, useMemo, useState } from "react";
import "./App.css";

/** 読み込み中に表示するスケルトン */
function Skeleton() {
  return (
    <div className="skeleton">
      <div className="s-thumb" />
      <div className="s-lines">
        <div className="s-line w-80" />
        <div className="s-line w-40" />
      </div>
    </div>
  );
}

/** 各 RSS カード */
function RSSWidget({ url, index, onRemove }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [feedTitle, setFeedTitle] = useState("");

  useEffect(() => {
    if (!url) return;

    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setErrorMsg("");

        // 相対パス: Vite 開発中は proxy、ビルド後は同一オリジンを想定
        const res = await fetch(
          `/api/rss?url=${encodeURIComponent(url)}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();

        // 後方互換: 旧API（配列のみ）でも動作
        if (Array.isArray(data)) {
          setItems(data);
          setFeedTitle(""); // タイトル不明 → ヘッダーでは URL を表示
        } else if (data && Array.isArray(data.items)) {
          setItems(data.items);
          setFeedTitle(data.feedTitle || "");
        } else {
          throw new Error("Unexpected response");
        }
      } catch (e) {
        if (e.name !== "AbortError") {
          console.error("RSS取得エラー:", e);
          setErrorMsg("フィードの取得に失敗しました。URLをご確認ください。");
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [url]);

  const headerTitle = feedTitle || url;

  return (
    <section className="card">
      <header className="card-hd">
        <div className="url">
          <span className="badge">RSS</span>
          <span className="truncate" title={headerTitle}>
            {headerTitle}
          </span>
        </div>
        <button className="btn btn-ghost" onClick={() => onRemove(index)}>
          削除
        </button>
      </header>

      <div className="card-bd">
        {loading && (
          <div className="list gap">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} />
            ))}
          </div>
        )}

        {!loading && errorMsg && <p className="error">{errorMsg}</p>}

        {!loading && !errorMsg && (
          <ul className="list">
            {items.map((item, i) => (
              <li key={i} className="item">
                {item.thumbnail && (
                  <img
                    src={item.thumbnail}
                    alt=""
                    className="thumb"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                )}
                <div className="meta">
                  <a
                    href={item.link}
                    className="title"
                    target="_blank"
                    rel="noreferrer"
                    title={item.title}
                  >
                    {item.title || "（無題）"}
                  </a>
                  <time className="date">
                    {item.pubDate ? new Date(item.pubDate).toLocaleString() : ""}
                  </time>
                </div>
              </li>
            ))}
            {items.length === 0 && (
              <li className="muted">記事がありません。</li>
            )}
          </ul>
        )}
      </div>
    </section>
  );
}

export default function App() {
  const [rssList, setRssList] = useState(() => {
    try {
      const saved = localStorage.getItem("rssList");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [newRssUrl, setNewRssUrl] = useState("");
  const [inputError, setInputError] = useState("");

  // ダーク/ライト（OS 設定を初期値に）
  const [dark, setDark] = useState(() => {
    return (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  });

  useEffect(() => {
    localStorage.setItem("rssList", JSON.stringify(rssList));
  }, [rssList]);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  const normalizedList = useMemo(
    () =>
      rssList
        .map((u) => (typeof u === "string" ? u.trim() : ""))
        .filter(Boolean),
    [rssList]
  );

  const addRss = () => {
    const url = newRssUrl.trim();
    if (!url) return setInputError("URLを入力してください。");

    try {
      const u = new URL(url);
      if (!/^https?:$/.test(u.protocol)) {
        return setInputError("http/https の URL を入力してください。");
      }
    } catch {
      return setInputError("正しい形式の URL を入力してください。");
    }

    if (normalizedList.includes(url)) {
      return setInputError("同じ URL が既に登録されています。");
    }

    setRssList((prev) => [...prev, url]);
    setNewRssUrl("");
    setInputError("");
  };

  const removeRss = (index) =>
    setRssList((prev) => prev.filter((_, i) => i !== index));

  return (
    <div className="wrap">
      <header className="topbar">
        <h1>RSS Dashboard</h1>

        <div className="actions">
          <div className="field">
            <input
              value={newRssUrl}
              onChange={(e) => setNewRssUrl(e.target.value)}
              placeholder="RSS URLを入力（例: https://example.com/feed.xml）"
            />
            <button className="btn" onClick={addRss}>
              追加
            </button>
          </div>

          <button className="btn btn-ghost" onClick={() => setDark((d) => !d)}>
            {dark ? "ライト" : "ダーク"}
          </button>
        </div>
      </header>

      {inputError && <div className="notice error">{inputError}</div>}

      {normalizedList.length === 0 ? (
        <div className="empty">
          まずは上のボックスに RSS の URL を入力し、「追加」を押してください。
        </div>
      ) : (
        <div className="grid">
          {normalizedList.map((rssUrl, index) => (
            <RSSWidget
              key={rssUrl}
              url={rssUrl}
              index={index}
              onRemove={removeRss}
            />
          ))}
        </div>
      )}

      <footer className="footer">Simple RSS viewer – M365 Copilot 提供</footer>
    </div>
  );
}
