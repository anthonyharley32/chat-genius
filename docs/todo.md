###TODO

run this prompt:

Now let's edit the @page.tsx so that under custom voice on the dropdown there is a "Trained" tag in blue right after the name of trained voices and a "Selected" tag next to the selected custom voice (last voice that was selected when the page had changes saved). On the right add a rename button next to the play/delete button. Also make a pause button that replaces the play button when it is playing.




[ ] User selective Vector Storage
[ ] Voice Synthesis
[ ] Video Synthesis
[ ] TL;DR Function
[ ] Avatar Upload with image generation
[X] Seperate AI Chats
[X] RAG prompting
[X] Chat Modal
[X] RAG Chatbot

###DEBUG
[ ] Video show thumbnail and plays after refresh.
[ ] 8s delay for message reactions and thread count in main chat log. (pushes log down)
[ ] If you search a message twice lag.(Check page before navigating?)
[ ] fix multiple users on same computer being logged in.
[ ] after image send, rerenders
[ ] thread indicator not updating in main chat log.
[X] isPressed().cite > 3 ? show all : null 
[X] citation misnumbering
[X] channel nav on cite click scrolls down
[X] Add channel metadata to pinecone and system prompt.
[X] Reload loses spot
[X] Citation UI
[X] Citation message nav + highlight
[X] Sidebar scrollable



###UI
[ ] loading sign during login
[ ] move "searching..." to top of page
[ ] Message settings
[ ] isolated videos w/ sound
[ ] show display name not full name.
[ ] Code blocks content select.
[ ] Mobile compatible
[ ] Sidebar scrollbar visibility.
[ ] Inline citations next to periods.
[X] Waiting for AI response indicator.
[X] Inline citations highlight citation card.
[X] Raise minimized AI chat above message input.
[X] Perplexity style message reference system.
[X] AI Chat Title Header.
[X] 4o mini
[X] Notification for new messages.
[X] Seperate page mapping (DMs and channels)
[X] Markdown formatting
[X] notifications don't show up for yourself.
[X] Confirm password
[X] Minimized AI chat = blue
[X] shows search result with space on each side.








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
