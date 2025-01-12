###TODO
little white space between bottom message and message input.

###DEBUG
[ ] fix multiple users on same computer being logged in.
[ ] videos don't show a preview.
[ ] 3~4s delay for message reactions and thread count in main chat log.
[ ] in incognito mode, can't send files as DM?
[ ] If you search a message twice, it doesn't highlight.


###OPTIMIZE
[ ] isolated videos w/ sound
[ ] show display name not full name.
[ ] show sending message when others are sending.
[ ] Seperate page mapping (DMs and channels)


###NICE[ ] TO[ ] HAVE
[ ] Workspaces
[ ] Poll creation
[ ] navbar pp hover options
[ ] Allow login with email or username







###UTILITIES
[ ] Add error handling utility for standardized error messages and handling
[ ] Add data validation utility for input validation (emails, passwords, etc.)
[ ] Implement persistent caching with Redis or similar for:
  [ ] User avatars
  [ ] Channel lists
  [ ] Frequently accessed messages
[ ] Move rate limiter to use persistent storage
[ ] Add comprehensive file upload handling:
  [ ]  Better error messages for failed uploads
  [ ]  File type validation
  [ ]  Progress tracking
  [ ]  Automatic retries for failed uploads
  [ ]  Cleanup of failed upload artifacts
[ ] Add request/response logging for API calls
