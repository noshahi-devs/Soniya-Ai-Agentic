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
import { getProviderStatus, PROVIDER_RULES } from '../ai/providerPolicy';
import {
  APP_NAME,
  APP_STAGE,
  APP_TAGLINE,
  COMPANION_PERSONA,
  DEFAULT_SETTINGS,
  DEMO_OWNER_PIN,
  PRIVACY_RULES,
  REQUIRED_PERMISSIONS,
  ROADMAP,
  SETTING_DEFINITIONS,
  SYSTEM_MODULES,
} from '../constants/appConfig';
import { buildAnnouncement, getSuggestedReplies, loadLocalInbox } from '../storage/messageStore';
import { loadAgentSettings, saveAgentSettings } from '../storage/settingsStorage';

const COMPANION_BACKGROUND = require('../../assets/images/bg_rose.jpg');
const COMPANION_PORTRAIT = require('../../assets/images/soniya-agentic-ai-portrait.png');

function Badge({ label, accent = false }) {
  return (
    <View style={[styles.badge, accent && styles.badgeAccent]}>
      <Text style={[styles.badgeText, accent && styles.badgeTextAccent]}>{label}</Text>
    </View>
  );
}

function SectionCard({ title, subtitle, children }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function AgentHomeScreen() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [messages, setMessages] = useState([]);
  const [selectedMessageId, setSelectedMessageId] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [sessionUnlocked, setSessionUnlocked] = useState(false);
  const [statusText, setStatusText] = useState('Loading Soniya with privacy-first companion mode...');

  useEffect(() => {
    let isMounted = true;

    const hydrateLocalState = async () => {
      const [storedSettings, storedMessages] = await Promise.all([
        loadAgentSettings(),
        loadLocalInbox(),
      ]);

      if (!isMounted) {
        return;
      }

      setSettings(storedSettings);
      setMessages(storedMessages);
      setSelectedMessageId(storedMessages[0]?.id || '');
      setStatusText('Stage 1 foundation is ready, jani. Settings and local inbox are loaded on this device.');
    };

    hydrateLocalState();

    return () => {
      isMounted = false;
    };
  }, []);

  const latestMessage = messages[0];
  const selectedMessage = messages.find((message) => message.id === selectedMessageId) || latestMessage;
  const providerStatus = getProviderStatus();
  const romanticToneEnabled = Boolean(settings.romanticCompanionMode);
  const announcementText = buildAnnouncement(latestMessage, romanticToneEnabled);
  const suggestedReplies = getSuggestedReplies(selectedMessage, romanticToneEnabled);

  const updateSetting = async (key, value) => {
    const nextSettings = {
      ...settings,
      [key]: value,
    };

    setSettings(nextSettings);
    await saveAgentSettings(nextSettings);
    setStatusText(`${key} saved locally. Soniya stays on-device with no cloud sync.`);
  };

  const verifyPin = () => {
    if (pinInput.trim() === DEMO_OWNER_PIN) {
      setSessionUnlocked(true);
      setStatusText('PIN verified, jaan. Sender list and message content are unlocked for this session.');
      return;
    }

    setSessionUnlocked(false);
    setStatusText('Tell me PIN code first, jani. Demo PIN for this stage is 1598.');
  };

  const lockSession = () => {
    setSessionUnlocked(false);
    setPinInput('');
    setStatusText('Privacy session locked again. Warm tone stays on, access stays protected.');
  };

  const openMessage = (messageId) => {
    if (!sessionUnlocked) {
      setStatusText('PIN verification is required before reading message content, jani.');
      return;
    }

    setSelectedMessageId(messageId);
    setStatusText('Selected sender is now available for the local reading flow.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient colors={['#140d26', '#3f2046', '#15445d']} style={styles.hero}>
          <Text style={styles.heroEyebrow}>{APP_STAGE}</Text>
          <Text style={styles.heroTitle}>{APP_NAME}</Text>
          <Text style={styles.heroSubtitle}>{APP_TAGLINE}</Text>
          <View style={styles.badgeRow}>
            <Badge label="Expo base" accent />
            <Badge label="Local-first" />
            <Badge label="PIN gate" />
            <Badge label="Command-only AI" />
            <Badge label="Romantic tone" />
          </View>
        </LinearGradient>

        <View style={styles.statusStrip}>
          <Text style={styles.statusLabel}>Current status</Text>
          <Text style={styles.statusText}>{statusText}</Text>
        </View>

        <SectionCard
          title={COMPANION_PERSONA.title}
          subtitle={COMPANION_PERSONA.description}
        >
          <ImageBackground
            source={COMPANION_BACKGROUND}
            imageStyle={styles.companionBackdropImage}
            style={styles.companionStage}
          >
            <LinearGradient
              colors={['rgba(24,10,32,0.25)', 'rgba(24,10,32,0.72)', 'rgba(10,14,24,0.92)']}
              style={styles.companionOverlay}
            >
              <View style={styles.companionCopy}>
                <Text style={styles.companionTag}>Soniya Agentic AI</Text>
                <Text style={styles.companionHeadline}>Romantic, lovely, friendly, and still privacy-first.</Text>
                <Text style={styles.companionBody}>
                  Your companion tone stays soft and warm while message access, PIN checks, and on-device rules remain strict.
                </Text>
              </View>
              <Image source={COMPANION_PORTRAIT} style={styles.companionPortrait} resizeMode="contain" />
            </LinearGradient>
          </ImageBackground>

          {COMPANION_PERSONA.samples.map((sample, index) => (
            <View
              key={sample}
              style={[styles.personaBubble, index === 1 && styles.personaBubbleAccent]}
            >
              <Text style={styles.personaBubbleText}>{sample}</Text>
            </View>
          ))}
        </SectionCard>

        <SectionCard
          title="Requirement alignment"
          subtitle="This screen now follows the technical document while preserving the warm and lovely companion tone."
        >
          {PRIVACY_RULES.map((rule) => (
            <View key={rule} style={styles.listRow}>
              <View style={styles.listDot} />
              <Text style={styles.listText}>{rule}</Text>
            </View>
          ))}
        </SectionCard>

        <SectionCard
          title="Settings control panel"
          subtitle="All controls are saved locally with AsyncStorage. No analytics or cloud sync is used here."
        >
          {SETTING_DEFINITIONS.map((setting) => (
            <View key={setting.key} style={styles.toggleCard}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleTitle}>{setting.title}</Text>
                <Text style={styles.toggleDescription}>{setting.description}</Text>
              </View>
              <Switch
                value={Boolean(settings[setting.key])}
                onValueChange={(value) => updateSetting(setting.key, value)}
                trackColor={{ false: '#3a465a', true: '#15b8a6' }}
                thumbColor={settings[setting.key] ? '#f5fffd' : '#f4f4f5'}
              />
            </View>
          ))}
        </SectionCard>

        <SectionCard
          title="Local message sandbox"
          subtitle="This is the Expo-safe simulation layer for the requirement flow before native Android notification listener work."
        >
          <View style={styles.notificationCard}>
            <Text style={styles.notificationLabel}>Incoming alert preview</Text>
            <Text style={styles.notificationText}>{announcementText}</Text>
            <Text style={styles.notificationMeta}>
              {latestMessage ? `${latestMessage.app} - ${latestMessage.receivedAt}` : 'Waiting for local messages'}
            </Text>
          </View>

          <View style={styles.pinRow}>
            <TextInput
              value={pinInput}
              onChangeText={setPinInput}
              placeholder="Enter PIN to unlock sender list"
              placeholderTextColor="#7f8ea3"
              style={styles.pinInput}
              keyboardType="number-pad"
              secureTextEntry
            />
            <TouchableOpacity style={styles.primaryButton} onPress={verifyPin} activeOpacity={0.9}>
              <Text style={styles.primaryButtonText}>Verify PIN</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.secondaryButton} onPress={lockSession} activeOpacity={0.85}>
            <Text style={styles.secondaryButtonText}>Lock Session</Text>
          </TouchableOpacity>

          <Text style={styles.lockHint}>
            Sender list and message content remain hidden until PIN 1598 is verified for this demo stage.
          </Text>

          <View style={styles.senderGrid}>
            {messages.map((message) => {
              const isActive = selectedMessage?.id === message.id;
              return (
                <TouchableOpacity
                  key={message.id}
                  style={[styles.senderChip, isActive && styles.senderChipActive]}
                  onPress={() => openMessage(message.id)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.senderChipText, isActive && styles.senderChipTextActive]}>
                    {sessionUnlocked ? message.sender : 'Sender hidden'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.messageCard}>
            <Text style={styles.messageCardTitle}>Selected message</Text>
            {sessionUnlocked && selectedMessage ? (
              <>
                <Text style={styles.messageSender}>{selectedMessage.sender}</Text>
                <Text style={styles.messageBody}>{selectedMessage.body}</Text>
                <Text style={styles.messageMeta}>{selectedMessage.app} - {selectedMessage.receivedAt}</Text>
                <Text style={styles.replyLabel}>Suggested local replies</Text>
                {suggestedReplies.map((reply) => (
                  <View key={reply} style={styles.replyChip}>
                    <Text style={styles.replyChipText}>{reply}</Text>
                  </View>
                ))}
              </>
            ) : (
              <Text style={styles.lockedBody}>
                PIN verification required. This matches the document rule that sender list and message reading stay protected.
              </Text>
            )}
          </View>
        </SectionCard>

        <SectionCard
          title="Required Android permissions"
          subtitle="Expo stays as the base, but some document requirements need dev build plus native Android integration."
        >
          {REQUIRED_PERMISSIONS.map((permission) => (
            <View key={permission.id} style={styles.permissionCard}>
              <Text style={styles.permissionTitle}>{permission.title}</Text>
              <Text style={styles.permissionDetail}>{permission.detail}</Text>
              <Text style={styles.permissionSupport}>{permission.support}</Text>
            </View>
          ))}
        </SectionCard>

        <SectionCard
          title="System modules"
          subtitle="These are the target building blocks from the requirement document."
        >
          <View style={styles.moduleWrap}>
            {SYSTEM_MODULES.map((moduleName) => (
              <View key={moduleName} style={styles.moduleChip}>
                <Text style={styles.moduleChipText}>{moduleName}</Text>
              </View>
            ))}
          </View>
        </SectionCard>

        <SectionCard
          title="Groq and OpenRouter policy"
          subtitle="Both providers can stay in the stack, but only under the privacy rules written in the document."
        >
          {providerStatus.map((provider) => (
            <View key={provider.id} style={styles.providerCard}>
              <View style={styles.providerHeader}>
                <Text style={styles.providerTitle}>{provider.name}</Text>
                <Badge label={provider.configured ? 'Configured' : 'Not configured'} accent={provider.configured} />
              </View>
              <Text style={styles.providerMode}>{provider.mode}</Text>
              <Text style={styles.providerBaseUrl}>{provider.baseUrl}</Text>
            </View>
          ))}

          {PROVIDER_RULES.map((rule) => (
            <View key={rule} style={styles.listRow}>
              <View style={styles.listDot} />
              <Text style={styles.listText}>{rule}</Text>
            </View>
          ))}
        </SectionCard>

        <SectionCard
          title="Execution roadmap"
          subtitle="We will only move to the next stage after you confirm this stage is working."
        >
          {ROADMAP.map((item) => (
            <View key={item.title} style={styles.roadmapCard}>
              <View style={styles.roadmapHeader}>
                <Text style={styles.roadmapTitle}>{item.title}</Text>
                <Text style={styles.roadmapStatus}>{item.status}</Text>
              </View>
              <Text style={styles.roadmapDetail}>{item.detail}</Text>
            </View>
          ))}
        </SectionCard>
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
  heroEyebrow: {
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
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  badgeAccent: {
    backgroundColor: '#dffcf7',
    borderColor: '#dffcf7',
  },
  badgeText: {
    color: '#f3e7f6',
    fontSize: 12,
    fontWeight: '700',
  },
  badgeTextAccent: {
    color: '#083b34',
  },
  statusStrip: {
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
  statusText: {
    marginTop: 8,
    color: '#f5eefb',
    fontSize: 14,
    lineHeight: 21,
  },
  companionStage: {
    height: 360,
    marginBottom: 18,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#151729',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  companionBackdropImage: {
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
    paddingBottom: 24,
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
  companionHeadline: {
    marginTop: 14,
    color: '#fff6fb',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  companionBody: {
    marginTop: 10,
    color: '#edd8e8',
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 220,
  },
  companionPortrait: {
    width: 190,
    height: 320,
    marginRight: -8,
  },
  personaBubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#101f35',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 10,
  },
  personaBubbleAccent: {
    backgroundColor: '#271937',
    borderColor: 'rgba(244,114,182,0.28)',
  },
  personaBubbleText: {
    color: '#f3ecf8',
    fontSize: 14,
    lineHeight: 21,
  },
  sectionCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#0d1727',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sectionTitle: {
    color: '#fdf8ff',
    fontSize: 20,
    fontWeight: '800',
  },
  sectionSubtitle: {
    marginTop: 6,
    marginBottom: 16,
    color: '#baaec6',
    fontSize: 14,
    lineHeight: 20,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  listDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#15b8a6',
    marginTop: 6,
  },
  listText: {
    flex: 1,
    color: '#e4dceb',
    fontSize: 14,
    lineHeight: 21,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  toggleCopy: {
    flex: 1,
  },
  toggleTitle: {
    color: '#fdf8ff',
    fontSize: 15,
    fontWeight: '700',
  },
  toggleDescription: {
    marginTop: 5,
    color: '#b8aec3',
    fontSize: 13,
    lineHeight: 19,
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
  primaryButton: {
    borderRadius: 16,
    backgroundColor: '#f59bc8',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#341427',
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#0a1220',
  },
  secondaryButtonText: {
    color: '#e4dceb',
    fontSize: 13,
    fontWeight: '700',
  },
  lockHint: {
    marginTop: 12,
    color: '#b8aec3',
    fontSize: 13,
    lineHeight: 19,
  },
  senderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  senderChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#0a1220',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  senderChipActive: {
    backgroundColor: '#f7c6e0',
    borderColor: '#f7c6e0',
  },
  senderChipText: {
    color: '#f0e7f6',
    fontSize: 13,
    fontWeight: '700',
  },
  senderChipTextActive: {
    color: '#402038',
  },
  messageCard: {
    marginTop: 16,
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#0a1220',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  messageCardTitle: {
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
  messageMeta: {
    marginTop: 8,
    color: '#b8aec3',
    fontSize: 13,
  },
  replyLabel: {
    marginTop: 16,
    marginBottom: 10,
    color: '#fdf8ff',
    fontSize: 14,
    fontWeight: '700',
  },
  replyChip: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#17182c',
    marginBottom: 8,
  },
  replyChipText: {
    color: '#ece2f2',
    fontSize: 13,
    lineHeight: 19,
  },
  lockedBody: {
    marginTop: 12,
    color: '#b8aec3',
    fontSize: 14,
    lineHeight: 21,
  },
  permissionCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#17182c',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 10,
  },
  permissionTitle: {
    color: '#fdf8ff',
    fontSize: 15,
    fontWeight: '700',
  },
  permissionDetail: {
    marginTop: 6,
    color: '#ece2f2',
    fontSize: 13,
    lineHeight: 19,
  },
  permissionSupport: {
    marginTop: 8,
    color: '#84e6d7',
    fontSize: 12,
    lineHeight: 18,
  },
  moduleWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  moduleChip: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#17182c',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  moduleChipText: {
    color: '#ece2f2',
    fontSize: 13,
    fontWeight: '600',
  },
  providerCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#17182c',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
  },
  providerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  providerTitle: {
    color: '#fdf8ff',
    fontSize: 16,
    fontWeight: '800',
  },
  providerMode: {
    marginTop: 8,
    color: '#ece2f2',
    fontSize: 13,
  },
  providerBaseUrl: {
    marginTop: 6,
    color: '#84e6d7',
    fontSize: 12,
    lineHeight: 18,
  },
  roadmapCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#17182c',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 10,
  },
  roadmapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  roadmapTitle: {
    color: '#fdf8ff',
    fontSize: 15,
    fontWeight: '700',
  },
  roadmapStatus: {
    color: '#84e6d7',
    fontSize: 12,
    fontWeight: '700',
  },
  roadmapDetail: {
    marginTop: 8,
    color: '#ece2f2',
    fontSize: 13,
    lineHeight: 19,
  },
});

export default AgentHomeScreen;
