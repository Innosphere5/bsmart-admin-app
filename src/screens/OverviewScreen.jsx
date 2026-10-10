import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import StatusBadge from '../components/StatusBadge';
import { overviewMetrics, recentOrders } from '../data/mockData';
import { colors, radii, spacing, typography } from '../theme/colors';
import {
  fetchProducts,
  fetchOrders,
  fetchShopStatus,
  updateShopStatus,
  calculateReopenDate,
  formatIndianDate,
} from '../services/api';
import { manualCheckForUpdate } from '../services/updateService';

export default function OverviewScreen({ navigation }) {
  const [totalProducts, setTotalProducts] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [ordersList, setOrdersList] = useState([]);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [shopStatus, setShopStatus] = useState(null);
  const [isTogglingShop, setIsTogglingShop] = useState(false);

  const loadLiveMetrics = async () => {
    try {
      const [items, liveOrders, status] = await Promise.all([
        fetchProducts(),
        fetchOrders(),
        fetchShopStatus(),
      ]);

      if (Array.isArray(items)) {
        setTotalProducts(items.length);
        const low = items.filter((p) => {
          const qty = Number(p.stockQuantity ?? 50);
          return p.stockStatus === 'Low Stock' || qty === 1 || p.stock === 'low';
        }).length;
        setLowStockCount(low);
      }

      if (Array.isArray(liveOrders)) {
        setOrdersList(liveOrders);
        const pending = liveOrders.filter((o) => o.status === 'pending').length;
        setPendingOrdersCount(pending);
      }

      if (status) {
        setShopStatus(status);
      }
    } catch (err) {
      console.error('Error fetching overview metrics:', err);
    }
  };

  useEffect(() => {
    loadLiveMetrics();
    const interval = setInterval(loadLiveMetrics, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickToggleShop = async (newVal) => {
    setIsTogglingShop(true);
    try {
      let updatePayload;
      if (newVal) {
        // Turning ON: default to 2 days closed from now
        const days = 2;
        const now = new Date();
        const calculated = calculateReopenDate(days, now);
        updatePayload = {
          isClosed: true,
          deliveryOrdersClosed: true,
          allowOrders: false,
          closureDays: days,
          startDate: now.toISOString(),
          reopenDate: calculated.reopenDate,
          reopenDateFormatted: calculated.reopenDateFormatted,
          bannerTitle: 'Online Order Processing Paused',
          bannerMessage:
            'We are currently not processing any online orders, Please revisit our website after a few business days.',
          showPopup: true,
          showTopBanner: true,
        };
      } else {
        // Turning OFF: store is open
        updatePayload = {
          isClosed: false,
          deliveryOrdersClosed: false,
          allowOrders: true,
        };
      }

      const res = await updateShopStatus(updatePayload);
      if (res && res.success) {
        setShopStatus(res.shopStatus);
        Alert.alert(
          newVal ? '🔴 Delivery Orders Closed' : '🟢 Delivery Orders Reopened',
          newVal
            ? `Delivery orders CLOSED! Website is locked showing ONLY the single notice page: "We are currently not processing any online orders, Please revisit our website after a few business days."`
            : 'Delivery orders reopened. The entire website is now live and accepting orders.'
        );
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update shop status: ' + e.message);
    } finally {
      setIsTogglingShop(false);
    }
  };

  const isClosed = Boolean(shopStatus?.isClosed || shopStatus?.deliveryOrdersClosed || shopStatus?.allowOrders === false);
  const reopenFormatted = shopStatus?.reopenDateFormatted || 'Saturday, 10 Oct 2026';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Title Header with OTA Update Button */}
        <View style={styles.titleSectionRow}>
          <View style={styles.titleSection}>
            <Text style={typography.h1}>Overview</Text>
            <Text style={typography.subtitle}>Today's operational metrics & store status</Text>
          </View>
          <Pressable
            style={styles.otaUpdateBadgeBtn}
            onPress={manualCheckForUpdate}
          >
            <Ionicons name="refresh-circle-outline" size={16} color={colors.navy} />
            <Text style={styles.otaUpdateBadgeText}>Check Update</Text>
          </Pressable>
        </View>

        {/* STORE CLOSURE BANNER MANAGEMENT CARD */}
        <View style={[styles.storeStatusCard, isClosed ? styles.storeClosedCard : styles.storeOpenCard]}>
          <View style={styles.storeStatusHeader}>
            <View style={styles.storeStatusTitleRow}>
              <View style={[styles.storeIconCircle, isClosed ? styles.storeIconClosed : styles.storeIconOpen]}>
                <Ionicons
                  name={isClosed ? 'lock-closed' : 'storefront'}
                  size={20}
                  color={isClosed ? colors.red : colors.green}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.storeStatusPillRow}>
                  <Text style={styles.storeStatusHeading}>Delivery Orders:</Text>
                  <View style={[styles.pillBadge, isClosed ? styles.pillClosed : styles.pillOpen]}>
                    <Text style={[styles.pillText, isClosed ? styles.pillTextClosed : styles.pillTextOpen]}>
                      {isClosed ? 'CLOSED (WEBSITE LOCKED)' : 'OPEN & TAKING ORDERS'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.storeStatusSubtext}>
                  {isClosed
                    ? `Website shows single notice page • Reopening ${reopenFormatted}`
                    : 'Taking online orders. Tap toggle to close delivery orders and lock site.'}
                </Text>
              </View>
            </View>

            {/* Quick Toggle Switch */}
            <View style={styles.switchWrapper}>
              {isTogglingShop ? (
                <ActivityIndicator size="small" color={colors.navy} />
              ) : (
                <Switch
                  value={isClosed}
                  onValueChange={handleQuickToggleShop}
                  trackColor={{ false: '#CBD5E1', true: '#FECDD3' }}
                  thumbColor={isClosed ? colors.red : '#F8FAFC'}
                />
              )}
            </View>
          </View>

          {/* Quick Action Button to Configure Closure & Dates */}
          <View style={styles.storeActionsRow}>
            <Pressable
              style={styles.manageClosureBtn}
              onPress={() => navigation?.navigate('StoreClosure')}
            >
              <Ionicons name="calendar-outline" size={16} color={colors.navy} />
              <Text style={styles.manageClosureBtnText}>
                {isClosed ? 'Edit Closure Dates & Notice Page' : 'Manage Delivery Closure & Dates'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.navy} />
            </Pressable>
          </View>
        </View>

        {/* Quick Action Buttons */}
        <View style={styles.actionsRow}>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => navigation?.navigate('AddProduct')}
          >
            <Ionicons name="add" size={18} color={colors.white} />
            <Text style={styles.primaryBtnText}>Add Product</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryBtn}
            onPress={() => navigation?.navigate('Orders')}
          >
            <Text style={styles.secondaryBtnText}>View Orders</Text>
          </Pressable>
        </View>

        {/* 2x2 Metric Cards Grid */}
        <View style={styles.gridContainer}>
          {/* Card 1: Orders Today */}
          <View style={styles.metricCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Orders Total</Text>
              <Ionicons name="bag-handle-outline" size={20} color={colors.textMuted} />
            </View>
            <Text style={styles.metricValue}>{ordersList.length || overviewMetrics.ordersToday.count}</Text>
            <View style={styles.greenTag}>
              <Ionicons name="trending-up-outline" size={12} color={colors.green} />
              <Text style={styles.greenTagText}>Active</Text>
            </View>
          </View>

          {/* Card 2: Pending Orders */}
          <View style={styles.metricCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Pending Orders</Text>
              <Ionicons name="time-outline" size={20} color={colors.amber} />
            </View>
            <Text style={[styles.metricValue, { color: colors.amber }]}>
              {pendingOrdersCount}
            </Text>
            <Text style={styles.amberText}>Needs action</Text>
          </View>

          {/* Card 3: Total Products */}
          <View style={styles.metricCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Total Products</Text>
              <Ionicons name="clipboard-outline" size={20} color={colors.textMuted} />
            </View>
            <Text style={styles.metricValue}>{totalProducts}</Text>
          </View>

          {/* Card 4: Low Stock Items */}
          <View style={[styles.metricCard, styles.warningCard]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.red }]}>Low Stock Items</Text>
              <Ionicons name="warning-outline" size={20} color={colors.red} />
            </View>
            <Text style={[styles.metricValue, { color: colors.red }]}>
              {lowStockCount}
            </Text>
            <Pressable onPress={() => navigation?.navigate('Inventory')}>
              <Text style={styles.redManageLink}>Manage</Text>
            </Pressable>
          </View>
        </View>

        {/* Section 2: Recent Orders Table */}
        <View style={styles.tableCard}>
          <View style={styles.tableCardHeader}>
            <Text style={typography.h2}>Recent Orders</Text>
            <Pressable onPress={() => navigation?.navigate('Orders')}>
              <Text style={styles.viewAllLink}>View All</Text>
            </Pressable>
          </View>

          {/* Table Headers */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableCol, styles.colId, styles.tableHeaderLabel]}>Order ID</Text>
            <Text style={[styles.tableCol, styles.colCustomer, styles.tableHeaderLabel]}>Customer</Text>
            <Text style={[styles.tableCol, styles.colAmount, styles.tableHeaderLabel]}>Amount</Text>
            <Text style={[styles.tableCol, styles.colStatus, styles.tableHeaderLabel]}>Status</Text>
          </View>

          {/* Table Rows */}
          {(ordersList.length > 0 ? ordersList.slice(0, 5) : recentOrders).map((order) => (
            <View key={order.id} style={styles.tableDataRow}>
              <Text style={[styles.tableCol, styles.colId, styles.orderIdText]}>
                {order.orderNumber || order.orderId || order.id}
              </Text>
              <Text style={[styles.tableCol, styles.colCustomer, styles.customerText]} numberOfLines={1}>
                {order.customerName || order.customer}
              </Text>
              <Text style={[styles.tableCol, styles.colAmount, styles.amountText]}>
                {typeof order.totalAmount === 'number' ? `₹${order.totalAmount}` : (order.amount || `₹${order.price || 0}`)}
              </Text>
              <View style={[styles.tableCol, styles.colStatus]}>
                <StatusBadge status={order.status} />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  titleSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  titleSection: {
    flex: 1,
  },
  otaUpdateBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.navySoft,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    gap: 4,
  },
  otaUpdateBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.navy,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  primaryBtn: {
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    gap: 6,
  },
  primaryBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.navy,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: colors.navy,
    fontWeight: '700',
    fontSize: 14,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  metricCard: {
    width: '47.5%',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  warningCard: {
    backgroundColor: colors.status.lowStockCardBg,
    borderColor: colors.status.lowStockCardBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.navy,
    marginVertical: 4,
  },
  greenTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
    alignSelf: 'flex-start',
    gap: 3,
  },
  greenTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.green,
  },
  amberText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.amber,
  },
  redManageLink: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.red,
    textDecorationLine: 'underline',
  },
  tableCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
  },
  tableCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  viewAllLink: {
    color: colors.navy,
    fontWeight: '700',
    fontSize: 13,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingBottom: spacing.sm,
    marginBottom: spacing.xs,
  },
  tableHeaderLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tableDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tableCol: {
    paddingRight: 4,
  },
  colId: { width: '25%' },
  colCustomer: { width: '30%' },
  colAmount: { width: '22%' },
  colStatus: { width: '23%' },

  orderIdText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
  },
  customerText: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  amountText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  storeStatusCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1.5,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  storeOpenCard: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  storeClosedCard: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF1F2',
  },
  storeStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  storeStatusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  storeIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeIconOpen: {
    backgroundColor: '#DCFCE7',
  },
  storeIconClosed: {
    backgroundColor: '#FEE2E2',
  },
  storeStatusPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  storeStatusHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
  },
  pillBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  pillOpen: {
    backgroundColor: '#DCFCE7',
  },
  pillClosed: {
    backgroundColor: '#FEE2E2',
  },
  pillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pillTextOpen: {
    color: '#15803D',
  },
  pillTextClosed: {
    color: '#B91C1C',
  },
  storeStatusSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  switchWrapper: {
    paddingLeft: spacing.xs,
  },
  storeActionsRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  manageClosureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
  },
  manageClosureBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
    flex: 1,
    marginLeft: 6,
  },
});

