/**
 * User-friendly error messages for API errors
 * Maps technical errors to helpful, actionable messages
 */

import { ApiError } from './fetch-with-retry';

export interface UserFriendlyError {
  title: string;
  message: string;
  action?: string;
  canRetry: boolean;
}

/**
 * Convert API error to user-friendly message
 */
export function getUserFriendlyError(
  error: Error | ApiError,
  context?: string
): UserFriendlyError {
  // Network/Connection errors
  if (
    error.message.includes('fetch') ||
    error.message.includes('network') ||
    error.message.includes('timeout') ||
    error.name === 'TypeError'
  ) {
    return {
      title: 'Connection Issue',
      message: 'Unable to connect to the server. Please check your internet connection.',
      action: 'Check your connection and try again',
      canRetry: true,
    };
  }

  // API Error with status code
  if (error instanceof ApiError) {
    const { statusCode, message } = error;

    switch (statusCode) {
      case 401:
        return {
          title: 'Session Expired',
          message: 'Your session has expired. Please log in again.',
          action: 'Log in to continue',
          canRetry: false,
        };

      case 403:
        return {
          title: 'Access Denied',
          message: "You don't have permission to perform this action.",
          action: 'Contact support if you believe this is an error',
          canRetry: false,
        };

      case 404:
        return getNotFoundError(context);

      case 409:
        return {
          title: 'Already Exists',
          message: message || 'This item already exists.',
          action: 'Try a different name or refresh the page',
          canRetry: false,
        };

      case 413:
        return {
          title: 'File Too Large',
          message: 'The file you uploaded is too large.',
          action: 'Try uploading a smaller file (max 10MB)',
          canRetry: false,
        };

      case 422:
        return {
          title: 'Invalid Data',
          message: message || 'The data you entered is invalid.',
          action: 'Please check your input and try again',
          canRetry: false,
        };

      case 429:
        return {
          title: 'Too Many Requests',
          message: 'You\'re doing that too quickly. Please slow down.',
          action: 'Wait a moment and try again',
          canRetry: true,
        };

      case 500:
      case 502:
      case 503:
      case 504:
        return {
          title: 'Server Error',
          message: 'Something went wrong on our end. We\'re working on it.',
          action: 'Try again in a few moments',
          canRetry: true,
        };

      default:
        return {
          title: 'Something Went Wrong',
          message: message || 'An unexpected error occurred.',
          action: 'Please try again',
          canRetry: true,
        };
    }
  }

  // Generic error
  return {
    title: 'Error',
    message: error.message || 'An unexpected error occurred.',
    action: 'Please try again',
    canRetry: true,
  };
}

/**
 * Get context-specific 404 error message
 */
function getNotFoundError(context?: string): UserFriendlyError {
  const baseMessage = {
    title: 'Not Found',
    canRetry: false,
  };

  switch (context) {
    case 'lesson':
      return {
        ...baseMessage,
        message: 'This lesson could not be found.',
        action: 'Go back to the lessons list',
      };

    case 'practice-farm':
      return {
        ...baseMessage,
        message: 'This practice farm could not be found.',
        action: 'Go back to your practice farms',
      };

    case 'topic':
      return {
        ...baseMessage,
        message: 'This topic could not be found.',
        action: 'Go back to topics',
      };

    case 'path':
      return {
        ...baseMessage,
        message: 'This learning path could not be found.',
        action: 'Go back to learning paths',
      };

    default:
      return {
        ...baseMessage,
        message: 'The item you\'re looking for could not be found.',
        action: 'Go back and try again',
      };
  }
}

/**
 * Get context-specific error messages for operations
 */
export function getOperationError(
  operation: string,
  error: Error | ApiError
): UserFriendlyError {
  const baseError = getUserFriendlyError(error);

  // Add operation-specific context
  const operationTitles: Record<string, string> = {
    'save-zones': 'Failed to Save',
    'create-practice-farm': 'Failed to Create Practice Farm',
    'submit-practice-farm': 'Failed to Submit',
    'complete-lesson': 'Failed to Complete Lesson',
    'enroll-path': 'Failed to Enroll',
    'ai-analysis': 'AI Analysis Failed',
  };

  const operationActions: Record<string, string> = {
    'save-zones': 'Your changes were not saved. Try saving again.',
    'create-practice-farm': 'The practice farm was not created. Please try again.',
    'submit-practice-farm': 'Your practice farm was not submitted. Try again.',
    'complete-lesson': 'The lesson was not marked complete. Try again.',
    'enroll-path': 'You were not enrolled in the path. Try again.',
    'ai-analysis': 'The AI could not analyze your design. Try again.',
  };

  return {
    ...baseError,
    title: operationTitles[operation] || baseError.title,
    action: operationActions[operation] || baseError.action,
  };
}

/**
 * Format error for toast notification
 */
export function formatErrorForToast(
  error: Error | ApiError,
  context?: string
) {
  const friendlyError = getUserFriendlyError(error, context);

  return {
    title: friendlyError.title,
    description: `${friendlyError.message} ${friendlyError.action}`,
    variant: 'destructive' as const,
  };
}
