// Ready-made answers for the common plant problems on the Troubleshoot tab.
// Tapping one of these shows the answer instantly with no AI. The names must
// match the SYMPTOMS list in PlantInfo.tsx exactly.

export type FixSection = { title: string; body: string };

function fix(
  causes: string[],
  how: string[],
  steps: string[],
  prevent: string[],
  worry: string[]
): FixSection[] {
  const list = (items: string[]) => items.map((x) => `- ${x}`).join("\n");
  return [
    { title: "Most Likely Causes", body: list(causes) },
    { title: "How to Tell Which One", body: list(how) },
    { title: "How to Fix It", body: list(steps) },
    { title: "Prevention", body: list(prevent) },
    { title: "When to Worry", body: list(worry) },
  ];
}

export const BUILT_IN_FIXES: Record<string, FixSection[]> = {
  "Yellow leaves": fix(
    [
      "Overwatering (the most common cause): soil stays wet and lower leaves turn yellow and soft.",
      "Underwatering: leaves turn yellow and crispy after the soil is bone dry.",
      "Too little light: pale yellow leaves and slow growth.",
      "Normal aging: an old lower leaf now and then.",
      "Hungry soil: overall pale leaves if it has not been fed in many months.",
    ],
    [
      "Push a finger 2 inches into the soil. Wet and cool means too much water; dry and dusty means too little.",
      "Soft yellow leaves point to water; crispy yellow leaves point to dryness.",
      "Lift the pot: a very light pot is dry, a heavy one is soaked.",
    ],
    [
      "Too wet: stop watering until the top 1 to 2 inches are dry, and empty any water sitting in the saucer.",
      "Too dry: water slowly until it drains from the bottom.",
      "Dim spot: move it closer to a bright window, out of harsh midday sun.",
      "Pick off leaves that are fully yellow.",
    ],
    [
      "Check the soil before watering instead of watering on a fixed day.",
      "Use pots with drainage holes.",
      "Feed lightly in spring and summer.",
    ],
    [
      "Many leaves yellowing fast, a mushy stem base, or a sour smell can mean root rot. Act quickly.",
      "A single old leaf is normal.",
    ]
  ),

  "Brown tips or edges": fix(
    [
      "Dry air.",
      "Soil that dries out completely between waterings, or uneven watering.",
      "Mineral or salt buildup from tap water or fertilizer.",
      "Sunburn from hot direct sun.",
    ],
    [
      "A white crust on the soil or pot rim means salt buildup.",
      "Brown patches only on the sun-facing side mean sunburn.",
      "Crispy tips on every leaf usually mean dry air or uneven watering.",
    ],
    [
      "Trim the brown parts with clean scissors, following the leaf's natural shape.",
      "Water thoroughly until it drains, then let it drain fully. Flush the soil this way every few months.",
      "Sensitive plants such as spider plants, calatheas, and peace lilies often do better with filtered or rainwater.",
      "Move out of hot direct sun, and away from heaters and vents.",
      "Cut back fertilizer by half.",
    ],
    [
      "Keep watering steady.",
      "Group humidity-loving plants together or use a humidifier.",
    ],
    [
      "Brown spots with yellow rings, or browning that spreads fast across the whole plant, may be something else. Check Spots on leaves.",
    ]
  ),

  "Drooping or wilting": fix(
    [
      "Thirsty: the soil is dry.",
      "Overwatered: wet soil and damaged roots can't take up water, so it looks the same as thirsty.",
      "Heat, a draft, or a recent move or repotting.",
      "Roots that have filled the pot.",
    ],
    [
      "Dry soil and a light pot mean thirsty. Wet soil means too much water.",
      "Drooping only in the hot afternoon, then recovering by evening, means heat stress.",
      "Roots coming out of the drainage holes mean it has outgrown the pot.",
    ],
    [
      "Dry: water thoroughly. Most plants perk up within a day.",
      "Wet: stop watering, empty the saucer, and check the roots. Healthy roots are firm and pale.",
      "Move it away from vents, heaters, and cold drafts, and shade it from harsh sun.",
      "Crowded roots: repot into a pot one size bigger.",
    ],
    [
      "Check the soil regularly.",
      "Keep the plant in a steady spot.",
    ],
    [
      "No improvement after 2 days of correct care.",
      "Mushy stems or black, smelly roots.",
    ]
  ),

  "Leggy or stretching": fix(
    [
      "Not enough light (the most common cause).",
      "Too warm for the amount of light it gets.",
      "Some plants are naturally vining and sprawl as they grow.",
    ],
    [
      "Long gaps between leaves, leaning toward the window, and small pale new leaves all point to low light.",
    ],
    [
      "Move it to a brighter spot gradually, since a sudden jump to strong sun can burn leaves.",
      "Turn the pot a quarter turn each week so it grows evenly.",
      "Trim stretched stems just above a leaf to encourage bushier growth. For herbs, pinch off the tips.",
      "In a dim home, add a grow light on a timer for roughly 12 hours a day.",
    ],
    [
      "Pick a spot that matches the plant's light needs.",
      "Pinch or trim regularly while it is growing.",
    ],
    [
      "Stretched succulents don't go back to a compact shape. Cut off the top and replant it, and give the original plant more light.",
    ]
  ),

  "Spots on leaves": fix(
    [
      "Leaf spot disease: brown or black spots, often with a yellow ring, from water sitting on leaves and stuffy air.",
      "Sunburn: pale, bleached, or tan patches on the sun-facing side.",
      "Pests such as spider mites: tiny pale dots across the leaf.",
      "Cold damage from a draft or cold window.",
    ],
    [
      "Look under the leaves for tiny bugs or fine webbing.",
      "A yellow ring around a dark spot suggests infection.",
      "A flat bleached patch only on the sunny side means sunburn.",
    ],
    [
      "Remove badly spotted leaves with clean scissors.",
      "Water the soil, not the leaves.",
      "Give plants more space and airflow.",
      "Move it out of harsh sun or away from cold glass.",
      "Isolate it if the spots are spreading, and see Bugs or pests if you find insects.",
    ],
    [
      "Water in the morning at soil level.",
      "Don't crowd plants together.",
      "Clean your scissors between plants.",
    ],
    [
      "Spots that spread fast, merge together, or show up on new growth.",
      "Soft or mushy parts. Isolate the plant and ask a local garden center about treatment.",
    ]
  ),

  "Bugs or pests": fix(
    [
      "Fungus gnats: tiny flies around the soil, caused by constantly wet soil.",
      "Spider mites: fine webbing and tiny pale dots on leaves, common in dry air.",
      "Mealybugs: white cottony fluff in leaf joints.",
      "Aphids: clusters on new growth and sticky leaves.",
      "Scale: small brown bumps on stems and leaves.",
    ],
    [
      "Check the undersides of leaves and the spots where leaves meet stems.",
      "Sticky leaves usually mean aphids, scale, or mealybugs.",
      "Tiny flies rising when you water mean fungus gnats.",
    ],
    [
      "Move the plant away from your other plants right away.",
      "Rinse it off in the sink or shower, then wipe leaves clean.",
      "Mealybugs and scale: dab with a cotton swab dipped in rubbing alcohol.",
      "Spray insecticidal soap or neem oil on all leaf surfaces, top and bottom, once a week for 3 to 4 weeks. Check the label is safe for your plant and your pets.",
      "Gnats: let the soil dry out more between waterings and use yellow sticky traps.",
    ],
    [
      "Inspect new plants and keep them apart from the rest for about 2 weeks.",
      "Avoid keeping soil constantly wet.",
    ],
    [
      "Pests keep coming back after a month of treatment.",
      "A heavy infestation. It may be best to cut the plant back hard or let it go.",
    ]
  ),

  "Not growing": fix(
    [
      "Winter rest: many plants slow down or stop in fall and winter. This is normal.",
      "Not enough light.",
      "Roots that have filled the pot.",
      "Tired soil with no nutrients left.",
      "Root damage from too much water.",
    ],
    [
      "Check the season first. Slow growth in winter is expected.",
      "Roots poking out of the holes, or soil that dries within a day, mean it is crowded.",
    ],
    [
      "Wait for spring if it is winter.",
      "Move it to a brighter spot.",
      "In spring, repot into a pot 1 to 2 inches wider with fresh soil.",
      "Feed lightly during the growing season only.",
    ],
    [
      "Repot every year or two for fast growers.",
      "Match the light to the plant.",
    ],
    [
      "No growth plus yellowing, mushy stems, or dropping leaves during the growing season. Check the roots.",
    ]
  ),

  "Leaves dropping": fix(
    [
      "A sudden change: moving, repotting, or a draft. Common in ficus and fiddle leaf figs.",
      "Too much or too little water.",
      "Low light, especially in winter.",
      "Big temperature swings.",
      "Normal seasonal shedding of a few old leaves.",
    ],
    [
      "Ask what changed in the last 2 to 3 weeks.",
      "Yellow leaves point to water, green leaves point to stress or a draft, and crispy brown leaves point to dryness.",
      "Do the finger test on the soil.",
    ],
    [
      "Keep the plant in one spot and avoid moving it.",
      "Keep it away from vents, doors, and heaters.",
      "Correct the watering.",
      "Give it a few weeks to adjust before judging.",
    ],
    [
      "Make changes slowly.",
      "Keep temperature and light steady.",
    ],
    [
      "More than a third of the leaves falling in a short time.",
      "Bare stems that are shriveled or soft. Scratch one gently: green underneath means it is still alive.",
    ]
  ),

  "Mold or white fuzz": fix(
    [
      "Harmless mold on the soil surface, a sign that it is too wet with little airflow.",
      "Mineral crust: hard white buildup on the soil or pot rim, not fuzzy.",
      "Powdery mildew: white powder on the leaves.",
      "Mealybugs: cottony clumps in the leaf joints, not on the soil.",
    ],
    [
      "Fuzzy and on the soil means mold.",
      "A hard crust means minerals or salts.",
      "A powder that wipes off the leaf means powdery mildew.",
      "Cottony clumps on the plant mean mealybugs. See Bugs or pests.",
    ],
    [
      "Mold: scrape off the top inch of soil, replace it with fresh mix, and let the soil dry out more between waterings.",
      "Minerals: water thoroughly until it drains to flush them out.",
      "Mildew: remove affected leaves, improve airflow, and use a fungicide or neem oil labeled for powdery mildew.",
      "Keep the plant in brighter light with a bit of airflow.",
    ],
    [
      "Use a well-draining mix and never leave water in the saucer.",
      "Space plants so air can move between them.",
    ],
    [
      "Mold that keeps returning with a sour smell, or a soft stem base, can mean root rot.",
      "Mildew spreading to new growth.",
    ]
  ),
};
