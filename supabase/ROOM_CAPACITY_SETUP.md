# Concurrent room capacity

Run migrations/202611010003_room_capacity.sql after the invitation and call migrations. Deploy the updated frontend together with this change: older clients do not reserve a seat and cannot join private calls after this migration.

The default is 15 concurrently present people per room, including the host. Saved memberships and pending invitations do not consume seats. A user in multiple tabs occupies one person slot; each tab has a separate lease. Leases renew every 25 seconds and expire after 90 seconds if abandoned. Leaving the room releases the current tab's lease immediately when the request succeeds.

Room-row locking serializes admission requests. New arrivals are rejected when full; existing admitted users can renew. Accepting an invitation still saves membership, but entering a full room is denied. Camera and microphone stop and call signaling is disconnected if the client loses its seat.

Change a room's max_participants field in the Supabase Table Editor/SQL as an administrator. New rooms default to 15. Lowering the setting does not kick existing users.

Test after applying SQL with 15 distinct accounts. The 16th must see Room is full. Verify that leaving allows another account in, two tabs of one account count once, and abandoned tabs free capacity after 90 seconds. These concurrency cases require a running PostgreSQL/Supabase instance and signed-in test accounts; frontend build/unit tests cannot verify SQL locking.
