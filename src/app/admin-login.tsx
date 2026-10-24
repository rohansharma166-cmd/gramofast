import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAdminLogin = () => {
    //  fixed admin email/password 
    if (email === 'admin@store.com' && password === 'admin123') {
      Alert.alert('Success', 'Welcome Admin!');
      router.replace('/admin'); // Admin panel par bhej dega
    } else {
      Alert.alert('Error', 'Invalid Admin Credentials!');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🔒 Admin Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Admin Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity style={styles.btn} onPress={handleAdminLogin}>
        <Text style={styles.btnText}>Login as Admin</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#FFF' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#DDD', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 14 },
  btn: { backgroundColor: '#0C831F', padding: 14, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});