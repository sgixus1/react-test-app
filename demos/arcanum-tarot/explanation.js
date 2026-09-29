
(() => {
  "use strict";

  const suitExplanations = {
    Wands: "Wands emphasize motivation, creativity, ambition, courage, initiative, and the use of personal energy.",
    Cups: "Cups emphasize emotion, relationships, intuition, empathy, imagination, and inner response.",
    Swords: "Swords emphasize thought, truth, communication, decisions, conflict, boundaries, and mental pressure.",
    Pentacles: "Pentacles emphasize work, money, health, skills, stability, resources, the body, and tangible results."
  };

  const rankExplanations = {
    Ace: "An Ace introduces the seed, opening, or raw potential of its suit.",
    Two: "A Two introduces polarity, choice, balance, or the need to coordinate two forces.",
    Three: "A Three develops the suit through growth, expression, collaboration, or consequence.",
    Four: "A Four stabilizes the suit, creating structure, pause, protection, or containment.",
    Five: "A Five destabilizes the suit and introduces challenge, adjustment, loss, competition, or change.",
    Six: "A Six moves toward restoration, exchange, progress, recognition, or rebalancing.",
    Seven: "A Seven tests commitment, judgment, patience, belief, or strategy.",
    Eight: "An Eight intensifies movement, skill, restriction, discipline, or practical application.",
    Nine: "A Nine brings the suit close to completion and often emphasizes maturity, resilience, pressure, or consequence.",
    Ten: "A Ten completes or overloads the suit, showing culmination and what follows from accumulated energy.",
    Page: "A Page represents learning, curiosity, messages, discovery, and an early-stage expression of the suit.",
    Knight: "A Knight represents pursuit, movement, commitment, and active expression of the suit.",
    Queen: "A Queen represents mature internal command of the suit and how its qualities are embodied.",
    King: "A King represents mature external command, leadership, responsibility, and direction within the suit."
  };

  const domainRules = {
    general: {
      Cups: "feelings, relationships, and intuition are active",
      Wands: "energy, motivation, creativity, and initiative are active",
      Swords: "thought, communication, conflict, and decisions are active",
      Pentacles: "practical matters, resources, work, health, and stability are active",
      Major: "a broader archetypal life theme is active"
    },
    love: {
      Cups: "emotional connection, vulnerability, and mutual response are emphasized",
      Wands: "chemistry, attraction, initiative, and desire are emphasized",
      Swords: "communication, expectations, boundaries, and difficult truths are emphasized",
      Pentacles: "stability, reliability, shared resources, and practical commitment are emphasized",
      Major: "the relationship carries a larger archetypal lesson or turning point"
    },
    career: {
      Cups: "job satisfaction, team dynamics, and emotional investment matter",
      Wands: "initiative, ambition, visibility, leadership, and motivation matter",
      Swords: "strategy, communication, competition, decisions, and clarity matter",
      Pentacles: "skills, money, security, resources, and measurable results matter",
      Major: "the work situation connects to a broader developmental theme"
    },
    decision: {
      Cups: "emotional truth and relationship consequences should be included in the choice",
      Wands: "motivation, courage, timing, and willingness to act should be considered",
      Swords: "facts, clarity, communication, and consequences should be prioritized",
      Pentacles: "feasibility, resources, risk, and long-term value should be weighed",
      Major: "the choice may affect a broader chapter of life"
    }
  };

  const elementPairs = {
    "Fire|Air": "supportive: Air feeds Fire, increasing initiative and expression",
    "Air|Fire": "supportive: Air feeds Fire, increasing initiative and expression",
    "Water|Earth": "supportive: Earth gives Water form, favoring steady emotional growth",
    "Earth|Water": "supportive: Earth gives Water form, favoring steady emotional growth",
    "Fire|Water": "tension: action and emotion can pull in different directions",
    "Water|Fire": "tension: action and emotion can pull in different directions",
    "Air|Earth": "tension: ideas and practical limits need reconciliation",
    "Earth|Air": "tension: ideas and practical limits need reconciliation"
  };

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));

  function domainFor(spreadKey) {
    if (spreadKey === "love") return "love";
    if (spreadKey === "career") return "career";
    if (spreadKey === "decision") return "decision";
    return "general";
  }

  function spreadName(key) {
    return {
      one: "One Card",
      three: "Past · Present · Future",
      love: "Love / Relationship",
      career: "Career",
      decision: "Decision",
      celtic: "Celtic Cross"
    }[key] || key;
  }

  function cardStructure(card) {
    if (card.arcana === "Major") {
      return card.name + " is a Major Arcana card. Major Arcana cards usually carry broader archetypal themes, turning points, or lessons that can outweigh short-term details.";
    }
    return card.name + " is Minor Arcana. " + rankExplanations[card.rank] + " " + suitExplanations[card.suit];
  }

  function orientationExplanation(draw) {
    return draw.reversed
      ? "Because the card is reversed, its meaning is read as blocked, internalized, delayed, redirected, excessive, deficient, or otherwise complicated."
      : "Because the card is upright, its meaning is read in a more direct, outward, or readily expressed form.";
  }

  function neighborExplanation(draws, index) {
    const current = draws[index];
    const neighbors = [draws[index - 1], draws[index + 1]].filter(Boolean);
    const notes = [];

    neighbors.forEach((n) => {
      if (current.card.element === n.card.element) {
        notes.push("The shared " + current.card.element + " element with " + n.card.name + " reinforces this theme.");
      } else {
        const rel = elementPairs[current.card.element + "|" + n.card.element];
        if (rel) notes.push("With " + n.card.name + ", the elemental relationship is " + rel + ".");
      }

      if (current.card.suit !== "Major" && current.card.suit === n.card.suit) {
        notes.push("The repeated " + current.card.suit + " suit strengthens that suit's concerns.");
      }
    });

    return notes;
  }

  function overallExplanation(reading) {
    const draws = reading.draws;
    const spreadKey = reading.spreadKey;
    const domain = domainFor(spreadKey);
    const question = reading.question || "";
    const positions = window.ARCANUM_TAROT.spreads[spreadKey];

    const majors = draws.filter((d) => d.card.arcana === "Major").length;
    const reversed = draws.filter((d) => d.reversed).length;
    const elements = { Fire:0, Water:0, Air:0, Earth:0 };
    const suits = { Wands:0, Cups:0, Swords:0, Pentacles:0 };

    draws.forEach((d) => {
      elements[d.card.element]++;
      if (d.card.suit !== "Major") suits[d.card.suit]++;
    });

    const dominantElement = Object.entries(elements).sort((a,b) => b[1] - a[1])[0];
    const dominantSuit = Object.entries(suits).sort((a,b) => b[1] - a[1])[0];

    const parts = [];
    parts.push("This is a " + spreadName(spreadKey) + " reading" + (question ? " focused on “" + question + "”." : "."));

    parts.push(
      majors >= Math.ceil(draws.length / 2)
        ? "Major Arcana dominate, so larger life themes, transitions, or lessons carry more weight than everyday detail."
        : "Minor Arcana are prominent, so practical choices and day-to-day dynamics carry substantial weight."
    );

    if (reversed === 0) {
      parts.push("No reversed cards appeared, so the spread is comparatively direct and outward-facing.");
    } else if (reversed >= Math.ceil(draws.length / 2)) {
      parts.push("Reversed cards are prominent, so internal processing, delay, resistance, or redirected energy deserves special attention.");
    } else {
      parts.push("The mix of upright and reversed cards suggests both outward movement and internal adjustment.");
    }

    if (dominantElement[1] > 1) {
      parts.push(dominantElement[0] + " is the most repeated element (" + dominantElement[1] + " cards), reinforcing that elemental mode across the reading.");
    }

    if (dominantSuit[1] > 1) {
      parts.push(dominantSuit[0] + " is the dominant Minor Arcana suit (" + dominantSuit[1] + " cards). " + suitExplanations[dominantSuit[0]]);
    }

    if (draws.length > 1) {
      const first = draws[0];
      const last = draws[draws.length - 1];
      parts.push(
        "The narrative begins with " + first.card.name + (first.reversed ? " reversed" : "") +
        " in the " + positions[0][0] + " position and resolves toward " +
        last.card.name + (last.reversed ? " reversed" : "") +
        " in the " + positions[positions.length - 1][0] + " position."
      );
    } else {
      parts.push("Because this is a one-card reading, the interpretation is concentrated on " + draws[0].card.name + (draws[0].reversed ? " reversed" : "") + ".");
    }

    return parts.join(" ");
  }

  function enrichReading() {
    const reading = window.__currentTarotReading;
    const target = $("#explanation");
    if (!reading || !target) return;

    const spreads = window.ARCANUM_TAROT.spreads;
    const positions = spreads[reading.spreadKey];
    const domain = domainFor(reading.spreadKey);

    target.innerHTML =
      '<div class="reading-explanation">' +
        '<h3>Explanation of This Reading</h3>' +
        '<p>' + esc(overallExplanation(reading)) + '</p>' +
      '</div>';

    const entries = document.querySelectorAll("#reading .entry");
    entries.forEach((entry, index) => {
      if (entry.querySelector(".card-explanation")) return;

      const draw = reading.draws[index];
      if (!draw) return;

      const card = draw.card;
      const position = positions[index];
      const base = draw.reversed ? card.reversed : card.upright;
      const parts = [
        cardStructure(card),
        orientationExplanation(draw),
        "The " + position[0] + " position asks us to interpret the card specifically as: " + position[1],
        "For this question type, " + domainRules[domain][card.suit] + ".",
        ...neighborExplanation(reading.draws, index)
      ];

      const div = document.createElement("div");
      div.className = "card-explanation";
      div.innerHTML =
        "<strong>Why this card means that here:</strong><br>" +
        parts.map((x) => "• " + esc(x)).join("<br>") +
        '<div class="base-meaning">Base tarot meaning used: ' + esc(base) + "</div>";

      const meaning = entry.querySelector(".meaning");
      if (meaning) meaning.insertAdjacentElement("afterend", div);
      else entry.appendChild(div);
    });
  }

  const readingRoot = $("#reading");
  if (readingRoot) {
    const observer = new MutationObserver(() => setTimeout(enrichReading, 0));
    observer.observe(readingRoot, { childList:true, subtree:false });
  }

  window.addEventListener("load", () => setTimeout(enrichReading, 50));
})();
