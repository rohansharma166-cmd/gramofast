import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { db } from '../firebaseConfig';

interface Order {
  id: string;
  items: { name: string; quantity: number; price: number }[];
  grandTotal: number;
  status: string;
  address?: string;
  paymentMethod?: string;
  transactionId?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  comparePrice?: number; // <-- Compare/MRP Price
  unit?: string;
  category: 'grocery' | 'medicine' | 'cakes & sweets';
  image?: string;
}

export default function AdminScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // New/Edit Product Form States
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodComparePrice, setProdComparePrice] = useState(''); // <-- Compare Price State
  const [prodUnit, setProdUnit] = useState('');
  const [prodCategory, setProdCategory] = useState<'grocery' | 'medicine' | 'cakes & sweets'>('grocery');
  const [prodImage, setProdImage] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await fetchOrders();
    await fetchProducts();
    setLoading(false);
  };

  const fetchOrders = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'orders'));
      const list: Order[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          items: data.items || [],
          grandTotal: data.grandTotal || 0,
          status: data.status || 'PLACED',
          address: data.address || '',
          paymentMethod: data.paymentMethod || 'COD',
          transactionId: data.transactionId || '',
        });
      });
      setOrders(list);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const list: Product[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          name: data.name || '',
          price: data.price || 0,
          comparePrice: data.comparePrice || 0,
          unit: data.unit || '1 kg',
          category: data.category || 'grocery',
          image: data.image || '',
        });
      });
      setProducts(list);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setProdImage(result.assets[0].uri);
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      Alert.alert('Success ✅', `Status changed to ${newStatus}`);
      fetchOrders();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSaveProduct = async () => {
    if (!prodName || !prodPrice) {
      Alert.alert('Error', 'Please fill product name and sale price.');
      return;
    }
    setUploading(true);
    try {
      const productData = {
        name: prodName,
        price: parseFloat(prodPrice),
        comparePrice: prodComparePrice ? parseFloat(prodComparePrice) : 0,
        unit: prodUnit || '1 kg',
        image: prodImage,
        category: prodCategory,
      };

      if (editingProductId) {
        await updateDoc(doc(db, 'products', editingProductId), productData);
        Alert.alert('Success 🎉', 'Product updated successfully!');
      } else {
        await addDoc(collection(db, 'products'), productData);
        Alert.alert('Success 🎉', 'Product added to store successfully!');
      }

      // Reset form
      setProdName('');
      setProdPrice('');
      setProdComparePrice('');
      setProdUnit('');
      setProdImage('');
      setProdCategory('grocery');
      setEditingProductId(null);
      fetchProducts();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEditClick = (product: Product) => {
    setEditingProductId(product.id);
    setProdName(product.name);
    setProdPrice(product.price.toString());
    setProdComparePrice(product.comparePrice ? product.comparePrice.toString() : '');
    setProdUnit(product.unit || '');
    setProdCategory(product.category);
    setProdImage(product.image || '');
  };

  const handleCancelEdit = () => {
    setEditingProductId(null);
    setProdName('');
    setProdPrice('');
    setProdComparePrice('');
    setProdUnit('');
    setProdImage('');
    setProdCategory('grocery');
  };

  const handleDeleteProduct = async (productId: string) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'products', productId));
              Alert.alert('Success 🗑️', 'Product deleted successfully!');
              fetchProducts();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🛠️ Store Admin Panel</Text>
        <TouchableOpacity onPress={fetchData} style={styles.refreshBtn}>
          <Text style={{ color: '#FFF', fontWeight: 'bold' }}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ padding: 16 }}>
        {/* Add / Edit Product Section */}
        <View style={styles.addProductCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={styles.sectionHeading}>
              {editingProductId ? '✏️ Edit Product' : '➕ Add New Product'}
            </Text>
            {editingProductId && (
              <TouchableOpacity onPress={handleCancelEdit}>
                <Text style={{ color: '#D9534F', fontWeight: 'bold', fontSize: 12 }}>Cancel Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Product Name (e.g. Fresh Potato)"
            value={prodName}
            onChangeText={setProdName}
          />
          
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Sale Price (₹)"
              keyboardType="numeric"
              value={prodPrice}
              onChangeText={setProdPrice}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="MRP / Compare Price (₹)"
              keyboardType="numeric"
              value={prodComparePrice}
              onChangeText={setProdComparePrice}
            />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Unit (e.g. 1 kg, 500g, 1 pcs)"
            value={prodUnit}
            onChangeText={setProdUnit}
          />

          {/* Image Picker Button */}
          <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
            <Text style={styles.imagePickerText}>
              {prodImage ? 'Change Product Image 🖼️' : 'Select Product Image from Gallery 🖼️'}
            </Text>
          </TouchableOpacity>

          {/* Selected Image Preview */}
          {prodImage ? (
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <Image source={{ uri: prodImage }} style={{ width: 70, height: 70, borderRadius: 8 }} />
            </View>
          ) : null}

          <View style={styles.categoryToggleRow}>
            <TouchableOpacity
              style={[styles.catBtn, prodCategory === 'grocery' && styles.catBtnActive]}
              onPress={() => setProdCategory('grocery')}>
              <Text style={[styles.catText, prodCategory === 'grocery' && styles.catTextActive]}>Grocery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.catBtn, prodCategory === 'medicine' && styles.catBtnActive]}
              onPress={() => setProdCategory('medicine')}>
              <Text style={[styles.catText, prodCategory === 'medicine' && styles.catTextActive]}>Medicine</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.catBtn, prodCategory === 'cakes & sweets' && styles.catBtnActive]}
              onPress={() => setProdCategory('cakes & sweets')}>
              <Text style={[styles.catText, prodCategory === 'cakes & sweets' && styles.catTextActive]}>Cakes & Sweets</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSaveProduct} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>
                {editingProductId ? 'Update Product' : 'Publish Product'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Existing Store Products List */}
        <Text style={[styles.sectionHeading, { marginTop: 20 }]}>📋 Manage Store Products</Text>
        {products.length === 0 ? (
          <Text style={{ color: '#888', marginBottom: 10 }}>No products added yet.</Text>
        ) : (
          products.map((item) => (
            <View key={item.id} style={styles.productManageCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={{ width: 45, height: 45, borderRadius: 6, marginRight: 10 }} />
                ) : (
                  <Text style={{ fontSize: 30, marginRight: 10 }}>📦</Text>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 14 }}>{item.name}</Text>
                  <Text style={{ color: '#0C831F', fontWeight: '600', fontSize: 12 }}>
                    ₹{item.price} {item.comparePrice ? `(MRP: ₹${item.comparePrice})` : ''} [{item.unit || '1 kg'}]
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity style={styles.editBtn} onPress={() => handleEditClick(item)}>
                  <Text style={styles.editBtnText}>Edit ✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteProduct(item.id)}>
                  <Text style={styles.deleteBtnText}>Delete 🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Customer Orders Section */}
        <Text style={[styles.sectionHeading, { marginTop: 20 }]}>📦 Customer Orders</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#0C831F" style={{ marginTop: 20 }} />
        ) : orders.length === 0 ? (
          <Text style={{ textAlign: 'center', color: '#888', marginTop: 10 }}>No orders found.</Text>
        ) : (
          orders.map((order) => (
            <View key={order.id} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.orderId}>Order #{order.id.slice(0, 8)}</Text>
                <Text style={styles.statusBadge}>{order.status}</Text>
              </View>
              <View style={styles.itemsContainer}>
                <Text style={styles.itemsTitle}>Items Ordered:</Text>
                {order.items.map((item, idx) => (
                  <Text key={idx} style={styles.itemText}>
                    • {item.name} (x{item.quantity}) - ₹{item.price * item.quantity}
                  </Text>
                ))}
              </View>
              <Text style={styles.detailText}>💳 Payment: {order.paymentMethod}</Text>
              <Text style={styles.detailText}>📍 Address: {order.address}</Text>
              <Text style={styles.totalText}>Total: ₹{order.grandTotal}</Text>
              
              <View style={styles.btnRow}>
                <TouchableOpacity style={[styles.btn, { backgroundColor: '#FFC107' }]} onPress={() => updateStatus(order.id, 'PACKED')}>
                  <Text style={styles.btnText}>PACKED 📦</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, { backgroundColor: '#2196F3' }]} onPress={() => updateStatus(order.id, 'OUT_FOR_DELIVERY')}>
                  <Text style={[styles.btnText, { color: '#FFF' }]}>OUT 🛵</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, { backgroundColor: '#4CAF50' }]} onPress={() => updateStatus(order.id, 'DELIVERED')}>
                  <Text style={[styles.btnText, { color: '#FFF' }]}>DELIVERED 🎉</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', paddingTop: 35 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#DDD' },
  title: { fontSize: 18, fontWeight: 'bold' },
  refreshBtn: { backgroundColor: '#0C831F', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  addProductCard: { backgroundColor: '#FFF', padding: 14, borderRadius: 10, marginBottom: 10, elevation: 2 },
  sectionHeading: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  input: { borderWidth: 1, borderColor: '#DDD', padding: 10, borderRadius: 8, marginBottom: 8, fontSize: 13 },
  imagePickerBtn: { backgroundColor: '#E9ECEF', padding: 10, borderRadius: 8, alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#CED4DA' },
  imagePickerText: { fontSize: 12, fontWeight: 'bold', color: '#495057' },
  categoryToggleRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  catBtn: { flex: 1, padding: 8, borderWidth: 1, borderColor: '#CCC', borderRadius: 6, alignItems: 'center' },
  catBtnActive: { backgroundColor: '#0C831F', borderColor: '#0C831F' },
  catText: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  catTextActive: { color: '#FFF' },
  submitBtn: { backgroundColor: '#0C831F', padding: 12, borderRadius: 8, alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  productManageCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 10, borderRadius: 8, marginBottom: 8, alignItems: 'center', elevation: 1 },
  editBtn: { backgroundColor: '#FFC107', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 },
  editBtnText: { fontSize: 11, fontWeight: 'bold', color: '#333' },
  deleteBtn: { backgroundColor: '#D9534F', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 },
  deleteBtnText: { fontSize: 11, fontWeight: 'bold', color: '#FFF' },
  card: { backgroundColor: '#FFF', padding: 14, borderRadius: 10, marginBottom: 12, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  orderId: { fontWeight: 'bold', fontSize: 14 },
  statusBadge: { backgroundColor: '#E6F4EA', color: '#0C831F', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontWeight: 'bold', fontSize: 12 },
  itemsContainer: { backgroundColor: '#F1F3F5', padding: 8, borderRadius: 6, marginVertical: 6 },
  itemsTitle: { fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  itemText: { fontSize: 11, color: '#555', marginVertical: 1 },
  detailText: { fontSize: 12, color: '#555', marginVertical: 2 },
  totalText: { fontSize: 14, fontWeight: 'bold', color: '#0C831F', marginTop: 4 },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btn: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  btnText: { fontWeight: 'bold', fontSize: 11 },
});