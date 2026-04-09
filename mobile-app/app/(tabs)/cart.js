import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { colors, spacing, radius, fontSize, fontWeight } from '../../src/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CartScreen() {
  const { cartItems, cartTotal, cartCount, updateQuantity, clearCart, placeOrder, paymentState } = useApp();
  const insets = useSafeAreaInsets();

  if (paymentState === 'processing') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={styles.paymentText}>Processing your order...</Text>
        <Text style={styles.paymentSub}>Please wait securely</Text>
      </View>
    );
  }

  if (paymentState === 'success') {
    return (
      <View style={styles.centered}>
        <View style={styles.successCircle}>
          <Ionicons name="checkmark" size={48} color="#fff" />
        </View>
        <Text style={styles.paymentText}>Order Placed! 🎉</Text>
        <Text style={styles.paymentSub}>Your meal is being prepared</Text>
      </View>
    );
  }

  if (cartCount === 0) {
    return (
      <View style={styles.centered}>
        <Text style={{ fontSize: 64 }}>🛒</Text>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySub}>Go to Home to add AI-recommended meals</Text>
      </View>
    );
  }

  const renderItem = ({ item }) => (
    <View style={styles.cartItem}>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemName} numberOfLines={2}>{item.meal_name || item.food_name}</Text>
        <Text style={styles.itemCategory}>{item.category}</Text>
        <Text style={styles.itemPrice}>₹{item.price} each</Text>
      </View>
      <View style={styles.qtyControls}>
        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item, -1)}>
          <Ionicons name="remove" size={16} color={colors.brand} />
        </TouchableOpacity>
        <Text style={styles.qtyText}>{item.quantity}</Text>
        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item, 1)}>
          <Ionicons name="add" size={16} color={colors.brand} />
        </TouchableOpacity>
      </View>
      <Text style={styles.itemTotal}>₹{(item.price * item.quantity).toFixed(0)}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={cartItems}
        keyExtractor={(item) => String(item.food_id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 220 }}
        ListHeaderComponent={
          <>
            <View style={styles.cartHeader}>
              <Text style={styles.cartTitle}>Your Cart ({cartCount} items)</Text>
              <TouchableOpacity onPress={clearCart}>
                <Text style={styles.clearText}>Clear All</Text>
              </TouchableOpacity>
            </View>

            {/* Payment Method Section */}
            <View style={styles.paymentSection}>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              <View style={styles.paymentOption}>
                <View style={styles.paymentIconBox}>
                  <Ionicons name="cash-outline" size={20} color={colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentName}>Cash on Delivery</Text>
                  <Text style={styles.paymentSubtext}>Pay when your meal arrives</Text>
                </View>
                <Ionicons name="checkmark-circle" size={24} color={colors.brand} />
              </View>
            </View>
          </>
        }
        ItemSeparatorComponent={() => <View style={styles.divider} />}
      />

      {/* Swiggy-style checkout footer */}
      <View style={[styles.checkoutBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <View>
          <Text style={styles.totalLabel}>{cartCount} item{cartCount > 1 ? 's' : ''}</Text>
          <Text style={styles.totalAmount}>₹{cartTotal.toFixed(0)}</Text>
        </View>
        <TouchableOpacity style={styles.checkoutBtn} onPress={placeOrder}>
          <Text style={styles.checkoutBtnText}>Place Order →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  paymentText: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary, marginTop: spacing.lg },
  paymentSub: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  successCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.success, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
  },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary, marginTop: spacing.lg },
  emptySub: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },

  cartHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md,
  },
  cartTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary },
  clearText: { color: colors.error, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  cartItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md,
  },
  itemName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  itemCategory: { fontSize: fontSize.xs, color: colors.brand, fontWeight: fontWeight.semibold, marginTop: 2 },
  itemPrice: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  qtyControls: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.sm, gap: spacing.sm,
  },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1.5, borderColor: colors.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyText: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary, minWidth: 20, textAlign: 'center' },
  itemTotal: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary, minWidth: 50, textAlign: 'right' },

  checkoutBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.brand,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md,
    shadowColor: colors.brand, shadowOpacity: 0.5, shadowRadius: 20, elevation: 20,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
  },
  totalLabel: { color: 'rgba(255,255,255,0.8)', fontSize: fontSize.sm },
  totalAmount: { color: '#fff', fontSize: fontSize.xl, fontWeight: fontWeight.heavy },
  checkoutBtn: {
    backgroundColor: '#fff', borderRadius: radius.full,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
  },
  checkoutBtnText: { color: colors.brand, fontWeight: fontWeight.heavy, fontSize: fontSize.md },

  // Payment Section
  paymentSection: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md,
    marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textSecondary, marginBottom: spacing.md },
  paymentOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  paymentIconBox: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.brand + '15', alignItems: 'center', justifyContent: 'center',
  },
  paymentName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  paymentSubtext: { fontSize: fontSize.xs, color: colors.textMuted },
});
