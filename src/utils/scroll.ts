export function scrollAppMainToTop(behavior: ScrollBehavior = "smooth") {
  document.querySelector("main")?.scrollTo({ top: 0, behavior });
}
