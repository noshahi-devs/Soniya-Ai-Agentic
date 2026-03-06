import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

function VoiceUI({
  value,
  onChangeText,
  onSubmit,
  quickCommands,
  onQuickCommand,
  responseText,
  history,
  actions,
}) {
  return (
    <View>
      <View style={styles.commandRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder='Try: "Kis kis ka message aya hai?"'
          placeholderTextColor="#8b92a7"
          style={styles.commandInput}
          multiline
        />
        <TouchableOpacity style={styles.runButton} onPress={onSubmit} activeOpacity={0.9}>
          <Text style={styles.runButtonText}>Run</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickWrap}>
        {quickCommands.map((command) => (
          <TouchableOpacity
            key={command}
            style={styles.quickChip}
            onPress={() => onQuickCommand(command)}
            activeOpacity={0.85}
          >
            <Text style={styles.quickChipText}>{command}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actionRow}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.key}
            style={styles.actionButton}
            onPress={action.onPress}
            activeOpacity={0.85}
          >
            <Text style={styles.actionButtonText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.responseCard}>
        <Text style={styles.responseLabel}>Assistant response</Text>
        <Text style={styles.responseText}>
          {responseText || 'Run a command or tap a quick action to test the local agent flow.'}
        </Text>
      </View>

      {!!history.length && (
        <View style={styles.historyBlock}>
          <Text style={styles.historyLabel}>Recent command history</Text>
          {history.map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <Text style={styles.historyCommand}>{item.commandText}</Text>
              <Text style={styles.historyResponse}>{item.responseText}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  commandRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch',
  },
  commandInput: {
    flex: 1,
    minHeight: 92,
    borderRadius: 18,
    backgroundColor: '#0a1220',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    color: '#f5fbff',
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  runButton: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#84e6d7',
    paddingHorizontal: 18,
  },
  runButtonText: {
    color: '#083b34',
    fontSize: 13,
    fontWeight: '800',
  },
  quickWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  quickChip: {
    borderRadius: 999,
    backgroundColor: '#17182c',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  quickChipText: {
    color: '#ece2f2',
    fontSize: 12,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  actionButton: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#261b38',
    borderWidth: 1,
    borderColor: 'rgba(244,114,182,0.22)',
  },
  actionButtonText: {
    color: '#ffd6ea',
    fontSize: 12,
    fontWeight: '800',
  },
  responseCard: {
    marginTop: 16,
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#17182c',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  responseLabel: {
    color: '#84e6d7',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  responseText: {
    marginTop: 10,
    color: '#f4edf8',
    fontSize: 14,
    lineHeight: 22,
  },
  historyBlock: {
    marginTop: 16,
  },
  historyLabel: {
    color: '#f9b4d9',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  historyItem: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#0a1220',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 8,
  },
  historyCommand: {
    color: '#84e6d7',
    fontSize: 12,
    fontWeight: '700',
  },
  historyResponse: {
    marginTop: 6,
    color: '#dcd2e8',
    fontSize: 13,
    lineHeight: 19,
  },
});

export default VoiceUI;
