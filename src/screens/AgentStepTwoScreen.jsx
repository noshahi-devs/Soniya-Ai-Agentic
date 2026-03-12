import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  Image,
  ImageBackground,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { QUICK_COMMANDS } from '../ai/intentEngine';
import VoiceUI from '../components/VoiceUI';
import VoiceHandler from '../../components/VoiceHandler';
import {
  APP_NAME,
  APP_STAGE,
  APP_TAGLINE,
  COMPANION_PERSONA,
  DEFAULT_SETTINGS,
  PRIVACY_RULES,
  SETTING_DEFINITIONS,
} from '../constants/appConfig';
import { createInitialAgentSession, processAgentCommand, processQuickAction } from '../services/messageHandler';
import {
  buildAnnouncement,
  findMessageById,
  getSuggestedReplies,
  loadLocalInbox,
  saveLocalInbox,
} from '../storage/messageStore';
import {
  DEFAULT_PRIVACY_STATE,
  isPrivacyUnlocked,
  loadPrivacyState,
  savePrivacyState,
} from '../storage/privacyStorage';
import {
  getVoiceRuntimeSnapshot,
  initializeVoicePersona,
  speakAssistantResponse,
} from '../services/voiceService';
import { loadAgentSettings, saveAgentSettings } from '../storage/settingsStorage';

const COMPANION_BACKGROUND = require('../../assets/images/bg_rose.jpg');
const COMPANION_PORTRAIT = require('../../assets/images/soniya-agentic-ai-portrait.png');

function Chip({ label, accent = false }) {
  return (
    <View style={[styles.chip, accent && styles.chipAccent]}>
      <Text style={[styles.chipText, accent && styles.chipTextAccent]}>{label}</Text>
    </View>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function AgentStepTwoScreen() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [messages, setMessages] = useState([]);
  const [privacyState, setPrivacyState] = useState(DEFAULT_PRIVACY_STATE);
  const [agentSession, setAgentSession] = useState(() => createInitialAgentSession());
  const [commandInput, setCommandInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [statusText, setStatusText] = useState('Loading Step 3 voice-assisted local workflow...');
  const [voiceStatusText, setVoiceStatusText] = useState('Voice engine is checking runtime support...');
  const [voiceRuntime, setVoiceRuntime] = useState({
    recognitionAvailable: false,
    permissionGranted: false,
    permissionStatus: 'checking',
    canAskAgain: false,
    defaultRecognitionService: '',
    assistantService: '',
    initErrorMessage: '',
  });

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      const [storedSettings, storedMessages, storedPrivacyState, nextVoiceRuntime] = await Promise.all([
        loadAgentSettings(),
        loadLocalInbox(),
        loadPrivacyState(),
        getVoiceRuntimeSnapshot(),
      ]);

      if (!isMounted) {
        return;
      }

      setSettings(storedSettings);
      setMessages(storedMessages);
      setPrivacyState(storedPrivacyState);
      setAgentSession(createInitialAgentSession(storedMessages));
      setStatusText('Step 3 voice-assisted local agent flow is ready. Try a command below.');
      setVoiceRuntime(nextVoiceRuntime);
      setVoiceStatusText(
        nextVoiceRuntime.recognitionAvailable
          ? 'Voice input is available for dev build testing.'
          : 'Voice input is unavailable in this runtime. Dev build is required for live mic commands.'
      );
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    initializeVoicePersona().catch(() => {});
  }, []);

  const romanticToneEnabled = Boolean(settings.romanticCompanionMode);
  const sessionUnlocked = isPrivacyUnlocked(privacyState);
  const latestMessage = messages[0] || null;
  const selectedMessage = findMessageById(messages, agentSession.selectedMessageId) || latestMessage;
  const announcementText = buildAnnouncement(latestMessage, romanticToneEnabled);
  const suggestedReplies = getSuggestedReplies(selectedMessage, romanticToneEnabled);
  const voiceModeLabel = voiceRuntime.recognitionAvailable ? 'Mic ready for dev build' : 'Mic fallback mode';
  const voicePermissionLabel = voiceRuntime.permissionGranted
    ? 'Mic permission granted'
    : `Mic permission ${voiceRuntime.permissionStatus}`;
  const voiceSpeechLabel = settings.voiceNotifications && !settings.presenceMode
    ? 'Spoken replies active'
    : 'Spoken replies paused';
  const voiceServiceSummary = voiceRuntime.defaultRecognitionService
    ? `Recognizer: ${voiceRuntime.defaultRecognitionService}`
    : 'Recognizer service will appear after the dev build runs on device.';
  const assistantServiceSummary = voiceRuntime.assistantService
    ? `Assistant: ${voiceRuntime.assistantService}`
    : 'Assistant package not exposed in the current runtime.';

  const applyAssistantResult = async (result) => {
    const nextInbox = result.inbox || messages;
    const nextPrivacy = result.privacyState || privacyState;

    if (result.inbox && result.inbox !== messages) {
      const savedInbox = await saveLocalInbox(nextInbox);
      setMessages(savedInbox);
    } else {
      setMessages(nextInbox);
    }

    if (result.privacyState && result.privacyState !== privacyState) {
      const savedPrivacy = await savePrivacyState(nextPrivacy);
      setPrivacyState(savedPrivacy);
    } else {
      setPrivacyState(nextPrivacy);
    }

    if (result.session) {
      setAgentSession(result.session);
    }

    if (result.responseText) {
      setStatusText(result.responseText);
      speakAssistantResponse(result.responseText, settings);
    }
  };

  const runCommand = async (rawCommand = commandInput) => {
    const trimmed = String(rawCommand || '').trim();
    if (!trimmed) {
      return;
    }

    const result = processAgentCommand({
      commandText: trimmed,
      inbox: messages,
      settings,
      privacyState,
      session: agentSession,
    });

    await applyAssistantResult(result);
    setCommandInput('');
  };

  const runAction = async (actionType) => {
    const result = processQuickAction({
      actionType,
      inbox: messages,
      settings,
      privacyState,
      session: agentSession,
    });

    await applyAssistantResult(result);
  };

  const verifyPinFromInput = async () => {
    if (!pinInput.trim()) {
      return;
    }

    await runCommand(pinInput.trim());
    setPinInput('');
  };

  const refreshVoiceRuntime = async () => {
    const nextVoiceRuntime = await getVoiceRuntimeSnapshot();
    setVoiceRuntime(nextVoiceRuntime);
    setVoiceStatusText(
      nextVoiceRuntime.recognitionAvailable
        ? 'Voice runtime refreshed. Mic commands can be tested in the dev build.'
        : 'Voice runtime refreshed. Current environment still cannot start live recognition.'
    );
  };

  const handleVoiceResult = async (spokenText) => {
    const trimmedSpeech = String(spokenText || '').trim();
    if (!trimmedSpeech) {
      return;
    }

    setCommandInput(trimmedSpeech);
    setVoiceStatusText(`Voice captured: "${trimmedSpeech}"`);
    await runCommand(trimmedSpeech);
  };

  const updateSetting = async (key, value) => {
    const nextSettings = {
      ...settings,
      [key]: value,
    };

    setSettings(nextSettings);
    await saveAgentSettings(nextSettings);
    setStatusText(`${key} saved locally. Step 3 remains on-device.`);
  };

  const actionButtons = [
    { key: 'YES', label: 'Yes', onPress: () => runAction('YES') },
    { key: 'NO', label: 'No', onPress: () => runAction('NO') },
    { key: 'REPLY', label: 'Reply', onPress: () => runAction('REPLY') },
    ...(agentSession.pendingReplyMessageId && agentSession.replyDraft
      ? [{ key: 'SEND', label: 'Send', onPress: () => runAction('SEND') }]
      : []),
    { key: 'LOCK', label: 'Lock', onPress: () => runAction('LOCK') },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient colors={['#140d26', '#3f2046', '#15445d']} style={styles.hero}>
          <Text style={styles.eyebrow}>{APP_STAGE}</Text>
          <Text style={styles.heroTitle}>{APP_NAME}</Text>
          <Text style={styles.heroSubtitle}>{APP_TAGLINE}</Text>
          <View style={styles.chipRow}>
            <Chip label="Local intent" accent />
            <Chip label="PIN gate" />
            <Chip label="Reply flow" />
            <Chip label="Romantic tone" />
          </View>
        </LinearGradient>

        <View style={styles.statusBarCard}>
          <Text style={styles.statusLabel}>Current status</Text>
          <Text style={styles.statusValue}>{statusText}</Text>
        </View>

        <Card title={COMPANION_PERSONA.title} subtitle={COMPANION_PERSONA.description}>
          <ImageBackground
            source={COMPANION_BACKGROUND}
            imageStyle={styles.companionBackground}
            style={styles.companionStage}
          >
            <LinearGradient
              colors={['rgba(24,10,32,0.25)', 'rgba(24,10,32,0.72)', 'rgba(10,14,24,0.92)']}
              style={styles.companionOverlay}
            >
              <View style={styles.companionCopy}>
                <Text style={styles.companionTag}>Soniya Agentic AI</Text>
                <Text style={styles.companionHeading}>Step 3 adds live voice handling.</Text>
                <Text style={styles.companionText}>
                  Local command parsing, message reading, reply drafting, and spoken assistant feedback now work together in one on-device flow.
                </Text>
              </View>
              <Image source={COMPANION_PORTRAIT} style={styles.companionPortrait} resizeMode="contain" />
            </LinearGradient>
          </ImageBackground>
        </Card>

        <Card
          title="Voice command engine"
          subtitle="Mic input uses on-device speech recognition in the dev build. Expo Go keeps a safe fallback and still allows spoken responses."
        >
          <VoiceHandler
            onSpeechResult={handleVoiceResult}
            onListenStart={() => setVoiceStatusText('Listening... boliye.')}
            onListenEnd={() => setVoiceStatusText('Listening session ended.')}
            variant="AI"
          />

          <View style={styles.chipRow}>
            <Chip label={voiceModeLabel} accent={voiceRuntime.recognitionAvailable} />
            <Chip label={voicePermissionLabel} />
            <Chip label={voiceSpeechLabel} accent={settings.voiceNotifications && !settings.presenceMode} />
          </View>

          <View style={styles.voiceInfoBox}>
            <Text style={styles.voiceInfoText}>{voiceStatusText}</Text>
            <Text style={styles.voiceInfoMeta}>{voiceServiceSummary}</Text>
            <Text style={styles.voiceInfoMeta}>{assistantServiceSummary}</Text>
            {!!voiceRuntime.initErrorMessage && (
              <Text style={styles.voiceInfoWarning}>
                Runtime note: {voiceRuntime.initErrorMessage}
              </Text>
            )}
          </View>

          <TouchableOpacity style={styles.secondaryButton} onPress={refreshVoiceRuntime} activeOpacity={0.88}>
            <Text style={styles.secondaryButtonText}>Refresh voice runtime</Text>
          </TouchableOpacity>
        </Card>

        <Card
          title="Agent command center"
          subtitle="Type commands here or trigger them from the voice engine while native notification listener work is still pending."
        >
          <VoiceUI
            value={commandInput}
            onChangeText={setCommandInput}
            onSubmit={() => runCommand()}
            quickCommands={QUICK_COMMANDS}
            onQuickCommand={runCommand}
            responseText={agentSession.lastResponse || statusText}
            history={agentSession.history || []}
            actions={actionButtons}
          />
        </Card>

        <Card
          title="Message sandbox"
          subtitle="Protected actions require PIN verification and continue locally after verification."
        >
          <View style={styles.notificationCard}>
            <Text style={styles.notificationLabel}>Incoming alert preview</Text>
            <Text style={styles.notificationText}>{announcementText}</Text>
            <Text style={styles.notificationMeta}>
              {latestMessage ? `${latestMessage.app} - ${latestMessage.receivedAt}` : 'Waiting for local messages'}
            </Text>
          </View>

          <View style={styles.chipRow}>
            <Chip label={sessionUnlocked ? 'Privacy unlocked' : 'Privacy locked'} accent={sessionUnlocked} />
            <Chip label={agentSession.pendingAction ? 'Pending PIN action' : 'No pending PIN action'} />
          </View>

          <View style={styles.pinRow}>
            <TextInput
              value={pinInput}
              onChangeText={setPinInput}
              placeholder="Enter PIN to unlock pending action"
              placeholderTextColor="#7f8ea3"
              style={styles.pinInput}
              keyboardType="number-pad"
              secureTextEntry
            />
            <TouchableOpacity style={styles.pinButton} onPress={verifyPinFromInput} activeOpacity={0.9}>
              <Text style={styles.pinButtonText}>Verify PIN</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.senderGrid}>
            {messages.map((message) => {
              const isActive = selectedMessage?.id === message.id;
              return (
                <TouchableOpacity
                  key={message.id}
                  style={[styles.senderCard, isActive && styles.senderCardActive]}
                  onPress={() => runCommand(`${message.sender} ka message open karo`)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.senderName, isActive && styles.senderNameActive]}>{message.sender}</Text>
                  <Text style={styles.senderMeta}>{message.isRead ? 'Read' : 'Unread'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.messageCard}>
            <Text style={styles.messageLabel}>Selected message</Text>
            {selectedMessage ? (
              <>
                <Text style={styles.messageSender}>{selectedMessage.sender}</Text>
                <Text style={styles.messageBody}>
                  {sessionUnlocked ? selectedMessage.body : 'PIN required before full content can be read.'}
                </Text>
                {!!selectedMessage.lastReplyText && (
                  <Text style={styles.replyStatus}>Last local reply: {selectedMessage.lastReplyText}</Text>
                )}
              </>
            ) : (
              <Text style={styles.messageBody}>No message selected yet.</Text>
            )}
          </View>

          <Text style={styles.suggestionLabel}>Suggested local replies</Text>
          {suggestedReplies.map((reply) => (
            <View key={reply} style={styles.suggestionChip}>
              <Text style={styles.suggestionText}>{reply}</Text>
            </View>
          ))}
        </Card>

        <Card title="Settings control panel" subtitle="All controls are still saved locally on device.">
          {SETTING_DEFINITIONS.map((setting) => (
            <View key={setting.key} style={styles.settingRow}>
              <View style={styles.settingCopy}>
                <Text style={styles.settingTitle}>{setting.title}</Text>
                <Text style={styles.settingDescription}>{setting.description}</Text>
              </View>
              <Switch
                value={Boolean(settings[setting.key])}
                onValueChange={(value) => updateSetting(setting.key, value)}
                trackColor={{ false: '#3a465a', true: '#15b8a6' }}
                thumbColor={settings[setting.key] ? '#f5fffd' : '#f4f4f5'}
              />
            </View>
          ))}
        </Card>

        <Card title="Privacy rules" subtitle="These are now backed by the local Step 3 command and voice flow.">
          {PRIVACY_RULES.map((rule) => (
            <View key={rule} style={styles.ruleRow}>
              <View style={styles.ruleDot} />
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ))}
          <Text style={styles.logNote}>
            Running work log file: `SONIYA_AGENTIC_AI_IMPLEMENTATION_LOG.md`
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#07111f',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  hero: {
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  eyebrow: {
    color: '#f9b4d9',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    marginTop: 10,
    color: '#fdf8ff',
    fontSize: 32,
    fontWeight: '800',
  },
  heroSubtitle: {
    marginTop: 8,
    color: '#e9d7ea',
    fontSize: 15,
    lineHeight: 22,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipAccent: {
    backgroundColor: '#dffcf7',
    borderColor: '#dffcf7',
  },
  chipText: {
    color: '#f3e7f6',
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextAccent: {
    color: '#083b34',
  },
  statusBarCard: {
    backgroundColor: '#17182c',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statusLabel: {
    color: '#84e6d7',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusValue: {
    marginTop: 8,
    color: '#f5eefb',
    fontSize: 14,
    lineHeight: 21,
  },
  card: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#0d1727',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardTitle: {
    color: '#fdf8ff',
    fontSize: 20,
    fontWeight: '800',
  },
  cardSubtitle: {
    marginTop: 6,
    marginBottom: 16,
    color: '#baaec6',
    fontSize: 14,
    lineHeight: 20,
  },
  companionStage: {
    height: 340,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#151729',
  },
  companionBackground: {
    opacity: 0.36,
  },
  companionOverlay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  companionCopy: {
    flex: 1,
    paddingBottom: 22,
    paddingRight: 10,
  },
  companionTag: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
    color: '#fdf8ff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  companionHeading: {
    marginTop: 14,
    color: '#fff6fb',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  companionText: {
    marginTop: 10,
    color: '#edd8e8',
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 220,
  },
  companionPortrait: {
    width: 180,
    height: 300,
    marginRight: -6,
  },
  notificationCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#17182c',
    borderWidth: 1,
    borderColor: 'rgba(244,114,182,0.18)',
  },
  notificationLabel: {
    color: '#f9b4d9',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  notificationText: {
    marginTop: 10,
    color: '#fdf8ff',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
  },
  notificationMeta: {
    marginTop: 10,
    color: '#b8aec3',
    fontSize: 13,
  },
  pinRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  pinInput: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#0a1220',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    color: '#f5fbff',
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
  },
  pinButton: {
    borderRadius: 16,
    backgroundColor: '#f59bc8',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  pinButtonText: {
    color: '#341427',
    fontSize: 13,
    fontWeight: '800',
  },
  senderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  senderCard: {
    minWidth: 112,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#0a1220',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  senderCardActive: {
    backgroundColor: '#f7c6e0',
    borderColor: '#f7c6e0',
  },
  senderName: {
    color: '#f0e7f6',
    fontSize: 13,
    fontWeight: '700',
  },
  senderNameActive: {
    color: '#402038',
  },
  senderMeta: {
    marginTop: 4,
    color: '#b8aec3',
    fontSize: 11,
    fontWeight: '600',
  },
  messageCard: {
    marginTop: 16,
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#0a1220',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  messageLabel: {
    color: '#f9b4d9',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  messageSender: {
    marginTop: 10,
    color: '#fdf8ff',
    fontSize: 18,
    fontWeight: '800',
  },
  messageBody: {
    marginTop: 8,
    color: '#ece2f2',
    fontSize: 15,
    lineHeight: 23,
  },
  replyStatus: {
    marginTop: 10,
    color: '#84e6d7',
    fontSize: 12,
    lineHeight: 18,
  },
  suggestionLabel: {
    marginTop: 16,
    marginBottom: 10,
    color: '#fdf8ff',
    fontSize: 14,
    fontWeight: '700',
  },
  suggestionChip: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#17182c',
    marginBottom: 8,
  },
  suggestionText: {
    color: '#ece2f2',
    fontSize: 13,
    lineHeight: 19,
  },
  voiceInfoBox: {
    marginTop: 16,
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#17182c',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  voiceInfoText: {
    color: '#f4edf8',
    fontSize: 14,
    lineHeight: 21,
  },
  voiceInfoMeta: {
    marginTop: 8,
    color: '#b8aec3',
    fontSize: 12,
    lineHeight: 18,
  },
  voiceInfoWarning: {
    marginTop: 8,
    color: '#f9b4d9',
    fontSize: 12,
    lineHeight: 18,
  },
  secondaryButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#1c3550',
    borderWidth: 1,
    borderColor: 'rgba(132,230,215,0.28)',
  },
  secondaryButtonText: {
    color: '#dffcf7',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  settingCopy: {
    flex: 1,
  },
  settingTitle: {
    color: '#fdf8ff',
    fontSize: 15,
    fontWeight: '700',
  },
  settingDescription: {
    marginTop: 5,
    color: '#b8aec3',
    fontSize: 13,
    lineHeight: 19,
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
    backgroundColor: '#15b8a6',
    marginTop: 6,
  },
  ruleText: {
    flex: 1,
    color: '#e4dceb',
    fontSize: 14,
    lineHeight: 21,
  },
  logNote: {
    marginTop: 12,
    color: '#84e6d7',
    fontSize: 13,
    lineHeight: 19,
  },
});

export default AgentStepTwoScreen;
