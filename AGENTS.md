<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Public match reads use a bounded, publishable-key server function and a route loader; this makes direct links render without relying on browser-only fetching.
- Keep SSR Query cache integration in the router with provider wrapping disabled, because the root already owns the QueryClientProvider.
