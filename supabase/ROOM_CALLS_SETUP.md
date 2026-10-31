# Room video and audio calls

1. Run migrations/202610310002_room_calls.sql in the connected Supabase SQL Editor. The previous room invitations migration is separate and does not configure call signaling.
2. Open the same room with two different signed-in accounts, using two devices or a regular and private browser window. Both must be room members or the owner.
3. Enable Camera and allow browser camera access. Enable Microphone separately and allow microphone access. Neither starts automatically.
4. Verify each user sees the other user's camera. Use headphones and verify two-way audio, mute/unmute, camera off/on, late joining, and leaving.
5. If autoplay blocks incoming audio, click Enable audio on the participant tile.
6. Deploy the frontend for remote devices. Camera/microphone need HTTPS, or localhost on the device running the browser.

The client uses RTCPeerConnection with Supabase private Broadcast and Presence signaling. The SQL authorizes room owners/members on room-call:<room UUID> topics. This is a peer mesh intended for small rooms. Existing unrelated Realtime policies are preserved; review any broad existing Realtime policies before public release.

Default ICE discovery uses public STUN servers. STUN alone cannot connect every pair of networks. If needed, configure a TURN relay using VITE_WEBRTC_ICE_SERVERS as a JSON array of RTCIceServer objects, then rebuild/redeploy. Include the URLs, username, and TURN credential supplied by your relay provider. All VITE values are visible in the browser; never put a relay provider management API key there. A production deployment should obtain short-lived TURN credentials from a server endpoint instead of embedding long-lived credentials in the frontend.

No media is stored in the database. Supabase carries signaling, while WebRTC sends media between peers (or via TURN if configured). The implementation has build/type verification, but cross-device media must be tested with actual browsers and devices.
