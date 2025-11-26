# Guidance for contributors

- Documentation in this repository should use Markdown with concise, sentence-case headings.
- When describing the user interface, prefer the Ukrainian wording already used in the app and add English context only when clarification is needed.
- Keep local setup instructions runnable with plain shell commands; the default way to preview the site is with a lightweight static server such as `python -m http.server`.
- Favor simple, dependency-light changes. The project is intentionally static (HTML, CSS, and vanilla JS); avoid adding build steps unless strictly necessary.
- Summaries of changes should group work under clear headings (Summary and Testing) and list terminal commands that were run.
