/** Helpers for showing the reviews in src/content/reviews.yaml. */

/** "Katerina Partolina Schwartz, Perpper & Salt, 14th August 2024" */
export function caption(review: {
  by?: string | undefined;
  publication: string;
  date: string;
}): string {
  return [review.by, review.publication, review.date]
    .filter(Boolean)
    .join(", ");
}

/** The first review gets a row to itself, then two per row. */
export function reviewRows<T>(reviews: T[]): T[][] {
  const [first, ...rest] = reviews;
  const rows: T[][] = first === undefined ? [] : [[first]];
  for (let i = 0; i < rest.length; i += 2) rows.push(rest.slice(i, i + 2));
  return rows;
}
