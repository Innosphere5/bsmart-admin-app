import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AdminHeader from '../components/AdminHeader';
import StatusBadge from '../components/StatusBadge';
import { OrdersSkeletonList } from '../components/Skeleton';
import { colors, radii, spacing, typography } from '../theme/colors';
import { fetchOrders, updateOrderStatus, getOrderPdfUrl, fetchNotifications, getRealtimeStreamUrl } from '../services/api';

const STATUS_FILTERS = ['All', 'Pending', 'Accepted', 'Completed', 'Declined'];
const DELIVERY_PRESETS = [
  'Within 45 mins',
  'Today by 4:00 PM',
  'Today by 6:30 PM',
  'Tomorrow Morning 10:00 AM',
  'Tomorrow Evening 5:00 PM'
];

export default function OrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  
  // Selected Order Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Accept with Delivery Time Modal State
  const [acceptModalVisible, setAcceptModalVisible] = useState(false);
  const [deliveryTimeInput, setDeliveryTimeInput] = useState('Today by 5:30 PM');
  const [actionLoading, setActionLoading] = useState(false);

  // Decline Modal State
  const [declineModalVisible, setDeclineModalVisible] = useState(false);
  const [declineReasonInput, setDeclineReasonInput] = useState('Out of stock or unable to deliver at this time.');

  // Notification state
  const [newOrderAlert, setNewOrderAlert] = useState(null);
  const [notificationsList, setNotificationsList] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [incomingOrderModalVisible, setIncomingOrderModalVisible] = useState(false);
  const [incomingOrder, setIncomingOrder] = useState(null);

  const loadOrdersData = async () => {
    try {
      const [data, notifs] = await Promise.all([
        fetchOrders(),
        fetchNotifications('all')
      ]);
      if (Array.isArray(data)) {
        setOrders(data);
        const pending = data.filter((o) => o.status === 'pending');
        if (pending.length > 0 && !newOrderAlert) {
          setNewOrderAlert(`${pending.length} pending order${pending.length > 1 ? 's' : ''} awaiting review!`);
        }
      }
      if (Array.isArray(notifs)) {
        setNotificationsList(notifs);
        const unread = notifs.filter((n) => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.warn('Error fetching orders / notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrdersData();

    // Setup SSE Real-time Stream if available in environment (e.g. Web or polyfilled)
    let eventSource;
    try {
      if (typeof window !== 'undefined' && window.EventSource) {
        eventSource = new EventSource(getRealtimeStreamUrl());
        eventSource.addEventListener('order_created', (e) => {
          try {
            const newOrder = JSON.parse(e.data);
            setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
            setNewOrderAlert(`🔔 New incoming order: ${newOrder.orderNumber || newOrder.id} placed by ${newOrder.customerName || 'customer'}!`);
            setIncomingOrder(newOrder);
            setIncomingOrderModalVisible(true);
            loadOrdersData();
          } catch (err) {}
        });

        eventSource.addEventListener('notification', (e) => {
          try {
            const notif = JSON.parse(e.data);
            setNotificationsList((prev) => [notif, ...prev.filter((n) => n.id !== notif.id)]);
            setUnreadCount((prev) => prev + 1);
          } catch (err) {}
        });

        eventSource.addEventListener('order_updated', (e) => {
          try {
            const updated = JSON.parse(e.data);
            setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
            loadOrdersData();
          } catch (err) {}
        });

        eventSource.addEventListener('order_completed', (e) => {
          try {
            const completed = JSON.parse(e.data);
            setOrders((prev) => prev.map((o) => (o.id === completed.id ? { ...o, ...completed } : o)));
            setNewOrderAlert(`✅ Order ${completed.orderNumber || completed.id} marked as completed by customer!`);
            loadOrdersData();
          } catch (err) {}
        });

        eventSource.onopen = () => setIsLiveConnected(true);
      }
    } catch (e) {}

    const interval = setInterval(loadOrdersData, 4000);
    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, []);

  const filteredOrders = orders.filter((order) => {
    const orderNo = String(order.orderNumber || order.id || '').toLowerCase();
    const customer = String(order.customerName || order.customer || '').toLowerCase();
    const school = String(order.school || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      orderNo.includes(query) ||
      customer.includes(query) ||
      school.includes(query);

    const matchesStatus =
      statusFilter === 'All' ||
      String(order.status || '').toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const handleOpenOrder = (order) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const handleOpenPdf = (order) => {
    const pdfUrl = getOrderPdfUrl(order.id);
    if (Platform.OS === 'web') {
      window.open(pdfUrl, '_blank');
    } else {
      Linking.openURL(pdfUrl).catch((err) => {
        Alert.alert('Unable to open PDF', 'Please ensure PDF viewer or browser is available.');
      });
    }
  };

  const handleAcceptOrder = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const updated = await updateOrderStatus(selectedOrder.id, {
        status: 'accepted',
        deliveryTime: deliveryTimeInput
      });
      setSelectedOrder(updated);
      setAcceptModalVisible(false);
      setModalVisible(false);
      Alert.alert('Order Accepted!', `Order ${updated.orderNumber || updated.id} accepted. Estimated delivery: ${deliveryTimeInput}`);
      loadOrdersData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to accept order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineOrder = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const updated = await updateOrderStatus(selectedOrder.id, {
        status: 'declined',
        declineReason: declineReasonInput
      });
      setSelectedOrder(updated);
      setDeclineModalVisible(false);
      setModalVisible(false);
      Alert.alert('Order Declined', `Order ${updated.orderNumber || updated.id} has been marked as declined.`);
      loadOrdersData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to decline order');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <AdminHeader
        title="B'Smart Orders"
        notificationCount={unreadCount}
        onNotificationPress={() => setNotificationsModalVisible(true)}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Pending Order Notification Banner */}
        {newOrderAlert && (
          <Pressable
            style={styles.notificationBanner}
            onPress={() => {
              const pending = incomingOrder || orders.find((o) => o.status === 'pending') || orders[0];
              if (pending) {
                setIncomingOrder(pending);
                setIncomingOrderModalVisible(true);
              }
            }}
          >
            <View style={styles.bannerLeft}>
              <Ionicons name="notifications" size={18} color="#92400E" />
              <Text style={styles.notificationText}>{newOrderAlert}</Text>
            </View>
            <View style={styles.bannerActions}>
              <Text style={styles.bannerTapText}>View &amp; PDF</Text>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  setNewOrderAlert(null);
                }}
                hitSlop={8}
              >
                <Ionicons name="close" size={16} color="#92400E" />
              </Pressable>
            </View>
          </Pressable>
        )}

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders, customer, school..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Status Filter Horizontal Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {STATUS_FILTERS.map((filter) => {
            const isSelected = statusFilter.toLowerCase() === filter.toLowerCase();
            return (
              <Pressable
                key={filter}
                style={[styles.filterPill, isSelected && styles.filterPillActive]}
                onPress={() => setStatusFilter(filter)}
              >
                <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
                  {filter}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Orders List */}
        {loading ? (
          <OrdersSkeletonList count={5} />
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bag-handle-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Orders Found</Text>
            <Text style={styles.emptySubtitle}>
              {statusFilter !== 'All'
                ? `No orders currently match '${statusFilter}' status.`
                : 'No customer orders have been received yet.'}
            </Text>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {filteredOrders.map((order) => {
              const orderNum = order.orderNumber || order.id || '#BS0000';
              const customerName = order.customerName || order.customer || 'Customer';
              const price = `₹${order.totalAmount || order.price || 0}`;
              const dateStr = new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
              const itemsCount = order.itemsCount || (order.items ? order.items.length : 1);
              const isCompleted = order.userCompleted || order.status === 'completed';

              return (
                <Pressable
                  key={order.id}
                  style={styles.orderCard}
                  onPress={() => handleOpenOrder(order)}
                >
                  {/* Top Row: Order No, Status Badge, Price, Date */}
                  <View style={styles.cardHeader}>
                    <View style={styles.orderNoRow}>
                      <Text style={styles.orderNo}>{orderNum}</Text>
                      <StatusBadge status={order.status || 'Pending'} />
                    </View>
                    <View style={styles.priceDateCol}>
                      <Text style={styles.orderPrice}>{price}</Text>
                      <Text style={styles.orderDate}>{dateStr}</Text>
                    </View>
                  </View>

                  {/* Customer Name & Mobile */}
                  <View style={styles.customerRow}>
                    <Text style={styles.customerName}>{customerName}</Text>
                    {order.customerMobile ? (
                      <Text style={styles.customerMobile}>{order.customerMobile}</Text>
                    ) : null}
                  </View>

                  {/* School Meta */}
                  <View style={styles.metaRow}>
                    <Ionicons name="school-outline" size={15} color={colors.textSecondary} />
                    <Text style={styles.metaText}>{order.school || 'General School'}</Text>
                  </View>

                  {/* Estimated Delivery Time if present */}
                  {order.deliveryTime ? (
                    <View style={styles.deliveryTimeRow}>
                      <Ionicons name="time" size={14} color="#1D4ED8" />
                      <Text style={styles.deliveryTimeText}>Delivery: {order.deliveryTime}</Text>
                    </View>
                  ) : null}

                  {/* Customer Completion Badge */}
                  {isCompleted && (
                    <View style={styles.completedBadgeRow}>
                      <Ionicons name="checkmark-circle" size={15} color="#047857" />
                      <Text style={styles.completedBadgeText}>Order Completed &amp; Received by Customer ✓</Text>
                    </View>
                  )}

                  {/* Items & View / PDF Links */}
                  <View style={styles.cardFooter}>
                    <View style={styles.metaRow}>
                      <Ionicons name="bag-handle-outline" size={15} color={colors.textSecondary} />
                      <Text style={styles.metaText}>
                        {itemsCount} {itemsCount === 1 ? 'Item' : 'Items'}
                      </Text>
                    </View>

                    <View style={styles.footerActions}>
                      <Pressable
                        style={styles.pdfBadgeBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleOpenPdf(order);
                        }}
                      >
                        <Ionicons name="document-text-outline" size={13} color="#9F1239" />
                        <Text style={styles.pdfBadgeText}>PDF</Text>
                      </Pressable>

                      <View style={styles.viewLinkRow}>
                        <Text style={styles.viewLinkText}>Manage</Text>
                        <Ionicons name="chevron-forward" size={14} color={colors.navy} />
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ======================================================== */}
      {/* 1. ORDER DETAILS & PDF PREVIEW MODAL                     */}
      {/* ======================================================== */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedOrder && (
              <>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View>
                    <View style={styles.modalTitleRow}>
                      <Text style={styles.modalTitle}>
                        {selectedOrder.orderNumber || selectedOrder.id}
                      </Text>
                      <StatusBadge status={selectedOrder.status || 'Pending'} />
                    </View>
                    <Text style={styles.modalDate}>
                      Placed on {new Date(selectedOrder.createdAt || Date.now()).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color={colors.textPrimary} />
                  </Pressable>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  {/* Customer Information Card */}
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionHeading}>Customer Credentials</Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Name:</Text>
                      <Text style={styles.infoValue}>{selectedOrder.customerName || 'N/A'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Mobile:</Text>
                      <Text style={styles.infoValueBold}>{selectedOrder.customerMobile || 'N/A'}</Text>
                    </View>
                    {selectedOrder.customerEmail ? (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Email:</Text>
                        <Text style={styles.infoValue}>{selectedOrder.customerEmail}</Text>
                      </View>
                    ) : null}
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>School:</Text>
                      <Text style={styles.infoValue}>{selectedOrder.school || 'General School'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Address:</Text>
                      <Text style={styles.infoValue}>
                        {typeof selectedOrder.deliveryAddress === 'object' && selectedOrder.deliveryAddress !== null
                          ? `${selectedOrder.deliveryAddress.address1 || ''} ${selectedOrder.deliveryAddress.address2 || ''}, ${selectedOrder.deliveryAddress.city || ''} ${selectedOrder.deliveryAddress.state || ''} - ${selectedOrder.deliveryAddress.postal || ''}`
                          : (selectedOrder.deliveryAddress || 'Standard Address')}
                      </Text>
                    </View>
                  </View>

                  {/* Delivery Status Information */}
                  {selectedOrder.deliveryTime ? (
                    <View style={[styles.sectionCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                      <Text style={[styles.sectionHeading, { color: '#1E40AF' }]}>Delivery Schedule</Text>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Estimated Time:</Text>
                        <Text style={[styles.infoValueBold, { color: '#1E40AF' }]}>{selectedOrder.deliveryTime}</Text>
                      </View>
                      {selectedOrder.userCompleted && (
                        <View style={styles.confirmedBox}>
                          <Ionicons name="checkmark-circle" size={16} color="#047857" />
                          <Text style={styles.confirmedText}>Customer Confirmed Order Received ✓</Text>
                        </View>
                      )}
                    </View>
                  ) : null}

                  {/* Ordered Items Table */}
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionHeading}>Items &amp; Size Credentials</Text>
                    {(selectedOrder.items || []).map((item, i) => (
                      <View key={i} style={styles.itemRowCard}>
                        <View style={styles.itemMainInfo}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          <Text style={styles.itemMeta}>
                            Size: <Text style={styles.boldText}>{item.size}</Text> • School: {item.school || selectedOrder.school}
                          </Text>
                        </View>
                        <View style={styles.itemPriceCol}>
                          <Text style={styles.itemPriceText}>₹{item.price} × {item.qty || 1}</Text>
                          <Text style={styles.itemTotalText}>₹{(Number(item.price || 0) * Number(item.qty || 1))}</Text>
                        </View>
                      </View>
                    ))}

                    <View style={styles.pricingSummary}>
                      <View style={styles.pricingRow}>
                        <Text style={styles.pricingLabel}>Subtotal</Text>
                        <Text style={styles.pricingValue}>₹{selectedOrder.subtotal || selectedOrder.totalAmount}</Text>
                      </View>
                      <View style={styles.pricingRow}>
                        <Text style={styles.pricingLabel}>Delivery Charge</Text>
                        <Text style={styles.pricingValue}>
                          {Number(selectedOrder.deliveryFee) === 0 ? 'FREE' : `₹${selectedOrder.deliveryFee}`}
                        </Text>
                      </View>
                      <View style={[styles.pricingRow, styles.grandTotalRow]}>
                        <Text style={styles.grandTotalLabel}>Grand Total</Text>
                        <Text style={styles.grandTotalValue}>₹{selectedOrder.totalAmount}</Text>
                      </View>
                    </View>
                  </View>

                  {/* PDF Action Button */}
                  <Pressable
                    style={styles.viewPdfBtn}
                    onPress={() => handleOpenPdf(selectedOrder)}
                  >
                    <Ionicons name="document-text" size={18} color="#FFFFFF" />
                    <Text style={styles.viewPdfBtnText}>View &amp; Print Official PDF Invoice</Text>
                  </Pressable>
                </ScrollView>

                {/* Modal Footer Action Buttons */}
                <View style={styles.modalFooter}>
                  {selectedOrder.status === 'pending' ? (
                    <View style={styles.actionBtnRow}>
                      <Pressable
                        style={[styles.actionBtn, styles.declineBtn]}
                        onPress={() => setDeclineModalVisible(true)}
                      >
                        <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
                        <Text style={styles.declineBtnText}>Decline</Text>
                      </Pressable>

                      <Pressable
                        style={[styles.actionBtn, styles.acceptBtn]}
                        onPress={() => {
                          setDeliveryTimeInput('Today by 5:30 PM');
                          setAcceptModalVisible(true);
                        }}
                      >
                        <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                        <Text style={styles.acceptBtnText}>Accept Order</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.statusFooterNotice}>
                      <Text style={styles.statusFooterText}>
                        Order is currently <Text style={styles.boldText}>{(selectedOrder.status || '').toUpperCase()}</Text>
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* 2. ACCEPT ORDER & SET DELIVERY TIME MODAL                */}
      {/* ======================================================== */}
      <Modal
        visible={acceptModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setAcceptModalVisible(false)}
      >
        <View style={styles.subModalOverlay}>
          <View style={styles.subModalCard}>
            <View style={styles.subModalHeader}>
              <Ionicons name="time" size={24} color={colors.navy} />
              <Text style={styles.subModalTitle}>Set Delivery Time</Text>
            </View>

            <Text style={styles.subModalSubtitle}>
              Specify estimated delivery time for {selectedOrder?.customerName || 'customer'}. This will instantly notify their Cart page!
            </Text>

            {/* Delivery Time Input */}
            <Text style={styles.inputLabel}>Estimated Delivery Time / Note:</Text>
            <TextInput
              style={styles.timeTextInput}
              value={deliveryTimeInput}
              onChangeText={setDeliveryTimeInput}
              placeholder="e.g. Today by 5:30 PM"
              placeholderTextColor={colors.textMuted}
            />

            {/* Quick Preset Buttons */}
            <Text style={styles.presetsLabel}>Quick Presets:</Text>
            <View style={styles.presetGrid}>
              {DELIVERY_PRESETS.map((preset) => (
                <Pressable
                  key={preset}
                  style={[
                    styles.presetPill,
                    deliveryTimeInput === preset && styles.presetPillSelected
                  ]}
                  onPress={() => setDeliveryTimeInput(preset)}
                >
                  <Text
                    style={[
                      styles.presetPillText,
                      deliveryTimeInput === preset && styles.presetPillTextSelected
                    ]}
                  >
                    {preset}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.subModalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setAcceptModalVisible(false)}
                disabled={actionLoading}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={styles.confirmAcceptBtn}
                onPress={handleAcceptOrder}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmAcceptText}>Confirm &amp; Send to User</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* 3. DECLINE ORDER MODAL                                   */}
      {/* ======================================================== */}
      <Modal
        visible={declineModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDeclineModalVisible(false)}
      >
        <View style={styles.subModalOverlay}>
          <View style={styles.subModalCard}>
            <View style={styles.subModalHeader}>
              <Ionicons name="alert-circle" size={24} color="#DC2626" />
              <Text style={[styles.subModalTitle, { color: '#DC2626' }]}>Decline Order</Text>
            </View>

            <Text style={styles.subModalSubtitle}>
              Are you sure you want to decline Order {selectedOrder?.orderNumber || selectedOrder?.id}?
            </Text>

            <Text style={styles.inputLabel}>Reason for Decline:</Text>
            <TextInput
              style={[styles.timeTextInput, { height: 70, textAlignVertical: 'top' }]}
              multiline
              value={declineReasonInput}
              onChangeText={setDeclineReasonInput}
              placeholder="Specify reason (out of stock, outside delivery radius, etc.)"
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.subModalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setDeclineModalVisible(false)}
                disabled={actionLoading}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.confirmAcceptBtn, { backgroundColor: '#DC2626' }]}
                onPress={handleDeclineOrder}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmAcceptText}>Decline Order</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* 4. REAL INCOMING ORDER NOTIFICATION POP-UP MODAL        */}
      {/* ======================================================== */}
      <Modal
        visible={incomingOrderModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIncomingOrderModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {incomingOrder && (
              <>
                <View style={[styles.modalHeader, { backgroundColor: '#FEF3C7', borderBottomColor: '#FCD34D' }]}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="notifications" size={20} color="#92400E" />
                      <Text style={[styles.modalTitle, { color: '#92400E' }]}>New Order Received!</Text>
                    </View>
                    <Text style={styles.modalDate}>
                      {incomingOrder.orderNumber || incomingOrder.id} • Placed {new Date(incomingOrder.createdAt || Date.now()).toLocaleTimeString()}
                    </Text>
                  </View>
                  <Pressable onPress={() => setIncomingOrderModalVisible(false)} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color="#92400E" />
                  </Pressable>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  {/* Real Customer Information Card */}
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionHeading}>Customer Credentials</Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Name:</Text>
                      <Text style={styles.infoValue}>{incomingOrder.customerName || 'Customer'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Mobile:</Text>
                      <Text style={styles.infoValueBold}>{incomingOrder.customerMobile || 'N/A'}</Text>
                    </View>
                    {incomingOrder.customerEmail ? (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Email:</Text>
                        <Text style={styles.infoValue}>{incomingOrder.customerEmail}</Text>
                      </View>
                    ) : null}
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>School:</Text>
                      <Text style={styles.infoValue}>{incomingOrder.school || 'General School'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Delivery To:</Text>
                      <Text style={styles.infoValue}>
                        {typeof incomingOrder.deliveryAddress === 'object' && incomingOrder.deliveryAddress !== null
                          ? `${incomingOrder.deliveryAddress.address1 || ''} ${incomingOrder.deliveryAddress.address2 || ''}, ${incomingOrder.deliveryAddress.city || ''} - ${incomingOrder.deliveryAddress.postal || ''}`
                          : (incomingOrder.deliveryAddress || 'Standard Home Delivery')}
                      </Text>
                    </View>
                  </View>

                  {/* Real Ordered Items Table */}
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionHeading}>Ordered Uniforms &amp; Sizes</Text>
                    {(incomingOrder.items || []).map((item, i) => (
                      <View key={i} style={styles.itemRowCard}>
                        <View style={styles.itemMainInfo}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          <Text style={styles.itemMeta}>
                            Size: <Text style={styles.boldText}>{item.size}</Text> • {item.school || incomingOrder.school}
                          </Text>
                        </View>
                        <View style={styles.itemPriceCol}>
                          <Text style={styles.itemPriceText}>₹{item.price} × {item.qty || 1}</Text>
                          <Text style={styles.itemTotalText}>₹{(Number(item.price || 0) * Number(item.qty || 1))}</Text>
                        </View>
                      </View>
                    ))}

                    <View style={styles.pricingSummary}>
                      <View style={styles.pricingRow}>
                        <Text style={styles.pricingLabel}>Subtotal</Text>
                        <Text style={styles.pricingValue}>₹{incomingOrder.subtotal || incomingOrder.totalAmount}</Text>
                      </View>
                      <View style={styles.pricingRow}>
                        <Text style={styles.pricingLabel}>Delivery Fee</Text>
                        <Text style={styles.pricingValue}>
                          {Number(incomingOrder.deliveryFee) === 0 ? 'FREE' : `₹${incomingOrder.deliveryFee}`}
                        </Text>
                      </View>
                      <View style={[styles.pricingRow, styles.grandTotalRow]}>
                        <Text style={styles.grandTotalLabel}>Grand Total</Text>
                        <Text style={styles.grandTotalValue}>₹{incomingOrder.totalAmount}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Prominent PDF Invoice Button */}
                  <Pressable
                    style={styles.viewPdfBtn}
                    onPress={() => handleOpenPdf(incomingOrder)}
                  >
                    <Ionicons name="document-text" size={18} color="#FFFFFF" />
                    <Text style={styles.viewPdfBtnText}>View &amp; Print Real Official PDF Invoice</Text>
                  </Pressable>
                </ScrollView>

                <View style={styles.modalFooter}>
                  <View style={styles.actionBtnRow}>
                    <Pressable
                      style={[styles.actionBtn, styles.declineBtn]}
                      onPress={() => {
                        setSelectedOrder(incomingOrder);
                        setIncomingOrderModalVisible(false);
                        setDeclineModalVisible(true);
                      }}
                    >
                      <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
                      <Text style={styles.declineBtnText}>Decline</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.actionBtn, styles.acceptBtn]}
                      onPress={() => {
                        setSelectedOrder(incomingOrder);
                        setIncomingOrderModalVisible(false);
                        setDeliveryTimeInput('Today by 5:30 PM');
                        setAcceptModalVisible(true);
                      }}
                    >
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.acceptBtnText}>Accept Order</Text>
                    </Pressable>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* 5. NOTIFICATIONS DRAWER / MODAL                         */}
      {/* ======================================================== */}
      <Modal
        visible={notificationsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setNotificationsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '75%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="notifications" size={22} color={colors.navy} />
                <Text style={styles.modalTitle}>Notifications Center</Text>
              </View>
              <Pressable onPress={() => setNotificationsModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView style={{ padding: spacing.md }} showsVerticalScrollIndicator={false}>
              {notificationsList.length === 0 ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Ionicons name="notifications-off-outline" size={40} color={colors.textMuted} />
                  <Text style={{ marginTop: 12, color: colors.textSecondary, fontWeight: '700' }}>
                    No notifications yet
                  </Text>
                </View>
              ) : (
                notificationsList.map((notif) => {
                  const targetOrd = orders.find((o) => o.id === notif.orderId || o.orderNumber === notif.orderId);
                  return (
                    <Pressable
                      key={notif.id}
                      style={[
                        styles.notifCard,
                        !notif.read && styles.notifCardUnread
                      ]}
                      onPress={() => {
                        setNotificationsModalVisible(false);
                        if (targetOrd) {
                          setSelectedOrder(targetOrd);
                          setModalVisible(true);
                        } else if (notif.orderId) {
                          const pseudoOrder = { id: notif.orderId, orderNumber: notif.orderId };
                          handleOpenPdf(pseudoOrder);
                        }
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.notifTitle}>{notif.title}</Text>
                        <Text style={styles.notifTime}>
                          {new Date(notif.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      <Text style={styles.notifMsg}>{notif.message}</Text>
                      {notif.orderId ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                          <Ionicons name="document-text-outline" size={13} color="#9F1239" />
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#9F1239' }}>
                            Tap to View Real Order &amp; PDF Invoice →
                          </Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  notificationBanner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  notificationText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#92400E',
    flex: 1,
  },
  bannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerTapText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
    backgroundColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  notifCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 8,
  },
  notifCardUnread: {
    backgroundColor: '#FFFDF5',
    borderColor: '#FCD34D',
    borderLeftWidth: 4,
    borderLeftColor: colors.navy,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  notifTime: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  notifMsg: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: 8,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  filterPill: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.xs + 3,
    marginRight: spacing.sm,
  },
  filterPillActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  filterPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: colors.white,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  ordersList: {
    gap: spacing.md,
  },
  orderCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  orderNoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  orderNo: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navy,
  },
  priceDateCol: {
    alignItems: 'flex-end',
  },
  orderPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  orderDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  customerMobile: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  deliveryTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginVertical: 4,
    alignSelf: 'flex-start',
  },
  deliveryTimeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  completedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginVertical: 4,
    alignSelf: 'flex-start',
  },
  completedBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#047857',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.xs + 2,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pdfBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  pdfBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9F1239',
  },
  viewLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    maxHeight: '90%',
    paddingBottom: spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
  },
  modalDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    padding: spacing.lg,
  },
  sectionCard: {
    backgroundColor: '#FAFAF9',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.navy,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
    gap: 8,
  },
  infoLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textSecondary,
    width: 65,
  },
  infoValue: {
    fontSize: 12.5,
    color: colors.textPrimary,
    flex: 1,
  },
  infoValueBold: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
  },
  confirmedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    padding: 6,
    borderRadius: 6,
    marginTop: 6,
  },
  confirmedText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
  },
  itemRowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginBottom: 6,
  },
  itemMainInfo: {
    flex: 1,
    paddingRight: 8,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  itemMeta: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  boldText: {
    fontWeight: '800',
    color: colors.navy,
  },
  itemPriceCol: {
    alignItems: 'flex-end',
  },
  itemPriceText: {
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  itemTotalText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.navy,
  },
  pricingSummary: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pricingLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  pricingValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 6,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy,
  },
  grandTotalValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#9F1239',
  },
  viewPdfBtn: {
    backgroundColor: '#881337',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radii.sm,
    marginVertical: spacing.md,
  },
  viewPdfBtnText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 13,
  },
  modalFooter: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radii.sm,
  },
  declineBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  declineBtnText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 13,
  },
  acceptBtn: {
    backgroundColor: '#047857',
  },
  acceptBtnText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 13,
  },
  statusFooterNotice: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusFooterText: {
    fontSize: 12.5,
    color: colors.textSecondary,
  },

  // SubModal Styles
  subModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  subModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  subModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.xs,
  },
  subModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.navy,
  },
  subModalSubtitle: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  timeTextInput: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.textPrimary,
    backgroundColor: '#FAFAF9',
    marginBottom: spacing.md,
  },
  presetsLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.lg,
  },
  presetPill: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  presetPillSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  presetPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  presetPillTextSelected: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  subModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  confirmAcceptBtn: {
    backgroundColor: '#047857',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmAcceptText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.white,
  },
});
