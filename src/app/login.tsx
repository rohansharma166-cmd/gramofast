import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth } from '../firebaseConfig';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);

  // Google Auth Request Hook configured with your Web Client ID
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: '525263145004-la2ss5fa4udn6jOh9l434idva00mcq1k.apps.googleusercontent.com',
    androidClientId: '525263145004-la2ss5fa4udn6jOh9l434idva00mcq1k.apps.googleusercontent.com',
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        handleGoogleLogin(id_token);
      } else {
        Alert.alert('Error', 'Google sign-in did not return an id_token.');
      }
    }
  }, [response]);

  const handleGoogleLogin = async (idToken: string) => {
    setLoading(true);
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
      Alert.alert('Success 🎉', 'Successfully logged in with Google!');
      // TODO: Navigate to home screen or dashboard here if needed
    } catch (error: any) {
      Alert.alert('Login Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚀 Gramofast</Text>
      <Text style={styles.subtitle}>Sign in to continue shopping</Text>

      <TouchableOpacity 
        style={styles.googleBtn} 
        disabled={!request || loading}
        onPress={() => promptAsync()}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.googleBtnText}>Sign in with Google 🌐</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA', padding: 20 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 8, color: '#0C831F' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 30 },
  googleBtn: { backgroundColor: '#4285F4', width: '100%', padding: 14, borderRadius: 8, alignItems: 'center', elevation: 2 },
  googleBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});