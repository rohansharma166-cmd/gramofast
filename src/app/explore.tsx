import { useRouter } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ExploreScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  // Sirf 3 main categories jo aapke app ke liye important hain
  const categories = [
    { id: '1', name: 'Grocery Store', emoji: '🛒' },
    { id: '2', name: 'Pharmacy / Medicine', emoji: '💊' },
    { id: '3', name: 'Cakes & Bakery', emoji: '🎂' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Search Bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore Products</Text>
      </View>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>{"🔍"}</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for grocery, medicines, cakes..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearSearch}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Main Categories</Text>
        <View style={styles.categoryGrid}>
          {categories.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.categoryCard}
              onPress={() => router.push({
                pathname: '/category-products',
                params: { categoryName: item.name }
              })}
            >
              <Text style={styles.categoryEmoji}>{item.emoji}</Text>
              <Text style={styles.categoryName}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Menu Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/')}>
          <Text style={{ fontSize: 18 }}>{"🏠"}</Text>
          <Text style={styles.menuText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/explore')}>
          <Text style={{ fontSize: 18 }}>{"🔍"}</Text>
          <Text style={styles.menuTextActive}>Explore</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/')}>
          <Text style={{ fontSize: 18 }}>{"📦"}</Text>
          <Text style={styles.menuText}>Orders</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/')}>
          <Text style={{ fontSize: 18 }}>{"👤"}</Text>
          <Text style={styles.menuText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', paddingTop: 35 },
  header: { paddingHorizontal: 16, paddingVertical: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  searchIcon: { marginRight: 8, fontSize: 16 },
  searchInput: { flex: 1, fontSize: 14, color: '#000' },
  clearSearch: { fontSize: 16, color: '#888', fontWeight: 'bold', paddingHorizontal: 6 },
  scrollContent: { paddingBottom: 100, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginVertical: 10, color: '#333' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  categoryCard: {
    width: '48%',
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryEmoji: { fontSize: 32, marginBottom: 8 },
  categoryName: { fontSize: 14, fontWeight: '600', color: '#333', textAlign: 'center' },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuItem: { alignItems: 'center', justifyContent: 'center' },
  menuText: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  menuTextActive: { fontSize: 11, color: '#0C831F', fontWeight: 'bold', marginTop: 2 },
});