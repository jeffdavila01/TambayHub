# Home messenger setup

1. In the Supabase project used by TambayHub, open SQL Editor.
2. Run the complete `migrations/202611010011_direct_message_realtime.sql` file.
3. Refresh the app on two accounts with an accepted friendship. Leave one account on Home, send it a message from the other, then reply in the Home chat popup.
4. Test that a third account cannot read either account's conversation.

The migration uses the existing `public.direct_messages` table with `id`, `sender_id`, `receiver_id`, `content`, and `created_at`. It adds Realtime publication membership and indexes; it does not remove messages or introduce a read-receipt field. Popup unread state is kept on the device rather than stored as a server read receipt.

Existing permissive policies, including any friendship requirement, remain in place. New restrictive policies limit reads to the sender/recipient and writes to the sender, with a 2,000-character message limit. These guards do not grant access on their own: the project's existing permissive SELECT and INSERT policies must still allow the intended conversation. If Messages already reports a permission error, inspect those existing policies in Supabase before changing them.

If `supabase_realtime` does not exist in the project, the migration preserves the rest of the database setup. Enable Postgres Changes for `public.direct_messages` in Supabase before testing live popups.

The messenger launcher appears on Home and the normal signed-in pages; the full Messages page and immersive room pages keep their existing layouts. Incoming messages open a chat when no conversation is active. An existing expanded chat is not replaced, and a minimized chat stays minimized; other senders get a badge in the conversation picker. Chat drafts survive minimize/close and conversation switches during this app session. Signing out clears that account's popup state.

The popup and full Messages page use the same thread loader, sender, and Realtime merge logic. Both load 50 messages at a time with older-history pagination, reject empty/oversized messages, and retain the draft on send failure. The inbox checks for new messages every 8 seconds as a fallback; active threads refresh every 15 seconds while visible. Existing history is seeded when the app opens, so popup badges describe new messages received during that session rather than durable server-side unread receipts.

Check phone/tablet layouts, Shift+Enter for a newline, minimize/close, switching between friends with unsent drafts, and opening the full thread from the popup. Verify incoming messages do not replace a conversation while composing, duplicate Realtime/poll delivery creates only one message, and failed sends leave the draft intact. Browser UI and two-account Realtime/RLS testing must be performed against the configured Supabase project.
