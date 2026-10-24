import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Link, useRouter } from 'expo-router';
import {
  createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signInWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../firebaseConfig';
GoogleSignin.configure({
  webClientId: '525263145004-la2ss5fa4udn6j0h9l434idva00mcq1k.apps.googleusercontent.com',
});
interface Product {
  id: string;
  name: string;
  price: number;
  comparePrice?: number;
  unit?: string;
  category: string;
  emoji: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface Order {
  id: string;
  items: { name: string; quantity: number; price: number }[];
  grandTotal: number;
  status: 'PLACED' | 'PACKED' | 'OUT_FOR_DELIVERY' | 'DELIVERED';
  address?: string;
  paymentMethod?: 'COD' | 'UPI';
  transactionId?: string;
  createdAt?: any;
}

const ORDER_STAGES = [
  { key: 'PLACED', label: 'Order Placed', emoji: '📝' },
  { key: 'PACKED', label: 'Packed & Ready', emoji: '📦' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', emoji: '🛵' },
  { key: 'DELIVERED', label: 'Delivered', emoji: '🎉' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<'Grocery' | 'Medicine' | 'Cakes & Sweets'>('Grocery');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Cart & Modals State
  const [cart, setCart] = useState<{ [key: string]: CartItem }>({});
  const [isCartVisible, setIsCartVisible] = useState<boolean>(false);
  const [isAuthModalVisible, setIsAuthModalVisible] = useState<boolean>(false);
  const [isOrdersModalVisible, setIsOrdersModalVisible] = useState<boolean>(false);
  const [isAddressModalVisible, setIsAddressModalVisible] = useState<boolean>(false);
  const [orderPlacing, setOrderPlacing] = useState<boolean>(false);

  // Payment Selection State
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'UPI'>('COD');
  const [transactionId, setTransactionId] = useState<string>('');
  const MY_UPI_ID = "9546122006-2@ybl"; // Yahan aapna asli UPI ID dalein

  // Address State
  const [houseNo, setHouseNo] = useState<string>('');
const [streetArea, setStreetArea] = useState<string>('');
const [pincode, setPincode] = useState<string>('');
const [savedAddress, setSavedAddress] = useState<string>('Home - Main Road, Ward 12');
const [loadingLocation, setLoadingLocation] = useState<boolean>(false);

  // Tracking State
  const [selectedTrackingOrder, setSelectedTrackingOrder] = useState<Order | null>(null);

  // Orders State
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(false);

  // Auth States
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState<boolean>(false);
 const handleDetectLocation = () => {
    setLoadingLocation(true);
    
    if (!navigator.geolocation) {
      setLoadingLocation(false);
      alert('Geolocation support nahi karta aapka environment.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const detectedAddr = `Lat: ${latitude.toFixed(2)}, Lng: ${longitude.toFixed(2)}`;
        setSavedAddress(detectedAddr);
        setLoadingLocation(false);
        setIsAddressModalVisible(false);
        alert('Location successfully fetch ho gayi!');
      },
      (error) => {
        setLoadingLocation(false);
        // Agar GPS fail ho toh default ya manual address set ho jaye
        setSavedAddress('Main Road, Jamshedpur');
        setIsAddressModalVisible(false);
        alert('Location fetch karne mein dikkat aayi, default set kar diya gaya hai.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };
  const handleGoogleLogin = async () => {
  try {
    await GoogleSignin.hasPlayServices();
    await GoogleSignin.signOut();
    const userInfo = await GoogleSignin.signIn();
    const userName = userInfo.data?.user?.name || (userInfo as any).user?.name;
    const userEmail = userInfo.data?.user?.email || (userInfo as any).user?.email;
    
    console.log("Login User Name:", userName);
    console.log("Login User Email:", userEmail);
    const idToken = userInfo.data?.idToken || (userInfo as any).idToken;
    
    if (!idToken) {
      throw new Error('No ID token found from Google Sign-In');
    }

    const credential = GoogleAuthProvider.credential(idToken);
    await signInWithCredential(auth, credential);
    
    setIsAuthModalVisible(false);
    Alert.alert('Success 🎉', 'Logged in with Google successfully!');
  } catch (error: any) {
    Alert.alert('Login Error', error.message);
  }
};
  <TouchableOpacity 
        style={{ 
          backgroundColor: '#4285F4', 
          padding: 14, 
          borderRadius: 8, 
          alignItems: 'center', 
          marginTop: 15 
        }} 
        onPress={handleGoogleLogin}
      >
        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>
          Sign in with Google 🇬
        </Text>
      </TouchableOpacity>

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  // Fetch Products
  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

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
        if (selectedCategory === 'Grocery') {
          return cat.includes('grocery') || cat.includes('fruit') || cat.includes('vegetable');
        } else if (selectedCategory === 'Medicine') {
          return cat.includes('medicine') || cat.includes('pharmacy') || cat.includes('medical');
        } else if (selectedCategory === 'Cakes & Sweets') {
          return cat.includes('cake') || cat.includes('sweet') || cat.includes('mithai') || cat.includes('bakery');
        }
        return false;
      });

      // Yahan se `fetchedProducts` ka fallback hata diya hai taaki mix na ho
      setProducts(filtered);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch User Orders
  const fetchUserOrders = async () => {
    if (!user) return;
    setOrdersLoading(true);
    try {
      const q = query(collection(db, 'orders'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const ordersList: Order[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        ordersList.push({
          id: doc.id,
          items: data.items || [],
          grandTotal: data.grandTotal || 0,
          status: data.status || 'PLACED',
          address: data.address || '',
          paymentMethod: data.paymentMethod || 'COD',
          transactionId: data.transactionId || '',
          createdAt: data.createdAt,
        });
      });
      setUserOrders(ordersList);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const openOrdersModal = () => {
    if (!user) {
      setIsAuthModalVisible(true);
      return;
    }
    fetchUserOrders();
    setIsOrdersModalVisible(true);
  };

  // Search Filter
  const filteredProducts = products.filter((item) =>
    item.name.toLowerCase().trim().includes(searchQuery.toLowerCase().trim())
  );

  // Cart Handlers
  const addToCart = (product: Product) => {
    setCart((prev) => ({
      ...prev,
      [product.id]: { 
        ...product, 
        quantity: prev[product.id] ? prev[product.id].quantity + 1 : 1 
      },
    }));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      const currentItem = prev[productId];
      if (!currentItem) return prev;

      const newQty = currentItem.quantity + delta;
      if (newQty <= 0) {
        const updated = { ...prev };
        delete updated[productId];
        if (Object.keys(updated).length === 0) {
          setIsCartVisible(false);
        }
        return updated;
      }

      return {
        ...prev,
        [productId]: { ...currentItem, quantity: newQty },
      };
    });
  };

  // Auth Handler
  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setAuthLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        Alert.alert('Success 🎉', 'Account created successfully!');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        Alert.alert('Success ✅', 'Logged in successfully!');
      }
      setIsAuthModalVisible(false);
      setEmail('');
      setPassword('');
    } catch (error: any) {
      Alert.alert('Auth Error', error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    Alert.alert('Logged Out', 'You have been logged out.');
  };

  // Save Address Handler
  const handleSaveAddress = () => {
    if (!houseNo || !streetArea || !pincode) {
      Alert.alert('Error', 'Please fill all address fields');
      return;
    }
    const fullAddr = `${houseNo}, ${streetArea} - ${pincode}`;
    setSavedAddress(fullAddr);
    setIsAddressModalVisible(false);
    Alert.alert('Address Saved 📍', fullAddr);
  };

  // Checkout & Order Placement Handler
  const handlePlaceOrder = async () => {
    if (!user) {
      setIsCartVisible(false);
      setIsAuthModalVisible(true);
      return;
    }

    if (paymentMethod === 'UPI' && !transactionId.trim()) {
      Alert.alert('Payment Error', 'Please enter UPI Transaction ID / UTR number after payment.');
      return;
    }

    setOrderPlacing(true);
    try {
      const orderData = {
        userId: user.uid,
        userEmail: user.email,
        items: cartItemsList.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        itemTotal,
        deliveryFee,
        grandTotal,
        address: savedAddress,
        paymentMethod,
        transactionId: paymentMethod === 'UPI' ? transactionId : 'N/A (COD)',
        status: 'PLACED',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'orders'), orderData);

      Alert.alert(
        '🎉 Order Confirmed!',
        `Payment Mode: ${paymentMethod}\nDelivering to:\n${savedAddress}\n\nTotal Paid: ₹${grandTotal}`
      );
      setCart({});
      setTransactionId('');
      setIsCartVisible(false);
    } catch (error: any) {
      console.error('Error placing order:', error);
      Alert.alert('Order Error', error.message);
    } finally {
      setOrderPlacing(false);
    }
  };

  const getStageIndex = (status: string) => {
    switch (status) {
      case 'PACKED': return 1;
      case 'OUT_FOR_DELIVERY': return 2;
      case 'DELIVERED': return 3;
      default: return 0;
    }
  };

  const cartItemsList = Object.values(cart);
  const totalItemsCount = cartItemsList.reduce((sum, item) => sum + item.quantity, 0);
  const itemTotal = cartItemsList.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = itemTotal > 0 ? 15 : 0;
  const grandTotal = itemTotal + deliveryFee;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

{/* Header */}
<View style={[styles.header, { flexDirection: 'column', alignItems: 'stretch' }]}>
  
  {/* Top Row: App Name & Cart Button in Top-Right Corner */}
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
    <Text style={{ fontSize: 22, fontWeight: '900', color: '#0C831F', letterSpacing: 0.5 }}>
      Gramofast
    </Text>

    {/* Dedicated Top-Right Corner Cart Button */}
    <TouchableOpacity 
      style={styles.headerCartBtn}
      onPress={() => setIsCartVisible(true)}
    >
      <Text style={styles.headerCartText}>
        🛒 {Object.values(cart).reduce((sum: number, item: any) => sum + item.quantity, 0)}
      </Text>
    </TouchableOpacity>
  </View>

  {/* Second Row: Delivery Time and Other Buttons (Admin, Login, Orders) */}
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
    <TouchableOpacity style={{ flex: 1 }} onPress={() => setIsAddressModalVisible(true)}>
      <Text style={styles.deliveryTime}>⚡ 40 - 50 MINS</Text>
      <Text style={styles.locationText} numberOfLines={1}>
        📍 {savedAddress} ▼
      </Text>
    </TouchableOpacity>

    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      {user && (
        <TouchableOpacity style={styles.myOrdersBtn} onPress={openOrdersModal}>
          <Text style={styles.myOrdersText}>📦 Orders</Text>
        </TouchableOpacity>
      )}
      
      <Link href="/admin-login" asChild>
        <TouchableOpacity style={styles.topAdminBtn}>
          <Text style={styles.topAdminText}>🔒 Admin</Text>
        </TouchableOpacity>
      </Link>

      <TouchableOpacity 
        style={styles.topLoginBtn} 
        onPress={() => (user ? handleLogout() : setIsAuthModalVisible(true))}
      >
        <Text style={styles.topLoginText}>{user ? 'Logout' : 'Login'}</Text>
      </TouchableOpacity>
    </View>
  </View>

</View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          placeholder="Search 'Milk, Paracetamol, Bread'..."
          style={styles.searchInput}
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
   {/* Toggle Switch / Categories */}
<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
  <View style={{ flexDirection: 'row', gap: 10 }}>
    
    {/* 1. Grocery Button */}
    <TouchableOpacity
      style={[
        styles.catTabButton, 
        selectedCategory === 'Grocery' && styles.activeCatTabButton
      ]}
      onPress={() => {
        setSelectedCategory('Grocery');
        setSearchQuery('');
      }}
    >
      <Text style={[styles.catTabText, selectedCategory === 'Grocery' && styles.activeCatTabText]}>
        🛒 Grocery Store
      </Text>
    </TouchableOpacity>

    {/* 2. Medicine Button */}
    <TouchableOpacity
      style={[
        styles.catTabButton, 
        selectedCategory === 'Medicine' && styles.activeCatTabButton
      ]}
      onPress={() => {
        setSelectedCategory('Medicine');
        setSearchQuery('');
      }}
    >
      <Text style={[styles.catTabText, selectedCategory === 'Medicine' && styles.activeCatTabText]}>
        💊 Pharmacy / Medicine
      </Text>
    </TouchableOpacity>

    {/* 3. Cakes & Sweets Button */}
    <TouchableOpacity
      style={[
        styles.catTabButton, 
        selectedCategory === 'Cakes & Sweets' && styles.activeCatTabButton
      ]}
      onPress={() => {
        setSelectedCategory('Cakes & Sweets');
        setSearchQuery('');
      }}
    >
      <Text style={[styles.catTabText, selectedCategory === 'Cakes & Sweets' && styles.activeCatTabText]}>
        🎂 Cakes & Sweets
      </Text>
    </TouchableOpacity>

  </View>
</ScrollView>

  {/* Title */}
      <Text style={styles.sectionTitle}>
        {searchQuery
          ? `Search Results for "${searchQuery}"`
          : selectedCategory === 'Grocery'
          ? 'Available Grocery Products'
          : selectedCategory === 'Medicine'
          ? 'Essential Medicines & Health'
          : 'Delicious Cakes & Sweets'}
      </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#0C831F" style={{ marginTop: 30 }} />
        ) : filteredProducts.length === 0 ? (
          <Text style={styles.emptyText}>No items found matching your search.</Text>
        ) : (
          <View style={styles.categoryGrid}>
            {filteredProducts.map((item) => {
              const qty = cart[item.id]?.quantity || 0;

              return (
                <View key={item.id} style={styles.categoryCard}>
                  {item.image ? (
  <Image source={{ uri: item.image }} style={{ width: 60, height: 60, borderRadius: 8, marginBottom: 4 }} />
) : (
  <Text style={styles.categoryEmoji}>📦</Text>
)}
                  {/* Unit display */}
{item.unit ? <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '500', marginBottom: 2 }}>{item.unit}</Text> : null}

<Text style={styles.categoryName}>{item.name}</Text>

{/* Price & Compare MRP Price */}
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
  <Text style={styles.priceText}>₹{item.price}</Text>
  {item.comparePrice && item.comparePrice > item.price ? (
    <Text style={{ fontSize: 12, color: '#9CA3AF', textDecorationLine: 'line-through' }}>₹{item.comparePrice}</Text>
  ) : null}
</View>
                  {qty === 0 ? (
                    <TouchableOpacity style={styles.addBtn} onPress={() => addToCart(item)}>
                      <Text style={styles.addBtnText}>ADD</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.qtyContainer}>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.id, -1)}>
                        <Text style={styles.qtyBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{qty}</Text>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.id, 1)}>
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Cart Floating Bar */}
      {totalItemsCount > 0 && (
        <View style={styles.cartBar}>
          <View style={styles.cartInfo}>
            <Text style={styles.cartBadge}>{totalItemsCount} {totalItemsCount === 1 ? 'ITEM' : 'ITEMS'}</Text>
            <Text style={styles.cartPriceText}>₹{grandTotal}</Text>
          </View>
          <TouchableOpacity style={styles.viewCartBtn} onPress={() => setIsCartVisible(true)}>
            <Text style={styles.viewCartText}>View Cart 🛒</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Cart Modal */}
      <Modal animationType="slide" transparent={true} visible={isCartVisible} onRequestClose={() => setIsCartVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>My Cart ({totalItemsCount} Items)</Text>
              <TouchableOpacity onPress={() => setIsCartVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 160 }}>
              {cartItemsList.map((item) => (
                <View key={item.id} style={styles.cartItemRow}>
                  <Text style={styles.cartItemEmoji}>{item.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cartItemName}>{item.name}</Text>
                    <Text style={styles.cartItemPrice}>₹{item.price * item.quantity}</Text>
                  </View>
                  <View style={styles.qtyContainerSmall}>
                    <TouchableOpacity style={styles.qtyBtnSmall} onPress={() => updateQuantity(item.id, -1)}>
                      <Text style={styles.qtyBtnTextSmall}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyTextSmall}>{item.quantity}</Text>
                    <TouchableOpacity style={styles.qtyBtnSmall} onPress={() => updateQuantity(item.id, 1)}>
                      <Text style={styles.qtyBtnTextSmall}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Delivery Address Preview */}
            <TouchableOpacity style={styles.cartAddressBox} onPress={() => setIsAddressModalVisible(true)}>
              <Text style={styles.cartAddressTitle}>Deliver to: 📍</Text>
              <Text style={styles.cartAddressText} numberOfLines={1}>{savedAddress}</Text>
              <Text style={styles.changeAddressText}>Change</Text>
            </TouchableOpacity>

            {/* Payment Method Selector */}
            <View style={styles.paymentSection}>
              <Text style={styles.paymentTitle}>Select Payment Method 💳</Text>
              <View style={styles.paymentRow}>
                <TouchableOpacity
                  style={[styles.payOptionBtn, paymentMethod === 'COD' && styles.payOptionActive]}
                  onPress={() => setPaymentMethod('COD')}
                >
                  <Text style={[styles.payOptionText, paymentMethod === 'COD' && styles.payOptionTextActive]}>
                    💵 Cash on Delivery
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.payOptionBtn, paymentMethod === 'UPI' && styles.payOptionActive]}
                  onPress={() => setPaymentMethod('UPI')}
                >
                  <Text style={[styles.payOptionText, paymentMethod === 'UPI' && styles.payOptionTextActive]}>
                    📱 Pay via UPI
                  </Text>
                </TouchableOpacity>
              </View>

              {/* UPI Box Info */}
{paymentMethod === 'UPI' && (
  <View style={styles.upiBox}>
    <Text style={styles.upiText}>Scan QR Code to Pay ₹{grandTotal}:</Text>

    <Image 
      source={require('../../assets/images/UPI.jpeg')} 
      style={{ width: 160, height: 160, alignSelf: 'center', marginVertical: 8, borderRadius: 8 }} 
      resizeMode="contain"
    />

    <Text style={styles.upiIdText}>9546122006-2@ybl</Text>

    <TextInput
      placeholder="Enter UPI Transaction ID / Ref No."
      style={styles.upiInput}
      value={transactionId}
      onChangeText={setTransactionId}
    />
  </View>
)}
            </View>

            <View style={styles.billContainer}>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Item Total</Text>
                <Text style={styles.billValue}>₹{itemTotal}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Delivery Charge</Text>
                <Text style={styles.billValue}>₹{deliveryFee}</Text>
              </View>
              <View style={[styles.billRow, { borderTopWidth: 1, borderColor: '#eee', paddingTop: 6, marginTop: 2 }]}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalValue}>₹{grandTotal}</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.checkoutBtn} 
              onPress={handlePlaceOrder}
              disabled={orderPlacing}
            >
              {orderPlacing ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.checkoutText}>
                  {user ? `Place Order • ₹${grandTotal}` : 'Login to Checkout'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Address Modal */}
<Modal
  animationType="slide"
  transparent={true}
  visible={isAddressModalVisible}
  onRequestClose={() => setIsAddressModalVisible(false)}
>
  <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
    <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, minHeight: 320 }}>
      
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#000' }}>Select your Location</Text>
        <TouchableOpacity onPress={() => setIsAddressModalVisible(false)}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#333', padding: 4 }}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* 1. Manual Address Inputs */}
      <View style={{ gap: 10, marginBottom: 15 }}>
        <TextInput
          style={{ borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 12, height: 44, backgroundColor: '#F9F9F9' }}
          placeholder="Flat / House No. / Building"
          placeholderTextColor="#888"
          value={houseNo}
          onChangeText={setHouseNo}
        />
        <TextInput
          style={{ borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 12, height: 44, backgroundColor: '#F9F9F9' }}
          placeholder="Street / Area / Locality"
          placeholderTextColor="#888"
          value={streetArea}
          onChangeText={setStreetArea}
        />
        <TextInput
          style={{ borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 12, height: 44, backgroundColor: '#F9F9F9' }}
          placeholder="Pincode"
          placeholderTextColor="#888"
          keyboardType="numeric"
          value={pincode}
          onChangeText={setPincode}
        />
      </View>

      {/* Save Manual Address Button */}
      <TouchableOpacity 
        style={{ backgroundColor: '#0C831F', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 12 }}
        onPress={() => {
          if (houseNo || streetArea || pincode) {
            setSavedAddress(`${houseNo} ${streetArea} ${pincode}`.trim());
            setIsAddressModalVisible(false);
          } else {
            alert('Kripya address enter karein');
          }
        }}
      >
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>Save Address</Text>
      </TouchableOpacity>

      {/* 2. Auto Detect Current Location Button */}
      <TouchableOpacity 
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#0C831F', borderRadius: 10, padding: 12, backgroundColor: '#F0FDF4' }} 
        onPress={handleDetectLocation}
        disabled={loadingLocation}
      >
        <Text style={{ fontSize: 16, marginRight: 8 }}>🎯</Text>
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#0C831F' }}>
          {loadingLocation ? 'Fetching location...' : 'Use current location'}
        </Text>
      </TouchableOpacity>

    </View>
  </View>
</Modal>

      {/* Orders History Modal */}
      <Modal animationType="slide" transparent={true} visible={isOrdersModalVisible} onRequestClose={() => setIsOrdersModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>My Orders 📦</Text>
              <TouchableOpacity onPress={() => setIsOrdersModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {ordersLoading ? (
              <ActivityIndicator size="large" color="#0C831F" style={{ marginVertical: 30 }} />
            ) : userOrders.length === 0 ? (
              <Text style={styles.emptyText}>You haven't placed any orders yet.</Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {userOrders.map((order) => (
                  <TouchableOpacity 
                    key={order.id} 
                    style={styles.orderCard}
                    onPress={() => setSelectedTrackingOrder(order)}
                  >
                    <View style={styles.orderCardHeader}>
                      <Text style={styles.orderIdText}>Order ID: #{order.id.slice(0, 8)}</Text>
                      <Text style={styles.orderStatusBadge}>{order.status}</Text>
                    </View>
                    <View style={{ marginVertical: 6 }}>
                      {order.items.map((item, idx) => (
                        <Text key={idx} style={styles.orderItemText}>
                          • {item.name} x {item.quantity} (₹{item.price * item.quantity})
                        </Text>
                      ))}
                    </View>
                    <Text style={{ fontSize: 11, color: '#777', marginBottom: 2 }}>
                      💳 Mode: {order.paymentMethod} {order.transactionId !== 'N/A (COD)' ? `(Ref: ${order.transactionId})` : ''}
                    </Text>
                    {order.address ? (
                      <Text style={{ fontSize: 11, color: '#777', marginBottom: 6 }}>
                        📍 {order.address}
                      </Text>
                    ) : null}
                    <View style={styles.trackOrderRow}>
                      <Text style={styles.orderTotalText}>Total: ₹{order.grandTotal}</Text>
                      <Text style={styles.trackText}>Track Order 📍</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Live Tracking Modal */}
      <Modal animationType="fade" transparent={true} visible={!!selectedTrackingOrder} onRequestClose={() => setSelectedTrackingOrder(null)}>
        <View style={styles.authOverlay}>
          <View style={styles.authModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Live Order Status 🚚</Text>
              <TouchableOpacity onPress={() => setSelectedTrackingOrder(null)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedTrackingOrder && (
              <View style={{ marginVertical: 10 }}>
                <Text style={{ fontSize: 13, color: '#666', marginBottom: 15, textAlign: 'center' }}>
                  Order ID: #{selectedTrackingOrder.id.slice(0, 8)}
                </Text>

                {ORDER_STAGES.map((stage, idx) => {
                  const currentIdx = getStageIndex(selectedTrackingOrder.status);
                  const isDone = idx <= currentIdx;
                  return (
                    <View key={stage.key} style={styles.timelineRow}>
                      <View style={styles.timelineIconCol}>
                        <View style={[styles.timelineDot, isDone && styles.timelineDotActive]}>
                          <Text style={{ fontSize: 12 }}>{stage.emoji}</Text>
                        </View>
                        {idx < ORDER_STAGES.length - 1 && (
                          <View style={[styles.timelineLine, idx < currentIdx && styles.timelineLineActive]} />
                        )}
                      </View>
                      <View style={styles.timelineTextCol}>
                        <Text style={[styles.timelineTitle, isDone && styles.timelineTitleActive]}>
                          {stage.label}
                        </Text>
                        <Text style={styles.timelineSub}>
                          {isDone ? 'Completed' : 'Pending'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </Modal>
      {/* Profile Modal */}
<Modal
  animationType="slide"
  transparent={true}
  visible={isProfileModalVisible}
  onRequestClose={() => setIsProfileModalVisible(false)}
>
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
    <View style={{ width: '85%', backgroundColor: '#fff', borderRadius: 12, padding: 20, alignItems: 'center' }}>
      
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 15 }}>My Profile</Text>
      
      <Text style={{ fontSize: 16, color: '#333', marginBottom: 5 }}>
        Name: {user?.displayName || 'User'}
      </Text>
      
      <Text style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>
        Email: {user?.email || 'N/A'}
      </Text>

      {/* Close Button */}
      <TouchableOpacity 
        style={{ backgroundColor: '#28a745', paddingVertical: 10, paddingHorizontal: 25, borderRadius: 8, marginTop: 10 }}
        onPress={() => setIsProfileModalVisible(false)}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Close</Text>
      </TouchableOpacity>

    </View>
  </View>
</Modal>

      {/* Auth Modal */}
      <Modal animationType="fade" transparent={true} visible={isAuthModalVisible} onRequestClose={() => setIsAuthModalVisible(false)}>
        <View style={styles.authOverlay}>
          <View style={styles.authModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>
              <TouchableOpacity onPress={() => setIsAuthModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder="Email Address"
              style={styles.inputField}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              placeholder="Password"
              style={styles.inputField}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity style={styles.authSubmitBtn} onPress={handleAuth} disabled={authLoading}>
              {authLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.authSubmitText}>{isSignUp ? 'Sign Up' : 'Login'}</Text>
              )}
            </TouchableOpacity>
<TouchableOpacity 
  style={{ 
    backgroundColor: '#4285F4', 
    padding: 14, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginTop: 15 
  }} 
  onPress={handleGoogleLogin}
>
  <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>
    Sign in with Google 🇬
  </Text>
</TouchableOpacity>
            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={{ marginTop: 15 }}>
              <Text style={styles.toggleAuthMode}>
                {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

{/* Bottom Menu Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/')}>
          <Text style={{ fontSize: 18 }}>{"🏠"}</Text>
          <Text style={styles.menuTextActive}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/explore')}>
          <Text style={{ fontSize: 18 }}>{"🔍"}</Text>
          <Text style={styles.menuText}>Explore</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={openOrdersModal}>
          <Text style={{ fontSize: 18 }}>{"📦"}</Text>
          <Text style={styles.menuText}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => user ? setIsProfileModalVisible(true) : setIsAuthModalVisible(true)}>
          <Text style={{ fontSize: 18 }}>{"👤"}</Text>
          <Text style={styles.menuText}>Profile</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', paddingTop: 35 },
  scrollContent: { paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  deliveryTime: { fontSize: 18, fontWeight: '900', color: '#000' },
  locationText: { fontSize: 12, color: '#555', marginTop: 2, paddingRight: 10 },
  profileBtn: { backgroundColor: '#EAEAEA', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  profileText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  myOrdersBtn: { backgroundColor: '#E6F4EA', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#0C831F' },
  myOrdersText: { fontSize: 12, fontWeight: 'bold', color: '#0C831F' },
topAdminBtn: {
    backgroundColor: '#0C831F',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  topAdminText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },

  topLoginBtn: {
    backgroundColor: '#E0E0E0',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  topLoginText: { color: '#333', fontSize: 11, fontWeight: 'bold' },

  headerCartBtn: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0C831F',
  },
  headerCartText: {
    color: '#0C831F',
    fontWeight: 'bold',
    fontSize: 11,
  },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', marginHorizontal: 16, marginVertical: 10, paddingHorizontal: 12, borderRadius: 12, elevation: 2, height: 45 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#000' },
  clearSearch: { fontSize: 16, color: '#888', paddingHorizontal: 6, fontWeight: 'bold' },
  toggleContainer: { flexDirection: 'row', marginHorizontal: 16, marginVertical: 12, backgroundColor: '#E0E0E0', borderRadius: 10, padding: 3 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activeGroceryBtn: { backgroundColor: '#0C831F' },
  activeMedicineBtn: { backgroundColor: '#0052CC' },
  toggleText: { fontWeight: '600', fontSize: 13, color: '#444' },
  activeToggleText: { color: '#FFF', fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginHorizontal: 16, marginTop: 10, marginBottom: 12, color: '#222' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
  categoryCard: { width: '45%', backgroundColor: '#FFF', margin: '2.5%', padding: 16, borderRadius: 12, alignItems: 'center', elevation: 1 },
  categoryEmoji: { fontSize: 32, marginBottom: 6 },
  categoryName: { fontSize: 13, fontWeight: '600', color: '#333', textAlign: 'center' },
  priceText: { fontSize: 14, fontWeight: '800', color: '#0C831F', marginVertical: 4 },
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
  menuItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  menuTextActive: {
    fontSize: 11,
    color: '#0C831F',
    fontWeight: 'bold',
    marginTop: 2,
  },
  addBtn: { marginTop: 6, backgroundColor: '#E6F4EA', paddingVertical: 6, paddingHorizontal: 22, borderRadius: 6, borderWidth: 1, borderColor: '#0C831F' },
  addBtnText: { color: '#0C831F', fontWeight: '800', fontSize: 12 },
  qtyContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0C831F', borderRadius: 6, marginTop: 6, paddingHorizontal: 4, paddingVertical: 2 },
  qtyBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  qtyBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  qtyText: { color: '#FFF', fontWeight: 'bold', fontSize: 14, paddingHorizontal: 6 },

  cartBar: { position: 'absolute', bottom: 150, left: 16, right: 16, backgroundColor: '#0C831F', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 8, zIndex: 999 },
  cartInfo: { justifyContent: 'center' },
  cartBadge: { color: '#FFF', fontSize: 11, fontWeight: '700', opacity: 0.9 },
  cartPriceText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  viewCartBtn: { backgroundColor: '#FFF', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  viewCartText: { color: '#0C831F', fontWeight: '800', fontSize: 13 },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  closeBtn: { fontSize: 20, color: '#666', fontWeight: 'bold', padding: 4 },
  cartItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  cartItemEmoji: { fontSize: 22, marginRight: 10 },
  cartItemName: { fontSize: 13, fontWeight: '600', color: '#333' },
  cartItemPrice: { fontSize: 12, color: '#0C831F', fontWeight: '700', marginTop: 2 },
  
  qtyContainerSmall: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0C831F', borderRadius: 6 },
  qtyBtnSmall: { paddingHorizontal: 8, paddingVertical: 2 },
  qtyBtnTextSmall: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  qtyTextSmall: { color: '#FFF', fontWeight: 'bold', fontSize: 12, paddingHorizontal: 4 },

  cartAddressBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F7F1', padding: 10, borderRadius: 8, marginTop: 10 },
  cartAddressTitle: { fontSize: 12, fontWeight: 'bold', color: '#0C831F' },
  cartAddressText: { flex: 1, fontSize: 12, color: '#333', marginHorizontal: 6 },
  changeAddressText: { fontSize: 12, fontWeight: 'bold', color: '#0052CC' },

  paymentSection: { marginTop: 10 },
  paymentTitle: { fontSize: 13, fontWeight: '700', color: '#222', marginBottom: 6 },
  paymentRow: { flexDirection: 'row', gap: 10 },
  payOptionBtn: { flex: 1, borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  payOptionActive: { borderColor: '#0C831F', backgroundColor: '#E6F4EA' },
  payOptionText: { fontSize: 12, fontWeight: '600', color: '#555' },
  payOptionTextActive: { color: '#0C831F', fontWeight: 'bold' },

  upiBox: { marginTop: 8, backgroundColor: '#FFF9C4', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#FBC02D' },
  upiText: { fontSize: 12, color: '#333' },
  upiIdText: { fontSize: 14, fontWeight: 'bold', color: '#D84315', marginVertical: 2 },
  upiInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CCC', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, marginTop: 6 },

  billContainer: { marginTop: 10, backgroundColor: '#F8F9FA', padding: 10, borderRadius: 10 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  billLabel: { fontSize: 12, color: '#666' },
  billValue: { fontSize: 12, fontWeight: '600', color: '#333' },
  grandTotalLabel: { fontSize: 14, fontWeight: '800', color: '#000' },
  grandTotalValue: { fontSize: 14, fontWeight: '800', color: '#0C831F' },

  checkoutBtn: { backgroundColor: '#0C831F', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  checkoutText: { color: '#FFF', fontSize: 15, fontWeight: '800' },

  orderCard: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#EAEAEA' },
  orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderIdText: { fontSize: 13, fontWeight: '700', color: '#333' },
  orderStatusBadge: { backgroundColor: '#E6F4EA', color: '#0C831F', fontSize: 11, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  orderItemText: { fontSize: 13, color: '#555', marginVertical: 2 },
  trackOrderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, borderTopWidth: 1, borderColor: '#EEE', paddingTop: 6 },
  orderTotalText: { fontSize: 14, fontWeight: '800', color: '#000' },
  trackText: { fontSize: 12, fontWeight: 'bold', color: '#0052CC' },

  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  timelineIconCol: { alignItems: 'center', width: 35 },
  timelineDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EAEAEA', justifyContent: 'center', alignItems: 'center' },
  timelineDotActive: { backgroundColor: '#C8E6C9' },
  timelineLine: { width: 3, height: 25, backgroundColor: '#EAEAEA', marginVertical: 2 },
  timelineLineActive: { backgroundColor: '#0C831F' },
  timelineTextCol: { marginLeft: 10, flex: 1 },
  timelineTitle: { fontSize: 14, fontWeight: '600', color: '#888' },
  timelineTitleActive: { color: '#0C831F', fontWeight: 'bold' },
  timelineSub: { fontSize: 11, color: '#999'},

  headerCartBtn: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0C831F',
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6, },

  headerCartText: {
    color: '#0C831F',
    fontWeight: 'bold',
    fontSize: 12,
  },
catTabButton: {
    backgroundColor: '#F0F0F0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  activeCatTabButton: {
    backgroundColor: '#0C831F',
    borderColor: '#0C831F',
  },
  catTabText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 13,
  },
  activeCatTabText: {
    color: '#FFF',
  },
  authOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  authModalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 16, padding: 20, elevation: 5 },
  inputField: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginVertical: 6, fontSize: 14, color: '#000' },
  authSubmitBtn: { backgroundColor: '#0C831F', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  authSubmitText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  toggleAuthMode: { color: '#0052CC', textAlign: 'center', fontWeight: '600', fontSize: 13 },
});