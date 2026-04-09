import React, { useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { colors, spacing, radius, fontSize, fontWeight } from '../../src/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OrdersScreen() {
  const { user, orders, fetchOrders, clearHistory, logout } = useApp();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleClear = () => {
    Alert.alert(
      'Clear Order History',
      'Are you sure you want to clear all past orders?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearHistory },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  const renderOrder = ({ item }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderTop}>
        <View style={styles.orderBadge}>
          <Text style={styles.orderBadgeText}>Order #{item.id}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: colors.success + '20', borderColor: colors.success + '40' }]}>
          <Text style={[styles.statusText, { color: colors.success }]}>{item.status || 'Completed'}</Text>
        </View>
      </View>
      <Text style={styles.orderItems} numberOfLines={2}>{item.items}</Text>
      <View style={styles.orderFooter}>
        <Text style={styles.orderDate}>{new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
        <Text style={styles.orderTotal}>₹{Number(item.total_amount).toFixed(0)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Profile header */}
      <View style={[styles.profileSection, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.username?.[0]?.toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{user?.username}</Text>
          <Text style={styles.userAddress} numberOfLines={1}>
            {user?.address ? `📍 ${user.address}` : '📍 No address set'}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>

      {/* Orders section */}
      <FlatList
        data={orders}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderOrder}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
        ListHeaderComponent={
          <View style={styles.ordersHeader}>
            <Text style={styles.sectionTitle}>📦 Order History</Text>
            {orders.length > 0 && (
              <TouchableOpacity onPress={handleClear}>
                <Text style={styles.clearBtn}>🗑 Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 48 }}>📋</Text>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySub}>Your orders will appear here after checkout</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  profileSection: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, padding: spacing.lg,
    borderBottomWidth: 1, borderColor: colors.border,
    gap: spacing.md,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.brand, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  avatarText: { color: '#fff', fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  userName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary },
  userAddress: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  logoutBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.error + '15', borderWidth: 1, borderColor: colors.error + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  ordersHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary },
  clearBtn: { color: colors.error, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  orderCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.xl,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  orderBadge: {
    backgroundColor: colors.brand + '20', borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderWidth: 1, borderColor: colors.brand + '40',
  },
  orderBadgeText: { color: colors.brand, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  statusBadge: {
    borderRadius: radius.sm, paddingHorizontal: spacing.sm,
    paddingVertical: 3, borderWidth: 1,
  },
  statusText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  orderItems: { color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: spacing.sm, lineHeight: 20 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: colors.border, paddingTop: spacing.sm },
  orderDate: { color: colors.textMuted, fontSize: fontSize.xs },
  orderTotal: { fontSize: fontSize.lg, fontWeight: fontWeight.heavy, color: colors.textPrimary },
  emptyBox: { alignItems: 'center', padding: spacing.xxl },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textPrimary, marginTop: spacing.md },
  emptySub: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
});
