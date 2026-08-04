/** Static suggestion lists for structured profile inputs (client-safe). */

export const LANGUAGE_SUGGESTIONS = [
  "العربية",
  "Nederlands",
  "English",
  "Français",
  "Deutsch",
  "Español",
  "Türkçe",
  "العربية المغربية",
  "Português",
  "Italiano",
  "Polski",
  "Svenska",
  "Dansk",
  "Norsk",
  "Ελληνικά",
  "中文",
  "日本語",
  "हिन्दी",
  "اردو",
  "русский",
];

export const EDUCATION_SUGGESTIONS = [
  "High school",
  "Secondary school",
  "Vocational / MBO",
  "Bachelor's degree (HBO)",
  "Master's degree (WO)",
  "PhD / Doctorate",
  "Professional certification",
  "Bootcamp",
  "Self-taught",
];

export const OCCUPATION_SUGGESTIONS = [
  "Software developer",
  "Designer",
  "Teacher",
  "Doctor",
  "Nurse",
  "Engineer",
  "Accountant",
  "Lawyer",
  "Consultant",
  "Sales",
  "Marketing",
  "Student",
  "Freelancer",
  "Business owner",
  "Electrician",
  "Plumber",
  "Cleaner",
  "Driver",
  "Chef",
  "Retired",
  "Unemployed",
];

export const HOBBY_SUGGESTIONS = [
  "Football", "Reading", "Cooking", "Traveling", "Photography",
  "Gaming", "Fitness", "Cycling", "Swimming", "Music", "Movies",
  "Art", "Gardening", "Fishing", "Volunteering", "Cars", "Fashion",
  "Coffee",
];

// ─── Localized translations (English key → { ar, nl }) ───

const AR_TRANSLATIONS: Record<string, string> = {
  // Occupations
  "Software developer": "مطور برمجيات", Designer: "مصمم", Teacher: "معلم",
  Doctor: "طبيب", Nurse: "ممرض", Engineer: "مهندس",
  Accountant: "محاسب", Lawyer: "محامي", Consultant: "مستشار",
  Sales: "مبيعات", Marketing: "تسويق", Student: "طالب",
  Freelancer: "مستقل", "Business owner": "صاحب عمل",
  Electrician: "كهربائي", Plumber: "سباك", Cleaner: "عامل نظافة",
  Driver: "سائق", Chef: "طاهي", Retired: "متقاعد",
  Unemployed: "عاطل عن العمل",
  // Education
  "High school": "ثانوية", "Secondary school": "مدرسة ثانوية",
  "Vocational / MBO": "تدريب مهني / MBO",
  "Bachelor's degree (HBO)": "بكالوريوس (HBO)",
  "Master's degree (WO)": "ماجستير (WO)",
  "PhD / Doctorate": "دكتوراه",
  "Professional certification": "شهادة مهنية",
  Bootcamp: "معسكر تدريبي", "Self-taught": "عصامي",
  // Hobbies
  Football: "كرة القدم", Reading: "القراءة", Cooking: "الطبخ",
  Traveling: "السفر", Photography: "التصوير", Gaming: "الألعاب",
  Fitness: "اللياقة", Cycling: "ركوب الدراجات", Swimming: "السباحة",
  Music: "الموسيقى", Movies: "الأفلام", Art: "الفن",
  Gardening: "البستنة", Fishing: "الصيد", Volunteering: "التطوع",
  Cars: "السيارات", Fashion: "الموضة", Coffee: "القهوة",
};

const NL_TRANSLATIONS: Record<string, string> = {
  "Software developer": "Softwareontwikkelaar", Designer: "Ontwerper",
  Teacher: "Docent", Doctor: "Arts", Nurse: "Verpleegkundige",
  Engineer: "Ingenieur", Accountant: "Accountant", Lawyer: "Advocaat",
  Consultant: "Consultant", Sales: "Verkoop", Marketing: "Marketing",
  Student: "Student", Freelancer: "Freelancer",
  "Business owner": "Ondernemer", Electrician: "Elektricien",
  Plumber: "Loodgieter", Cleaner: "Schoonmaker", Driver: "Chauffeur",
  Chef: "Chef-kok", Retired: "Gepensioneerd", Unemployed: "Werkloos",
  "High school": "Middelbare school", "Secondary school": "Voortgezet onderwijs",
  "Vocational / MBO": "Beroepsonderwijs / MBO",
  "Bachelor's degree (HBO)": "Bachelor (HBO)",
  "Master's degree (WO)": "Master (WO)", "PhD / Doctorate": "PhD / Doctoraat",
  "Professional certification": "Professionele certificering",
  Bootcamp: "Bootcamp", "Self-taught": "Autodidact",
  Football: "Voetbal", Reading: "Lezen", Cooking: "Koken",
  Traveling: "Reizen", Photography: "Fotografie", Gaming: "Gamen",
  Fitness: "Fitness", Cycling: "Fietsen", Swimming: "Zwemmen",
  Music: "Muziek", Movies: "Films", Art: "Kunst", Gardening: "Tuinieren",
  Fishing: "Vissen", Volunteering: "Vrijwilligerswerk", Cars: "Auto's",
  Fashion: "Mode", Coffee: "Koffie",
};

/** Returns the suggestions list translated to the given locale when available. */
export function getLocalizedList(list: string[], locale: "ar" | "nl" | string): string[] {
  if (locale === "ar") return list.map((v) => AR_TRANSLATIONS[v] ?? v);
  if (locale === "nl") return list.map((v) => NL_TRANSLATIONS[v] ?? v);
  return list;
}
