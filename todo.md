###TODO

- Add an add channel button as a drop down from Channel
-Add a way to add a different workspace.
-Add a way to make a thread.
-Add emoji reactions.
-Add a way to add a file.
-Add a way to add a poll.
-Add image upload.
-Fix new login pp on landing.
-Update status.
-Add search functionality.
-Give options from navbar pp hover.
-make it so most recent messages are shown at the bottom.
-fix multiple users on same computer being logged in.
-modify session handling to make more secure. (ref 1)



###COMPLETED
-Fix size of chat page.




REFERENCES:
Ref 1: 

    Yes, we could implement a more secure custom session handling system. Here's what that might look like:

    1. Track active sessions in your database:
    ```typescript
    // Add to your Supabase schema
    type Session = {
    id: string
    user_id: string
    device_info: string
    last_active: timestamp
    created_at: timestamp
    ip_address: string
    is_active: boolean
    }
    ```

    2. Modify the login process to manage sessions:
    ```typescript
    const handleLogin = async () => {
    const { data: authData, error: authError } = await supabase.auth.signIn({...});
    
    if (authData?.user) {
        // Create new session record
        const { data: sessionData } = await supabase
        .from('sessions')
        .insert({
            user_id: authData.user.id,
            device_info: navigator.userAgent,
            ip_address: await fetchIpAddress(), // You'd need to implement this
            is_active: true
        });

        // Store session ID in local storage
        localStorage.setItem('session_id', sessionData.id);
    }
    };
    ```

    3. Add session validation middleware:
    ```typescript
    const validateSession = async () => {
    const sessionId = localStorage.getItem('session_id');
    
    if (!sessionId) {
        return false;
    }

    const { data: session } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

    if (!session || !session.is_active) {
        // Session invalid or revoked
        await handleLogout();
        return false;
    }

    // Update last_active timestamp
    await supabase
        .from('sessions')
        .update({ last_active: new Date() })
        .eq('id', sessionId);

    return true;
    };
    ```

    4. Add session management UI:
    ```typescript
    const SessionManager = () => {
    const [sessions, setSessions] = useState([]);
    
    const loadSessions = async () => {
        const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('is_active', true);
        setSessions(data);
    };

    const revokeSession = async (sessionId) => {
        await supabase
        .from('sessions')
        .update({ is_active: false })
        .eq('id', sessionId);
        
        loadSessions();
    };

    return (
        <div>
        <h2>Active Sessions</h2>
        {sessions.map(session => (
            <div key={session.id}>
            <p>Device: {session.device_info}</p>
            <p>Last active: {new Date(session.last_active).toLocaleString()}</p>
            <button onClick={() => revokeSession(session.id)}>
                Revoke Access
            </button>
            </div>
        ))}
        </div>
    );
    };
    ```

    Benefits of this approach:
    1. Full control over session management
    2. Ability to track and monitor sessions
    3. Can implement device-specific restrictions
    4. Can force-logout specific sessions
    5. Better audit trail of user access

    Drawbacks:
    1. More complex to implement and maintain
    2. Additional database queries
    3. Need to handle edge cases (network issues, etc.)
    4. More code to test and debug

    Would you like me to help implement this more secure approach? We can start with the basic structure and add security features incrementally.
