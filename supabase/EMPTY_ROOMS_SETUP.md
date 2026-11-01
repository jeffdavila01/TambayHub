# Empty room lifecycle

Run `202611010010_empty_rooms.sql` after 009, then reload the app. Do not re-run older admission migrations after this one.

- Create room immediately enters the creator into that room.
- The final attendee using Leave Room closes the room immediately. A second tab for the same person still counts as attendance.
- Room closure is terminal: it disappears from directories and invite lookups, cannot be entered again, stops shared playback, and clears the host. Users/accounts, shared music and movies are untouched. Room records are retained as closed records rather than physically deleted.
- Navigating away uses a 10-second empty-room grace before cleanup, preventing development remounts and brief reconnects from immediately ending the room.
- A disconnected tab uses the 90-second seat lease, followed by a short cleanup grace. Directories reconcile empty rooms before listing and every 30 seconds; new admissions also reconcile. No cron is required, but with nobody using the app there is no background sweep; the next directory visit/admission reconciles before showing rooms.
- A room that was never entered receives five minutes for its creator to connect, then becomes eligible for cleanup. Existing empty rooms are subject to the same rules after migration.
- Room admission, host transfer, closure and cleanup lock the same room row to prevent cleanup from closing a room during a concurrent admission. Direct client writes cannot clear closed_at or forge attendance lifecycle flags.

Verify in Supabase with two accounts: leave one participant (room remains, hosting passes if appropriate); leave the final participant (room disappears and old invite fails). Keep a second tab open and verify it prevents closure. Test browser close and refresh after lease expiry. A new room must survive initial entry/development remounts. A regular user must not be able to set closed_at or has_had_attendees through the REST API. Live SQL/RLS validation requires the Supabase environment.
