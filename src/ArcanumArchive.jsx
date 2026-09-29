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
  ["learn", "Learn Magic"],
  ["library", "Digital Library"],
];

function parseRoute() {
  const raw = window.location.hash.replace(/^#\/?/, "");
  if (!raw) return { view: "home" };
  const [view, id] = raw.split("/");
  if (view === "entry" && id) return { view: "entry", id };
  if (["home", "encyclopedia", "learn", "library"].includes(view)) return { view };
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

function Header({ route, motion, onToggleMotion }) {
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
      <div><strong>中文 + EN</strong><span>bilingual source layer</span></div>
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
            <span>{entry.original}</span>
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
            Explore, study, and understand <b>rituals, spells, magical artifacts, symbols, grimoires, traditions, entities, and hidden knowledge</b> through a source-linked digital archive.
          </p>
          <HeroSearch onSearch={onSearch} />
          <div className="hero-ctas">
            <button className="button gold" type="button" onClick={() => goTo("encyclopedia")}>Explore the Encyclopedia</button>
            <button className="button ghost" type="button" onClick={() => goTo("learn")}>Begin Learning</button>
          </div>
          <p className="hero-note">Original Chinese titles are preserved alongside English navigation. Unread source text remains locked until extraction.</p>
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
          <SubjectGate eyebrow="DIVINATION" title="Oracles" visual="divination" copy="Tarot, astrology, runic sources, and visual systems of interpretation." onClick={() => onSearch("divination")} />
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

function RecordCard({ entry, bookmarked, onToggleBookmark }) {
  return (
    <button className="record-card" type="button" onClick={() => goTo("entry", entry.id)}>
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
        <span className="record-index">SOURCE LOCKED</span>
      </span>
      <span className="record-content">
        <small>{entry.category} · {entry.tradition}</small>
        <strong>{entry.title}</strong>
        <span className="record-original">{entry.original}</span>
        <span className="record-summary">{entry.summary}</span>
        <span className="record-footer">
          <em>{entry.status}</em>
          <b>Open record ↗</b>
        </span>
      </span>
    </button>
  );
}

function EncyclopediaView({ initialSearch, onSearchConsumed, bookmarkSet, onToggleBookmark }) {
  const [search, setSearch] = useState(initialSearch || "");
  const [category, setCategory] = useState("All");
  const [savedOnly, setSavedOnly] = useState(false);

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearch(initialSearch);
      onSearchConsumed?.();
    }
  }, [initialSearch, onSearchConsumed]);

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
            {filtered.length ? filtered.map((entry) => <RecordCard entry={entry} bookmarked={bookmarkSet.has(entry.id)} onToggleBookmark={onToggleBookmark} key={entry.id} />) : (
              <div className="empty-state">
                <ArcaneSeal compact />
                <h3>No record answered the summons.</h3>
                <p>Try another term or reset the category filter.</p>
                <button className="button ghost" type="button" onClick={() => { setSearch(""); setCategory("All"); setSavedOnly(false); }}>Reset archive</button>
              </div>
            )}
          </div>
        </div>
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
          <p className="entry-original-title">{entry.original}</p>
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
            <span className="viewer-lock">GENERATED INDEX VISUAL · SOURCE IMAGE PENDING</span>
            {annotations && (
              <>
                <button className="annotation-point point-a" type="button"><i>1</i><span>Future source annotation</span></button>
                <button className="annotation-point point-b" type="button"><i>2</i><span>Linked symbol or diagram</span></button>
              </>
            )}
          </div>
          <div className="viewer-tools">
            <button type="button" onClick={() => setAnnotations((value) => !value)} className={annotations ? "active" : ""}>◎ Annotations</button>
            <button type="button" disabled>＋ Zoom after source import</button>
            <button type="button" disabled>▤ Original pages pending</button>
          </div>
        </div>

        <article className="entry-document">
          <div className="document-tabs">
            {["overview", "source", "related", "images"].map((item) => (
              <button className={tab === item ? "active" : ""} type="button" key={item} onClick={() => setTab(item)}>
                {item}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <div className="document-panel">
              <p className="kicker">CURRENT INDEX RECORD</p>
              <h2>{entry.title}</h2>
              <p className="document-lede">{entry.summary}</p>
              <MetadataGrid entry={entry} />
              <div className="source-warning">
                <strong>Source-locked content</strong>
                <p>The uploaded inventory confirms this source exists, but it does not expose the book's full text. The site will not invent spell instructions, historical claims, translations, or diagrams that have not been extracted from the actual file.</p>
              </div>
            </div>
          )}

          {tab === "source" && (
            <div className="document-panel">
              <p className="kicker">PROVENANCE</p>
              <h2>Original source record</h2>
              <div className="source-card">
                <span>FILE</span><strong>{entry.sourceFile}</strong>
                <span>ORIGINAL TITLE</span><strong>{entry.original}</strong>
                <span>LANGUAGE LAYER</span><strong>{entry.language}</strong>
                <span>IMPORT STATE</span><strong>{entry.status}</strong>
              </div>
              <p className="muted-copy">When the underlying document is extracted, this section will add page-level citations, edition notes, image provenance, OCR confidence, and translation review status.</p>
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
              <p className="kicker">VISUAL SOURCE LAYER</p>
              <h2>Images & diagrams</h2>
              <div className="image-lock-grid">
                {[1, 2, 3].map((number) => (
                  <div key={number}><img src={visualMap[entry.visual]} alt="" /><span>Original source image slot {number}</span></div>
                ))}
              </div>
              <p className="muted-copy">Generated artwork is being used only as interface art. Original manuscript pages, sigils, diagrams, tarot imagery, and symbols will replace these slots after extraction.</p>
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

function LearnView() {
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
          {learningChapters.map((item, index) => (
            <button className={active === index ? "active" : ""} type="button" key={item.number} onClick={() => setActive(index)}>
              <span>{item.number}</span>
              <div><strong>{item.title}</strong><small>{item.subtitle}</small></div>
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
          <button className="button gold" type="button" onClick={() => goTo("encyclopedia")}>Explore matching sources</button>
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
      <small>{entry.original}</small>
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
          <h1>Browse the sources themselves.</h1>
          <p>The Digital Library is the preservation layer: original titles, scans, diagrams, source metadata, English translations, and links back into the encyclopedia.</p>
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
                <p className="record-original">{selected.original}</p>
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
              <p>{selected.original}</p>
              <button type="button" onClick={() => setMode("shelf")}>← Back to shelf</button>
              <button type="button" onClick={() => goTo("entry", selected.id)}>Encyclopedia record ↗</button>
            </div>
            <div className="reader-book">
              <div className="reader-page original-page">
                <small>ORIGINAL SOURCE</small>
                <div className="source-page-placeholder">
                  <span>✦</span>
                  <strong>{selected.original}</strong>
                  <p>Original scan / document page will appear here after extraction.</p>
                </div>
              </div>
              <div className="reader-gutter" />
              <div className="reader-page translation-page">
                <small>ENGLISH TRANSLATION</small>
                <h2>{selected.title}</h2>
                <p>{selected.summary}</p>
                <div className="translation-lines" />
                <div className="reader-note"><strong>Source-locked:</strong> translation text has not been fabricated. This panel activates when the source is extracted and reviewed.</div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <Brand />
      <div><strong>Explore · Study · Understand Magic</strong><small>Inventory-grounded prototype · Original source imagery pending extraction</small></div>
      <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Return to top ↑</button>
    </footer>
  );
}

export default function ArcanumArchive() {
  const route = useRoute();
  const [motion, setMotion] = useState(true);
  const [pendingSearch, setPendingSearch] = useState("");
  const rootRef = useRef(null);
  const archiveMemory = useArchiveMemory();

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

  const performSearch = (term) => {
    setPendingSearch(term);
    goTo("encyclopedia");
  };

  return (
    <div className={motion ? "arcanum-app" : "arcanum-app reduced-motion"} ref={rootRef}>
      <ParticleField motion={motion} />
      <div className="grain-overlay" aria-hidden="true" />
      <div className="cursor-aura" aria-hidden="true" />
      <Header route={route} motion={motion} onToggleMotion={() => setMotion((value) => !value)} />

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
      {route.view === "learn" && <LearnView />}
      {route.view === "library" && <LibraryView />}

      <Footer />
    </div>
  );
}
