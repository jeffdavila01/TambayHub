# Website owner and media dashboard

1. Run `202611010007_media_admin_catalog.sql` in Supabase SQL Editor after 005 and 006.
2. Run `SET_OWNER_ACCOUNT.sql` to assign the confirmed existing username `jeffdavila01` as owner. It fails without changing anything if that username does not identify exactly one profile.
3. Sign out and sign in again (or reload). Open Settings > Open media dashboard, or `/admin/media`. The desktop sidebar also includes the link.
4. Add music (audio upload or YouTube link) and movies (YouTube or direct video URL).
5. Members browse the catalog in their rooms. Queue adds a song for the member who chooses it. The room host starts the next singer. Watch starts the selected movie for that room. Room owners cannot add arbitrary sources.

The owner/admin permission is stored in `media_admins`, which has no client read or write grants. Registration and profile changes cannot grant this role. Additional administrators must be assigned through trusted Supabase SQL access. This dashboard does not expose role assignment.

Existing songs remain in the catalog. Existing room sources remain playable, but changing a source requires a catalog entry. A removed catalog entry is unavailable for future choices; an already loaded room source may continue playing. Movie files are not uploaded by this dashboard: use supported movie links. Audio uploads retain the existing 20 MB limit.

Verify using two accounts: the owner can open `/admin/media` and add/delete entries; a regular user cannot open the dashboard or insert/delete catalog records or upload audio directly. Both can choose catalog items inside a room they belong to. A non-member must not be able to call either selection RPC for that room.

Applying SQL is separate from Git/Vercel deployment. Deploy this frontend together with migration 007; older versions show upload controls that the database will now reject for non-admins.
