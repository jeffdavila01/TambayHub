# Comments and six reactions

Run migrations/202611010004_post_engagement.sql in Supabase SQL Editor, then deploy the updated frontend.

Existing post_likes rows are preserved as Like. A unique post/user index enforces one reaction per user. Users can switch or remove their own reaction. The comments table restricts writes to the signed-in author and reads to posts visible under existing post policies. Comments are limited to 2,000 characters and owners can delete their own comments. Existing unrelated policies are preserved.

Test with two accounts: react with each of the six choices, change a reaction, remove it by selecting it again, post a comment, verify the other account sees its author and content, and delete your own comment. Verify one account cannot delete another's comment through the API. Use a real published post; design preview posts do not save engagement.

The UI listens for Realtime inserts/updates and refreshes on focus. The open comment panel also refreshes every 30 seconds as a fallback. Actual row security and cross-account interactions require testing against the applied Supabase migration; the local unit tests verify reaction logic only.
