# YouTube and saved karaoke songs

YouTube playback uses the official IFrame Player API. It does not download or rehost videos, and does not require a YouTube Data API key. You can paste a video URL into the room media settings or the manual Videoke queue without a new database column.

To enable the saved song catalog, run migrations/202611010005_karaoke_songs.sql in Supabase SQL Editor. Signed-in users can browse saved title/artist metadata and save their own entries. Users can delete only their own entries. The room host selects a singer and queues saved songs. No sample/copyrighted song list is preloaded.

Test in the room:
1. As host, switch to Videoke.
2. Choose Save song, enter title/artist and an embeddable YouTube video link, then save.
3. Select a singer in the queue form, find the saved song, and choose Queue.
4. Choose Next singer to load the video, then Play. Each device may need to press Play in the YouTube player once to allow audio.
5. Verify play/pause/seek and late-join position with a second account/device. Embedding-restricted/private/deleted/region-restricted videos may not play; use another video.

YouTube's own controls, branding, ads, and playback restrictions remain. Playback sync is approximate and separate ads/buffering may cause differences between viewers. Do not promise frame-perfect synchronization. No tests here exercise YouTube's remote iframe; those require real browsers with external network access.

Official API: https://developers.google.com/youtube/iframe_api_reference
