###TODO
[ ] TL;DR Function
[ ] User selective Vector Storage
[ ] Video Synthesis
[?] Avatar Upload with image generation


###DEBUG
[!] Microphone not working.
[!] "Ref 1" in audio transcription.
[ ] thread indicator not updating in main chat log.
[ ] Unread message error.
[ ] minimized ai chat shows at top when maximized.
[ ] Video show thumbnail and plays after refresh.
[ ] 8s delay for message reactions and thread count in main chat log. (pushes log down)
[ ] If you search a message twice lag.(Check page before navigating?)
[ ] fix multiple users on same computer being logged in.
[ ] after image send, rerenders
[ ] Don't let voice setup accept mp4 etc.
[ ] Citation clicking goes to bottom of page sometimes (race condition?)


###UI
[ ] loading sign during login
[!] Profile "Loading" Elements
[ ] Message settings
[ ] isolated videos w/ sound
[ ] show display name not full name.
[ ] Code blocks content select.
[ ] Mobile compatible
[ ] Sidebar scrollbar visibility.



###NICE-TO-HAVE
[ ] Edit message
[ ] Delete message
[ ] Workspaces
[ ] Poll creation
[ ] navbar pp hover options
[ ] Allow login with email or username
[ ] LLM streaming
[ ] show sending message when others are sending.




###UTILITIES
[ ] Add error handling utility for standardized error messages and handling
[ ] Add data validation utility for input validation (emails, passwords, etc.)
[ ] Implement persistent caching with Redis or similar for user avatar, channel lists, and frequently accessed messages
[ ] Move rate limiter to use persistent storage
[ ] Add comprehensive file upload handling:
  [ ]  Better error messages for failed uploads
  [ ]  File type validation
  [ ]  Progress tracking
  [ ]  Automatic retries for failed uploads
  [ ]  Cleanup of failed upload artifacts
[ ] Add request/response logging for API calls
[ ] Scroll pagination
--AI Chat History
Performance Considerations:
   - Implement message batching
   - Add proper pagination
   - Cache recent messages
   - Optimize re-renders



#TRY
[ ] supabase CLI tracking
[ ] add reatltime init in supabase.sql
