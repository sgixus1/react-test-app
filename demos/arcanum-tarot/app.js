(() => {
  "use strict";

  const { deck, spreads } = window.ARCANUM_TAROT;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));

  const domainRules = {
    general:{
      Cups:"feelings, relationships, and intuition are active",
      Wands:"energy, motivation, and initiative are active",
      Swords:"thought, communication, conflict, or decisions are active",
      Pentacles:"resources, work, body, money, or practical stability are active",
      Major:"an archetypal life theme is active"
    },
    love:{
      Cups:"emotional connection and vulnerability are emphasized",
      Wands:"chemistry, desire, and initiative are emphasized",
      Swords:"communication, expectations, and boundaries are emphasized",
      Pentacles:"stability, trust, and practical commitment are emphasized",
      Major:"the relationship carries a larger developmental theme"
    },
    career:{
      Cups:"satisfaction, purpose, and team dynamics matter",
      Wands:"initiative, ambition, visibility, and leadership matter",
      Swords:"strategy, communication, competition, and decisions matter",
      Pentacles:"skills, money, reliability, and tangible results matter",
      Major:"the work situation connects to a larger developmental theme"
    },
    decision:{
      Cups:"include emotional truth and relationship impact in the choice",
      Wands:"consider motivation, appetite for risk, and willingness to act",
      Swords:"prioritize facts, clarity, communication, and consequences",
      Pentacles:"weigh resources, feasibility, security, and long-term value",
      Major:"the decision may shape a broader life chapter"
    }
  };

  const elementPairs = {
    "Fire|Air":"supportive — Air feeds Fire, increasing expression and initiative",
    "Air|Fire":"supportive — Air feeds Fire, increasing expression and initiative",
    "Water|Earth":"supportive — Earth gives Water form, favoring steady emotional growth",
    "Earth|Water":"supportive — Earth gives Water form, favoring steady emotional growth",
    "Fire|Water":"friction — drive and emotion may pull in different directions",
    "Water|Fire":"friction — drive and emotion may pull in different directions",
    "Air|Earth":"friction — ideas and practical limits need reconciliation",
    "Earth|Air":"friction — ideas and practical limits need reconciliation"
  };

  const majorSymbols = [
    "✧","✦","☾","❀","♜","⌂","♡","➳","♌","✺","⊙","⚖",
    "▽","✣","⚗","⛓","ϟ","★","☽","☀","♬","◎"
  ];
  const suitSymbols = {Wands:"✦",Cups:"◡",Swords:"†",Pentacles:"⬟"};
  const palettes = {
    Fire:["#571e16","#e2a14d"],
    Water:["#112c4c","#83c4d8"],
    Air:["#252f4b","#d7d9ee"],
    Earth:["#27371f","#b5ba70"]
  };

  function hashSeed(str){
    let h = 2166136261;
    for(let i=0;i<str.length;i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return h >>> 0;
  }

  function makeRng(seed){
    let a = hashSeed(seed);
    return () => {
      a += 0x6D2B79F5;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function fisherYates(items, rng){
    const a = [...items];
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(rng() * (i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }

  function domainFor(spreadKey){
    if(spreadKey==="love") return "love";
    if(spreadKey==="career") return "career";
    if(spreadKey==="decision") return "decision";
    return "general";
  }

  function symbolFor(card){
    if(card.arcana==="Major") return majorSymbols[Number(card.id.slice(1))] || "✦";
    return suitSymbols[card.suit] || "✦";
  }

  function sceneForMajor(card, color){
    const n = Number(card.id.slice(1));
    const variants = [
      '<path d="M28 210 Q100 145 172 210 L172 238 L28 238Z" fill="'+color+'" opacity=".11"/><circle cx="132" cy="132" r="24" fill="'+color+'" opacity=".17"/>',
      '<rect x="52" y="143" width="96" height="68" rx="7" fill="'+color+'" opacity=".12"/><path d="M100 109V225M63 166H137" stroke="'+color+'" opacity=".42"/>',
      '<path d="M55 214 Q100 96 145 214" fill="none" stroke="'+color+'" opacity=".4"/><circle cx="75" cy="123" r="17" fill="'+color+'" opacity=".12"/><circle cx="125" cy="123" r="17" fill="'+color+'" opacity=".12"/>',
      '<path d="M38 220 Q64 136 100 180 Q136 136 162 220Z" fill="'+color+'" opacity=".13"/><circle cx="100" cy="133" r="29" fill="'+color+'" opacity=".12"/>'
    ];
    return variants[n % variants.length];
  }

  function cardArt(card){
    const [dark, accent] = palettes[card.element] || palettes.Air;
    const sym = symbolFor(card);
    let body = "";

    if(card.arcana==="Major"){
      body = `
        <circle cx="100" cy="148" r="51" fill="none" stroke="${accent}" opacity=".30"/>
        <circle cx="100" cy="151" r="15" fill="${accent}" opacity=".76"/>
        <path d="M100 166 L73 226 L127 226Z" fill="${accent}" opacity=".36"/>
        ${sceneForMajor(card,accent)}
      `;
    } else {
      const numeric = parseInt(card.rank,10);
      if(Number.isFinite(numeric)){
        const count = Math.min(10,numeric);
        const coords = [
          [100,104],[65,132],[135,132],[100,157],[65,182],
          [135,182],[100,207],[65,226],[135,226],[100,242]
        ];
        for(let i=0;i<count;i++){
          const [x,y] = coords[i];
          body += '<text x="'+x+'" y="'+y+'" text-anchor="middle" font-size="26" fill="'+accent+'" opacity=".88">'+sym+'</text>';
        }
      } else {
        const crown = card.rank==="King" ? "♔" : card.rank==="Queen" ? "♕" : card.rank==="Knight" ? "♞" : "✧";
        body = `
          <circle cx="100" cy="156" r="45" fill="${accent}" opacity=".11"/>
          <path d="M100 112 L70 224 L130 224Z" fill="${accent}" opacity=".28"/>
          <text x="100" y="154" text-anchor="middle" font-size="44" fill="${accent}">${sym}</text>
          <text x="100" y="204" text-anchor="middle" font-size="24" fill="${accent}">${crown}</text>
        `;
      }
    }

    return `
      <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(card.name)}">
        <defs>
          <radialGradient id="g-${card.id}">
            <stop stop-color="${accent}" stop-opacity=".18"/>
            <stop offset="1" stop-color="${dark}" stop-opacity=".98"/>
          </radialGradient>
          <pattern id="stars-${card.id}" width="19" height="19" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r=".9" fill="${accent}" opacity=".18"/>
          </pattern>
        </defs>
        <rect width="200" height="300" rx="12" fill="${dark}"/>
        <rect x="7" y="7" width="186" height="286" rx="8" fill="url(#g-${card.id})" stroke="${accent}" stroke-width="1.3"/>
        <rect x="11" y="11" width="178" height="278" rx="6" fill="url(#stars-${card.id})"/>
        <text x="100" y="29" text-anchor="middle" font-size="10" fill="#f3e8cb" letter-spacing="1">${esc(card.rank)}</text>
        <text x="100" y="76" text-anchor="middle" font-size="45" fill="${accent}">${sym}</text>
        ${body}
        <path d="M31 247H169" stroke="${accent}" opacity=".55"/>
        <text x="100" y="269" text-anchor="middle" font-size="12" fill="#f7e8c5" font-family="Georgia">${esc(card.name)}</text>
        <text x="100" y="285" text-anchor="middle" font-size="8" fill="${accent}" opacity=".82">${card.element.toUpperCase()}</text>
      </svg>
    `;
  }

  function repeatedRankRules(draws, index){
    const card = draws[index].card;
    const same = draws.filter((d,i)=>i!==index && d.card.rank===card.rank && d.card.arcana===card.arcana);
    if(!same.length) return [];
    return ["Pattern repetition — the rank/archetype repeats elsewhere in the spread"];
  }

  function neighborRules(draws,index){
    const current = draws[index].card;
    const neighbors = [draws[index-1],draws[index+1]].filter(Boolean);
    const rules = [];

    neighbors.forEach(n => {
      const other = n.card;
      if(current.element===other.element){
        rules.push("Reinforcement with "+other.name+" — shared "+current.element+" element");
      } else {
        const relation = elementPairs[current.element+"|"+other.element];
        if(relation) rules.push(other.name+" — "+relation);
      }

      if(current.suit!=="Major" && current.suit===other.suit){
        rules.push("Suit reinforcement with "+other.name+" — repeated "+current.suit);
      }
    });

    return rules;
  }

  function interpretCard(draws,index,position,domain){
    const draw = draws[index];
    const card = draw.card;
    const orientation = draw.reversed ? "reversed" : "upright";
    const base = draw.reversed ? card.reversed : card.upright;
    const domainRule = domainRules[domain][card.suit];

    const rules = [
      "Base card rule — "+orientation+" meaning",
      "Spread position — "+position[0]+": "+position[1],
      "Domain modifier — "+domainRule,
      ...neighborRules(draws,index),
      ...repeatedRankRules(draws,index)
    ];

    const neighborText = rules
      .filter(r => r.startsWith("Reinforcement") || r.startsWith("Suit") || r.includes(" — supportive") || r.includes(" — friction"))
      .map(r => r.replace(/^.*? — /,""));

    let text = base + ". ";
    text += "In the "+position[0]+" position, apply this to "+position[1].toLowerCase()+". ";
    text += domainRule.charAt(0).toUpperCase()+domainRule.slice(1)+".";
    if(neighborText.length) text += " Nearby cards add "+neighborText.join("; ")+".";
    if(rules.some(r=>r.startsWith("Pattern repetition"))) text += " A repeated rank/archetype makes this theme more persistent across the reading.";

    return {text,rules};
  }

  function overallSummary(draws,domain){
    const majors = draws.filter(d=>d.card.arcana==="Major").length;
    const reversed = draws.filter(d=>d.reversed).length;
    const elements = {Fire:0,Water:0,Air:0,Earth:0};
    const suits = {Wands:0,Cups:0,Swords:0,Pentacles:0};
    const court = [];

    draws.forEach(d=>{
      elements[d.card.element]++;
      if(d.card.suit!=="Major") suits[d.card.suit]++;
      if(["Page","Knight","Queen","King"].includes(d.card.rank)) court.push(d.card.name);
    });

    const [dominantElement,elementCount] = Object.entries(elements).sort((a,b)=>b[1]-a[1])[0];
    const [dominantSuit,suitCount] = Object.entries(suits).sort((a,b)=>b[1]-a[1])[0];

    const parts = [];
    parts.push(
      majors >= Math.ceil(draws.length/2)
        ? "Major Arcana dominate, so broad life themes carry more weight than short-term details."
        : "Minor Arcana are prominent, so practical choices and day-to-day dynamics carry more weight."
    );

    parts.push(
      reversed===0
        ? "All cards are upright, emphasizing relatively direct outward expression."
        : reversed>=Math.ceil(draws.length/2)
        ? "Reversals are prominent, emphasizing internal processing, delays, resistance, or redirected energy."
        : "The mix of upright and reversed cards suggests both outward movement and internal adjustment."
    );

    if(elementCount>1) parts.push(dominantElement+" is the most repeated element, increasing its influence across the spread.");
    if(suitCount>1) parts.push(dominantSuit+" repeat, reinforcing "+domainRules[domain][dominantSuit]+".");
    if(court.length>1) parts.push("Multiple court cards suggest that roles, personalities, or styles of action are especially important.");

    return parts.join(" ");
  }

  function render(draws,spreadKey,seed,question){
    const positions = spreads[spreadKey];
    const domain = domainFor(spreadKey);
    const area = $("#spreadArea");

    area.innerHTML = draws.map((d,i)=>`
      <div class="slot">
        <div class="card" data-index="${i}" aria-label="Flip ${esc(d.card.name)}">
          <div class="card-inner">
            <div class="face card-back"></div>
            <div class="face card-front ${d.reversed?"reversed":""}">${cardArt(d.card)}</div>
          </div>
        </div>
        <div class="position">${esc(positions[i][0])}</div>
        <div class="focus">${esc(positions[i][1])}</div>
      </div>
    `).join("");

    area.querySelectorAll(".card").forEach(el=>{
      el.addEventListener("click",()=>el.classList.toggle("revealed"));
    });

    $("#summary").innerHTML = '<div class="summary">'+esc(overallSummary(draws,domain))+'</div>';

    $("#reading").innerHTML = draws.map((d,i)=>{
      const result = interpretCard(draws,i,positions[i],domain);
      return `
        <div class="entry">
          <h4>${i+1}. ${esc(positions[i][0])} — ${esc(d.card.name)} ${d.reversed?"↕":""}</h4>
          <div class="chips">
            <span class="chip">${d.card.arcana}</span>
            <span class="chip">${d.card.suit}</span>
            <span class="chip">${d.card.element}</span>
            <span class="chip">${d.reversed?"Reversed":"Upright"}</span>
          </div>
          <div class="meaning">${esc(result.text)}</div>
          <div class="why">${esc(result.rules.join(" · "))}</div>
        </div>
      `;
    }).join("");

    const trace = {
      seed,
      question: question || null,
      spread: spreadKey,
      domain,
      cards: draws.map((d,i)=>({
        position:positions[i][0],
        card:d.card.name,
        orientation:d.reversed?"reversed":"upright",
        arcana:d.card.arcana,
        suit:d.card.suit,
        element:d.card.element,
        rules:interpretCard(draws,i,positions[i],domain).rules
      }))
    };

    $("#trace").textContent = JSON.stringify(trace,null,2);
    $("#status").textContent = "Seed: "+seed+" · "+draws.length+" card"+(draws.length===1?"":"s")+" · "+domain+" logic";

    window.__currentTarotReading = {draws,spreadKey,seed,question:question||"",time:new Date().toISOString()};

    setTimeout(()=>{
      area.querySelectorAll(".card").forEach((card,i)=>{
        setTimeout(()=>card.classList.add("revealed"),i*120);
      });
    },120);
  }

  function createReading(spreadKey,seed,reversalRate){
    const positions = spreads[spreadKey];
    const rng = makeRng(seed);
    const shuffled = fisherYates(deck,rng);
    return shuffled.slice(0,positions.length).map(card=>({
      card,
      reversed:rng()<reversalRate
    }));
  }

  function saveHistory(reading){
    const list = JSON.parse(localStorage.getItem("arcanumTarotHistory")||"[]");
    list.unshift({
      spreadKey:reading.spreadKey,
      seed:reading.seed,
      question:reading.question,
      time:reading.time,
      cards:reading.draws.map(d=>({id:d.card.id,reversed:d.reversed}))
    });
    localStorage.setItem("arcanumTarotHistory",JSON.stringify(list.slice(0,8)));
    renderHistory();
  }

  function renderHistory(){
    const list = JSON.parse(localStorage.getItem("arcanumTarotHistory")||"[]");
    const root = $("#historyList");

    if(!list.length){
      root.innerHTML = '<div class="note">No readings saved yet.</div>';
      return;
    }

    root.innerHTML = list.map((r,i)=>`
      <button data-history="${i}">
        ${new Date(r.time).toLocaleString()} · ${esc(r.spreadKey)}
        ${r.question?" · "+esc(r.question.slice(0,24)):""}
      </button>
    `).join("");

    root.querySelectorAll("button").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const r = list[Number(btn.dataset.history)];
        const draws = r.cards.map(x=>({
          card:deck.find(c=>c.id===x.id),
          reversed:x.reversed
        }));
        $("#spread").value = r.spreadKey;
        $("#question").value = r.question || "";
        $("#seed").value = r.seed;
        render(draws,r.spreadKey,r.seed,r.question||"");
      });
    });
  }

  function drawNew(){
    const spreadKey = $("#spread").value;
    const question = $("#question").value.trim();
    const seed = $("#seed").value.trim() || (Date.now()+"-"+Math.random().toString(36).slice(2));
    const reversalRate = Number($("#reversalRate").value);

    $("#seed").value = seed;
    const draws = createReading(spreadKey,seed,reversalRate);
    render(draws,spreadKey,seed,question);
    saveHistory(window.__currentTarotReading);
  }

  function drawDaily(){
    const day = new Date().toISOString().slice(0,10);
    const key = "arcanumDaily-"+day;
    const seed = "ARCANUM-DAILY-"+day;
    let stored = localStorage.getItem(key);
    let draw;

    if(stored){
      const x = JSON.parse(stored);
      draw = {card:deck.find(c=>c.id===x.id),reversed:x.reversed};
    } else {
      const rng = makeRng(seed);
      const card = fisherYates(deck,rng)[0];
      draw = {card,reversed:rng()<0.25};
      localStorage.setItem(key,JSON.stringify({id:card.id,reversed:draw.reversed}));
    }

    $("#spread").value = "one";
    $("#seed").value = seed;
    render([draw],"one",seed,"Daily card");
    saveHistory(window.__currentTarotReading);
  }

  function runSelfTests(){
    const tests = [];
    const test = (name,fn)=>{
      try{ tests.push({name,pass:Boolean(fn())}); }
      catch(e){ tests.push({name,pass:false,error:e.message}); }
    };

    test("Full 78-card deck",()=>deck.length===78);
    test("All card IDs unique",()=>new Set(deck.map(c=>c.id)).size===78);
    test("All meanings populated",()=>deck.every(c=>c.upright && c.reversed));
    test("Seeded shuffle deterministic",()=>{
      const a=fisherYates(deck,makeRng("same-seed")).slice(0,10).map(c=>c.id).join(",");
      const b=fisherYates(deck,makeRng("same-seed")).slice(0,10).map(c=>c.id).join(",");
      return a===b;
    });
    test("Different seeds change order",()=>{
      const a=fisherYates(deck,makeRng("seed-a")).slice(0,8).map(c=>c.id).join(",");
      const b=fisherYates(deck,makeRng("seed-b")).slice(0,8).map(c=>c.id).join(",");
      return a!==b;
    });
    test("No duplicate cards in Celtic Cross",()=>{
      const r=createReading("celtic","duplicate-test",0.33);
      return new Set(r.map(x=>x.card.id)).size===10;
    });
    test("Spread sizes correct",()=>Object.entries(spreads).every(([k,p])=>createReading(k,"size-"+k,0).length===p.length));
    test("Reversal off means upright",()=>createReading("celtic","rev-off",0).every(x=>!x.reversed));
    test("Reversal 100% means reversed",()=>createReading("three","rev-all",1).every(x=>x.reversed));
    test("Rule engine emits trace",()=>{
      const r=createReading("three","rule-test",0.25);
      return interpretCard(r,1,spreads.three[1],"general").rules.length>=3;
    });

    const pass = tests.every(t=>t.pass);
    const badge = $("#testBadge");
    badge.textContent = pass ? "Engine self-checks: PASS" : "Engine self-checks: FAIL";
    badge.classList.add(pass?"pass":"fail");

    if(!pass) console.error("Tarot self-test failures",tests.filter(t=>!t.pass));
    else console.info("Arcanum Tarot self-tests",tests);

    return tests;
  }

  $("#drawButton").addEventListener("click",drawNew);
  $("#dailyButton").addEventListener("click",drawDaily);

  renderHistory();
  runSelfTests();

  const demoSeed = "ARCANUM-DEMO";
  $("#seed").value = demoSeed;
  render(createReading("three",demoSeed,0.25),"three",demoSeed,"Demo reading");
})();