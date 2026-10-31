// Built-in plant knowledge: category and a typical indoor watering interval
// for common houseplants, herbs and garden plants. Checked BEFORE any AI call,
// so well-known plants never need the AI at all.
//
// To add a plant: add one line to ENTRIES as [names, category, days].
// Names are lowercase; the longest matching name wins, so "boston fern"
// beats "fern" and "christmas cactus" beats "cactus".

export type BuiltInCategory =
  | "flowering"
  | "foliage"
  | "succulent"
  | "fern"
  | "palm"
  | "herb"
  | "trailing"
  | "cactus"
  | "bulb"
  | "tropical";

export type BuiltInProfile = {
  category: BuiltInCategory;
  wateringIntervalDays: number;
};

type Entry = [names: string[], category: BuiltInCategory, days: number];

const ENTRIES: Entry[] = [
  // Foliage
  [["snake plant", "sansevieria", "mother-in-law's tongue", "mother in law's tongue"], "foliage", 14],
  [["zz plant", "zamioculcas", "zanzibar gem"], "foliage", 14],
  [["rubber plant", "ficus elastica", "rubber tree"], "foliage", 9],
  [["fiddle leaf fig", "ficus lyrata"], "foliage", 7],
  [["weeping fig", "ficus benjamina", "ficus"], "foliage", 7],
  [["chinese evergreen", "aglaonema"], "foliage", 8],
  [["dieffenbachia", "dumb cane"], "foliage", 7],
  [["dracaena", "corn plant", "dragon tree", "lucky bamboo"], "foliage", 10],
  [["cast iron plant", "aspidistra"], "foliage", 10],
  [["peperomia", "radiator plant", "watermelon peperomia"], "foliage", 10],
  [["pilea", "chinese money plant", "friendship plant"], "foliage", 8],
  [["croton"], "foliage", 6],
  [["schefflera", "umbrella plant", "umbrella tree"], "foliage", 8],
  [["yucca"], "foliage", 14],
  [["money tree", "pachira"], "foliage", 10],
  [["polka dot plant", "hypoestes"], "foliage", 4],
  [["coleus"], "foliage", 4],
  [["nerve plant", "fittonia"], "foliage", 4],
  [["jade pothos"], "trailing", 7],
  [["parlor ivy"], "trailing", 7],
  [["rex begonia"], "foliage", 6],
  [["ti plant", "cordyline"], "foliage", 7],
  [["caladium"], "foliage", 5],
  [["calathea", "prayer plant", "maranta", "rattlesnake plant"], "foliage", 5],
  [["pothos tree"], "foliage", 7],
  [["norfolk island pine"], "foliage", 7],
  [["rosemary topiary"], "herb", 7],

  // Trailing and vining
  [["pothos", "epipremnum", "devil's ivy", "devils ivy"], "trailing", 7],
  [["philodendron", "heartleaf philodendron"], "trailing", 7],
  [["spider plant", "chlorophytum"], "trailing", 7],
  [["english ivy", "hedera", "ivy"], "trailing", 7],
  [["string of hearts", "ceropegia", "rosary vine"], "trailing", 12],
  [["hoya", "wax plant"], "trailing", 12],
  [["tradescantia", "wandering jew", "inch plant", "wandering dude"], "trailing", 7],
  [["swedish ivy", "plectranthus"], "trailing", 7],
  [["creeping fig"], "trailing", 5],
  [["string of bananas", "string of dolphins"], "trailing", 14],
  [["lipstick plant", "aeschynanthus"], "trailing", 8],
  [["grape ivy"], "trailing", 7],

  // Tropical
  [["monstera", "swiss cheese plant"], "tropical", 7],
  [["split leaf philodendron", "philodendron selloum", "philodendron birkin", "philodendron brasil", "philodendron pink princess"], "tropical", 7],
  [["bird of paradise", "strelitzia"], "tropical", 7],
  [["banana plant", "banana tree"], "tropical", 4],
  [["alocasia", "elephant ear", "colocasia"], "tropical", 5],
  [["bromeliad", "guzmania", "aechmea"], "tropical", 7],
  [["air plant", "tillandsia"], "tropical", 7],
  [["ginger plant"], "tropical", 4],
  [["heliconia"], "tropical", 4],
  [["pineapple plant"], "tropical", 7],
  [["bird's nest anthurium"], "tropical", 7],
  [["taro"], "tropical", 3],

  // Succulents
  [["aloe", "aloe vera"], "succulent", 14],
  [["jade plant", "jade", "crassula"], "succulent", 14],
  [["echeveria"], "succulent", 14],
  [["haworthia", "zebra plant"], "succulent", 14],
  [["sedum", "stonecrop"], "succulent", 14],
  [["kalanchoe", "flaming katy", "mother of thousands"], "succulent", 14],
  [["hens and chicks", "sempervivum"], "succulent", 14],
  [["string of pearls", "string of turtles"], "succulent", 14],
  [["burro's tail", "burros tail", "donkey tail"], "succulent", 14],
  [["crown of thorns", "euphorbia"], "succulent", 14],
  [["panda plant"], "succulent", 14],
  [["agave"], "succulent", 21],
  [["gasteria", "ox tongue"], "succulent", 14],
  [["desert rose", "adenium"], "succulent", 14],
  [["lithops", "living stones"], "succulent", 21],
  [["pencil cactus"], "succulent", 14],
  [["succulent"], "succulent", 14],

  // Cacti
  [["cactus", "cacti", "prickly pear", "opuntia", "barrel cactus", "golden barrel", "moon cactus", "bunny ears", "san pedro", "saguaro", "peyote"], "cactus", 21],
  [["christmas cactus", "holiday cactus", "thanksgiving cactus", "schlumbergera", "easter cactus"], "cactus", 10],
  [["orchid cactus"], "cactus", 10],

  // Ferns
  [["fern"], "fern", 4],
  [["boston fern", "nephrolepis", "sword fern"], "fern", 3],
  [["maidenhair", "maidenhair fern"], "fern", 3],
  [["bird's nest fern", "asplenium"], "fern", 5],
  [["staghorn fern", "platycerium"], "fern", 7],
  [["button fern"], "fern", 5],
  [["rabbit's foot fern", "rabbits foot fern"], "fern", 5],
  [["asparagus fern"], "fern", 4],
  [["kimberly queen fern"], "fern", 4],
  [["holly fern"], "fern", 5],
  [["blue star fern"], "fern", 5],

  // Palms
  [["palm"], "palm", 7],
  [["areca palm", "butterfly palm"], "palm", 5],
  [["parlor palm", "neanthe bella"], "palm", 7],
  [["kentia palm"], "palm", 10],
  [["majesty palm"], "palm", 5],
  [["bamboo palm"], "palm", 7],
  [["sago palm"], "palm", 14],
  [["ponytail palm"], "palm", 21],
  [["lady palm", "rhapis"], "palm", 7],
  [["fishtail palm"], "palm", 7],
  [["cat palm"], "palm", 5],

  // Herbs
  [["basil"], "herb", 2],
  [["mint", "peppermint", "spearmint"], "herb", 3],
  [["cilantro", "coriander"], "herb", 3],
  [["parsley"], "herb", 3],
  [["chives", "chive"], "herb", 3],
  [["oregano", "marjoram"], "herb", 5],
  [["thyme"], "herb", 7],
  [["rosemary"], "herb", 7],
  [["lavender"], "herb", 7],
  [["sage"], "herb", 5],
  [["dill", "fennel"], "herb", 3],
  [["lemon balm"], "herb", 3],
  [["tarragon"], "herb", 5],
  [["bay laurel", "bay leaf", "bay tree"], "herb", 7],
  [["lemongrass"], "herb", 3],
  [["catnip", "catmint"], "herb", 4],
  [["chamomile"], "herb", 4],
  [["stevia"], "herb", 3],

  // Flowering
  [["orchid", "phalaenopsis", "moth orchid"], "flowering", 7],
  [["african violet", "saintpaulia"], "flowering", 7],
  [["peace lily", "spathiphyllum"], "flowering", 5],
  [["anthurium", "flamingo flower"], "flowering", 7],
  [["begonia"], "flowering", 6],
  [["geranium", "pelargonium"], "flowering", 7],
  [["hibiscus"], "flowering", 4],
  [["gardenia"], "flowering", 5],
  [["jasmine"], "flowering", 5],
  [["cyclamen"], "flowering", 5],
  [["poinsettia"], "flowering", 7],
  [["rose", "miniature rose"], "flowering", 3],
  [["bougainvillea"], "flowering", 5],
  [["fuchsia"], "flowering", 4],
  [["impatiens"], "flowering", 3],
  [["petunia"], "flowering", 2],
  [["marigold"], "flowering", 3],
  [["zinnia"], "flowering", 4],
  [["sunflower"], "flowering", 3],
  [["chrysanthemum", "mum"], "flowering", 3],
  [["hydrangea"], "flowering", 3],
  [["camellia"], "flowering", 7],
  [["azalea"], "flowering", 5],
  [["lantana"], "flowering", 4],
  [["gerbera", "gerbera daisy"], "flowering", 4],
  [["daisy"], "flowering", 4],
  [["pansy", "viola"], "flowering", 3],
  [["streptocarpus", "cape primrose"], "flowering", 7],
  [["bleeding heart"], "flowering", 4],
  [["lavender plant"], "flowering", 7],
  [["clivia"], "flowering", 10],
  [["oxalis", "shamrock plant"], "bulb", 7],

  // Bulbs
  [["amaryllis", "hippeastrum"], "bulb", 7],
  [["tulip"], "bulb", 5],
  [["hyacinth"], "bulb", 4],
  [["daffodil", "narcissus", "paperwhite", "paperwhites"], "bulb", 4],
  [["lily", "lilies"], "bulb", 5],
  [["crocus"], "bulb", 4],
  [["freesia"], "bulb", 4],
  [["iris"], "bulb", 5],
  [["dahlia"], "bulb", 4],
  [["gladiolus"], "bulb", 4],
];

function normalize(text: string): string {
  return (
    " " +
    text
      .toLowerCase()
      .replace(/['\u2019]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim() +
    " "
  );
}

type Candidate = { key: string; category: BuiltInCategory; days: number };

const CANDIDATES: Candidate[] = ENTRIES.flatMap(([names, category, days]) =>
  names.map((name) => ({ key: normalize(name), category, days }))
);

// Returns the best built-in match for a plant name, or null if Eden doesn't
// know it (in which case the caller falls back to the cache, then the AI).
export function lookupBuiltInProfile(name: string): BuiltInProfile | null {
  const n = normalize(name);
  let best: Candidate | null = null;

  for (const c of CANDIDATES) {
    const base = c.key.trim();
    const hit =
      n.includes(c.key) ||
      n.includes(` ${base}s `) ||
      n.includes(` ${base}es `);

    if (hit && (!best || c.key.length > best.key.length)) best = c;
  }

  return best
    ? { category: best.category, wateringIntervalDays: best.days }
    : null;
}
