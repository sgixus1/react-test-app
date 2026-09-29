import { useEffect, useMemo, useRef, useState } from "react";
import { archiveStats, categories, learningChapters, libraryEntries } from "./arcanumData";
import { useArchiveMemory } from "./useArchiveMemory";
import "./arcanum.css";

const visualMap = {
  spells: "/arcanum/spells.svg",
  rituals: "/arcanum/rituals.svg",
  artifacts: "/arcanum/artifacts.svg",
  traditions: "/arcanum/traditions.svg",
  entities: "/arcanum/entities.svg",
  divination: "/arcanum/divination.svg",
  alchemy: "/arcanum/alchemy.svg",
  plants: "/arcanum/plants.svg",
  grimoires: "/arcanum/spells.svg",
  historical: "/arcanum/traditions.svg",
};

const navItems = [
  ["home", "Home"],
  ["encyclopedia", "Encyclopedia"],
  ["map", "Knowledge Map"],
  ["divination", "Divination"],
  ["learn", "Learn Magic"],
  ["library", "Digital Library"],
];

function parseRoute() {
  const raw = window.location.hash.replace(/^#\/?/, "");
  if (!raw) return { view: "home" };
  const [view, id] = raw.split("/");
  if (view === "entry" && id) return { view: "entry", id };
  if (["home", "encyclopedia", "map", "divination", "sources", "learn", "library"].includes(view)) return { view };
  return { view: "home" };
}

function goTo(view, id) {
  window.location.hash = id ? `#/${view}/${id}` : `#/${view}`;
}

function useRoute() {
  const [route, setRoute] = useState(parseRoute());
  useEffect(() => {
    const update = () => {
      setRoute(parseRoute());
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return route;
}

function ParticleField({ motion }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    let frame;
    let stars = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      stars = Array.from(
        { length: Math.min(110, Math.max(54, Math.floor(window.innerWidth / 13))) },
        () => ({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          r: Math.random() * 1.5 + 0.2,
          drift: Math.random() * 0.13 + 0.02,
          alpha: Math.random() * 0.28 + 0.09,
        }),
      );
    };

    const draw = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      stars.forEach((star) => {
        if (motion) {
          star.y -= star.drift;
          star.x += Math.sin(star.y * 0.01) * 0.015;
          if (star.y < -6) star.y = window.innerHeight + 6;
        }

        ctx.beginPath();
        ctx.fillStyle = `rgba(223, 189, 104, ${star.alpha})`;
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      });

      frame = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [motion]);

  return <canvas className="particle-field" ref={canvasRef} aria-hidden="true" />;
}

function Brand() {
  return (
    <button className="brand" type="button" onClick={() => goTo("home")} aria-label="The Arcanum Archive home">
      <span className="brand-glyph"><span>✦</span></span>
      <span className="brand-copy">
        <strong>THE ARCANUM</strong>
        <small>ARCHIVE</small>
      </span>
    </button>
  );
}

function Header({ route, motion, onToggleMotion, onOpenSearch }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <Brand />
      <nav className={menuOpen ? "main-nav open" : "main-nav"} aria-label="Primary navigation">
        {navItems.map(([view, label]) => (
          <button
            key={view}
            className={route.view === view ? "active" : ""}
            type="button"
            onClick={() => {
              goTo(view);
              setMenuOpen(false);
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="header-actions">
        <button className="global-search-button" type="button" onClick={onOpenSearch} aria-label="Search the archive">
          ⌕ <span>Search</span><kbd>⌘K</kbd>
        </button>
        <button className="motion-toggle" type="button" onClick={onToggleMotion} aria-pressed={!motion}>
          <span className="status-dot" /> Motion {motion ? "On" : "Off"}
        </button>
        <button className="menu-toggle" type="button" onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle menu">
          ☰
        </button>
      </div>
    </header>
  );
}

function ArcaneSeal({ compact = false }) {
  return (
    <div className={compact ? "arcane-seal compact" : "arcane-seal"} aria-hidden="true">
      <span className="seal-ring ring-one" />
      <span className="seal-ring ring-two" />
      <span className="seal-ring ring-three" />
      <span className="seal-diamond" />
      <span className="seal-core">✦</span>
      <span className="orbit-dot dot-a" />
      <span className="orbit-dot dot-b" />
      <span className="orbit-dot dot-c" />
    </div>
  );
}


function CommandPalette({ open, onClose, onOpenEntry, onSearch }) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return libraryEntries.slice(0, 8);
    return libraryEntries
      .filter((entry) => [
        entry.title,
        entry.category,
        entry.tradition,
        entry.kind,
        entry.summary,
      ].join(" ").toLowerCase().includes(needle))
      .slice(0, 8);
  }, [query]);

  if (!open) return null;

  return (
    <div className="command-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="command-palette" role="dialog" aria-modal="true" aria-label="Search The Arcanum Archive" onMouseDown={(event) => event.stopPropagation()}>
        <div className="command-input">
          <span>⌕</span>
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the whole archive…" />
          <kbd>Esc</kbd>
        </div>
        <div className="command-results">
          {results.map((entry) => (
            <button type="button" key={entry.id} onClick={() => { onOpenEntry(entry.id); onClose(); }}>
              <img src={visualMap[entry.visual]} alt="" />
              <span><strong>{entry.title}</strong><small>{entry.kind}</small><em>{entry.category} · {entry.tradition}</em></span>
              <b>↗</b>
            </button>
          ))}
          {!results.length && <div className="command-empty">No indexed source matches “{query}”.</div>}
        </div>
        <div className="command-footer">
          <button type="button" onClick={() => { onSearch(query); onClose(); }}>Search all records for “{query || "everything"}”</button>
          <span>Ctrl/⌘ + K</span>
        </div>
      </section>
    </div>
  );
}

function HeroSearch({ initial = "", onSearch }) {
  const [value, setValue] = useState(initial);

  useEffect(() => setValue(initial), [initial]);

  return (
    <form
      className="hero-search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(value.trim());
      }}
    >
      <span className="search-rune">⌕</span>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Summon a spell, ritual, artifact, grimoire, symbol…"
        aria-label="Search The Arcanum Archive"
      />
      <button type="submit">Summon Knowledge</button>
    </form>
  );
}

function StatRibbon() {
  return (
    <div className="stat-ribbon">
      <div><strong>{archiveStats.rawFiles}</strong><span>raw files indexed</span></div>
      <i />
      <div><strong>{archiveStats.splitVolumes}</strong><span>archive volumes</span></div>
      <i />
      <div><strong>Curated</strong><span>reviewed knowledge layer</span></div>
      <i />
      <div><strong>Source-Locked</strong><span>no invented articles</span></div>
    </div>
  );
}

function SubjectGate({ eyebrow, title, copy, visual, onClick }) {
  return (
    <button className="subject-gate" type="button" onClick={onClick}>
      <img src={visualMap[visual]} alt="" />
      <span className="subject-shade" />
      <span className="subject-copy">
        <small>{eyebrow}</small>
        <strong>{title}</strong>
        <span>{copy}</span>
        <em>Enter subject →</em>
      </span>
    </button>
  );
}

function FeaturedRail({ onOpen }) {
  const picks = ["magic-circles", "flower-shadow-tarot", "lesser-key", "ancient-egyptian-spells", "angel-demon-symbols"]
    .map((id) => libraryEntries.find((entry) => entry.id === id))
    .filter(Boolean);

  return (
    <div className="featured-rail">
      {picks.map((entry, index) => (
        <button className="featured-record" type="button" key={entry.id} onClick={() => onOpen(entry.id)}>
          <span className="featured-number">0{index + 1}</span>
          <span className="featured-art" style={{ backgroundImage: `url(${visualMap[entry.visual]})` }} />
          <span className="featured-info">
            <small>{entry.category}</small>
            <strong>{entry.title}</strong>
            <span>{entry.tradition}</span>
          </span>
          <span className="featured-arrow">↗</span>
        </button>
      ))}
    </div>
  );
}

function KnowledgeMap() {
  const nodes = [
    ["Kabbalah", "14%", "24%"],
    ["Ancient Egypt", "82%", "24%"],
    ["Golden Dawn", "17%", "76%"],
    ["Chinese Historical Magic", "82%", "76%"],
    ["Alchemy", "49%", "12%"],
    ["Divination", "51%", "88%"],
  ];

  return (
    <div className="knowledge-map">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M50 50L14 24M50 50L82 24M50 50L17 76M50 50L82 76M50 50L49 12M50 50L51 88" />
        <circle cx="50" cy="50" r="30" />
        <circle cx="50" cy="50" r="42" />
      </svg>
      <button className="map-core" type="button" onClick={() => goTo("encyclopedia")}>
        <span>✦</span>
        <strong>ARCANUM</strong>
      </button>
      {nodes.map(([label, x, y]) => (
        <button
          className="map-node"
          type="button"
          key={label}
          style={{ "--node-x": x, "--node-y": y }}
          onClick={() => goTo("encyclopedia")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function HomeView({ onSearch, onOpen, bookmarks, recent, onToggleBookmark }) {
  const savedEntries = bookmarks.map((id) => libraryEntries.find((entry) => entry.id === id)).filter(Boolean).slice(0, 4);
  const recentEntries = recent.map((id) => libraryEntries.find((entry) => entry.id === id)).filter(Boolean).slice(0, 4);
  return (
    <main className="view home-view">
      <section className="home-hero">
        <div className="hero-library-art" aria-hidden="true" />
        <div className="hero-blackout" aria-hidden="true" />
        <div className="hero-copy">
          <p className="kicker">A LIVING ENCYCLOPEDIA OF MAGIC</p>
          <h1>
            THE <em>ARCANUM</em>
            <span>ARCHIVE</span>
          </h1>
          <p className="hero-lede">
            Explore, study, and understand <b>rituals, spells, magical artifacts, symbols, grimoires, traditions, entities, divination, and esoteric history</b> through a cinematic digital archive.
          </p>
          <HeroSearch onSearch={onSearch} />
          <div className="hero-ctas">
            <button className="button gold" type="button" onClick={() => goTo("encyclopedia")}>Explore the Encyclopedia</button>
            <button className="button ghost" type="button" onClick={() => goTo("learn")}>Begin Learning</button>
          </div>
          <p className="hero-note">A curated research archive with interactive learning, cross-linked records, and reflective divination tools.</p>
        </div>
        <div className="hero-seal-wrap"><ArcaneSeal /></div>
        <div className="hero-index">
          <small>INDEX NO. 01</small>
          <strong>The threshold of study</strong>
          <span>Scroll to enter ↓</span>
        </div>
      </section>

      <StatRibbon />

      <section className="content-section subject-section">
        <div className="section-intro split">
          <div>
            <p className="kicker">ENTER THE SUBJECT</p>
            <h2>Magic is not one shelf.</h2>
          </div>
          <p>
            The archive separates traditions, source types, objects, practices, and historical studies so visitors can explore without flattening everything into one generic idea of “magic.”
          </p>
        </div>
        <div className="subject-grid">
          <SubjectGate eyebrow="SPELLCRAFT" title="Spells" visual="spells" copy="Collections, incantations, correspondences, and source-linked spell texts." onClick={() => onSearch("spells")} />
          <SubjectGate eyebrow="CEREMONY" title="Rituals" visual="rituals" copy="Ritual structures, sacred space, symbolic sequences, and ceremonial systems." onClick={() => onSearch("ritual")} />
          <SubjectGate eyebrow="OBJECTS OF POWER" title="Artifacts" visual="artifacts" copy="Talismans, circles, runes, sigils, manuscripts, and ritual objects." onClick={() => onSearch("artifact")} />
          <SubjectGate eyebrow="LINEAGES & SYSTEMS" title="Traditions" visual="traditions" copy="Distinct cultural and historical systems presented with their own provenance." onClick={() => onSearch("tradition")} />
          <SubjectGate eyebrow="DIVINATION" title="Oracles" visual="divination" copy="Tarot, runes, symbolic systems, and interactive reflective readings." onClick={() => goTo("divination")} />
          <SubjectGate eyebrow="TRANSFORMATION" title="Alchemy" visual="alchemy" copy="Historical, spiritual, and Western alchemical source material." onClick={() => onSearch("alchemy")} />
        </div>
      </section>

      <section className="content-section featured-section">
        <div className="section-intro">
          <p className="kicker">RECENTLY UNSEALED</p>
          <h2>Priority records from your collection.</h2>
          <p>These are real source records from the uploaded inventory. They are ready to receive translations, page images, and cross-references as extraction progresses.</p>
        </div>
        <FeaturedRail onOpen={onOpen} />
      </section>

      <section className="content-section home-oracle-feature">
        <div className="oracle-feature-copy">
          <p className="kicker">THE DIVINATION CHAMBER</p>
          <h2>Read symbols. Trace patterns. Keep the mechanics visible.</h2>
          <p>Enter complete Tarot and Elder Futhark reading systems built around transparent selection, position-aware interpretation, history, and reproducible seeded casts.</p>
          <button className="button gold" type="button" onClick={() => goTo("divination")}>Enter Divination</button>
        </div>
        <div className="oracle-feature-visual" aria-hidden="true">
          <span className="oracle-moon">☾</span>
          <span className="oracle-ring ring-one" />
          <span className="oracle-ring ring-two" />
          <span className="oracle-rune rune-a">ᛟ</span>
          <span className="oracle-rune rune-b">ᛉ</span>
          <span className="oracle-star">✦</span>
        </div>
      </section>

      <section className="content-section personal-vault-section">
        <div className="section-intro split">
          <div>
            <p className="kicker">YOUR PRIVATE VAULT</p>
            <h2>Keep a trail through the archive.</h2>
          </div>
          <p>Bookmark sources worth returning to and let the archive remember the records you recently opened. This stays in your browser and does not alter the source library.</p>
        </div>
        <div className="personal-vault-grid">
          <div className="vault-panel">
            <div className="vault-heading"><span>✦</span><div><small>SAVED RECORDS</small><strong>{savedEntries.length ? "Your bookmarked sources" : "No seals placed yet"}</strong></div></div>
            {savedEntries.length ? (
              <div className="vault-list">
                {savedEntries.map((entry) => (
                  <button type="button" key={entry.id} onClick={() => onOpen(entry.id)}>
                    <img src={visualMap[entry.visual]} alt="" />
                    <span><strong>{entry.title}</strong><small>{entry.original}</small></span>
                    <em onClick={(event) => { event.stopPropagation(); onToggleBookmark(entry.id); }}>Remove</em>
                  </button>
                ))}
              </div>
            ) : <p className="vault-empty">Open an encyclopedia record and place a bookmark to build your personal reading shelf.</p>}
          </div>
          <div className="vault-panel">
            <div className="vault-heading"><span>⌛</span><div><small>RECENTLY VIEWED</small><strong>{recentEntries.length ? "Continue your research" : "Your path is still unwritten"}</strong></div></div>
            {recentEntries.length ? (
              <div className="vault-list">
                {recentEntries.map((entry) => (
                  <button type="button" key={entry.id} onClick={() => onOpen(entry.id)}>
                    <img src={visualMap[entry.visual]} alt="" />
                    <span><strong>{entry.title}</strong><small>{entry.original}</small></span>
                    <b>Continue ↗</b>
                  </button>
                ))}
              </div>
            ) : <p className="vault-empty">Records you open will appear here so you can return to a research thread quickly.</p>}
          </div>
        </div>
      </section>

      <section className="content-section learning-preview">
        <div className="learning-copy">
          <p className="kicker">THE PATH OF STUDY</p>
          <h2>Learn the archive, not just the aesthetic.</h2>
          <p>
            Visitors should understand where a text comes from, what tradition it belongs to, how symbols relate to other sources, and where later interpretations diverge from the original.
          </p>
          <button className="text-link" type="button" onClick={() => goTo("learn")}>Enter the learning path →</button>
        </div>
        <div className="chapter-stack">
          {learningChapters.slice(0, 4).map((chapter) => (
            <button type="button" key={chapter.number} onClick={() => goTo("learn")}>
              <span>{chapter.number}</span>
              <div><strong>{chapter.title}</strong><small>{chapter.subtitle}</small></div>
              <em>↗</em>
            </button>
          ))}
        </div>
      </section>

      <section className="content-section knowledge-section">
        <div className="section-intro centered">
          <p className="kicker">KNOWLEDGE CONSTELLATION</p>
          <h2>Everything connects.</h2>
          <p>A spell can connect to a source book, symbol, tradition, historical period, artifact, or related ritual. The final archive makes those relationships explorable rather than hiding them inside folders.</p>
        </div>
        <KnowledgeMap />
      </section>

      <section className="content-section library-teaser">
        <div className="teaser-copy">
          <p className="kicker">DIGITAL GRIMOIRE LIBRARY</p>
          <h2>See the original.<br />Read the translation.</h2>
          <p>Original scans and Chinese text will sit beside the English layer, with zoomable diagrams, source metadata, annotations, and links back into the encyclopedia.</p>
          <button className="button gold" type="button" onClick={() => goTo("library")}>Open the Digital Library</button>
        </div>
        <div className="book-object" aria-label="Stylized manuscript preview">
          <div className="book-glow" />
          <div className="book-page left-page">
            <small>ORIGINAL SOURCE</small>
            <div className="manuscript-glyph">✦</div>
            <h3>魔法阵</h3>
            <p>Original source imagery will be attached here after extraction.</p>
          </div>
          <div className="book-spine" />
          <div className="book-page right-page">
            <small>ENGLISH LAYER</small>
            <h3>Magic Circles</h3>
            <p>Translation, historical context, symbol annotations, and connected records.</p>
            <div className="ink-lines" />
          </div>
        </div>
      </section>
    </main>
  );
}

function SearchPanel({ search, setSearch, category, setCategory, count, savedOnly, setSavedOnly }) {
  return (
    <div className="archive-controls">
      <label className="archive-search">
        <span>⌕</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search titles, Chinese terms, traditions, source files…" />
        <small>{count} records</small>
      </label>
      <div className="category-row">
        <div className="category-scroll">
        {categories.map((item) => (
          <button className={category === item ? "active" : ""} type="button" key={item} onClick={() => setCategory(item)}>
            {item}
          </button>
        ))}
        </div>
        <button className={savedOnly ? "saved-filter active" : "saved-filter"} type="button" onClick={() => setSavedOnly((value) => !value)}>
          ★ Saved only
        </button>
      </div>
    </div>
  );
}

function RecordCard({ entry, bookmarked, onToggleBookmark, comparing, onToggleCompare }) {
  return (
    <button className="record-card" type="button" onClick={() => goTo("entry", entry.id)}>
      <span
        className={comparing ? "record-compare active" : "record-compare"}
        role="button"
        tabIndex={0}
        aria-label={comparing ? "Remove from comparison" : "Add to comparison"}
        onClick={(event) => { event.stopPropagation(); onToggleCompare(entry.id); }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            onToggleCompare(entry.id);
          }
        }}
      >{comparing ? "⇄" : "≍"}</span>
      <span
        className={bookmarked ? "record-bookmark active" : "record-bookmark"}
        role="button"
        tabIndex={0}
        aria-label={bookmarked ? "Remove bookmark" : "Bookmark record"}
        onClick={(event) => { event.stopPropagation(); onToggleBookmark(entry.id); }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            onToggleBookmark(entry.id);
          }
        }}
      >{bookmarked ? "★" : "☆"}</span>
      <span className="record-art">
        <img src={visualMap[entry.visual]} alt="" />
        <span className="record-index">ARCHIVE RECORD</span>
      </span>
      <span className="record-content">
        <small>{entry.category} · {entry.tradition}</small>
        <strong>{entry.title}</strong>
        <span className="record-summary">{entry.summary}</span>
        <span className="record-footer">
          <em>{entry.status}</em>
          <b>Open record ↗</b>
        </span>
      </span>
    </button>
  );
}

function CompareTray({ ids, onRemove, onClear }) {
  const entries = ids.map((id) => libraryEntries.find((entry) => entry.id === id)).filter(Boolean);
  if (entries.length < 2) return null;

  const rows = [
    ["Tradition", "tradition"],
    ["Record type", "kind"],
    ["Language", "language"],
    ["Import status", "status"],
  ];

  return (
    <section className="compare-tray">
      <div className="compare-heading">
        <div><p className="kicker">COMPARE SOURCES</p><strong>{entries.length} records selected</strong></div>
        <button type="button" onClick={onClear}>Clear comparison</button>
      </div>
      <div className="compare-scroll">
        <table>
          <thead>
            <tr>
              <th>Field</th>
              {entries.map((entry) => (
                <th key={entry.id}>
                  <button type="button" onClick={() => goTo("entry", entry.id)}>{entry.title}</button>
                  <span onClick={() => onRemove(entry.id)} role="button" tabIndex={0}>Remove ×</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, key]) => (
              <tr key={key}>
                <td>{label}</td>
                {entries.map((entry) => <td key={entry.id}>{entry[key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function KnowledgeMapView({ onSearch }) {
  const clusters = useMemo(() => {
    const map = new Map();
    libraryEntries.forEach((entry) => {
      const key = entry.tradition;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
  }, []);

  const positions = [
    [50,10],[76,17],[91,38],[88,67],[67,86],[42,89],[18,78],
    [8,53],[14,27],[34,20],[62,29],[72,54],[52,68],[31,55],
  ];

  return (
    <main className="view map-view">
      <section className="subpage-hero map-hero">
        <div>
          <p className="kicker">KNOWLEDGE MAP</p>
          <h1>Trace the relationships.</h1>
          <p>Browse the archive as a network of traditions and source clusters rather than a flat folder tree. Nodes are generated from the current indexed records.</p>
        </div>
        <ArcaneSeal compact />
      </section>
      <section className="content-section map-workspace">
        <div className="map-explainer">
          <p className="kicker">INDEX-GENERATED NETWORK</p>
          <h2>Traditions become constellations.</h2>
          <p>Node size reflects how many indexed records currently belong to a tradition. Selecting a node opens the encyclopedia filtered by that term.</p>
        </div>
        <div className="research-constellation">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {positions.map(([x,y], index) => <line key={index} x1="50" y1="50" x2={x} y2={y} />)}
            <circle cx="50" cy="50" r="30" />
            <circle cx="50" cy="50" r="42" />
          </svg>
          <button className="research-core" type="button" onClick={() => goTo("encyclopedia")}><span>✦</span><strong>THE ARCHIVE</strong></button>
          {clusters.map(([tradition, count], index) => {
            const [x,y] = positions[index];
            return (
              <button
                key={tradition}
                type="button"
                className="research-node"
                style={{ "--x": `${x}%`, "--y": `${y}%`, "--scale": String(0.9 + Math.min(count, 5) * 0.08) }}
                onClick={() => onSearch(tradition)}
              >
                <strong>{tradition}</strong><span>{count} {count === 1 ? "record" : "records"}</span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function EncyclopediaView({ initialSearch, onSearchConsumed, bookmarkSet, onToggleBookmark }) {
  const [search, setSearch] = useState(initialSearch || "");
  const [category, setCategory] = useState("All");
  const [savedOnly, setSavedOnly] = useState(false);
  const [compareIds, setCompareIds] = useState([]);

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearch(initialSearch);
      onSearchConsumed?.();
    }
  }, [initialSearch, onSearchConsumed]);

  const toggleCompare = (id) => {
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) return [...current.slice(1), id];
      return [...current, id];
    });
  };

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return libraryEntries.filter((entry) => {
      const categoryMatch = category === "All" || entry.category === category;
      const haystack = [
        entry.title,
        entry.original,
        entry.category,
        entry.tradition,
        entry.kind,
        entry.language,
        entry.status,
        entry.sourceFile,
        entry.summary,
      ].join(" ").toLowerCase();
      const savedMatch = !savedOnly || bookmarkSet.has(entry.id);
      return categoryMatch && savedMatch && (!needle || haystack.includes(needle));
    });
  }, [search, category, savedOnly, bookmarkSet]);

  return (
    <main className="view encyclopedia-view">
      <section className="subpage-hero archive-hero">
        <div>
          <p className="kicker">THE ENCYCLOPEDIA</p>
          <h1>Explore the Archive</h1>
          <p>Browse source-indexed records by title, tradition, object type, language, and status. Search supports both English and original Chinese names.</p>
        </div>
        <ArcaneSeal compact />
      </section>

      <section className="content-section archive-browser">
        <SearchPanel search={search} setSearch={setSearch} category={category} setCategory={setCategory} count={filtered.length} savedOnly={savedOnly} setSavedOnly={setSavedOnly} />
        <div className="archive-layout">
          <aside className="archive-aside">
            <div className="aside-card">
              <p className="kicker">SOURCE POLICY</p>
              <h3>Nothing is invented.</h3>
              <p>Inventory metadata is usable now. Article text, translations, diagrams, and ritual details remain locked until the original source is extracted.</p>
            </div>
            <div className="aside-card compact">
              <span><b>{archiveStats.rawFiles}</b> raw files</span>
              <span><b>{archiveStats.splitVolumes}</b> volumes</span>
              <span><b>CN + EN</b> sources</span>
            </div>
          </aside>
          <div className="record-grid">
            {filtered.length ? filtered.map((entry) => <RecordCard entry={entry} bookmarked={bookmarkSet.has(entry.id)} onToggleBookmark={onToggleBookmark} comparing={compareIds.includes(entry.id)} onToggleCompare={toggleCompare} key={entry.id} />) : (
              <div className="empty-state">
                <ArcaneSeal compact />
                <h3>No record answered the summons.</h3>
                <p>Try another term or reset the category filter.</p>
                <button className="button ghost" type="button" onClick={() => { setSearch(""); setCategory("All"); setSavedOnly(false); }}>Reset archive</button>
              </div>
            )}
          </div>
        </div>
        <CompareTray ids={compareIds} onRemove={toggleCompare} onClear={() => setCompareIds([])} />
      </section>
    </main>
  );
}

function MetadataGrid({ entry }) {
  const items = [
    ["Tradition", entry.tradition],
    ["Record Type", entry.kind],
    ["Language", entry.language],
    ["Import Status", entry.status],
  ];
  return (
    <dl className="metadata-grid">
      {items.map(([label, value]) => (
        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
      ))}
    </dl>
  );
}

function RelatedRecords({ entry }) {
  const related = libraryEntries
    .filter((item) => item.id !== entry.id && (item.category === entry.category || item.tradition === entry.tradition))
    .slice(0, 4);
  return (
    <div className="related-grid">
      {related.map((item) => (
        <button type="button" key={item.id} onClick={() => goTo("entry", item.id)}>
          <img src={visualMap[item.visual]} alt="" />
          <span><small>{item.category}</small><strong>{item.title}</strong><em>{item.original}</em></span>
        </button>
      ))}
    </div>
  );
}

function EntryView({ id, bookmarked, onToggleBookmark, onRemember }) {
  const entry = libraryEntries.find((item) => item.id === id);
  const [tab, setTab] = useState("overview");
  const [annotations, setAnnotations] = useState(false);

  useEffect(() => {
    if (entry) onRemember(entry.id);
  }, [entry, onRemember]);

  if (!entry) {
    return (
      <main className="view missing-view">
        <ArcaneSeal />
        <h1>Record not found</h1>
        <button className="button gold" type="button" onClick={() => goTo("encyclopedia")}>Return to archive</button>
      </main>
    );
  }

  return (
    <main className="view entry-view">
      <section className="entry-hero" style={{ "--entry-art": `url(${visualMap[entry.visual]})` }}>
        <div className="entry-hero-shade" />
        <button className="breadcrumb" type="button" onClick={() => goTo("encyclopedia")}>← Encyclopedia / {entry.category}</button>
        <div className="entry-title-block">
          <p className="kicker">{entry.category}</p>
          <h1>{entry.title}</h1>
          <div className="entry-badges">
            <span>{entry.tradition}</span><span>{entry.kind}</span><span>{entry.language}</span>
          </div>
          <button className={bookmarked ? "entry-bookmark active" : "entry-bookmark"} type="button" onClick={() => onToggleBookmark(entry.id)}>
            {bookmarked ? "★ Saved to your vault" : "☆ Save this record"}
          </button>
        </div>
        <div className="entry-hero-seal"><ArcaneSeal compact /></div>
      </section>

      <section className="content-section entry-body">
        <div className="entry-viewer">
          <div className="viewer-stage">
            <img src={visualMap[entry.visual]} alt="" />
            <span className="viewer-vignette" />
            <span className="viewer-lock">CURATED ARCHIVE VISUAL</span>
            {annotations && (
              <>
                <button className="annotation-point point-a" type="button"><i>1</i><span>Symbol context</span></button>
                <button className="annotation-point point-b" type="button"><i>2</i><span>Related visual motif</span></button>
              </>
            )}
          </div>
          <div className="viewer-tools">
            <button type="button" onClick={() => setAnnotations((value) => !value)} className={annotations ? "active" : ""}>◎ Annotations</button>
            <button type="button" disabled>＋ Detail view</button>
            <button type="button" disabled>▤ Archive edition</button>
          </div>
        </div>

        <article className="entry-document">
          <div className="document-tabs">
            {["overview", "context", "related", "images"].map((item) => (
              <button className={tab === item ? "active" : ""} type="button" key={item} onClick={() => setTab(item)}>
                {item}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <div className="document-panel">
              <p className="kicker">ARCHIVE RECORD</p>
              <h2>{entry.title}</h2>
              <p className="document-lede">{entry.summary}</p>
              <MetadataGrid entry={entry} />
              <div className="source-warning">
                <strong>Curated research standard</strong>
                <p>This public record includes only material supported by the archive. Detailed instructions, historical claims, translations, and diagrams are added only after the underlying source has been reviewed.</p>
              </div>
            </div>
          )}

          {tab === "context" && (
            <div className="document-panel">
              <p className="kicker">RESEARCH CONTEXT</p>
              <h2>How this record is classified</h2>
              <div className="source-card">
                <span>TRADITION</span><strong>{entry.tradition}</strong>
                <span>RECORD TYPE</span><strong>{entry.kind}</strong>
                <span>LANGUAGE REVIEW</span><strong>{entry.language}</strong>
                <span>ARCHIVE STATE</span><strong>{entry.status}</strong>
              </div>
              <p className="muted-copy">Research provenance and OCR diagnostics are maintained privately so the public record can stay clean, readable, and focused on the subject itself.</p>
            </div>
          )}

          {tab === "related" && (
            <div className="document-panel">
              <p className="kicker">CONNECTED KNOWLEDGE</p>
              <h2>Related records</h2>
              <RelatedRecords entry={entry} />
            </div>
          )}

          {tab === "images" && (
            <div className="document-panel">
              <p className="kicker">VISUAL INDEX</p>
              <h2>Symbols & related imagery</h2>
              <div className="image-lock-grid">
                {[1, 2, 3].map((number) => (
                  <div key={number}><img src={visualMap[entry.visual]} alt="" /><span>Related visual {number}</span></div>
                ))}
              </div>
              <p className="muted-copy">Visuals are used to support navigation and recognition. Reviewed manuscript pages, symbols, and diagrams are added to records as they become available.</p>
            </div>
          )}
        </article>
      </section>

      <section className="content-section entry-related-section">
        <div className="section-intro"><p className="kicker">CONTINUE EXPLORING</p><h2>Follow the thread.</h2></div>
        <RelatedRecords entry={entry} />
      </section>
    </main>
  );
}

function LearnView({ completedStudy, onToggleStudyComplete }) {
  const [active, setActive] = useState(0);
  const chapter = learningChapters[active];

  return (
    <main className="view learn-view">
      <section className="subpage-hero learn-hero">
        <div>
          <p className="kicker">LEARN MAGIC</p>
          <h1>A guided path through the archive.</h1>
          <p>Not a random list of occult terms. The learning experience is structured around source literacy, historical context, symbolic systems, and relationships between traditions.</p>
        </div>
        <div className="lesson-orbit"><ArcaneSeal /></div>
      </section>

      <section className="content-section learning-workspace">
        <div className="learning-index">
          <div className="study-progress">
            <div><span>Study progress</span><strong>{completedStudy.length}/{learningChapters.length}</strong></div>
            <div className="study-progress-track"><i style={{ width: `${(completedStudy.length / learningChapters.length) * 100}%` }} /></div>
          </div>
          {learningChapters.map((item, index) => (
            <button className={active === index ? "active" : ""} type="button" key={item.number} onClick={() => setActive(index)}>
              <span>{item.number}</span>
              <div><strong>{item.title}</strong><small>{item.subtitle}</small></div>
              {completedStudy.includes(item.number) && <em className="chapter-complete">✓</em>}
            </button>
          ))}
        </div>
        <div className="learning-panel">
          <div className="chapter-number">{chapter.number}</div>
          <p className="kicker">CHAPTER {chapter.number}</p>
          <h2>{chapter.title}</h2>
          <h3>{chapter.subtitle}</h3>
          <p>{chapter.description}</p>
          <div className="topic-grid">
            {chapter.topics.map((topic, index) => <div key={topic}><span>0{index + 1}</span><strong>{topic}</strong></div>)}
          </div>
          <div className="lesson-lock">
            <span>✦</span>
            <div><strong>Course content follows the source import.</strong><p>Lesson text will be built from the actual library documents rather than generic internet occult material.</p></div>
          </div>
          <div className="lesson-actions">
            <button className={completedStudy.includes(chapter.number) ? "button ghost complete-button" : "button gold complete-button"} type="button" onClick={() => onToggleStudyComplete(chapter.number)}>
              {completedStudy.includes(chapter.number) ? "✓ Chapter marked complete" : "Mark chapter complete"}
            </button>
            <button className="button ghost" type="button" onClick={() => goTo("encyclopedia")}>Explore matching sources</button>
          </div>
        </div>
      </section>
    </main>
  );
}


function DivinationView() {
  const tools = [
    {
      id: "tarot",
      eyebrow: "78-CARD SYSTEM",
      title: "Tarot",
      symbol: "✦",
      copy: "Draw from a complete 78-card deck with multiple spreads, upright and optional reversed meanings, position-aware interpretation, and reading history.",
      href: "/arcanum/divination/tarot.html",
      status: "Available now",
      meta: "One Card · Three Card · Love · Career · Decision · Celtic Cross",
    },
    {
      id: "runes",
      eyebrow: "ELDER FUTHARK",
      title: "Rune Casting",
      symbol: "ᛟ",
      copy: "Cast from all 24 Elder Futhark runes with One Rune, Three Norns, Five Rune Cross, and Nine Rune Cast layouts.",
      href: "/arcanum/divination/runes.html",
      status: "Available now",
      meta: "24 runes · seeded replay · optional reversals · Rune of the Day",
    },
  ];

  const upcoming = [
    ["Pendulum", "Question-led reflective yes / no / unclear casting"],
    ["Numerology", "Calculated personal numbers and cycle readings"],
    ["I Ching", "Six-line hexagram casting with changing lines"],
    ["Oracle", "Original Arcanum symbolic card system"],
    ["Lenormand", "36-card neighbor and pairing interpretation"],
    ["Geomancy", "Traditional sixteen-figure shield-chart system"],
  ];

  return (
    <main className="view divination-view">
      <section className="divination-hero">
        <div className="divination-hero-copy">
          <p className="kicker">THE DIVINATION CHAMBER</p>
          <h1>Enter the oracle.</h1>
          <p>
            Interactive systems for reflective readings, symbolic study, and structured interpretation. Random selection and calculated inputs are separated from the rules that explain each result.
          </p>
          <div className="divination-hero-actions">
            <a className="button gold" href="/arcanum/divination/tarot.html">Open Tarot</a>
            <a className="button ghost" href="/arcanum/divination/runes.html">Cast Runes</a>
          </div>
        </div>
        <div className="divination-orbit" aria-hidden="true">
          <span className="orbit-ring ring-a" />
          <span className="orbit-ring ring-b" />
          <span className="orbit-ring ring-c" />
          <strong>☾</strong>
          <i>✦</i>
        </div>
      </section>

      <section className="content-section divination-tools-section">
        <div className="section-intro split">
          <div>
            <p className="kicker">ACTIVE SYSTEMS</p>
            <h2>Two complete reading engines are live.</h2>
          </div>
          <p>Each system keeps its own symbolism and mechanics instead of forcing every divination method into the same generic reading template.</p>
        </div>

        <div className="divination-tool-grid">
          {tools.map((tool) => (
            <a className={"divination-tool-card " + tool.id} href={tool.href} key={tool.id}>
              <span className="divination-tool-glow" />
              <div className="divination-tool-symbol">{tool.symbol}</div>
              <div className="divination-tool-copy">
                <small>{tool.eyebrow}</small>
                <h3>{tool.title}</h3>
                <p>{tool.copy}</p>
                <em>{tool.meta}</em>
              </div>
              <div className="divination-tool-footer">
                <span>{tool.status}</span>
                <strong>Enter reading →</strong>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="content-section divination-roadmap-section">
        <div className="section-intro">
          <p className="kicker">THE ORACLE WING</p>
          <h2>More systems will join the chamber.</h2>
          <p>The next modules are being built as distinct tools with their own calculations, casting logic, history, and educational context.</p>
        </div>
        <div className="divination-roadmap-grid">
          {upcoming.map(([title, copy], index) => (
            <article key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><strong>{title}</strong><p>{copy}</p></div>
              <em>Planned</em>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section divination-principles">
        <div>
          <p className="kicker">READING PRINCIPLES</p>
          <h2>Transparent mechanics, not mystery-box output.</h2>
        </div>
        <div className="principle-grid">
          <article><span>01</span><strong>Selection</strong><p>Random draws and casts are handled independently from the interpretation rules.</p></article>
          <article><span>02</span><strong>Context</strong><p>Spread position, orientation, neighboring symbols, and repeated themes can modify a base meaning.</p></article>
          <article><span>03</span><strong>Replay</strong><p>Optional seeds let a reading be reproduced exactly when testing or reviewing an interpretation.</p></article>
          <article><span>04</span><strong>Reflection</strong><p>Results are presented as reflective frameworks rather than guaranteed predictions.</p></article>
        </div>
      </section>
    </main>
  );
}

function BookSpine({ entry, selected, onSelect }) {
  return (
    <button className={selected ? "book-spine-card selected" : "book-spine-card"} type="button" onClick={onSelect}>
      <span className="spine-rune">✦</span>
      <strong>{entry.title}</strong>
      <em>{entry.category}</em>
    </button>
  );
}

function LibraryView() {
  const [selectedId, setSelectedId] = useState("magic-circles");
  const [mode, setMode] = useState("shelf");
  const selected = libraryEntries.find((entry) => entry.id === selectedId) || libraryEntries[0];

  return (
    <main className="view library-view">
      <section className="subpage-hero library-hero">
        <div>
          <p className="kicker">DIGITAL GRIMOIRE LIBRARY</p>
          <h1>Enter the digital reading room.</h1>
          <p>Browse curated volumes, open connected encyclopedia records, and move between subjects without exposing the archive's internal filenames or ingestion metadata.</p>
        </div>
        <div className="library-lantern"><span>✦</span></div>
      </section>

      <section className="content-section library-workspace">
        <div className="library-toolbar">
          <div>
            <button className={mode === "shelf" ? "active" : ""} type="button" onClick={() => setMode("shelf")}>▥ Shelf</button>
            <button className={mode === "reader" ? "active" : ""} type="button" onClick={() => setMode("reader")}>▤ Reader</button>
          </div>
          <span>{archiveStats.rawFiles} files indexed · {archiveStats.splitVolumes} volumes</span>
        </div>

        {mode === "shelf" ? (
          <>
            <div className="library-room">
              <div className="shelf-row">
                {libraryEntries.slice(0, 16).map((entry) => (
                  <BookSpine key={entry.id} entry={entry} selected={entry.id === selectedId} onSelect={() => setSelectedId(entry.id)} />
                ))}
              </div>
              <div className="shelf-base" />
              <div className="shelf-row lower">
                {libraryEntries.slice(16).map((entry) => (
                  <BookSpine key={entry.id} entry={entry} selected={entry.id === selectedId} onSelect={() => setSelectedId(entry.id)} />
                ))}
              </div>
              <div className="shelf-base" />
            </div>

            <div className="selected-book">
              <div className="selected-cover"><img src={visualMap[selected.visual]} alt="" /><span>✦</span></div>
              <div>
                <p className="kicker">SELECTED SOURCE</p>
                <h2>{selected.title}</h2>
                <p>{selected.summary}</p>
                <MetadataGrid entry={selected} />
                <div className="selected-actions">
                  <button className="button gold" type="button" onClick={() => setMode("reader")}>Open reader</button>
                  <button className="button ghost" type="button" onClick={() => goTo("entry", selected.id)}>Open encyclopedia record</button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="reader-shell">
            <div className="reader-sidebar">
              <p className="kicker">SOURCE READER</p>
              <h3>{selected.title}</h3>
<p>{selected.category} · {selected.tradition}</p>
              <button type="button" onClick={() => setMode("shelf")}>← Back to shelf</button>
              <button type="button" onClick={() => goTo("entry", selected.id)}>Encyclopedia record ↗</button>
            </div>
            <div className="reader-book">
              <div className="reader-page original-page">
                <small>ARCHIVE EDITION</small>
                <div className="source-page-placeholder">
                  <span>✦</span>
                  <strong>{selected.title}</strong>
                  <p>This archive edition presents the record in a clean reading format while the underlying research collection continues to expand.</p>
                </div>
              </div>
              <div className="reader-gutter" />
              <div className="reader-page translation-page">
                <small>READING NOTES</small>
                <h2>{selected.title}</h2>
                <p>{selected.summary}</p>
                <div className="translation-lines" />
                <div className="reader-note"><strong>Editorial standard:</strong> this reading view only publishes material that has been reviewed against the archive.</div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function SourceLabView() {
  const [manifest, setManifest] = useState(null);
  const [extraction, setExtraction] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/arcanum/source-manifest.json", { cache: "no-store" }),
      fetch("/arcanum/extraction-report.json", { cache: "no-store" }),
    ])
      .then(async ([manifestResponse, extractionResponse]) => {
        if (!manifestResponse.ok) throw new Error(`Manifest request failed: ${manifestResponse.status}`);
        if (!extractionResponse.ok) throw new Error(`Extraction report request failed: ${extractionResponse.status}`);
        return [await manifestResponse.json(), await extractionResponse.json()];
      })
      .then(([manifestData, extractionData]) => {
        if (alive) {
          setManifest(manifestData);
          setExtraction(extractionData);
        }
      })
      .catch((reason) => {
        if (alive) setError(reason.message || "Could not read source reports.");
      });
    return () => { alive = false; };
  }, []);

  /* legacy fetch kept out intentionally */
  /* fetch("/arcanum/source-manifest.json", { cache: "no-store" }) */
  const summary = manifest?.summary || {};
  const extractionSummary = extraction?.summary || {};
  const capabilities = extraction?.capabilities || {};
  const extractionRecords = Array.isArray(extraction?.records) ? extraction.records.slice(0, 18) : [];
  const extracted = Number(summary.totalFiles || summary.extractedFiles || 0);
  const processed = Number(extractionSummary.requested || 0);
  const inventoryFiles = Number(summary.inventoryFiles || archiveStats.rawFiles || 0);
  const progress = inventoryFiles ? Math.min(100, Math.round((extracted / inventoryFiles) * 100)) : 0;
  const files = Array.isArray(manifest?.files) ? manifest.files.slice(0, 18) : [];

  const stages = [
    {
      title: "Inventory",
      state: "ready",
      copy: "The uploaded inventory establishes filenames, source categories, archive volume count, and the current bilingual record map.",
    },
    {
      title: "Filesystem scan",
      state: extracted ? "ready" : "waiting",
      copy: "The Windows scanner walks the extracted library, records relative paths and file sizes, and hashes source files for exact duplicate detection.",
    },
    {
      title: "Deduplication",
      state: extracted ? "ready" : "waiting",
      copy: "SHA-256 identifies exact copies while normalized filenames plus byte size flag likely duplicate editions for review.",
    },
    {
      title: "Text & image extraction",
      state: processed ? "ready" : "waiting",
      copy: "PDF/DOC/DOCX text, page images, diagrams, sigils, tarot art, and illustrations will be attached to their source records after extraction.",
    },
    {
      title: "Translation review",
      state: "waiting",
      copy: "Chinese originals and reviewed English translations will remain linked at page and record level rather than replacing the source text.",
    },
    {
      title: "Encyclopedia publishing",
      state: "waiting",
      copy: "Only reviewed source-derived material moves into public article sections, learning lessons, diagrams, and the knowledge graph.",
    },
  ];

  return (
    <main className="view source-lab-view">
      <section className="subpage-hero source-lab-hero">
        <div>
          <p className="kicker">SOURCE INGESTION LAB</p>
          <h1>Turn the library into structured knowledge.</h1>
          <p>This workspace tracks the path from extracted files to deduplicated sources, visual assets, page-level provenance, translations, and encyclopedia records.</p>
        </div>
        <ArcaneSeal compact />
      </section>

      <section className="content-section source-lab-workspace">
        <div className="source-lab-overview">
          <div className="source-progress-card">
            <div className="source-progress-ring" style={{ "--progress": `${progress * 3.6}deg` }}>
              <span><strong>{progress}%</strong><small>extracted</small></span>
            </div>
            <div>
              <p className="kicker">CURRENT SOURCE STATE</p>
              <h2>{manifest?.state === "inventory-only" ? "Inventory mapped. Extraction pending." : "Extracted source tree indexed."}</h2>
              <p>{manifest?.state === "inventory-only"
                ? "The website currently knows the library inventory and source filenames, but the underlying document bytes have not yet been imported into the content pipeline."
                : "The source manifest is active. Duplicate detection and file-type classification are now available for the extracted tree."}</p>
            </div>
          </div>

          <div className="source-metrics">
            <div><span>Inventory files</span><strong>{inventoryFiles}</strong></div>
            <div><span>Extracted files</span><strong>{extracted}</strong></div>
            <div><span>Images found</span><strong>{summary.imageFiles || 0}</strong></div>
            <div><span>Documents found</span><strong>{summary.documentFiles || 0}</strong></div>
            <div><span>Exact duplicate sets</span><strong>{summary.exactDuplicateSets || 0}</strong></div>
            <div><span>Likely duplicate sets</span><strong>{summary.likelyDuplicateSets || 0}</strong></div>
            <div><span>Text records</span><strong>{extractionSummary.textRecords || 0}</strong></div>
            <div><span>Asset records</span><strong>{extractionSummary.assetRecords || 0}</strong></div>
          </div>
        </div>

        <div className="section-intro split source-pipeline-intro">
          <div><p className="kicker">INGESTION PIPELINE</p><h2>Every source keeps its provenance.</h2></div>
          <p>The pipeline is deliberately conservative: it can organize and detect duplicates without pretending it has read a book that has not yet been extracted.</p>
        </div>

        <div className="pipeline-grid">
          {stages.map((stage, index) => (
            <article className={`pipeline-stage ${stage.state}`} key={stage.title}>
              <span className="pipeline-number">0{index + 1}</span>
              <i />
              <small>{stage.state === "ready" ? "READY" : "PENDING"}</small>
              <h3>{stage.title}</h3>
              <p>{stage.copy}</p>
            </article>
          ))}
        </div>

        <div className="source-toolkit">
          <div className="toolkit-copy">
            <p className="kicker">WINDOWS IMPORT TOOLKIT</p>
            <h2>One scan. One import. No manual file sorting.</h2>
            <p>The repository now contains a Windows scanner and a Node importer. After the library is extracted, the scanner creates a hash-aware file manifest and the importer writes the source manifest used by this page.</p>
          </div>
          <div className="command-stack">
            <div><small>1 · SCAN EXTRACTED LIBRARY</small><code>npm run arcanum:scan -- -Root "D:\\Magic-Library" -HashAll</code></div>
            <div><small>2 · BUILD SOURCE MANIFEST</small><code>npm run arcanum:import -- "import\\source-files.json"</code></div>
            <div><small>3 · EXTRACT TEXT & ASSETS</small><code>npm run arcanum:extract -- --root "D:\\Magic-Library" --extract-archives</code></div>
            <div><small>4 · START WEBSITE</small><code>npm run dev</code></div>
          </div>
        </div>

        <section className="extractor-capabilities">
          <div className="section-intro split">
            <div><p className="kicker">EXTRACTION ENGINE</p><h2>Use what is installed. Record what is missing.</h2></div>
            <p>Plain text and images are handled directly. PDF, Office, and archive extraction use optional system tools when available, so one missing dependency does not block the whole library.</p>
          </div>
          <div className="capability-grid">
            <div className={capabilities.nativePdf ? "ready" : capabilities.pdfToText ? "attention" : "blocked"}><span>PDF TEXT</span><strong>{capabilities.nativePdf ? "PDF.js native parser ready" : capabilities.pdfToText ? "pdftotext fallback ready" : "PDF parser unavailable"}</strong><small>{capabilities.nativePdf ? "Page-by-page text + provenance enabled" : capabilities.pdfToTextPath || capabilities.nativePdfError || "Install dependencies or Poppler"}</small></div>
            <div className={capabilities.nativeDocx ? "ready" : "blocked"}><span>DOCX</span><strong>{capabilities.nativeDocx ? "Mammoth native parser ready" : "DOCX parser unavailable"}</strong><small>{capabilities.nativeDocx ? "Raw text extraction without LibreOffice" : capabilities.nativeDocxError || "Run npm install"}</small></div>
            <div className={capabilities.office ? "ready" : "attention"}><span>LEGACY DOC / RTF</span><strong>{capabilities.office ? "LibreOffice fallback ready" : "LibreOffice optional"}</strong><small>{capabilities.officePath || "Only old .doc/.rtf files still require LibreOffice"}</small></div>
            <div className={capabilities.sevenZip ? "ready" : "blocked"}><span>RAR / ZIP / 7Z</span><strong>{capabilities.sevenZip ? "7-Zip ready" : "7-Zip missing"}</strong><small>{capabilities.sevenZipPath || "Install 7-Zip or set ARCANUM_7Z"}</small></div>
            <div className="ready"><span>PAGE PROVENANCE</span><strong>{Number(extractionSummary.pageMappedRecords || 0)} PDF records mapped</strong><small>{Number(extractionSummary.totalPages || 0)} source pages indexed</small></div>
            <div className={Number(extractionSummary.needsVision || 0) ? "attention" : "ready"}><span>SCANNED PDF</span><strong>{Number(extractionSummary.needsVision || 0)} need vision review</strong><small>Image-only PDFs are flagged instead of treated as empty text</small></div>
            <div className="ready"><span>EXACT DUPLICATES</span><strong>{Number(extractionSummary.exactDuplicatesSkipped || 0)} copies skipped</strong><small>Canonical sources retain the derived content</small></div>
            <div className="ready"><span>TXT / MD / HTML</span><strong>Built-in Node extraction</strong><small>No external dependency required</small></div>
            <div className="ready"><span>IMAGE FILES</span><strong>Asset indexing ready</strong><small>Original bytes copied into derived asset storage</small></div>
          </div>

          {extractionRecords.length > 0 && (
            <div className="extraction-records">
              <div className="extraction-record-heading"><span>Latest extraction records</span><strong>{processed} processed</strong></div>
              {extractionRecords.map((record) => (
                <div className="extraction-row" key={record.id}>
                  <span className={`extraction-status ${record.status}`}>{record.status}</span>
                  <div><strong>{record.filename}</strong><small>{record.reason || record.note || record.kind}</small></div>
                  <em>{record.textChars ? `${record.textChars.toLocaleString()} chars` : record.memberCount ? `${record.memberCount} members` : record.assetPath ? "asset" : "—"}</em>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="source-file-section">
          <div className="section-intro">
            <p className="kicker">SOURCE FILE MANIFEST</p>
            <h2>{files.length ? "Extracted files detected." : "Waiting for the extracted library."}</h2>
            <p>{files.length
              ? "The first manifest records are shown below. Full-text and image extraction are separate review stages."
              : "When the scanner/importer runs, this area will populate automatically with the real relative paths, hashes, file kinds, duplicate flags, and import state."}</p>
          </div>

          {error && <div className="source-error">{error}</div>}

          {files.length ? (
            <div className="source-file-table-wrap">
              <table className="source-file-table">
                <thead><tr><th>File</th><th>Kind</th><th>Size</th><th>Duplicate</th><th>Status</th></tr></thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.id}>
                      <td><strong>{file.filename}</strong><small>{file.path}</small></td>
                      <td>{file.kind}</td>
                      <td>{file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "—"}</td>
                      <td>{file.duplicate?.exact ? "Exact" : file.duplicate?.likely ? "Likely" : "No"}</td>
                      <td>{file.status || "indexed"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="source-awaiting">
              <ArcaneSeal compact />
              <strong>No extracted source manifest yet.</strong>
              <p>The inventory remains the authoritative basis for the current public records.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <Brand />
      <div><strong>Explore · Study · Understand Magic</strong><small>A living digital archive of esoteric history, symbolism, and divination.</small></div>
      <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Return to top ↑</button>
    </footer>
  );
}

export default function ArcanumArchive() {
  const route = useRoute();
  const [motion, setMotion] = useState(true);
  const [pendingSearch, setPendingSearch] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const rootRef = useRef(null);
  const archiveMemory = useArchiveMemory();

  useEffect(() => {
    const keyboard = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      } else if (event.key === "Escape") {
        setPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const pointer = (event) => {
      if (!motion) return;
      const x = event.clientX / window.innerWidth;
      const y = event.clientY / window.innerHeight;
      root.style.setProperty("--pointer-x", `${event.clientX}px`);
      root.style.setProperty("--pointer-y", `${event.clientY}px`);
      root.style.setProperty("--parallax-x", `${(x - 0.5) * 16}px`);
      root.style.setProperty("--parallax-y", `${(y - 0.5) * 12}px`);
    };

    window.addEventListener("pointermove", pointer);
    return () => window.removeEventListener("pointermove", pointer);
  }, [motion]);


  useEffect(() => {
    // premium reveal observer
    const root = rootRef.current;
    if (!root) return undefined;

    const updateScrollState = () => {
      root.classList.toggle("site-scrolled", window.scrollY > 24);
    };
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });

    const revealTargets = root.querySelectorAll(
      ".content-section, .subject-gate, .featured-record, .record-card, .vault-panel, .pipeline-stage, .capability-grid > div, .divination-tool-card, .divination-roadmap-grid article, .principle-grid article, .selected-book, .reader-book, .learning-workspace"
    );

    revealTargets.forEach((node, index) => {
      node.classList.add("premium-reveal");
      node.style.setProperty("--reveal-delay", String(Math.min(index % 8, 7) * 55) + "ms");
    });

    if (!motion || !("IntersectionObserver" in window)) {
      revealTargets.forEach((node) => node.classList.add("is-visible"));
      return () => window.removeEventListener("scroll", updateScrollState);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -7% 0px" },
    );

    revealTargets.forEach((node) => observer.observe(node));

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateScrollState);
    };
  }, [route.view, motion]);

  const performSearch = (term) => {
    setPendingSearch(term);
    goTo("encyclopedia");
  };

  return (
    <div className={motion ? "arcanum-app" : "arcanum-app reduced-motion"} ref={rootRef}>
      <ParticleField motion={motion} />
      <div className="grain-overlay" aria-hidden="true" />
      <div className="cursor-aura" aria-hidden="true" />
      <Header route={route} motion={motion} onToggleMotion={() => setMotion((value) => !value)} onOpenSearch={() => setPaletteOpen(true)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onOpenEntry={(id) => goTo("entry", id)} onSearch={performSearch} />

      {route.view === "home" && <HomeView onSearch={performSearch} onOpen={(id) => goTo("entry", id)} bookmarks={archiveMemory.bookmarks} recent={archiveMemory.recent} onToggleBookmark={archiveMemory.toggleBookmark} />}
      {route.view === "encyclopedia" && (
        <EncyclopediaView
          initialSearch={pendingSearch}
          onSearchConsumed={() => setPendingSearch("")}
          bookmarkSet={archiveMemory.bookmarkSet}
          onToggleBookmark={archiveMemory.toggleBookmark}
        />
      )}
      {route.view === "entry" && <EntryView id={route.id} bookmarked={archiveMemory.bookmarkSet.has(route.id)} onToggleBookmark={archiveMemory.toggleBookmark} onRemember={archiveMemory.remember} />}
      {route.view === "map" && <KnowledgeMapView onSearch={performSearch} />}
      {route.view === "divination" && <DivinationView />}
      {route.view === "sources" && <SourceLabView />}
      {route.view === "learn" && <LearnView completedStudy={archiveMemory.completedStudy} onToggleStudyComplete={archiveMemory.toggleStudyComplete} />}
      {route.view === "library" && <LibraryView />}

      <Footer />
    </div>
  );
}
