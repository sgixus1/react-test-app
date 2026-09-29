window.ARCANUM_TAROT = (() => {
  const majorRows = [
    ["The Fool","Beginnings, freedom, trust, spontaneity","Recklessness, hesitation, poor judgment","Air","0"],
    ["The Magician","Will, skill, manifestation, resourcefulness","Manipulation, scattered energy, unused talent","Air","I"],
    ["The High Priestess","Intuition, mystery, inner knowing, silence","Blocked intuition, secrecy, disconnection","Water","II"],
    ["The Empress","Abundance, nurture, creativity, sensuality","Creative block, dependence, neglect","Earth","III"],
    ["The Emperor","Structure, authority, stability, boundaries","Rigidity, domination, loss of control","Fire","IV"],
    ["The Hierophant","Tradition, teaching, ritual, shared values","Rebellion, dogma, unconventional path","Earth","V"],
    ["The Lovers","Union, choice, values, alignment","Disharmony, imbalance, misaligned values","Air","VI"],
    ["The Chariot","Drive, victory, direction, self-control","Stalled progress, aggression, scattered will","Water","VII"],
    ["Strength","Courage, patience, compassion, inner strength","Self-doubt, raw emotion, insecurity","Fire","VIII"],
    ["The Hermit","Solitude, reflection, wisdom, guidance","Isolation, withdrawal, avoidance","Earth","IX"],
    ["Wheel of Fortune","Cycles, turning point, change, opportunity","Resistance to change, setbacks, repeating patterns","Fire","X"],
    ["Justice","Truth, balance, accountability, fair judgment","Bias, avoidance, unfairness, denial","Air","XI"],
    ["The Hanged Man","Pause, surrender, new perspective, release","Stalling, martyrdom, needless delay","Water","XII"],
    ["Death","Ending, transformation, transition, renewal","Resistance, stagnation, fear of change","Water","XIII"],
    ["Temperance","Balance, moderation, integration, healing","Excess, imbalance, friction, poor timing","Fire","XIV"],
    ["The Devil","Attachment, temptation, shadow, material bonds","Release, awareness, reclaiming power","Earth","XV"],
    ["The Tower","Sudden change, revelation, disruption, liberation","Avoided upheaval, fear of change, delayed collapse","Fire","XVI"],
    ["The Star","Hope, renewal, inspiration, calm faith","Discouragement, disconnection, lost confidence","Air","XVII"],
    ["The Moon","Uncertainty, dreams, intuition, hidden factors","Clarity emerging, fear exposed, confusion lifting","Water","XVIII"],
    ["The Sun","Vitality, success, joy, confidence","Temporary cloud, overexposure, delayed success","Fire","XIX"],
    ["Judgement","Awakening, reckoning, calling, renewal","Self-doubt, avoidance, refusal to learn","Fire","XX"],
    ["The World","Completion, integration, achievement, wholeness","Loose ends, delay, incomplete cycle","Earth","XXI"]
  ];

  const minors = {
    Wands: [
      ["Ace","Inspiration, new spark, initiative","Delay, low energy, false start"],
      ["Two","Planning, future vision, choice of direction","Fear of change, limited planning, indecision"],
      ["Three","Expansion, progress, foresight","Delays, obstacles, lack of foresight"],
      ["Four","Celebration, homecoming, stable foundation","Tension at home, instability, private celebration"],
      ["Five","Competition, conflict, testing ideas","Conflict avoidance, resolution, internal tension"],
      ["Six","Recognition, victory, public support","Ego, fall from favor, private win"],
      ["Seven","Defense, conviction, standing ground","Exhaustion, yielding, feeling overwhelmed"],
      ["Eight","Speed, movement, messages, momentum","Delay, confusion, miscommunication"],
      ["Nine","Resilience, boundaries, persistence","Fatigue, defensiveness, nearing burnout"],
      ["Ten","Burden, duty, responsibility, overload","Release, delegation, collapse under pressure"],
      ["Page","Curiosity, discovery, enthusiastic message","Restlessness, immature enthusiasm, bad news"],
      ["Knight","Adventure, action, bold pursuit","Impulsiveness, anger, scattered action"],
      ["Queen","Confidence, warmth, independence, attraction","Jealousy, insecurity, demanding energy"],
      ["King","Vision, leadership, entrepreneurship","Domination, rash leadership, unrealistic expectations"]
    ],
    Cups: [
      ["Ace","Emotional opening, love, compassion, intuition","Blocked feelings, emptiness, emotional overflow"],
      ["Two","Partnership, mutual attraction, agreement","Imbalance, separation, miscommunication"],
      ["Three","Friendship, celebration, community","Overindulgence, gossip, social tension"],
      ["Four","Contemplation, reevaluation, emotional pause","Renewed interest, awareness, emerging motivation"],
      ["Five","Loss, grief, disappointment, focus on absence","Acceptance, recovery, finding what remains"],
      ["Six","Nostalgia, innocence, reunion, memory","Living in the past, unrealistic nostalgia, moving on"],
      ["Seven","Choices, imagination, fantasy, many options","Clarity, decision, avoiding illusion"],
      ["Eight","Walking away, seeking deeper meaning","Fear of leaving, aimless drifting, returning"],
      ["Nine","Satisfaction, pleasure, wish fulfilled","Dissatisfaction, excess, shallow gratification"],
      ["Ten","Emotional fulfillment, family harmony, shared joy","Family strain, broken harmony, unrealistic ideal"],
      ["Page","Sensitive message, intuition, creative feeling","Emotional immaturity, insecurity, blocked intuition"],
      ["Knight","Romance, invitation, idealism, following the heart","Moodiness, unrealistic promises, disappointment"],
      ["Queen","Empathy, emotional depth, intuition, care","Emotional overwhelm, dependence, porous boundaries"],
      ["King","Emotional balance, diplomacy, compassion","Emotional control, manipulation, suppressed feeling"]
    ],
    Swords: [
      ["Ace","Clarity, truth, breakthrough, decisive thought","Confusion, misinformation, harsh judgment"],
      ["Two","Difficult choice, truce, guarded balance","Indecision breaking, information overload, avoidance"],
      ["Three","Heartbreak, sorrow, painful truth","Recovery, forgiveness, releasing pain"],
      ["Four","Rest, recovery, retreat, contemplation","Restlessness, burnout, forced pause"],
      ["Five","Conflict, hollow victory, tension","Reconciliation, making amends, lingering resentment"],
      ["Six","Transition, moving on, gradual recovery","Baggage, resistance, unfinished transition"],
      ["Seven","Strategy, stealth, independence, acting alone","Exposure, self-deception, changing strategy"],
      ["Eight","Restriction, fear, trapped perspective","Release, new options, reclaiming agency"],
      ["Nine","Anxiety, worry, sleeplessness, mental pressure","Relief, facing fear, persistent anxiety"],
      ["Ten","Painful ending, collapse, finality","Recovery, survival, resisting an ending"],
      ["Page","Alertness, curiosity, new idea, candid message","Gossip, defensiveness, scattered thinking"],
      ["Knight","Ambition, speed, direct action, argument","Recklessness, aggression, poor timing"],
      ["Queen","Independence, discernment, direct truth","Bitterness, harshness, isolation"],
      ["King","Reason, authority, strategy, ethics","Coldness, misuse of intellect, rigid judgment"]
    ],
    Pentacles: [
      ["Ace","Material opportunity, seed of prosperity, grounding","Missed opportunity, poor planning, instability"],
      ["Two","Adaptability, juggling priorities, resource management","Overload, disorganization, dropped priorities"],
      ["Three","Teamwork, craft, learning, building quality","Poor collaboration, low standards, lack of growth"],
      ["Four","Security, conservation, control, boundaries","Greed, fear of loss, releasing control"],
      ["Five","Hardship, exclusion, financial strain, insecurity","Recovery, assistance, gradual improvement"],
      ["Six","Giving, receiving, generosity, fair exchange","Debt, strings attached, unequal exchange"],
      ["Seven","Patience, assessment, long-term investment","Impatience, poor return, wasted effort"],
      ["Eight","Practice, skill, diligence, craftsmanship","Perfectionism, repetitive work, lack of focus"],
      ["Nine","Independence, comfort, earned reward, self-reliance","Overwork, dependence, superficial success"],
      ["Ten","Legacy, family wealth, long-term stability","Family conflict, unstable foundation, short-term focus"],
      ["Page","Study, practical opportunity, new skill","Procrastination, poor follow-through, impractical plan"],
      ["Knight","Reliability, routine, patience, steady work","Stagnation, boredom, stubbornness"],
      ["Queen","Practical care, security, generosity, resourcefulness","Self-neglect, possessiveness, work-home imbalance"],
      ["King","Prosperity, stewardship, discipline, dependable leadership","Materialism, stubbornness, misuse of resources"]
    ]
  };

  const elements = {Wands:"Fire",Cups:"Water",Swords:"Air",Pentacles:"Earth"};
  const deck = majorRows.map((r,i)=>({
    id:"M"+String(i).padStart(2,"0"),
    name:r[0], upright:r[1], reversed:r[2], element:r[3], rank:r[4],
    suit:"Major", arcana:"Major"
  }));

  Object.entries(minors).forEach(([suit, rows]) => rows.forEach(r => deck.push({
    id:suit[0]+"-"+r[0],
    name:r[0]+" of "+suit,
    upright:r[1], reversed:r[2],
    element:elements[suit], rank:r[0], suit, arcana:"Minor"
  })));

  const spreads = {
    one:[
      ["Message","What deserves your attention now?"]
    ],
    three:[
      ["Past","What established the present pattern?"],
      ["Present","What is active now?"],
      ["Future","What direction develops if the pattern continues?"]
    ],
    love:[
      ["You","Your energy and needs"],
      ["Other","The other person or relational counterpart"],
      ["Bond","What connects you"],
      ["Challenge","What complicates the connection"],
      ["Direction","A constructive direction for the relationship"]
    ],
    career:[
      ["Current Role","The energy around your work now"],
      ["Strength","What you can rely on"],
      ["Challenge","What needs management"],
      ["Opportunity","Where growth is available"],
      ["Next Step","A practical direction"]
    ],
    decision:[
      ["Situation","What defines the decision"],
      ["Path A","Energy around the first option"],
      ["Path B","Energy around the second option"],
      ["Hidden Factor","What is easy to overlook"],
      ["Guidance","What principle supports a sound choice"]
    ],
    celtic:[
      ["Present","Core situation"],
      ["Crossing","Immediate challenge or influence"],
      ["Foundation","Underlying cause"],
      ["Past","What is receding"],
      ["Possibility","Conscious aim or potential"],
      ["Near Future","Developing influence"],
      ["Self","Your stance"],
      ["Environment","External context"],
      ["Hopes / Fears","Emotional expectation"],
      ["Outcome","Likely direction if current dynamics continue"]
    ]
  };

  return {deck, spreads};
})();