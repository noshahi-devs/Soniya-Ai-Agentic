import { detectIntent } from '../ai/intentEngine';
import {
  buildIgnoreResponse,
  buildLockResponse,
  buildMissingMessageResponse,
  buildOpenAppResponse,
  buildPinRejectedResponse,
  buildPinRequiredResponse,
  buildPinVerifiedResponse,
  buildReadMessageResponse,
  buildReplyDraftResponse,
  buildReplyPromptResponse,
  buildReplySentResponse,
  buildSenderListResponse,
  buildUnknownCommandResponse,
} from '../ai/responseEngine';
import {
  attachReplyToMessage,
  findMessageById,
  findMessageBySender,
  getSenderNames,
  markMessageRead,
} from '../storage/messageStore';
import {
  buildLockedPrivacyState,
  isPrivacyUnlocked,
  verifyPrivacyPin,
} from '../storage/privacyStorage';

export const createInitialAgentSession = (messages = []) => ({
  selectedMessageId: messages[0]?.id || '',
  pendingAction: null,
  pendingReplyMessageId: '',
  replyDraft: '',
  lastResponse: '',
  lastCommand: '',
  history: [],
});

const buildHistoryEntry = (commandText, responseText) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  commandText,
  responseText,
});

const commitState = (session, commandText, responseText, extra = {}) => ({
  ...session,
  ...extra,
  lastCommand: commandText,
  lastResponse: responseText,
  history: [
    buildHistoryEntry(commandText, responseText),
    ...(session.history || []),
  ].slice(0, 8),
});

const resolveSelectedMessage = (messages, session, senderQuery = '') => {
  if (senderQuery) {
    return findMessageBySender(messages, senderQuery);
  }

  return findMessageById(messages, session.selectedMessageId) || messages[0] || null;
};

const finalizeProtectedAction = ({ action, inbox, settings, session }) => {
  const romanticTone = Boolean(settings.romanticCompanionMode);
  const targetMessage = resolveSelectedMessage(inbox, session, action?.senderQuery);

  if (!targetMessage) {
    return {
      inbox,
      session: commitState(session, 'pending-action', buildMissingMessageResponse(action?.senderQuery || 'selected sender', romanticTone), {
        pendingAction: null,
      }),
      responseText: buildMissingMessageResponse(action?.senderQuery || 'selected sender', romanticTone),
      privacyState: null,
    };
  }

  if (action.type === 'LIST_SENDERS') {
    const senderListResponse = buildSenderListResponse(getSenderNames(inbox), romanticTone);
    return {
      inbox,
      session: commitState(session, 'pending-action', senderListResponse, {
        pendingAction: null,
      }),
      responseText: senderListResponse,
      privacyState: null,
    };
  }

  const updatedInbox = markMessageRead(inbox, targetMessage.id);
  const refreshedMessage = findMessageById(updatedInbox, targetMessage.id) || targetMessage;
  const messageResponse = buildReadMessageResponse(refreshedMessage, romanticTone);

  return {
    inbox: updatedInbox,
    session: commitState(session, 'pending-action', messageResponse, {
      selectedMessageId: refreshedMessage.id,
      pendingAction: null,
    }),
    responseText: messageResponse,
    privacyState: null,
  };
};

const handleProtectedIntent = ({ intent, inbox, settings, privacyState, session, commandText }) => {
  const romanticTone = Boolean(settings.romanticCompanionMode);
  const needsLock = Boolean(settings.privacyLock) && !isPrivacyUnlocked(privacyState);

  if (needsLock) {
    const pinResponse = buildPinRequiredResponse(romanticTone);
    return {
      inbox,
      privacyState,
      session: commitState(session, commandText, pinResponse, {
        pendingAction: intent,
      }),
      responseText: pinResponse,
    };
  }

  return finalizeProtectedAction({ action: intent, inbox, settings, session });
};

const handleReplyIntent = ({ intent, inbox, settings, session, commandText }) => {
  const romanticTone = Boolean(settings.romanticCompanionMode);
  const targetMessage = resolveSelectedMessage(inbox, session, intent.senderQuery);

  if (!targetMessage) {
    const missingResponse = buildMissingMessageResponse(intent.senderQuery || 'selected sender', romanticTone);
    return {
      inbox,
      session: commitState(session, commandText, missingResponse),
      responseText: missingResponse,
    };
  }

  const replyPrompt = buildReplyPromptResponse(targetMessage, romanticTone);
  return {
    inbox,
    session: commitState(session, commandText, replyPrompt, {
      selectedMessageId: targetMessage.id,
      pendingReplyMessageId: targetMessage.id,
      replyDraft: '',
    }),
    responseText: replyPrompt,
  };
};

export const processAgentCommand = ({
  commandText,
  inbox,
  settings,
  privacyState,
  session,
}) => {
  const intent = detectIntent(commandText, inbox);
  const romanticTone = Boolean(settings.romanticCompanionMode);

  switch (intent.type) {
    case 'EMPTY':
      return {
        inbox,
        privacyState,
        session,
        responseText: '',
      };
    case 'OPEN_APP': {
      const openResponse = buildOpenAppResponse(romanticTone);
      return {
        inbox,
        privacyState,
        session: commitState(session, commandText, openResponse),
        responseText: openResponse,
      };
    }
    case 'LIST_SENDERS':
      return handleProtectedIntent({ intent, inbox, settings, privacyState, session, commandText });
    case 'READ_LATEST_MESSAGE':
    case 'CONFIRM_READ_LATEST':
      return handleProtectedIntent({
        intent: { ...intent, type: 'READ_MESSAGE', senderQuery: '' },
        inbox,
        settings,
        privacyState,
        session,
        commandText,
      });
    case 'READ_MESSAGE_BY_SENDER':
      return handleProtectedIntent({ intent, inbox, settings, privacyState, session, commandText });
    case 'VERIFY_PIN': {
      const verification = verifyPrivacyPin(privacyState, intent.pin);
      if (!verification.ok) {
        const rejectedResponse = buildPinRejectedResponse(romanticTone);
        return {
          inbox,
          privacyState,
          session: commitState(session, commandText, rejectedResponse),
          responseText: rejectedResponse,
        };
      }

      if (!session.pendingAction) {
        const verifiedResponse = buildPinVerifiedResponse(romanticTone);
        return {
          inbox,
          privacyState: verification.state,
          session: commitState(session, commandText, verifiedResponse),
          responseText: verifiedResponse,
        };
      }

      const pendingResult = finalizeProtectedAction({
        action: session.pendingAction,
        inbox,
        settings,
        session: {
          ...session,
          pendingAction: null,
        },
      });

      return {
        ...pendingResult,
        privacyState: verification.state,
      };
    }
    case 'IGNORE_MESSAGE': {
      const ignoreResponse = buildIgnoreResponse(romanticTone);
      return {
        inbox,
        privacyState,
        session: commitState(session, commandText, ignoreResponse, {
          pendingAction: null,
        }),
        responseText: ignoreResponse,
      };
    }
    case 'START_REPLY':
      return {
        ...handleReplyIntent({ intent, inbox, settings, session, commandText }),
        privacyState,
      };
    case 'SET_REPLY_DRAFT': {
      const targetMessage = resolveSelectedMessage(inbox, session);
      if (!targetMessage) {
        const missingResponse = buildMissingMessageResponse('selected sender', romanticTone);
        return {
          inbox,
          privacyState,
          session: commitState(session, commandText, missingResponse),
          responseText: missingResponse,
        };
      }

      const replyDraftResponse = buildReplyDraftResponse(
        targetMessage,
        intent.replyText,
        romanticTone,
        Boolean(settings.askBeforeReply)
      );

      if (!settings.askBeforeReply) {
        const sentInbox = attachReplyToMessage(inbox, targetMessage.id, intent.replyText);
        const sentResponse = buildReplySentResponse(targetMessage, intent.replyText, romanticTone);
        return {
          inbox: sentInbox,
          privacyState,
          session: commitState(session, commandText, sentResponse, {
            selectedMessageId: targetMessage.id,
            pendingReplyMessageId: '',
            replyDraft: '',
          }),
          responseText: sentResponse,
        };
      }

      return {
        inbox,
        privacyState,
        session: commitState(session, commandText, replyDraftResponse, {
          selectedMessageId: targetMessage.id,
          pendingReplyMessageId: targetMessage.id,
          replyDraft: intent.replyText,
        }),
        responseText: replyDraftResponse,
      };
    }
    case 'SEND_REPLY': {
      if (!session.pendingReplyMessageId || !session.replyDraft) {
        const unknownResponse = buildUnknownCommandResponse(romanticTone);
        return {
          inbox,
          privacyState,
          session: commitState(session, commandText, unknownResponse),
          responseText: unknownResponse,
        };
      }

      const targetMessage = findMessageById(inbox, session.pendingReplyMessageId);
      if (!targetMessage) {
        const missingResponse = buildMissingMessageResponse('selected sender', romanticTone);
        return {
          inbox,
          privacyState,
          session: commitState(session, commandText, missingResponse),
          responseText: missingResponse,
        };
      }

      const sentInbox = attachReplyToMessage(inbox, targetMessage.id, session.replyDraft);
      const sentResponse = buildReplySentResponse(targetMessage, session.replyDraft, romanticTone);
      return {
        inbox: sentInbox,
        privacyState,
        session: commitState(session, commandText, sentResponse, {
          selectedMessageId: targetMessage.id,
          pendingReplyMessageId: '',
          replyDraft: '',
        }),
        responseText: sentResponse,
      };
    }
    case 'LOCK_PRIVACY': {
      const lockedResponse = buildLockResponse(romanticTone);
      return {
        inbox,
        privacyState: buildLockedPrivacyState(privacyState),
        session: commitState(session, commandText, lockedResponse, {
          pendingAction: null,
        }),
        responseText: lockedResponse,
      };
    }
    default: {
      const unknownResponse = buildUnknownCommandResponse(romanticTone);
      return {
        inbox,
        privacyState,
        session: commitState(session, commandText, unknownResponse),
        responseText: unknownResponse,
      };
    }
  }
};

export const processQuickAction = ({
  actionType,
  inbox,
  settings,
  privacyState,
  session,
}) => {
  const actionCommandMap = {
    YES: 'haan',
    NO: 'no',
    REPLY: 'reply bhejo',
    SEND: 'send',
    LOCK: 'lock',
  };

  return processAgentCommand({
    commandText: actionCommandMap[actionType] || '',
    inbox,
    settings,
    privacyState,
    session,
  });
};
