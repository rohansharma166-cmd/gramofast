import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';

interface Product {
  id: string;
  name: string;
  price: number;
  comparePrice?: number;
  unit?: string;
  category: string;
  image: string;
}

export default function CategoryProductsScreen() {
  const router = useRouter();
  const { categoryName } = useLocalSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [cart, setCart] = useState<{ [key: string]: { item: Product; qty: number } }>({});
  
  // Modal aur Animation States
  const [isCartModalVisible, setIsCartModalVisible] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [orderPlacing, setOrderPlacing] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [categoryName]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const fetchedProducts: Product[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedProducts.push({
          id: doc.id,
          name: data.name || '',
          price: data.price || 0,
          comparePrice: data.comparePrice || 0,
          unit: data.unit || '',
          category: data.category || '',
          image: data.image || '',
        });
      });

      const filtered = fetchedProducts.filter((item) => {
        const cat = item.category ? item.category.toLowerCase() : '';
        const selected = categoryName ? String(categoryName).toLowerCase() : '';
        
        if (selected.includes('grocery')) {
          return cat.includes('grocery') || cat.includes('fruit') || cat.includes('vegetable') || cat.includes('dairy');
        } else if (selected.includes('pharmacy')) {
          return cat.includes('pharmacy') || cat.includes('medicine');
        } else if (selected.includes('cake')) {
          return cat.includes('cake') || cat.includes('bakery');
        }
        return cat.includes(selected);
      });

      setProducts(filtered);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    setCart((prevCart) => {
      const currentQty = prevCart[product.id] ? prevCart[product.id].qty : 0;
      return {
        ...prevCart,
        [product.id]: { item: product, qty: currentQty + 1 },
      };
    });

    // Congratulation popup trigger
    setPopupMessage(`🎉 Added ${product.name} to cart!`);
    setShowPopup(true);
    setTimeout(() => {
      setShowPopup(false);
    }, 1500);
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prevCart) => {
      const updated = { ...prevCart };
      if (updated[productId] && updated[productId].qty > 1) {
        updated[productId].qty -= 1;
      } else {
        delete updated[productId];
      }
      return updated;
    });
  };

  const totalItems = Object.values(cart).reduce((sum, entry) => sum + (entry?.qty || 0), 0);
  const totalPrice = Object.values(cart).reduce((sum, entry) => sum + ((entry?.item?.price || 0) * (entry?.qty || 0)), 0);

  // Order Place karne ka function
  const handlePlaceOrder = async () => {
    if (!auth.currentUser) {
      Alert.alert('Login Required', 'Please login first to place an order.');
      return;
    }
    if (Object.keys(cart).length === 0) {
      Alert.alert('Cart Empty', 'Please add some products to cart.');
      return;
    }

    setOrderPlacing(true);
    try {
      const orderData = {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        items: Object.values(cart).map(entry => ({
          id: entry.item.id,
          name: entry.item.name,
          price: entry.item.price,
          unit: entry.item.unit || '',
          qty: entry.qty,
        })),
        grandTotal: totalPrice,
        status: 'PLACED',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'orders'), orderData);
      Alert.alert('Success!', '🎉 Order placed successfully!');
      setCart({});
      setIsCartModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setOrderPlacing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0C831F' }}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{categoryName}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#0C831F" style={{ marginTop: 40 }} />
        ) : products.length > 0 ? (
          <View style={styles.productGrid}>
            {products.map((item) => {
              const qty = cart[item.id] ? cart[item.id].qty : 0;
              return (
                <View key={item.id} style={styles.productCard}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.productImage} />
                  ) : (
                    <View style={[styles.productImage, { backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' }]}>
                      <Text>📦</Text>
                    </View>
                  )}

                  {/* Unit display */}
                  {item.unit ? <Text style={styles.productUnit}>{item.unit}</Text> : null}

                  <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                  
                  {/* Price & Compare Price display */}
                  <View style={styles.priceContainer}>
                    <Text style={styles.productPrice}>₹{item.price}</Text>
                    {item.comparePrice && item.comparePrice > item.price ? (
                      <Text style={styles.comparePrice}>₹{item.comparePrice}</Text>
                    ) : null}
                  </View>

                  {qty === 0 ? (
                    <TouchableOpacity style={styles.addButton} onPress={() => handleAddToCart(item)}>
                      <Text style={styles.addButtonText}>ADD</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.counterContainer}>
                      <TouchableOpacity onPress={() => handleRemoveFromCart(item.id)} style={styles.counterBtn}>
                        <Text style={styles.counterText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{qty}</Text>
                      <TouchableOpacity onPress={() => handleAddToCart(item)} style={styles.counterBtn}>
                        <Text style={styles.counterText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={{ textAlign: 'center', marginTop: 50, color: '#666', fontSize: 16 }}>
            No products found in {categoryName}.
          </Text>
        )}
      </ScrollView>

      {/* Congratulation Popup Animation Notification */}
      {showPopup && (
        <View style={styles.popupContainer}>
          <Text style={styles.popupText}>{popupMessage}</Text>
        </View>
      )}

      {/* Floating Cart Bar */}
      {totalItems > 0 && (
        <View style={styles.floatingCartBar}>
          <View>
            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>{totalItems} items added</Text>
            <Text style={{ color: '#FFF', fontSize: 12 }}>₹{totalPrice} | Plus taxes</Text>
          </View>
          <TouchableOpacity onPress={() => setIsCartModalVisible(true)} style={styles.viewCartBtn}>
            <Text style={{ color: '#0C831F', fontWeight: 'bold' }}>View Cart →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Cart Details Modal */}
      <Modal visible={isCartModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Your Cart</Text>
              <TouchableOpacity onPress={() => setIsCartModalVisible(false)}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#888' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300 }}>
              {Object.values(cart).map((entry, index) => (
                <View key={index} style={styles.cartItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600' }}>{entry.item.name}</Text>
                    {entry.item.unit ? <Text style={{ fontSize: 11, color: '#888' }}>{entry.item.unit}</Text> : null}
                  </View>
                  <Text style={{ marginRight: 15, color: '#666' }}>x{entry.qty}</Text>
                  <Text style={{ fontWeight: 'bold', color: '#0C831F' }}>₹{entry.item.price * entry.qty}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.billSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Grand Total:</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0C831F' }}>₹{totalPrice}</Text>
              </View>

              <TouchableOpacity style={styles.checkoutBtn} onPress={handlePlaceOrder} disabled={orderPlacing}>
                {orderPlacing ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Place Order</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#FFF' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#000', marginLeft: 15 },
  scrollContent: { padding: 16, paddingBottom: 130 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  productCard: {
    width: '48%',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  productImage: { width: 100, height: 100, borderRadius: 8, marginBottom: 8, resizeMode: 'contain' },
  productUnit: { fontSize: 11, color: '#6B7280', fontWeight: '500', marginBottom: 2 },
  productName: { fontSize: 13, fontWeight: '600', color: '#333', textAlign: 'center', marginBottom: 4 },
  priceContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  productPrice: { fontSize: 14, fontWeight: 'bold', color: '#0C831F' },
  comparePrice: { fontSize: 12, color: '#9CA3AF', textDecorationLine: 'line-through' },
  addButton: { borderWidth: 1, borderColor: '#0C831F', backgroundColor: '#F0FDF4', paddingVertical: 6, paddingHorizontal: 20, borderRadius: 6 },
  addButtonText: { color: '#0C831F', fontWeight: 'bold', fontSize: 12 },
  counterContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0C831F', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  counterBtn: { paddingHorizontal: 8 },
  counterText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  qtyText: { color: '#FFF', fontWeight: 'bold', fontSize: 14, marginHorizontal: 6 },
  popupContainer: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    backgroundColor: '#111',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    elevation: 10,
  },
  popupText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  floatingCartBar: {
    position: 'absolute',
    bottom: 60,
    left: 16,
    right: 16,
    backgroundColor: '#0C831F',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 5,
  },
  viewCartBtn: {
    backgroundColor: '#FFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  cartItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  billSection: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 15 },
  checkoutBtn: { backgroundColor: '#0C831F', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 10 },
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
  },
  menuItem: { alignItems: 'center', justifyContent: 'center' },
  menuText: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  menuTextActive: { fontSize: 11, color: '#0C831F', fontWeight: 'bold', marginTop: 2 },
});