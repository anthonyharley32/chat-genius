interface NavigationOptions {
  minimizeAIChat?: () => void;
}

export function navigateToMessage(messageId: string, options?: NavigationOptions) {
  // Find the message element
  const messageElement = document.getElementById(`message-${messageId}`);
  if (!messageElement) {
    console.warn(`Message element with ID message-${messageId} not found`);
    return false;
  }

  // Minimize AI chat if provided
  if (options?.minimizeAIChat) {
    options.minimizeAIChat();
  }

  // Scroll to message
  messageElement.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });

  // Apply highlight animation
  messageElement.classList.add('highlight-message');
  
  // Remove highlight after animation
  setTimeout(() => {
    messageElement.classList.remove('highlight-message');
  }, 2000);

  return true;
}

export function useMessageNavigation() {
  const navigate = (messageId: string, options?: NavigationOptions) => {
    return navigateToMessage(messageId, options);
  };

  return { navigate };
} 