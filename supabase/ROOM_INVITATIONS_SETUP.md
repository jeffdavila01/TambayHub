# Room invitations setup

1. Open the Supabase project used by the app.
2. Open SQL Editor and run `migrations/202610310001_room_invitations.sql` once.
3. Test with two signed-in accounts that have an accepted friendship.
4. As a room owner/member, open the room and choose Invite friends. Search for the friend and choose Invite.
5. In the recipient account, open the notification bell and choose Join room. Decline leaves room membership unchanged.

The SQL creates an invitation inbox protected by RLS and two authenticated RPCs. It checks the sender's membership and accepted friendship on the server. Only the receiver can accept; acceptance creates their room membership atomically. No user is automatically added by the sender. The existing rooms, friendships, profiles, and room_members tables are used. Their existing policies are preserved.

Prerequisites: UUID IDs, profiles display_name/username fields, and a unique room_members(room_id,user_id) constraint, consistent with the app's existing room join flow.

The UI needs this migration applied before sending/receiving invitations. Deploy the frontend after applying the SQL. Live updates use Supabase Realtime; the inbox also refreshes on focus and every 30 seconds.
