/** Pagination window around current page (used across admin list views). */
export function getPaginationPages(currentPage, totalPages) {
  const delta = 2;
  const pages = new Set([1, totalPages]);
  for (let i = currentPage - delta; i <= currentPage + delta; i++) {
    if (i >= 1 && i <= totalPages) pages.add(i);
  }
  return Array.from(pages).sort((a, b) => a - b);
}
