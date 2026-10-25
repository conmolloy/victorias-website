/**
 * The gallery's cover cards: one per show (src/content/gallery.yaml →
 * productions), plus one each for the misc photos, the dance photos and the
 * stage combat certificates. A card's first photo is its cover; tapping it
 * opens all of the card's photos in the lightbox.
 */

/** the filter buttons above the cards, in order ("All" comes first) */
export const CATEGORIES = ["Theatre", "Dance", "Stage combat"] as const;
export type Category = (typeof CATEGORIES)[number];

/** "Stage combat" → "stage-combat": the filter's #address and data value */
export const categorySlug = (category: Category) =>
  category.toLowerCase().replace(/\s+/g, "-");

interface Photo {
  file: string;
  alt: string;
}

export interface Card {
  /** lightbox group: the card's photos are browsed together */
  key: string;
  title: string;
  company?: string | undefined;
  role?: string | undefined;
  category: Category;
  /** shown in the lightbox above each photo's description */
  caption: string;
  photos: Photo[];
}

interface GalleryData {
  productions: {
    title: string;
    company: string;
    role: string;
    category: Category;
    photos: Photo[];
  }[];
  misc: Photo[];
  dance: Photo[];
  certificates: { photos: Photo[] }[];
}

export function galleryCards(data: GalleryData): Card[] {
  const cards: Card[] = data.productions.map((show, i) => ({
    key: `show-${i}`,
    title: show.title,
    company: show.company,
    role: show.role,
    category: show.category,
    caption: `${show.title} – ${show.role}`,
    photos: show.photos,
  }));
  const extra: [string, string, Category, Photo[]][] = [
    ["misc", "More productions", "Theatre", data.misc],
    ["dance", "Dance", "Dance", data.dance],
    [
      "certificates",
      "Stage combat certificates",
      "Stage combat",
      data.certificates.flatMap((column) => column.photos),
    ],
  ];
  for (const [key, title, category, photos] of extra)
    if (photos.length)
      cards.push({ key, title, category, caption: title, photos });
  return cards;
}

/**
 * The mixed-size ("bento") layout: in every run of seven cards the first is
 * big (2×2) and the fifth wide (2×1); the grid fills the gaps.
 */
export function cardSize(index: number): "big" | "wide" | "normal" {
  const step = index % 7;
  return step === 0 ? "big" : step === 4 ? "wide" : "normal";
}
