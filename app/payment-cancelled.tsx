import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { useThemeColor } from '../hooks/useThemeColor';

export default function PaymentCancelledScreen() {
  const router = useRouter();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const mutedTextColor = useThemeColor({}, 'textSecondary');
  const dangerColor = useThemeColor({}, 'accentDanger');
  
  // Set page title on web
  React.useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = 'Wiznote';
    }
  }, []);

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <View style={styles.content}>
        <Ionicons name="close-circle" size={64} color={dangerColor} />
        <ThemedText type="title" style={[styles.title, { color: textColor }]}>Payment Cancelled</ThemedText>
        <ThemedText style={[styles.subtitle, { color: mutedTextColor }]}>No charges were made. You can try again anytime.</ThemedText>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => router.replace('/join-premium')}>
            <Ionicons name="card" size={20} color="#FFFFFF" />
            <ThemedText style={styles.buttonText}>Try Again</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.primary]} onPress={() => router.replace('/(tabs)')}>
            <Ionicons name="home" size={20} color="#FFFFFF" />
            <ThemedText style={styles.buttonText}>Go to Home</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { alignItems: 'center', gap: 12 as any },
  row: { flexDirection: 'row', gap: 12 as any, marginTop: 4 },
  title: { marginTop: 8 },
  subtitle: { textAlign: 'center', marginBottom: 16 },
  button: { flexDirection: 'row', alignItems: 'center', gap: 8 as any, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 },
  buttonText: { color: '#FFFFFF', fontWeight: '600' },
  primary: { backgroundColor: '#6A5ACD' },
  secondary: { backgroundColor: '#EF4444' },
});


