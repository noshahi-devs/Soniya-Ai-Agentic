import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getCompanionProfilePrompt,
  lockLocalMemorySecuritySession,
  syncLocalMemorySecurityPin,
} from '../../api/localMemory';
import SoniyaAvatar from '../../components/SoniyaAvatar';
import VoiceHandler from '../../components/VoiceHandler';
import {
  APP_NAME,
  DEFAULT_SETTINGS,
  PRIVACY_RULES,
  SETTING_DEFINITIONS,
} from '../constants/appConfig';
import { routeAssistantInput } from '../services/assistantRouter';
import { createInitialAgentSession } from '../services/messageHandler';
import {
  clearCapturedNotifications,
  getCapturedNotifications,
  getNativeBridgeStatus,
  hideFloatingBubble,
  isNativeStageFourBridgeAvailable,
  openNotificationListenerSettings,
  requestNativeNotificationRebind,
  showFloatingBubble,
  startNativeAssistantService,
  stopAssistantService,
} from '../services/nativeAssistantService';
import {
  getVoiceRuntimeSnapshot,
  initializeVoicePersona,
  speakAssistantResponse,
} from '../services/voiceService';
import {
  buildAnnouncement,
  findMessageById,
  getSuggestedReplies,
  loadLocalInbox,
  mergeNativeNotificationsIntoInbox,
  saveLocalInbox,
} from '../storage/messageStore';
import {
  DEFAULT_PRIVACY_STATE,
  buildLockedPrivacyState,
  isDefaultPrivacyPin,
  isPrivacyUnlocked,
  loadPrivacyState,
  savePrivacyState,
  updatePrivacyPin,
} from '../storage/privacyStorage';
import { loadAgentSettings, saveAgentSettings } from '../storage/settingsStorage';

const createChatEntry = (role, text, meta = {}) => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  text,
  meta,
});

const buildWelcomeText = (hasVoiceRuntime) => (
  hasVoiceRuntime
    ? 'Main ready hoon. Mujh se baat karein, messages poochhein, ya mic se bolo, main sunti hoon.'
    : 'Main ready hoon. Text chat abhi kaam karegi; live mic ke liye dev build chahiye.'
);

function UtilityCard({ title, subtitle, children }) {
  return (
    <View style={styles.utilityCard}>
      <Text style={styles.utilityTitle}>{title}</Text>
      {subtitle ? <Text style={styles.utilitySubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function StatusPill({ label, accent = false, icon = 'sparkles-outline' }) {
  return (
    <View style={[styles.statusPill, accent && styles.statusPillAccent]}>
      <Ionicons name={icon} size={12} color={accent ? '#092c30' : '#d4eff6'} />
      <Text style={[styles.statusPillText, accent && styles.statusPillTextAccent]}>{label}</Text>
    </View>
  );
}

function ChatBubble({ item }) {
  const isUser = item.role === 'user';
  return (
    <View style={[styles.chatBubble, isUser ? styles.chatBubbleUser : styles.chatBubbleAssistant]}>
      <Text style={[styles.chatRole, isUser ? styles.chatRoleUser : styles.chatRoleAssistant]}>
        {isUser ? 'You' : 'Soniya'}
      </Text>
      <Text style={styles.chatText}>{item.text}</Text>
    </View>
  );
}

function MessageSenderChip({ label, active = false, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      style={[styles.senderChip, active && styles.senderChipActive]}
    >
      <Text style={[styles.senderChipText, active && styles.senderChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function SoniyaCompanionScreen() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [messages, setMessages] = useState([]);
  const [privacyState, setPrivacyState] = useState(DEFAULT_PRIVACY_STATE);
  const [agentSession, setAgentSession] = useState(() => createInitialAgentSession());
  const [voiceRuntime, setVoiceRuntime] = useState({
    recognitionAvailable: false,
    permissionGranted: false,
    permissionStatus: 'checking',
    canAskAgain: false,
    defaultRecognitionService: '',
    assistantService: '',
    initErrorMessage: '',
  });
  const [voiceStatusText, setVoiceStatusText] = useState('Voice runtime is loading...');
  const [statusText, setStatusText] = useState('Soniya is waking up...');
  const [composerText, setComposerText] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [currentPinDraft, setCurrentPinDraft] = useState('');
  const [newPinDraft, setNewPinDraft] = useState('');
  const [confirmPinDraft, setConfirmPinDraft] = useState('');
  const [conversation, setConversation] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [assistantMood, setAssistantMood] = useState('HAPPY');
  const [activityMode, setActivityMode] = useState('CHAT');
  const [utilityVisible, setUtilityVisible] = useState(false);
  const [nativeBridgeStatus, setNativeBridgeStatus] = useState({
    bridgeAvailable: false,
    notificationAccessEnabled: false,
    listenerConnected: false,
    listenerConnectedAt: 0,
    foregroundServiceActive: false,
    foregroundServiceStartedAt: 0,
    storedCount: 0,
  });
  const [nativeNotifications, setNativeNotifications] = useState([]);

  const settingsRef = useRef(settings);
  const messagesRef = useRef(messages);
  const privacyStateRef = useRef(privacyState);
  const sessionRef = useRef(agentSession);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    privacyStateRef.current = privacyState;
  }, [privacyState]);

  useEffect(() => {
    sessionRef.current = agentSession;
  }, [agentSession]);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      const [storedSettings, storedMessages, storedPrivacyState, runtimeSnapshot, companionProfilePrompt] = await Promise.all([
        loadAgentSettings(),
        loadLocalInbox(),
        loadPrivacyState(),
        getVoiceRuntimeSnapshot(),
        getCompanionProfilePrompt(),
      ]);

      if (!isMounted) {
        return;
      }

      const welcomeText = buildWelcomeText(runtimeSnapshot.recognitionAvailable);
      const initialPrompt = String(companionProfilePrompt || '').trim();
      const initialConversation = [createChatEntry('assistant', welcomeText, { kind: 'welcome' })];
      if (initialPrompt) {
        initialConversation.push(createChatEntry('assistant', initialPrompt, { kind: 'profile_prompt' }));
      }

      setSettings(storedSettings);
      if (storedSettings.showFloatingBubble) {
        await showFloatingBubble();
      }
      setMessages(storedMessages);
      setPrivacyState(storedPrivacyState);
      setAgentSession(createInitialAgentSession(storedMessages));
      setVoiceRuntime(runtimeSnapshot);
      setStatusText(initialPrompt || welcomeText);
      setConversation(initialConversation);
      setVoiceStatusText(
        runtimeSnapshot.recognitionAvailable
          ? 'Mic ready hai. Voice input dev build mein test karein.'
          : 'Text chat ready hai. Live mic ke liye development build zaroori hai.'
      );
    };

    hydrate();
    initializeVoicePersona().catch(() => { });

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshNativeBridgeState = async () => {
    const [statusSnapshot, notificationSnapshot] = await Promise.all([
      getNativeBridgeStatus(),
      getCapturedNotifications(),
    ]);

    setNativeBridgeStatus(statusSnapshot);
    setNativeNotifications(Array.isArray(notificationSnapshot) ? notificationSnapshot : []);
  };

  useEffect(() => {
    refreshNativeBridgeState().catch(() => { });
  }, []);

  useEffect(() => {
    if (!utilityVisible) {
      return;
    }

    refreshNativeBridgeState().catch(() => { });
  }, [utilityVisible]);

  const latestMessage = messages[0] || null;
  const unreadCount = messages.filter((message) => !message.isRead).length;
  const sessionUnlocked = isPrivacyUnlocked(privacyState);
  const defaultPinActive = isDefaultPrivacyPin(privacyState);
  const selectedMessage = findMessageById(messages, agentSession.selectedMessageId) || latestMessage;
  const announcementText = buildAnnouncement(latestMessage, Boolean(settings.romanticCompanionMode));
  const suggestedReplies = getSuggestedReplies(selectedMessage, Boolean(settings.romanticCompanionMode));
  const displayedConversation = useMemo(() => conversation.slice(-6), [conversation]);
  const nativeBridgeAvailable = isNativeStageFourBridgeAvailable();
  const stageFourStatusLabel = nativeBridgeAvailable ? 'Native bridge ready' : 'Run Android dev build after prebuild';

  const appendConversation = (...entries) => {
    const cleanEntries = entries.filter((entry) => entry?.text);
    if (!cleanEntries.length) {
      return;
    }

    startTransition(() => {
      setConversation((current) => [...current, ...cleanEntries].slice(-14));
    });
  };

  const updateSetting = async (key, value) => {
    const nextSettings = {
      ...settingsRef.current,
      [key]: value,
    };

    settingsRef.current = nextSettings;
    setSettings(nextSettings);
    await saveAgentSettings(nextSettings);

    // Handle Native Side-Effects
    if (key === 'showFloatingBubble') {
      if (value) {
        await showFloatingBubble();
      } else {
        await hideFloatingBubble();
      }
    }

    if (key === 'assistantActive') {
      if (value) {
        await startNativeAssistantService();
        if (settingsRef.current.showFloatingBubble) {
          await showFloatingBubble();
        }
      } else {
        await hideFloatingBubble();
        await stopAssistantService();
      }
    }
  };

  const lockPrivacyNow = async () => {
    const lockedPrivacyState = await savePrivacyState(buildLockedPrivacyState(privacyStateRef.current));
    await lockLocalMemorySecuritySession();
    privacyStateRef.current = lockedPrivacyState;
    setPrivacyState(lockedPrivacyState);
    setStatusText('Privacy lock ab dobara active hai.');
    setAssistantMood('HAPPY');
  };

  const updateOwnerPin = async () => {
    const updateResult = updatePrivacyPin(privacyStateRef.current, {
      currentPin: currentPinDraft,
      nextPin: newPinDraft,
      confirmPin: confirmPinDraft,
    });

    if (!updateResult.ok) {
      setStatusText(updateResult.message || 'PIN update nahi ho saka.');
      setAssistantMood('SAD');
      return;
    }

    const savedPrivacyState = await savePrivacyState(updateResult.state);
    privacyStateRef.current = savedPrivacyState;
    setPrivacyState(savedPrivacyState);
    await syncLocalMemorySecurityPin(newPinDraft);
    setCurrentPinDraft('');
    setNewPinDraft('');
    setConfirmPinDraft('');
    setStatusText(updateResult.message || 'PIN update ho gaya hai.');
    setAssistantMood('HAPPY');
  };

  const applyAssistantResult = async (result) => {
    const nextInbox = result?.inbox ?? messagesRef.current;
    const nextPrivacyState = result?.privacyState ?? privacyStateRef.current;
    const nextSession = result?.session ?? sessionRef.current;
    const responseText = String(result?.responseText || '').trim();

    if (result?.inbox) {
      const savedInbox = await saveLocalInbox(nextInbox);
      messagesRef.current = savedInbox;
      setMessages(savedInbox);
    }

    if (result?.privacyState) {
      const savedPrivacyState = await savePrivacyState(nextPrivacyState);
      privacyStateRef.current = savedPrivacyState;
      setPrivacyState(savedPrivacyState);
    }

    if (result?.session) {
      sessionRef.current = nextSession;
      setAgentSession(nextSession);
    }

    if (!responseText) {
      return;
    }

    setStatusText(responseText);
    setAssistantMood(result?.mood || 'HAPPY');
    setActivityMode(result?.activityMode || 'CHAT');
    appendConversation(createChatEntry('assistant', responseText, { source: result?.type || 'assistant' }));

    const speechStarted = speakAssistantResponse(responseText, settingsRef.current, {
      onStart: () => {
        setIsSpeaking(true);
      },
      onEnd: () => {
        setIsSpeaking(false);
        setActivityMode(result?.activityMode || 'CHAT');
      },
    });

    if (!speechStarted) {
      setIsSpeaking(false);
    }
  };

  const submitPrompt = async (rawInput = composerText) => {
    const trimmedInput = String(rawInput || '').trim();
    if (!trimmedInput) {
      return;
    }

    setComposerText('');
    setIsThinking(true);
    setActivityMode('CHAT');
    appendConversation(createChatEntry('user', trimmedInput, { source: 'input' }));
    setStatusText('Soniya soch rahi hai...');

    try {
      const result = await routeAssistantInput({
        inputText: trimmedInput,
        inbox: messagesRef.current,
        settings: settingsRef.current,
        privacyState: privacyStateRef.current,
        session: sessionRef.current,
      });

      await applyAssistantResult(result);
    } catch (_error) {
      const fallbackText = 'Main abhi jawab nahi de pa rahi. Dobara try karein.';
      setStatusText(fallbackText);
      setAssistantMood('SAD');
      appendConversation(createChatEntry('assistant', fallbackText, { source: 'error' }));
    } finally {
      setIsThinking(false);
    }
  };

  const submitPin = async () => {
    const trimmedPin = String(pinInput || '').trim();
    if (!trimmedPin) {
      return;
    }

    setPinInput('');
    await submitPrompt(trimmedPin);
  };

  const refreshVoiceRuntime = async () => {
    const nextRuntime = await getVoiceRuntimeSnapshot();
    setVoiceRuntime(nextRuntime);
    setVoiceStatusText(
      nextRuntime.recognitionAvailable
        ? 'Voice runtime refreshed. Mic commands dev build mein chalne chahiye.'
        : 'Runtime refreshed. Text chat available hai, mic ke liye dev build chahiye.'
    );
  };

  const syncNativeNotifications = async () => {
    const latestNativeNotifications = await getCapturedNotifications();
    const mergedInbox = mergeNativeNotificationsIntoInbox(messagesRef.current, latestNativeNotifications);
    const savedInbox = await saveLocalInbox(mergedInbox);
    messagesRef.current = savedInbox;
    setMessages(savedInbox);
    setNativeNotifications(Array.isArray(latestNativeNotifications) ? latestNativeNotifications : []);
    setStatusText('Stage 4 native notifications local inbox mein sync kar di gayi hain.');
  };

  const clearNativeNotificationSnapshot = async () => {
    await clearCapturedNotifications();
    setNativeNotifications([]);
    setNativeBridgeStatus((current) => ({
      ...current,
      storedCount: 0,
    }));
    setStatusText('Stage 4 native notification snapshot clear kar diya gaya hai.');
  };

  const handleVoiceResult = async (spokenText) => {
    const cleanedSpeech = String(spokenText || '').trim();
    if (!cleanedSpeech) {
      return;
    }

    setVoiceStatusText(`Voice captured: "${cleanedSpeech}"`);
    await submitPrompt(cleanedSpeech);
  };

  const selectedMessagePreview = selectedMessage
    ? (sessionUnlocked ? selectedMessage.body : 'PIN verify karne ke baad full message dikhaya jayega.')
    : 'Abhi koi message select nahi hua.';

  return (
    <>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'android' ? 25 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <LinearGradient colors={['#06131f', '#13203e', '#3c1326']} style={styles.background}>
              <View style={styles.topBar}>
                <View>
                  <Text style={styles.brandEyebrow}>Companion Mode</Text>
                  <Text style={styles.brandTitle}>{APP_NAME}</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.utilityButton}
                  onPress={() => setUtilityVisible(true)}
                >
                  <Ionicons name="grid-outline" size={18} color="#fff8fb" />
                  <Text style={styles.utilityButtonText}>Utility</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.heroSection}>
                <View style={styles.heroGlow} />
                <View style={styles.avatarStage}>
                  <View style={styles.avatarFrame}>
                    <SoniyaAvatar
                      mood={assistantMood}
                      isSpeaking={isSpeaking}
                      isThinking={isThinking}
                      viewType="FULL"
                      activityMode={activityMode}
                      styleVariant={assistantMood === 'SAD' ? 'CASUAL' : 'ELEGANT'}
                      autoModeEnabled
                      pinToBottom
                    />
                  </View>
                </View>

                <View style={styles.heroOverlay}>
                  <View style={styles.speechCard}>
                    <Text style={styles.speechLabel}>Soniya</Text>
                    <Text numberOfLines={4} style={styles.speechText}>{statusText}</Text>
                  </View>

                  <View style={styles.heroMetaRow}>
                    <StatusPill
                      label={`${unreadCount} unread`}
                      accent={unreadCount > 0}
                      icon="mail-unread-outline"
                    />
                    <StatusPill
                      label={sessionUnlocked ? 'Unlocked' : 'Locked'}
                      accent={sessionUnlocked}
                      icon="shield-checkmark-outline"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.bottomDock}>
                <View style={styles.composerRow}>
                  <TextInput
                    value={composerText}
                    onChangeText={setComposerText}
                    placeholder="Type a message..."
                    placeholderTextColor="#8ea0b7"
                    style={styles.composerInput}
                  />
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={styles.sendButton}
                    onPress={() => submitPrompt()}
                  >
                    <Ionicons name="arrow-up" size={18} color="#082c2f" />
                  </TouchableOpacity>
                </View>

                <View style={styles.micActionRow}>
                  <VoiceHandler
                    onSpeechResult={handleVoiceResult}
                    showLabel={true}
                  />
                </View>
              </View>
            </LinearGradient>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <Modal
        animationType="slide"
        presentationStyle="fullScreen"
        visible={utilityVisible}
        onRequestClose={() => setUtilityVisible(false)}
      >
        <SafeAreaView style={styles.utilitySafeArea}>
          <StatusBar barStyle="light-content" />
          <LinearGradient colors={['#07111f', '#11263a', '#2a132e']} style={styles.utilityBackground}>
            <View style={styles.utilityHeader}>
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.backButton}
                onPress={() => setUtilityVisible(false)}
              >
                <Ionicons name="chevron-back" size={20} color="#fff" />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              <View style={styles.utilityHeaderCopy}>
                <Text style={styles.utilityHeaderEyebrow}>Utility Screen</Text>
                <Text style={styles.utilityHeaderTitle}>Advanced controls</Text>
              </View>
            </View>

            <ScrollView
              style={styles.utilityScroll}
              contentContainerStyle={styles.utilityContent}
              showsVerticalScrollIndicator={false}
            >
              <UtilityCard
                title="Message access"
                subtitle="Main screen clean rakha gaya hai. Yahan inbox, PIN, aur protected actions milengi."
              >
                <View style={styles.alertCard}>
                  <Text style={styles.alertLabel}>Latest alert</Text>
                  <Text style={styles.alertText}>{announcementText}</Text>
                  <Text style={styles.alertMeta}>
                    {latestMessage ? `${latestMessage.app} • ${latestMessage.receivedAt}` : 'No local message available'}
                  </Text>
                </View>

                <View style={styles.utilityChipRow}>
                  <StatusPill
                    label={sessionUnlocked ? 'Privacy unlocked' : 'Privacy locked'}
                    accent={sessionUnlocked}
                    icon="shield-half-outline"
                  />
                  <StatusPill
                    label={agentSession.pendingAction ? 'PIN required' : 'No pending lock'}
                    icon="key-outline"
                  />
                </View>

                <View style={styles.pinRow}>
                  <TextInput
                    value={pinInput}
                    onChangeText={setPinInput}
                    placeholder="Enter your PIN"
                    placeholderTextColor="#8290a5"
                    secureTextEntry
                    keyboardType="number-pad"
                    style={styles.pinInput}
                  />
                  <TouchableOpacity activeOpacity={0.88} style={styles.pinButton} onPress={submitPin}>
                    <Text style={styles.pinButtonText}>Verify</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.senderGrid}>
                  {messages.map((message) => (
                    <MessageSenderChip
                      key={message.id}
                      label={message.sender}
                      active={selectedMessage?.id === message.id}
                      onPress={() => submitPrompt(`${message.sender} ka message open karo`)}
                    />
                  ))}
                </View>

                <View style={styles.selectedMessageCard}>
                  <Text style={styles.selectedMessageLabel}>Selected message</Text>
                  <Text style={styles.selectedMessageSender}>{selectedMessage?.sender || 'No sender selected'}</Text>
                  <Text style={styles.selectedMessageText}>{selectedMessagePreview}</Text>
                  {!!selectedMessage?.lastReplyText && (
                    <Text style={styles.selectedReplyText}>Last local reply: {selectedMessage.lastReplyText}</Text>
                  )}
                </View>

                <Text style={styles.suggestionTitle}>Suggested replies</Text>
                {suggestedReplies.map((reply) => (
                  <TouchableOpacity
                    key={reply}
                    activeOpacity={0.85}
                    style={styles.suggestionItem}
                    onPress={() => submitPrompt(`Likho ${reply}`)}
                  >
                    <Text style={styles.suggestionItemText}>{reply}</Text>
                  </TouchableOpacity>
                ))}
              </UtilityCard>

              <UtilityCard
                title="Settings"
                subtitle="Local device settings. Main screen par sirf essentials rakhe gaye hain."
              >
                {SETTING_DEFINITIONS.map((setting) => (
                  <View key={setting.key} style={styles.settingRow}>
                    <View style={styles.settingCopy}>
                      <Text style={styles.settingTitle}>{setting.title}</Text>
                      <Text style={styles.settingDescription}>{setting.description}</Text>
                    </View>
                    <Switch
                      value={Boolean(settings[setting.key])}
                      onValueChange={(value) => updateSetting(setting.key, value)}
                      trackColor={{ false: '#324050', true: '#21c4b2' }}
                      thumbColor={settings[setting.key] ? '#f7fffd' : '#f5f7fb'}
                    />
                  </View>
                ))}
              </UtilityCard>

              <UtilityCard
                title="PIN security"
                subtitle="Apna privacy PIN yahan set ya change karein. Yeh local device par ही rahega."
              >
                <View style={styles.utilityChipRow}>
                  <StatusPill
                    label={defaultPinActive ? 'Default PIN active' : 'Custom PIN active'}
                    accent={!defaultPinActive}
                    icon="lock-closed-outline"
                  />
                  <StatusPill
                    label={sessionUnlocked ? 'Session unlocked' : 'Session locked'}
                    accent={sessionUnlocked}
                    icon="shield-checkmark-outline"
                  />
                </View>

                <View style={styles.voiceInfoCard}>
                  <Text style={styles.voiceInfoMain}>
                    {defaultPinActive
                      ? 'Privacy ko strong rakhne ke liye apna custom PIN set kar dein.'
                      : 'Custom PIN active hai. Zaroorat parhne par yahin se change kar sakte hain.'}
                  </Text>
                  <Text style={styles.voiceInfoMeta}>
                    PIN 4 se 8 digits ka hona chahiye. App aap ka PIN screen par khud reveal nahi karegi.
                  </Text>
                </View>

                <View style={styles.pinSecurityForm}>
                  <TextInput
                    value={currentPinDraft}
                    onChangeText={setCurrentPinDraft}
                    placeholder="Current PIN"
                    placeholderTextColor="#8290a5"
                    secureTextEntry
                    keyboardType="number-pad"
                    style={styles.pinInput}
                  />
                  <TextInput
                    value={newPinDraft}
                    onChangeText={setNewPinDraft}
                    placeholder="New PIN"
                    placeholderTextColor="#8290a5"
                    secureTextEntry
                    keyboardType="number-pad"
                    style={styles.pinInput}
                  />
                  <TextInput
                    value={confirmPinDraft}
                    onChangeText={setConfirmPinDraft}
                    placeholder="Confirm new PIN"
                    placeholderTextColor="#8290a5"
                    secureTextEntry
                    keyboardType="number-pad"
                    style={styles.pinInput}
                  />
                </View>

                <View style={styles.nativeActionsWrap}>
                  <TouchableOpacity
                    activeOpacity={0.88}
                    style={styles.refreshButton}
                    onPress={updateOwnerPin}
                  >
                    <Text style={styles.refreshButtonText}>Update PIN</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.88}
                    style={styles.secondaryInlineButton}
                    onPress={lockPrivacyNow}
                  >
                    <Text style={styles.secondaryInlineButtonText}>Lock now</Text>
                  </TouchableOpacity>
                </View>
              </UtilityCard>

              <UtilityCard
                title="Voice runtime"
                subtitle="Officially mic input tab chalegi jab app development build par run ho, Expo Go par nahi."
              >
                <View style={styles.utilityChipRow}>
                  <StatusPill
                    label={voiceRuntime.recognitionAvailable ? 'Recognition available' : 'Recognition unavailable'}
                    accent={voiceRuntime.recognitionAvailable}
                    icon="mic-circle-outline"
                  />
                  <StatusPill
                    label={voiceRuntime.permissionGranted ? 'Permission granted' : `Permission ${voiceRuntime.permissionStatus}`}
                    accent={voiceRuntime.permissionGranted}
                    icon="settings-outline"
                  />
                </View>

                <View style={styles.voiceInfoCard}>
                  <Text style={styles.voiceInfoMain}>{voiceStatusText}</Text>
                  <Text style={styles.voiceInfoMeta}>
                    {voiceRuntime.defaultRecognitionService
                      ? `Recognizer: ${voiceRuntime.defaultRecognitionService}`
                      : 'Recognizer package current runtime mein expose nahi ho raha.'}
                  </Text>
                  <Text style={styles.voiceInfoMeta}>
                    {voiceRuntime.assistantService
                      ? `Assistant service: ${voiceRuntime.assistantService}`
                      : 'Assistant package current runtime se nahi mil raha.'}
                  </Text>
                  {!!voiceRuntime.initErrorMessage && (
                    <Text style={styles.voiceInfoWarning}>Runtime note: {voiceRuntime.initErrorMessage}</Text>
                  )}
                </View>

                <TouchableOpacity
                  activeOpacity={0.88}
                  style={styles.refreshButton}
                  onPress={refreshVoiceRuntime}
                >
                  <Text style={styles.refreshButtonText}>Refresh voice runtime</Text>
                </TouchableOpacity>
              </UtilityCard>

              <UtilityCard
                title="Recent conversation"
                subtitle="Home screen clean rakhi gayi hai. Pichli baatein yahan dekh sakte hain."
              >
                {displayedConversation.length ? (
                  <View style={styles.utilityConversationList}>
                    {displayedConversation.map((item) => (
                      <ChatBubble key={item.id} item={item} />
                    ))}
                  </View>
                ) : (
                  <Text style={styles.utilityEmptyText}>Abhi conversation start nahi hui.</Text>
                )}
              </UtilityCard>

              <UtilityCard
                title="Stage 4 Android bridge"
                subtitle="Yeh native listener/service layer hai jo prebuild ke baad Android dev build mein active hogi."
              >
                <View style={styles.utilityChipRow}>
                  <StatusPill
                    label={stageFourStatusLabel}
                    accent={nativeBridgeAvailable}
                    icon="construct-outline"
                  />
                  <StatusPill
                    label={nativeBridgeStatus.notificationAccessEnabled ? 'Notification access enabled' : 'Notification access pending'}
                    accent={nativeBridgeStatus.notificationAccessEnabled}
                    icon="notifications-outline"
                  />
                  <StatusPill
                    label={nativeBridgeStatus.listenerConnected ? 'Listener connected' : 'Listener waiting'}
                    accent={nativeBridgeStatus.listenerConnected}
                    icon="pulse-outline"
                  />
                </View>

                <View style={styles.voiceInfoCard}>
                  <Text style={styles.voiceInfoMain}>
                    Stored native notifications: {nativeBridgeStatus.storedCount}
                  </Text>
                  <Text style={styles.voiceInfoMeta}>
                    Foreground service: {nativeBridgeStatus.foregroundServiceActive ? 'active' : 'inactive'}
                  </Text>
                  <Text style={styles.voiceInfoMeta}>
                    Native notifications in current snapshot: {nativeNotifications.length}
                  </Text>
                </View>

                <View style={styles.nativeActionsWrap}>
                  <TouchableOpacity
                    activeOpacity={0.88}
                    style={styles.refreshButton}
                    onPress={openNotificationListenerSettings}
                  >
                    <Text style={styles.refreshButtonText}>Open notification access</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.88}
                    style={styles.refreshButton}
                    onPress={startNativeAssistantService}
                  >
                    <Text style={styles.refreshButtonText}>Start background service</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.88}
                    style={styles.refreshButton}
                    onPress={requestNativeNotificationRebind}
                  >
                    <Text style={styles.refreshButtonText}>Request listener rebind</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.88}
                    style={styles.refreshButton}
                    onPress={refreshNativeBridgeState}
                  >
                    <Text style={styles.refreshButtonText}>Refresh Stage 4 status</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.nativeActionsWrap}>
                  <TouchableOpacity
                    activeOpacity={0.88}
                    style={styles.secondaryInlineButton}
                    onPress={syncNativeNotifications}
                  >
                    <Text style={styles.secondaryInlineButtonText}>Sync native inbox to app</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.88}
                    style={styles.secondaryInlineButton}
                    onPress={clearNativeNotificationSnapshot}
                  >
                    <Text style={styles.secondaryInlineButtonText}>Clear native snapshot</Text>
                  </TouchableOpacity>
                </View>
              </UtilityCard>

              <UtilityCard
                title="Privacy guardrails"
                subtitle="Protected flows ab bhi local hain. General conversation ke liye provider-backed chat route use ho sakta hai."
              >
                {PRIVACY_RULES.map((rule) => (
                  <View key={rule} style={styles.ruleRow}>
                    <View style={styles.ruleDot} />
                    <Text style={styles.ruleText}>{rule}</Text>
                  </View>
                ))}
              </UtilityCard>
            </ScrollView>
          </LinearGradient>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#040c16',
  },
  background: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 18,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandEyebrow: {
    color: '#91f0df',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  brandTitle: {
    marginTop: 4,
    color: '#fff5fa',
    fontSize: 26,
    fontWeight: '900',
  },
  utilityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  utilityButtonText: {
    color: '#fff8fb',
    fontSize: 13,
    fontWeight: '800',
  },
  heroSection: {
    flex: 1,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  heroGlow: {
    position: 'absolute',
    top: '10%',
    left: '8%',
    right: '8%',
    height: '56%',
    borderRadius: 200,
    backgroundColor: 'rgba(250, 114, 182, 0.16)',
  },
  avatarStage: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    // Removed overflow: 'hidden' to prevent clipping Soniya's head when scaled
  },
  avatarFrame: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    transform: [{ scale: 1.1 }], // Slightly reduced scale to keep face in view
    marginBottom: -40, // Adjusted to sit better on the dock
  },
  heroOverlay: {
    position: 'absolute',
    top: 10,
    left: 16,
    right: 16,
    gap: 10,
  },
  speechCard: {
    alignSelf: 'flex-start',
    maxWidth: '74%',
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: 'rgba(8, 18, 32, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  speechLabel: {
    color: '#91f0df',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  speechText: {
    marginTop: 6,
    color: '#f9edf6',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(4,12,25,0.58)',
  },
  statusPillAccent: {
    backgroundColor: '#bafaf3',
    borderColor: '#bafaf3',
  },
  statusPillText: {
    color: '#eaf8fb',
    fontSize: 11,
    fontWeight: '800',
  },
  statusPillTextAccent: {
    color: '#092c30',
  },
  bottomDock: {
    marginHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 10,
    gap: 15,
  },
  micActionRow: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  voiceActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  voiceActionLabel: {
    color: '#91f0df',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  recentSignalCard: {
    marginBottom: 10,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  recentSignalLabel: {
    color: '#91f0df',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  recentSignalText: {
    marginTop: 5,
    color: '#f4edf8',
    fontSize: 13,
    lineHeight: 18,
  },
  chatBubble: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  chatBubbleUser: {
    alignSelf: 'flex-end',
    marginLeft: 52,
    backgroundColor: '#1d3e54',
    borderColor: 'rgba(136, 231, 220, 0.24)',
  },
  chatBubbleAssistant: {
    alignSelf: 'flex-start',
    marginRight: 42,
    backgroundColor: '#201628',
    borderColor: 'rgba(249, 181, 215, 0.18)',
  },
  chatRole: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  chatRoleUser: {
    color: '#91f0df',
  },
  chatRoleAssistant: {
    color: '#f4b6da',
  },
  chatText: {
    marginTop: 5,
    color: '#f7f2fb',
    fontSize: 14,
    lineHeight: 20,
  },
  quickRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickButton: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: '#10192a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  quickButtonText: {
    color: '#e7deef',
    fontSize: 11,
    fontWeight: '700',
    maxWidth: 118,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  composerInput: {
    flex: 1,
    height: 54,
    borderRadius: 27,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  sendButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  miniAction: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#1b1830',
    borderWidth: 1,
    borderColor: 'rgba(244,182,218,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  miniActionText: {
    color: '#fef2f7',
    fontSize: 12,
    fontWeight: '800',
  },
  runtimeNote: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  runtimeNoteText: {
    flex: 1,
    color: '#9fb7bf',
    fontSize: 11,
    lineHeight: 16,
  },
  utilitySafeArea: {
    flex: 1,
    backgroundColor: '#06111d',
  },
  utilityBackground: {
    flex: 1,
  },
  utilityHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  utilityHeaderCopy: {
    flex: 1,
  },
  utilityHeaderEyebrow: {
    color: '#8fe9d7',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  utilityHeaderTitle: {
    marginTop: 3,
    color: '#fff4f8',
    fontSize: 22,
    fontWeight: '900',
  },
  utilityScroll: {
    flex: 1,
    marginTop: 12,
  },
  utilityContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 36,
  },
  utilityCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: 'rgba(8, 18, 32, 0.84)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  utilityTitle: {
    color: '#fff6fb',
    fontSize: 20,
    fontWeight: '900',
  },
  utilitySubtitle: {
    marginTop: 6,
    marginBottom: 14,
    color: '#b8c4d4',
    fontSize: 13,
    lineHeight: 19,
  },
  alertCard: {
    borderRadius: 18,
    padding: 15,
    backgroundColor: '#161f34',
    borderWidth: 1,
    borderColor: 'rgba(249,181,215,0.18)',
  },
  alertLabel: {
    color: '#f4b6da',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  alertText: {
    marginTop: 8,
    color: '#fbf5fd',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 24,
  },
  alertMeta: {
    marginTop: 8,
    color: '#afbccb',
    fontSize: 12,
  },
  utilityChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  pinRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  pinSecurityForm: {
    marginTop: 14,
    gap: 10,
  },
  pinInput: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#091321',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    color: '#f7f7fa',
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
  },
  pinButton: {
    borderRadius: 16,
    backgroundColor: '#f5a5cb',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  pinButtonText: {
    color: '#341427',
    fontSize: 13,
    fontWeight: '900',
  },
  senderGrid: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  senderChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#0b1425',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  senderChipActive: {
    backgroundColor: '#f8c8df',
    borderColor: '#f8c8df',
  },
  senderChipText: {
    color: '#ece3f4',
    fontSize: 13,
    fontWeight: '800',
  },
  senderChipTextActive: {
    color: '#451d3a',
  },
  selectedMessageCard: {
    marginTop: 16,
    borderRadius: 18,
    padding: 15,
    backgroundColor: '#0b1425',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  selectedMessageLabel: {
    color: '#91f0df',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  selectedMessageSender: {
    marginTop: 9,
    color: '#fff5fb',
    fontSize: 18,
    fontWeight: '900',
  },
  selectedMessageText: {
    marginTop: 8,
    color: '#dce5f1',
    fontSize: 14,
    lineHeight: 21,
  },
  selectedReplyText: {
    marginTop: 8,
    color: '#91f0df',
    fontSize: 12,
    lineHeight: 18,
  },
  suggestionTitle: {
    marginTop: 14,
    marginBottom: 10,
    color: '#fff5fb',
    fontSize: 14,
    fontWeight: '800',
  },
  suggestionItem: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: '#151f33',
    marginBottom: 8,
  },
  suggestionItemText: {
    color: '#edf2f9',
    fontSize: 13,
    lineHeight: 19,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  settingCopy: {
    flex: 1,
  },
  settingTitle: {
    color: '#fff4f8',
    fontSize: 15,
    fontWeight: '800',
  },
  settingDescription: {
    marginTop: 5,
    color: '#b3c0cf',
    fontSize: 13,
    lineHeight: 19,
  },
  voiceInfoCard: {
    marginTop: 14,
    borderRadius: 18,
    padding: 15,
    backgroundColor: '#161f34',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  voiceInfoMain: {
    color: '#f5f6fb',
    fontSize: 14,
    lineHeight: 21,
  },
  voiceInfoMeta: {
    marginTop: 8,
    color: '#b3c0cf',
    fontSize: 12,
    lineHeight: 18,
  },
  voiceInfoWarning: {
    marginTop: 8,
    color: '#f5a5cb',
    fontSize: 12,
    lineHeight: 18,
  },
  utilityConversationList: {
    gap: 10,
  },
  utilityEmptyText: {
    color: '#b3c0cf',
    fontSize: 13,
    lineHeight: 19,
  },
  refreshButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#1b3850',
    borderWidth: 1,
    borderColor: 'rgba(145,240,223,0.2)',
  },
  refreshButtonText: {
    color: '#ddfff9',
    fontSize: 12,
    fontWeight: '900',
  },
  nativeActionsWrap: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  secondaryInlineButton: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#141d2f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  secondaryInlineButtonText: {
    color: '#edf2f9',
    fontSize: 12,
    fontWeight: '800',
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  ruleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    backgroundColor: '#1fd0bc',
  },
  ruleText: {
    flex: 1,
    color: '#e6edf6',
    fontSize: 14,
    lineHeight: 20,
  },
});
