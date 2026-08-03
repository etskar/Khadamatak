export type Country = {
  code: string;
  name: string;
  nameAr: string;
  cities: string[];
};

export const COUNTRIES: Country[] = [
  {
    code: "NL",
    name: "Netherlands",
    nameAr: "هولندا",
    cities: [
      "Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven", "Groningen",
      "Tilburg", "Almere", "Breda", "Nijmegen", "Haarlem", "Arnhem", "Enschede",
      "Amersfoort", "Zwolle", "Leiden", "Maastricht", "Dordrecht", "Delft",
      "Den Bosch", "Leeuwarden", "Venlo", "Ede", "Deventer", "Sittard", "Emmen",
      "Alkmaar", "Hilversum", "Hoorn", "Middelburg",
    ],
  },
  {
    code: "BE",
    name: "Belgium",
    nameAr: "بلجيكا",
    cities: [
      "Brussels", "Antwerp", "Ghent", "Charleroi", "Liège", "Bruges", "Namur",
      "Leuven", "Mons", "Mechelen", "Ostend", "Hasselt",
    ],
  },
  {
    code: "DE",
    name: "Germany",
    nameAr: "ألمانيا",
    cities: [
      "Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt", "Stuttgart",
      "Düsseldorf", "Dortmund", "Essen", "Leipzig", "Bremen", "Dresden",
      "Hanover", "Nuremberg", "Duisburg", "Bochum", "Wuppertal", "Bielefeld",
      "Bonn", "Münster",
    ],
  },
  {
    code: "FR",
    name: "France",
    nameAr: "فرنسا",
    cities: [
      "Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Montpellier",
      "Strasbourg", "Bordeaux", "Lille", "Rennes", "Reims", "Toulon", "Grenoble",
    ],
  },
  {
    code: "ES",
    name: "Spain",
    nameAr: "إسبانيا",
    cities: [
      "Madrid", "Barcelona", "Valencia", "Seville", "Zaragoza", "Málaga",
      "Murcia", "Palma", "Bilbao", "Alicante", "Córdoba", "Granada",
    ],
  },
  {
    code: "IT",
    name: "Italy",
    nameAr: "إيطاليا",
    cities: [
      "Rome", "Milan", "Naples", "Turin", "Palermo", "Genoa", "Bologna",
      "Florence", "Bari", "Catania", "Venice", "Verona", "Padua", "Trieste",
    ],
  },
  {
    code: "UK",
    name: "United Kingdom",
    nameAr: "المملكة المتحدة",
    cities: [
      "London", "Manchester", "Birmingham", "Leeds", "Glasgow", "Liverpool",
      "Sheffield", "Bristol", "Newcastle", "Nottingham", "Cardiff", "Belfast",
      "Edinburgh", "Brighton",
    ],
  },
  {
    code: "US",
    name: "United States",
    nameAr: "الولايات المتحدة",
    cities: [
      "New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia",
      "San Antonio", "San Diego", "Dallas", "San Jose", "Austin", "Seattle",
      "Miami", "Boston", "Denver", "Atlanta", "San Francisco", "Portland",
      "Las Vegas", "Washington DC",
    ],
  },
  {
    code: "MA",
    name: "Morocco",
    nameAr: "المغرب",
    cities: [
      "Casablanca", "Rabat", "Marrakesh", "Fes", "Tangier", "Agadir",
      "Meknes", "Oujda", "Kenitra", "Tetouan", "Safi", "El Jadida",
    ],
  },
  {
    code: "EG",
    name: "Egypt",
    nameAr: "مصر",
    cities: [
      "Cairo", "Alexandria", "Giza", "Shubra El Kheima", "Port Said", "Suez",
      "Luxor", "Mansoura", "El Mahalla", "Tanta", "Asyut", "Ismailia",
    ],
  },
  {
    code: "SA",
    name: "Saudi Arabia",
    nameAr: "السعودية",
    cities: [
      "Riyadh", "Jeddah", "Mecca", "Medina", "Dammam", "Khobar", "Tabuk",
      "Abha", "Taif", "Buraydah", "Jubail", "Yanbu",
    ],
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    nameAr: "الإمارات",
    cities: [
      "Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah",
      "Al Ain", "Umm Al Quwain",
    ],
  },
  {
    code: "QA",
    name: "Qatar",
    nameAr: "قطر",
    cities: ["Doha", "Al Rayyan", "Lusail", "Al Wakrah", "Al Khor"],
  },
  {
    code: "KW",
    name: "Kuwait",
    nameAr: "الكويت",
    cities: ["Kuwait City", "Hawalli", "Salmiya", "Fahaheel", "Jahra"],
  },
  {
    code: "TR",
    name: "Turkey",
    nameAr: "تركيا",
    cities: [
      "Istanbul", "Ankara", "Izmir", "Bursa", "Antalya", "Adana", "Gaziantep",
      "Konya", "Mersin", "Kayseri",
    ],
  },
  {
    code: "SE",
    name: "Sweden",
    nameAr: "السويد",
    cities: ["Stockholm", "Gothenburg", "Malmö", "Uppsala", "Västerås", "Örebro", "Linköping", "Helsingborg"],
  },
  {
    code: "DK",
    name: "Denmark",
    nameAr: "الدنمارك",
    cities: ["Copenhagen", "Aarhus", "Odense", "Aalborg", "Esbjerg", "Randers"],
  },
  {
    code: "NO",
    name: "Norway",
    nameAr: "النرويج",
    cities: ["Oslo", "Bergen", "Trondheim", "Stavanger", "Drammen", "Kristiansand"],
  },
  {
    code: "PL",
    name: "Poland",
    nameAr: "بولندا",
    cities: ["Warsaw", "Kraków", "Łódź", "Wrocław", "Poznań", "Gdańsk", "Szczecin", "Lublin", "Białystok"],
  },
  {
    code: "PT",
    name: "Portugal",
    nameAr: "البرتغال",
    cities: ["Lisbon", "Porto", "Braga", "Coimbra", "Faro", "Aveiro"],
  },
  {
    code: "GR",
    name: "Greece",
    nameAr: "اليونان",
    cities: ["Athens", "Thessaloniki", "Patras", "Piraeus", "Heraklion", "Larissa"],
  },
  {
    code: "IE",
    name: "Ireland",
    nameAr: "أيرلندا",
    cities: ["Dublin", "Cork", "Limerick", "Galway", "Waterford", "Drogheda"],
  },
  {
    code: "CH",
    name: "Switzerland",
    nameAr: "سويسرا",
    cities: ["Zurich", "Geneva", "Basel", "Bern", "Lausanne", "Lucerne", "Winterthur"],
  },
  {
    code: "AT",
    name: "Austria",
    nameAr: "النمسا",
    cities: ["Vienna", "Graz", "Linz", "Salzburg", "Innsbruck", "Klagenfurt"],
  },
];

export function getCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export function countryName(code: string, locale: "ar" | "nl" | "en" = "en"): string {
  const c = getCountry(code);
  if (!c) return code;
  if (locale === "ar") return c.nameAr;
  return c.name;
}
