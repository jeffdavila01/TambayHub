# Room exits and session hosting

Run `202611010009_room_hosts.sql` after migrations 001?008, then deploy/reload the updated app. It wraps the capacity admission function; do not re-run migration 003 after 009 because it would replace that wrapper.

The permanent room creator and website admins keep their existing roles. A separate session host controls playback, Cinema/Videoke mode, queue removal, and Next singer. The first attendee becomes host. Leaving transfers hosting to the remaining attendee with the earliest recorded admission. Reconnecting does not take hosting back. Existing attendance records receive the migration time as their joined time; UUID breaks ties deterministically.

In Participants, the current host can use **Make host** on another attendee. The server rejects non-host transfers and targets without an active room seat. The transfer applies to both Cinema and Videoke. Room ownership and website admin roles do not transfer.

Leave Room immediately unmounts the media player and stops local camera/microphone; native audio/video is paused, its source detached, and YouTube is destroyed. The shared playback continues for people who remain. Browser Back or navigating away performs the same component cleanup. Keeping another room tab open means that account is still present; hosting is retained until its final room session leaves.

Abrupt browser close, lost internet, or a failed release uses the existing 90-second attendance expiry. Remaining attendees check every 25 seconds, so failover can take up to about 115 seconds; normal Leave Room releases immediately. No background cron is required: failover is reconciled on admissions/heartbeats and releases.

Verify with two accounts: play media; leave one and confirm it is silent there while the other still hears it. Pass hosting manually and verify only the recipient has host controls. Leave the host and verify automatic handoff. Try a non-host transfer and an absent target through the RPC and verify rejection. Test a second tab of the same host and an abrupt browser close. SQL and live multi-account tests must be run in the Supabase environment; local compilation does not validate deployed RLS.

The playback icon follows actual playback on each device. The host controls the room; participants can pause/resume their own device while the room is playing. Local pause survives periodic sync checkpoints. Resuming catches up to the shared playback position. If the host pauses the room, participants wait for the host to resume. A click calls the player immediately so browser autoplay permission can be granted before database synchronization.
