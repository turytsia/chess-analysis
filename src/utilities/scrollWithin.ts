/*
 * Keeps an item visible by scrolling its list only. The native scrollIntoView
 * would also scroll the page whenever the list is off screen, which makes the
 * board jump away while stepping through moves on a phone. The list must be
 * the item's offset parent, so it needs a non-static position.
 */
export function scrollWithin(list: HTMLElement, item: HTMLElement): void {
  const top = item.offsetTop;
  const bottom = top + item.offsetHeight;
  if (top < list.scrollTop) {
    list.scrollTop = top;
  } else if (bottom > list.scrollTop + list.clientHeight) {
    list.scrollTop = bottom - list.clientHeight;
  }
}
