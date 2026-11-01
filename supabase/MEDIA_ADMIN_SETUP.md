# Website owner and media dashboard

1. Run `202611010007_media_admin_catalog.sql` in Supabase SQL Editor after 005 and 006.
2. Run `SET_OWNER_ACCOUNT.sql` to assign the confirmed existing username `jeffdavila01` as owner. It fails without changing anything if that username does not identify exactly one profile.
3. Sign out and sign in again (or reload). Open Dashboard in the left navigation, or `/admin`. Music & movies is a separate dashboard tab at `/admin/media`. Run migration 008 to enable the Users & activity overview.
4. Add music (audio upload or YouTube link) and movies (YouTube or direct video URL).
5. Members browse the catalog in their rooms. Queue adds a song for the member who chooses it. The room host starts the next singer. Watch starts the selected movie for that room. Room owners cannot add arbitrary sources.

The owner/admin permission is stored in `media_admins`, which has no client read or write grants. Registration and profile changes cannot grant this role. Additional administrators must be assigned through trusted Supabase SQL access. This dashboard does not expose role assignment.

Existing songs remain in the catalog. Existing room sources remain playable, but changing a source requires a catalog entry. A removed catalog entry is unavailable for future choices; an already loaded room source may continue playing. Movie files are not uploaded by this dashboard: use supported movie links. Audio uploads retain the existing 20 MB limit.

Verify using two accounts: the owner can open `/admin/media` and add/delete entries; a regular user cannot open the dashboard or insert/delete catalog records or upload audio directly. Both can choose catalog items inside a room they belong to. A non-member must not be able to call either selection RPC for that room.

Applying SQL is separate from Git/Vercel deployment. Deploy this frontend together with migration 007; older versions show upload controls that the database will now reject for non-admins.

## Users and activity overview

Run `202611010008_admin_dashboard.sql` after 007. `/admin` shows account counts, new accounts in 24 hours, users whose latest sign-in was within 24 hours, and catalog totals. Search users by username/name and switch between newest accounts and latest sign-ins. The dashboard refreshes every 30 seconds. Dates use Asia/Singapore (same time as the Philippines).

The admin-only RPC returns profile names, roles, account creation dates and latest sign-in dates. It does not expose emails, passwords, tokens, or auth metadata. Latest sign-in is neither online presence nor a complete event history. No service-role key belongs in the browser. Verify a normal account receives permission denied from `admin_dashboard`, even when calling the RPC directly.
