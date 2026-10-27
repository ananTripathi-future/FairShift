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

## FairShift architecture

- Protect private screens under the managed authenticated layout and server functions with requireSupabaseAuth; site-scoped database functions enforce all mutations.
- Keep account roles separate from profiles and confidential report ownership separate from manager-visible reports; this prevents privilege and identity leaks.
- Use append-only database events for decisions, and private evidence storage with short-lived signed reads; do not persist workforce data in browser storage.
- Group worked minutes by IST calendar day and scope payroll by scheduled-start IST month; these keep attendance and earnings consistent.
- Keep reusable shift, pay and safety views in components/fairshift and validated commands in lib/workflows so both roles share domain rules.
- Enforce role capabilities in database commands and direct-read policies, mirrored by lib/permissions for screen controls; UI-only restrictions cannot protect records.
- Use fs_sites.manager_id for site ownership and escalation; retain legacy supervisor_id only for compatibility so roles can follow the three-level hierarchy.
