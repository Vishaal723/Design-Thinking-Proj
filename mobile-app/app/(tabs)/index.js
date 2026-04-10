import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, FlatList, Animated,
  KeyboardAvoidingView, Platform, Modal, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

// Conditional import for MapView to prevent web errors
let MapView, Marker;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}
import { useApp } from '../../context/AppContext';
import { getCategories, getRecommendations, updateAddress } from '../../src/api';
import { colors, spacing, radius, fontSize, fontWeight } from '../../src/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CHENNAI_CENTER = {
  latitude: 13.0827,
  longitude: 80.2707,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// Categories will now use backend restaurant names directly.

const GOALS = [
  { value: 'bulking', label: '💪 Bulking' },
  { value: 'cutting', label: '🔥 Cutting' },
  { value: 'lean_bulk', label: '⚡ Lean Bulk' },
];

export default function HomeScreen() {
  const { user, addToCart, logout, updateAddress: ctxUpdateAddress } = useApp();
  const insets = useSafeAreaInsets();
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState('bulking');
  const [topN, setTopN] = useState('5');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [recs, setRecs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addressModal, setAddressModal] = useState(!user?.address);
  const [addressInput, setAddressInput] = useState(user?.address || '');
  const [savingAddr, setSavingAddr] = useState(false);
  const [addressMode, setAddressMode] = useState('manual'); // 'manual' or 'map'
  const [region, setRegion] = useState(CHENNAI_CENTER);
  const [mapMarker, setMapMarker] = useState(null);
  const [addedId, setAddedId] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getCategories()
      .then((res) => setCategories(res.data))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!user?.address) setAddressModal(true);
  }, [user]);

  const animateIn = () => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  };

  const handleRecommend = async () => {
    if (!weight) { setError('Please enter your weight'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await getRecommendations(parseFloat(weight), goal, parseInt(topN), category || null);
      setRecs(res.data);
      animateIn();
    } catch (err) {
      setError('Failed to get recommendations. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item) => {
    addToCart(item);
    setAddedId(item.food_id);
    setTimeout(() => setAddedId(null), 1200);
  };

  const getCurrentLocation = async () => {
    setSavingAddr(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Allow location access to find you on the map.');
        setSavingAddr(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      const newRegion = { ...region, latitude, longitude };
      setRegion(newRegion);
      setMapMarker({ latitude, longitude });
      setAddressInput(`📍 Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)} (Fetching address...)`);
      
      // Attempt reverse geocode
      try {
        const addr = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (addr && addr.length > 0) {
          const first = addr[0];
          const formatted = `${first.name ? first.name + ', ' : ''}${first.street ? first.street + ', ' : ''}${first.city || first.subregion}`;
          setAddressInput(formatted);
        }
      } catch (e) {
        console.log("Reverse geocode failed", e);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not get location');
    } finally {
      setSavingAddr(false);
    }
  };

  const saveAddress = async () => {
    if (!addressInput.trim()) { Alert.alert('Please enter a valid address'); return; }
    setSavingAddr(true);
    try {
      await ctxUpdateAddress(addressInput.trim());
      setAddressModal(false);
    } catch {
      Alert.alert('Error', 'Could not save address');
    } finally {
      setSavingAddr(false);
    }
  };

  const renderMacroChip = (label, value, color) => (
    <View style={[styles.macroChip, { borderColor: color + '40', backgroundColor: color + '15' }]}>
      <Text style={[styles.macroValue, { color }]}>{value}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );

  const renderMealCard = ({ item: rec }) => {
    const isAdded = addedId === rec.food_id;
    return (
      <View style={styles.mealCard}>
        <View style={styles.rankBadge}><Text style={styles.rankText}>#{rec.rank}</Text></View>
        <View style={styles.mealCardContent}>
          <View style={styles.mealHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.mealName} numberOfLines={2}>{rec.meal_name}</Text>
              <Text style={styles.restaurantLabel}>
                🍴 {rec.restaurant_name}
              </Text>
            </View>
            <View style={styles.matchBadge}>
              <Text style={styles.matchText}>{(rec.match_score * 100).toFixed(0)}%</Text>
              <Text style={styles.matchSub}>match</Text>
            </View>
          </View>

          <Text style={styles.categoryTag}>{rec.category}</Text>

          <View style={styles.macrosRow}>
            {renderMacroChip('Cal', `${rec.calories}`, colors.calories)}
            {renderMacroChip('Protein', `${rec.protein_g}g`, colors.protein)}
            {renderMacroChip('Carbs', `${rec.carbs_g}g`, colors.carbs)}
            {renderMacroChip('Fat', `${rec.fat_g}g`, colors.fat)}
          </View>

          <View style={styles.mealFooter}>
            <Text style={styles.price}>₹{rec.price}</Text>
            <TouchableOpacity
              style={[styles.addBtn, isAdded && styles.addBtnAdded]}
              onPress={() => handleAddToCart(rec)}
            >
              <Text style={styles.addBtnText}>{isAdded ? '✓ Added' : '+ ADD'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Address Modal */}
      <Modal visible={addressModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📍 Delivery Location</Text>
              <TouchableOpacity onPress={() => setAddressModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.addressToggle}>
              <TouchableOpacity 
                style={[styles.toggleBtn, addressMode === 'manual' && styles.toggleBtnActive]}
                onPress={() => setAddressMode('manual')}
              >
                <Text style={[styles.toggleBtnText, addressMode === 'manual' && styles.toggleBtnTextActive]}>Type Address</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleBtn, addressMode === 'map' && styles.toggleBtnActive]}
                onPress={() => setAddressMode('map')}
              >
                <Text style={[styles.toggleBtnText, addressMode === 'map' && styles.toggleBtnTextActive]}>Use Map</Text>
              </TouchableOpacity>
            </View>

            {addressMode === 'manual' || Platform.OS === 'web' ? (
              <View>
                {Platform.OS === 'web' && addressMode === 'map' && (
                  <View style={[styles.mapContainer, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="map-outline" size={48} color={colors.textMuted} />
                    <Text style={{ color: colors.textSecondary, marginTop: 10, textAlign: 'center' }}>
                      Maps are only available on the mobile app.{"\n"}Please use manual entry here.
                    </Text>
                  </View>
                )}
                <TextInput
                  style={styles.modalInput}
                  placeholder="Flat No, Building, Street Name..."
                  placeholderTextColor={colors.textMuted}
                  value={addressInput}
                  onChangeText={setAddressInput}
                  multiline
                />
              </View>
            ) : (
              <View style={styles.mapContainer}>
                {MapView && (
                  <MapView
                    style={styles.map}
                    initialRegion={region}
                    onPress={(e) => {
                      const coords = e.nativeEvent.coordinate;
                      setMapMarker(coords);
                      setAddressInput(`📍 Coordinates: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
                    }}
                  >
                    {mapMarker && <Marker coordinate={mapMarker} />}
                  </MapView>
                )}
                <TouchableOpacity style={styles.currentLocBtn} onPress={getCurrentLocation}>
                  <Ionicons name="locate" size={20} color={colors.brand} />
                  <Text style={styles.currentLocText}>Locate Me</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.modalBtn} onPress={saveAddress} disabled={savingAddr}>
              {savingAddr
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.modalBtnText}>Confirm Delivery Location</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Hero Header */}
        <View style={[styles.hero, { paddingTop: insets.top + spacing.md }]}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.deliveryLabel}>Delivering to</Text>
              <TouchableOpacity onPress={() => setAddressModal(true)}>
                <Text style={styles.addressText} numberOfLines={1}>
                  {user?.address ? `📍 ${user.address}` : '📍 Set your address ▼'}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={styles.userBadge} 
              onPress={() => Alert.alert(
                'Profile', 
                `Hello, ${user?.username}!\nWould you like to logout?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Logout', onPress: logout, style: 'destructive' }
                ]
              )}
            >
              <Text style={styles.userInitial}>{user?.username?.[0]?.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.heroTitle}>What do you want{'\n'}to eat today? 🍽️</Text>
          <Text style={styles.heroSub}>AI-curated meals for your {goal.replace('_', ' ')} goal</Text>
        </View>

        {/* Recommendation Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>🔬 AI Meal Curation</Text>

          {/* Weight */}
          <Text style={styles.label}>Body Weight (kg)</Text>
          <View style={styles.inputRow}>
            <Ionicons name="barbell-outline" size={18} color={colors.brand} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 75"
              placeholderTextColor={colors.textMuted}
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
            />
          </View>

          {/* Goal */}
          <Text style={styles.label}>Fitness Goal</Text>
          <View style={styles.goalRow}>
            {GOALS.map((g) => (
              <TouchableOpacity
                key={g.value}
                style={[styles.goalChip, goal === g.value && styles.goalChipActive]}
                onPress={() => setGoal(g.value)}
              >
                <Text style={[styles.goalChipText, goal === g.value && styles.goalChipTextActive]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Category */}
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
            {['', ...categories].map((c) => (
              <TouchableOpacity
                key={c || 'all'}
                style={[styles.catChip, category === c && styles.catChipActive]}
                onPress={() => setCategory(c)}
              >
                <Text style={[styles.catChipText, category === c && styles.catChipTextActive]}>
                  {c || 'All'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Top N */}
          <Text style={styles.label}>Number of Results</Text>
          <View style={styles.topNRow}>
            {[3, 5, 8, 10].map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.nChip, topN === String(n) && styles.nChipActive]}
                onPress={() => setTopN(String(n))}
              >
                <Text style={[styles.nChipText, topN === String(n) && styles.nChipTextActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.curatBtn, loading && { opacity: 0.7 }]}
            onPress={handleRecommend}
            disabled={loading}
          >
            {loading
              ? <><ActivityIndicator color="#fff" style={{ marginRight: 8 }} /><Text style={styles.curatBtnText}>AI is thinking...</Text></>
              : <><Ionicons name="flash" size={18} color="#fff" style={{ marginRight: 6 }} /><Text style={styles.curatBtnText}>Curate My Meals</Text></>
            }
          </TouchableOpacity>
        </View>

        {/* Results */}
        {recs && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>🏆 Top Picks for You</Text>
              <Text style={styles.resultsSubtitle}>
                Optimised for {recs.user_profile?.goal?.replace('_', ' ')} • {recs.recommendations?.length} meals found
              </Text>
            </View>
            <FlatList
              data={recs.recommendations}
              keyExtractor={(item) => String(item.rank)}
              renderItem={renderMealCard}
              scrollEnabled={false}
              contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xxl }}
            />
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // Hero
  hero: {
    backgroundColor: colors.bgCard,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  deliveryLabel: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: 1 },
  addressText: { color: colors.brand, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, maxWidth: 240 },
  userBadge: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center',
  },
  userInitial: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.bold },
  heroTitle: { fontSize: fontSize.xxl, fontWeight: fontWeight.heavy, color: colors.textPrimary, lineHeight: 34 },
  heroSub: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.xs },

  // Form
  formCard: {
    backgroundColor: colors.bgCard, marginHorizontal: spacing.md,
    borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  formTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary, marginBottom: spacing.lg },
  label: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing.xs },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgInput, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, height: 48, marginBottom: spacing.md,
  },
  inputIcon: { marginRight: spacing.sm },
  textInput: { flex: 1, color: colors.textPrimary, fontSize: fontSize.md },
  goalRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  goalChip: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, alignItems: 'center',
  },
  goalChipActive: { borderColor: colors.brand, backgroundColor: colors.brand + '20' },
  goalChipText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  goalChipTextActive: { color: colors.brand, fontWeight: fontWeight.bold },
  catChip: {
    paddingVertical: spacing.xs, paddingHorizontal: spacing.md,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, marginRight: spacing.sm,
  },
  catChipActive: { borderColor: colors.brand, backgroundColor: colors.brand },
  catChipText: { color: colors.textSecondary, fontSize: fontSize.sm },
  catChipTextActive: { color: '#fff', fontWeight: fontWeight.bold },
  topNRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  nChip: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  nChipActive: { borderColor: colors.brand, backgroundColor: colors.brand },
  nChipText: { color: colors.textSecondary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  nChipTextActive: { color: '#fff', fontWeight: fontWeight.bold },
  errorText: { color: colors.error, fontSize: fontSize.sm, marginBottom: spacing.sm, textAlign: 'center' },
  curatBtn: {
    backgroundColor: colors.brand, borderRadius: radius.full,
    height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.brand, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  curatBtnText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.bold },

  // Results
  resultsHeader: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  resultsTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  resultsSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },

  // Meal Card
  mealCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.xl, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  rankBadge: {
    position: 'absolute', top: spacing.sm, left: spacing.sm,
    backgroundColor: colors.brand, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 2, zIndex: 1,
  },
  rankText: { color: '#fff', fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  mealCardContent: { padding: spacing.md, paddingTop: spacing.lg },
  mealHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  mealName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary, marginRight: spacing.sm },
  restaurantLabel: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
  matchBadge: {
    backgroundColor: colors.success + '20', borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 4, alignItems: 'center',
    borderWidth: 1, borderColor: colors.success + '40',
  },
  matchText: { color: colors.success, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  matchSub: { color: colors.success, fontSize: 9 },
  categoryTag: {
    color: colors.brand, fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  macrosRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  macroChip: {
    flex: 1, borderRadius: radius.sm, borderWidth: 1,
    alignItems: 'center', paddingVertical: spacing.xs, paddingHorizontal: 2,
  },
  macroValue: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  macroLabel: { fontSize: 9, color: colors.textMuted, marginTop: 1 },
  mealFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontSize: fontSize.lg, fontWeight: fontWeight.heavy, color: colors.textPrimary },
  addBtn: {
    borderWidth: 1.5, borderColor: colors.brand,
    borderRadius: radius.sm, paddingVertical: 6, paddingHorizontal: spacing.md,
  },
  addBtnAdded: { backgroundColor: colors.success, borderColor: colors.success },
  addBtnText: { color: colors.brand, fontSize: fontSize.sm, fontWeight: fontWeight.bold },

  // Address Modal
  // Address Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl, padding: spacing.xl,
    borderTopWidth: 1, borderColor: colors.border,
    minHeight: 500,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  modalTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary },
  addressToggle: { 
    flexDirection: 'row', backgroundColor: colors.bgInput, 
    borderRadius: radius.md, padding: 4, marginBottom: spacing.md 
  },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.sm },
  toggleBtnActive: { backgroundColor: colors.brand },
  toggleBtnText: { color: colors.textSecondary, fontWeight: fontWeight.semibold },
  toggleBtnTextActive: { color: '#fff' },
  modalInput: {
    backgroundColor: colors.bgInput, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
    color: colors.textPrimary, fontSize: fontSize.md,
    height: 120, textAlignVertical: 'top', marginBottom: spacing.md,
  },
  mapContainer: {
    height: 250, borderRadius: radius.md, overflow: 'hidden',
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  map: { flex: 1 },
  currentLocBtn: {
    position: 'absolute', bottom: 10, right: 10,
    backgroundColor: colors.bgCard, padding: 8, borderRadius: radius.sm,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: colors.brand,
  },
  currentLocText: { color: colors.brand, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  modalBtn: {
    backgroundColor: colors.brand, borderRadius: radius.full,
    height: 52, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.brand, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  modalBtnText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.bold },
});
