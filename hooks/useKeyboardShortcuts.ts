import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;  // Command key on Mac
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
}

/**
 * Hook for global keyboard shortcuts
 *
 * Shortcuts:
 * - Cmd/Ctrl + Enter: Generate content
 * - Cmd/Ctrl + Shift + Enter: Post to LinkedIn
 * - Escape: Close modals
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true } = options;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in input/textarea (unless Escape)
    const target = event.target as HTMLElement;
    const isTyping = target.tagName === 'INPUT' ||
                     target.tagName === 'TEXTAREA' ||
                     target.isContentEditable;

    for (const shortcut of shortcuts) {
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatches = shortcut.ctrlKey ? (event.ctrlKey || event.metaKey) : true;
      const metaMatches = shortcut.metaKey ? event.metaKey : true;
      const shiftMatches = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
      const altMatches = shortcut.altKey ? event.altKey : !event.altKey;

      // For Escape, allow even when typing
      const allowWhileTyping = shortcut.key.toLowerCase() === 'escape';

      if (keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches) {
        if (isTyping && !allowWhileTyping) continue;

        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }
        shortcut.action();
        break;
      }
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Predefined shortcuts for the app
export function useAppShortcuts({
  onGenerate,
  onPost,
  onCloseModal,
  onCopyPost,
  isGenerating = false,
  isPosting = false,
  hasResult = false,
  modalOpen = false,
}: {
  onGenerate?: () => void;
  onPost?: () => void;
  onCloseModal?: () => void;
  onCopyPost?: () => void;
  isGenerating?: boolean;
  isPosting?: boolean;
  hasResult?: boolean;
  modalOpen?: boolean;
}) {
  const shortcuts: KeyboardShortcut[] = [];

  // Cmd/Ctrl + Enter: Generate
  if (onGenerate && !isGenerating) {
    shortcuts.push({
      key: 'Enter',
      ctrlKey: true,
      action: onGenerate,
      description: 'Generate content',
    });
  }

  // Cmd/Ctrl + Shift + Enter: Post to LinkedIn
  if (onPost && hasResult && !isPosting) {
    shortcuts.push({
      key: 'Enter',
      ctrlKey: true,
      shiftKey: true,
      action: onPost,
      description: 'Post to LinkedIn',
    });
  }

  // Escape: Close modal
  if (onCloseModal && modalOpen) {
    shortcuts.push({
      key: 'Escape',
      action: onCloseModal,
      description: 'Close modal',
    });
  }

  // Cmd/Ctrl + C: Copy post (when not focused on input)
  if (onCopyPost && hasResult) {
    shortcuts.push({
      key: 'c',
      ctrlKey: true,
      action: onCopyPost,
      description: 'Copy post',
      preventDefault: false, // Don't prevent default copy behavior
    });
  }

  useKeyboardShortcuts(shortcuts);
}

// Helper to display shortcut hints
export function getShortcutDisplay(shortcut: { ctrlKey?: boolean; shiftKey?: boolean; key: string }): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const parts: string[] = [];

  if (shortcut.ctrlKey) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.shiftKey) {
    parts.push(isMac ? '⇧' : 'Shift');
  }

  const keyDisplay = shortcut.key === 'Enter' ? '↵' : shortcut.key.toUpperCase();
  parts.push(keyDisplay);

  return parts.join(isMac ? '' : '+');
}
