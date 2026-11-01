# Separate Cinema and Videoke, with uploaded audio

Run migrations/202611010006_separate_room_media_audio.sql after migration 005, then deploy this frontend. Older frontend versions use the shared cinema_sessions table; update all clients for correct mode separation.

The migration creates room_media_sessions with one row per room/mode. The existing shared source is preserved as Cinema and paused at its estimated current position. Videoke starts empty. It does not remove the old cinema_sessions table. New movie loads never overwrite Videoke, and queued music never replaces Cinema. Switching saves and pauses the departing mode; returning loads its own saved position and waits for Play.

Videoke > Add music > Upload audio accepts MP3/M4A/WAV/OGG/WebM/AAC/FLAC up to 20 MB. Any signed-in user can save a backing track in the shared music library; the host chooses a singer and queues it. Existing YouTube songs remain available. Audio alone does not generate lyrics, remove vocals, or provide a score.

Uploads are stored under each user's folder in the private videoke-audio bucket. Signed-in users can listen to the shared library, while only the owner can upload/remove files under their folder. Playback references store the stable object path; the player obtains 2-hour signed URLs and refreshes them every 45 minutes and on foregrounding. Storage project limits and browser codec support still apply.

Test with two accounts: play a movie, switch to Videoke, upload and queue a song, play it, switch back, verify the original movie/source/position remains, then return to Videoke and verify its own source/position. Test audio playback, microphone voice, YouTube playback, file rejection, reload and renewed audio URLs. These cross-device/backend tests have not been performed by local unit/build checks.
