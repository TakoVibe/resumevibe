// Saving a signed-out browser draft is an explicit new-document action. Never
// reuse a previous account's document metadata or replace it with the latest
// cloud document during the sign-in handoff.
export function guestDraftEditorUrl(href: string) {
    const url = new URL(href);
    for (const key of ['edit', 'view', 'ai', 'application', 'from']) url.searchParams.delete(key);
    url.searchParams.set('new', '1');
    url.hash = 'builder';
    return url.pathname + url.search + url.hash;
}
