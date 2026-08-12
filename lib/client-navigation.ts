export function navigateTo(href: string) {
  window.location.assign(href);
}

export function refreshPage() {
  window.location.reload();
}

export function goBack(fallback = "/") {
  if (window.history.length > 1) window.history.back();
  else window.location.assign(fallback);
}
