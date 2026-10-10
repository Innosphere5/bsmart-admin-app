import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '../theme/colors';
import {
  fetchShopStatus,
  updateShopStatus,
  formatIndianDate,
  calculateReopenDate,
  getDefaultShopStatus,
} from '../services/api';

export default function StoreClosureScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Shop Status State
  const [isClosed, setIsClosed] = useState(false);
  const [deliveryOrdersClosed, setDeliveryOrdersClosed] = useState(false);
  const [closureDays, setClosureDays] = useState(2);
  const [startDate, setStartDate] = useState(new Date().toISOString());
  const [reopenDate, setReopenDate] = useState(
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
  );
  const [reopenDateFormatted, setReopenDateFormatted] = useState(
    formatIndianDate(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000))
  );
  const [bannerTitle, setBannerTitle] = useState('Online Order Processing Paused');
  const [bannerMessage, setBannerMessage] = useState(
    'We are currently not processing any online orders, Please revisit our website after a few business days.'
  );
  const [allowOrders, setAllowOrders] = useState(false);
  const [showPopup, setShowPopup] = useState(true);
  const [showTopBanner, setShowTopBanner] = useState(true);

  // Load existing status from Supabase/Backend
  const loadStatus = async () => {
    setLoading(true);
    try {
      const data = await fetchShopStatus();
      if (data) {
        const closed = Boolean(data.isClosed || data.deliveryOrdersClosed || data.allowOrders === false);
        setIsClosed(closed);
        setDeliveryOrdersClosed(Boolean(data.deliveryOrdersClosed || closed));
        const days = Number(data.closureDays) || 2;
        setClosureDays(days);
        setStartDate(data.startDate || new Date().toISOString());

        const targetReopen = data.reopenDate || new Date(Date.now() + days * 86400000).toISOString();
        setReopenDate(targetReopen);
        setReopenDateFormatted(data.reopenDateFormatted || formatIndianDate(targetReopen));

        setBannerTitle(data.bannerTitle || 'Online Order Processing Paused');
        setBannerMessage(
          data.bannerMessage ||
            'We are currently not processing any online orders, Please revisit our website after a few business days.'
        );
        setAllowOrders(data.allowOrders !== false && !closed);
        setShowPopup(data.showPopup !== false);
        setShowTopBanner(data.showTopBanner !== false);
      }
    } catch (err) {
      console.warn('Error loading shop status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  // Update dates when days change
  const handleDaysChange = (newDays, updateText = true) => {
    const days = Math.max(1, parseInt(newDays, 10) || 1);
    setClosureDays(days);

    const start = startDate ? new Date(startDate) : new Date();
    const calculated = calculateReopenDate(days, start);

    setReopenDate(calculated.reopenDate);
    setReopenDateFormatted(calculated.reopenDateFormatted);

    if (updateText) {
      setBannerTitle(`Delivery Orders Paused for ${days} ${days === 1 ? 'Day' : 'Days'}`);
      setBannerMessage(
        'We are currently not processing any online orders, Please revisit our website after a few business days.'
      );
    }
  };

  // Stepper to increment date (Real Calendar Date increment)
  const adjustDays = (delta) => {
    const nextDays = Math.max(1, closureDays + delta);
    handleDaysChange(nextDays, true);
  };

  // Toggle Shop Closed switch
  const handleToggleClosed = (val) => {
    setIsClosed(val);
    setDeliveryOrdersClosed(val);
    setAllowOrders(!val);
    if (val && closureDays <= 0) {
      handleDaysChange(2, true);
    }
  };

  // Auto-generate fresh text based on current real date
  const handleRegenerateText = () => {
    setBannerTitle(`Delivery Orders Paused for ${closureDays} ${closureDays === 1 ? 'Day' : 'Days'}`);
    setBannerMessage(
      'We are currently not processing any online orders, Please revisit our website after a few business days.'
    );
  };

  // Save changes to Supabase & Backend
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        isClosed,
        deliveryOrdersClosed: isClosed || !allowOrders,
        closureDays,
        startDate,
        reopenDate,
        reopenDateFormatted,
        bannerTitle: bannerTitle.trim() || 'Online Order Processing Paused',
        bannerMessage:
          bannerMessage.trim() ||
          'We are currently not processing any online orders, Please revisit our website after a few business days.',
        allowOrders: !isClosed && allowOrders,
        showPopup,
        showTopBanner,
      };

      const res = await updateShopStatus(payload);
      if (res && res.success) {
        Alert.alert(
          isClosed ? '🔴 Delivery Orders Closed!' : '🟢 Store is Open!',
          isClosed
            ? `Delivery orders are CLOSED for ${closureDays} days (Reopening on ${reopenDateFormatted}). The website is now LOCKED to display only the single notice page: "We are currently not processing any online orders, Please revisit our website after a few business days."`
            : 'Store marked as OPEN. The single closure page is removed, and the full website catalog and checkout are live for customers.'
        );
      } else {
        Alert.alert('Notice', 'Settings saved to cloud database successfully.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Instant Reopen Shop
  const handleInstantReopen = () => {
    Alert.alert(
      'Reopen Online Delivery Orders?',
      'This will immediately unlock the entire website so visitors can view products, access the cart, and place orders.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Reopen Now',
          style: 'default',
          onPress: async () => {
            setSaving(true);
            try {
              await updateShopStatus({
                isClosed: false,
                deliveryOrdersClosed: false,
                allowOrders: true,
              });
              setIsClosed(false);
              setDeliveryOrdersClosed(false);
              setAllowOrders(true);
              Alert.alert('🟢 Success', 'Online delivery orders reopened! The entire website is now accessible.');
            } catch (e) {
              Alert.alert('Error', 'Failed to reopen shop: ' + e.message);
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation?.navigate('Overview')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.navy} />
          </Pressable>
          <Text style={styles.headerTitle}>Store Closure & Banner</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.navy} />
          <Text style={styles.loadingText}>Loading store status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Navigation Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation?.navigate('Overview')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.navy} />
        </Pressable>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Store Closure & Banner</Text>
          <Text style={styles.headerSubtitle}>Manage real-time closure notice & popup</Text>
        </View>
        <View
          style={[
            styles.statusPill,
            isClosed ? styles.statusPillClosed : styles.statusPillOpen,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isClosed ? colors.red : colors.green },
            ]}
          />
          <Text
            style={[
              styles.statusPillText,
              { color: isClosed ? colors.red : colors.green },
            ]}
          >
            {isClosed ? 'CLOSED' : 'OPEN'}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* SECTION 1: MASTER TOGGLE */}
        <View style={[styles.card, isClosed ? styles.cardClosedBorder : styles.cardOpenBorder]}>
          <View style={styles.switchRow}>
            <View style={styles.switchTextBox}>
              <View style={styles.switchTitleRow}>
                <Ionicons
                  name={isClosed ? 'lock-closed' : 'storefront-outline'}
                  size={20}
                  color={isClosed ? colors.red : colors.navy}
                />
                <Text style={styles.cardTitle}>
                  {isClosed ? 'Delivery Orders: CLOSED (Website Locked)' : 'Delivery Orders: OPEN & ACCEPTING'}
                </Text>
              </View>
              <Text style={styles.cardSubtitle}>
                {isClosed
                  ? 'Website is locked to display ONLY the single notice page: "We are currently not processing any online orders, Please revisit our website after a few business days."'
                  : 'Full website is accessible. Customers can browse uniforms, schools, cart, and place online delivery orders.'}
              </Text>
            </View>
            <Switch
              value={isClosed}
              onValueChange={handleToggleClosed}
              trackColor={{ false: '#CBD5E1', true: '#FECDD3' }}
              thumbColor={isClosed ? colors.red : '#F8FAFC'}
            />
          </View>
        </View>

        {/* SECTION 2: DURATION & REAL REOPENING DATE */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={20} color={colors.navy} />
            <Text style={styles.cardTitle}>Closure Duration & Real Reopening Date</Text>
          </View>
          <Text style={styles.cardSubtitle}>
            Increases the date to the exact calendar date when your shop reopens.
          </Text>

          {/* Real Date Display Box */}
          <View style={styles.reopenHighlightBox}>
            <View style={styles.calendarBadge}>
              <Ionicons name="time" size={22} color={colors.navy} />
            </View>
            <View style={styles.reopenInfo}>
              <Text style={styles.reopenLabel}>REOPENING ON (REAL DATE):</Text>
              <Text style={styles.reopenDateBig}>{reopenDateFormatted}</Text>
              <Text style={styles.durationNote}>
                Total Closure Duration: <Text style={styles.boldText}>{closureDays} {closureDays === 1 ? 'Day' : 'Days'}</Text>
              </Text>
            </View>
          </View>

          {/* Quick Date Stepper Buttons */}
          <Text style={styles.fieldLabel}>Increase / Adjust Closure Days:</Text>
          <View style={styles.stepperRow}>
            <Pressable
              style={[styles.stepperBtn, closureDays <= 1 && styles.stepperBtnDisabled]}
              onPress={() => adjustDays(-1)}
              disabled={closureDays <= 1}
            >
              <Ionicons name="remove" size={18} color={closureDays <= 1 ? colors.textMuted : colors.navy} />
              <Text style={[styles.stepperBtnText, closureDays <= 1 && styles.stepperBtnTextDisabled]}>
                -1 Day
              </Text>
            </Pressable>

            <View style={styles.currentDaysBox}>
              <Text style={styles.currentDaysNumber}>{closureDays}</Text>
              <Text style={styles.currentDaysLabel}>DAYS</Text>
            </View>

            <Pressable style={styles.stepperBtn} onPress={() => adjustDays(1)}>
              <Ionicons name="add" size={18} color={colors.navy} />
              <Text style={styles.stepperBtnText}>+1 Day</Text>
            </Pressable>

            <Pressable style={styles.stepperBtn} onPress={() => adjustDays(2)}>
              <Ionicons name="add" size={18} color={colors.navy} />
              <Text style={styles.stepperBtnText}>+2 Days</Text>
            </Pressable>
          </View>

          {/* Quick Preset Chips */}
          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Quick Presets:</Text>
          <View style={styles.chipRow}>
            {[
              { label: '1 Day', days: 1 },
              { label: '2 Days (Default)', days: 2 },
              { label: '3 Days', days: 3 },
              { label: '5 Days', days: 5 },
              { label: '1 Week', days: 7 },
            ].map((chip) => {
              const isSelected = closureDays === chip.days;
              return (
                <Pressable
                  key={chip.days}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => handleDaysChange(chip.days, true)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* SECTION 3: BANNER & POPUP CONTENT */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeader}>
              <Ionicons name="megaphone-outline" size={20} color={colors.navy} />
              <Text style={styles.cardTitle}>Banner & Popup Content</Text>
            </View>
            <Pressable style={styles.autoGenBtn} onPress={handleRegenerateText}>
              <Ionicons name="sparkles" size={14} color={colors.navy} />
              <Text style={styles.autoGenText}>Auto Sync Text</Text>
            </Pressable>
          </View>

          {/* Banner Title */}
          <Text style={styles.fieldLabel}>Banner Headline / Popup Title:</Text>
          <TextInput
            style={styles.textInput}
            value={bannerTitle}
            onChangeText={setBannerTitle}
            placeholder="e.g. Shop Temporarily Closed for 2 Days"
            placeholderTextColor={colors.textMuted}
          />

          {/* Banner Message */}
          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>
            Customer Notice Message:
          </Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={bannerMessage}
            onChangeText={setBannerMessage}
            placeholder="Enter notice details for your website visitors..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* SECTION 4: DISPLAY & ORDER OPTIONS */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="options-outline" size={20} color={colors.navy} />
            <Text style={styles.cardTitle}>Customer Ordering & Visibility</Text>
          </View>

          <View style={styles.optionRow}>
            <View style={styles.optionTextBox}>
              <Text style={styles.optionTitle}>Allow Online Orders with Delay Notice</Text>
              <Text style={styles.optionDesc}>
                Customers can still place orders. When they order, a notice reminds them fulfillment begins on {reopenDateFormatted}.
              </Text>
            </View>
            <Switch
              value={allowOrders}
              onValueChange={setAllowOrders}
              trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }}
              thumbColor={allowOrders ? colors.navy : '#F8FAFC'}
            />
          </View>

          <View style={[styles.optionRow, styles.borderTop]}>
            <View style={styles.optionTextBox}>
              <Text style={styles.optionTitle}>Show Popup Modal to Every Visitor</Text>
              <Text style={styles.optionDesc}>
                Presents a prominent welcome popup notice to every customer entering the website.
              </Text>
            </View>
            <Switch
              value={showPopup}
              onValueChange={setShowPopup}
              trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }}
              thumbColor={showPopup ? colors.navy : '#F8FAFC'}
            />
          </View>

          <View style={[styles.optionRow, styles.borderTop]}>
            <View style={styles.optionTextBox}>
              <Text style={styles.optionTitle}>Show Sticky Top Announcement Bar</Text>
              <Text style={styles.optionDesc}>
                Keeps a persistent notice bar at the top of every page.
              </Text>
            </View>
            <Switch
              value={showTopBanner}
              onValueChange={setShowTopBanner}
              trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }}
              thumbColor={showTopBanner ? colors.navy : '#F8FAFC'}
            />
          </View>
        </View>

        {/* SECTION 5: LIVE WEBSITE PREVIEW */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="desktop-outline" size={20} color={colors.navy} />
            <Text style={styles.cardTitle}>Live Website Customer Preview</Text>
          </View>
          <Text style={styles.cardSubtitle}>
            {isClosed
              ? 'Current Live View: Single Page Only (Entire Site Locked)'
              : 'Current Live View: Full Website Active'}
          </Text>

          {isClosed ? (
            <View style={styles.previewSinglePageBox}>
              <View style={styles.previewSinglePageHeader}>
                <Ionicons name="lock-closed" size={14} color="#B91C1C" />
                <Text style={styles.previewSinglePageHeaderTag}>ONLY THIS PAGE IS SHOWN TO CUSTOMERS</Text>
              </View>

              <View style={styles.previewMandatoryMessageBox}>
                <Ionicons name="alert-circle" size={22} color="#991B1B" />
                <Text style={styles.previewMandatoryMessageText}>
                  "We are currently not processing any online orders, Please revisit our website after a few business days."
                </Text>
              </View>

              <View style={styles.previewReopenInfo}>
                <Ionicons name="calendar-outline" size={14} color="#881337" />
                <Text style={styles.previewReopenText}>
                  Expected Reopening: <Text style={{ fontWeight: '800' }}>{reopenDateFormatted}</Text>
                </Text>
              </View>

              <Text style={styles.previewSinglePageNote}>
                🔒 The rest of the site (uniform catalog, school pages, search, cart, checkout) is hidden from visitors while delivery orders are closed.
              </Text>
            </View>
          ) : (
            <View style={styles.previewOpenBox}>
              <View style={styles.previewOpenBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                <Text style={styles.previewOpenBadgeText}>FULL WEBSITE IS ACCESSIBLE</Text>
              </View>
              <Text style={styles.previewOpenText}>
                Customers can view the home page, school uniforms, add to cart, and place orders normally.
              </Text>
            </View>
          )}
        </View>

        {/* SAVE & PUBLISH ACTION BUTTONS */}
        <View style={styles.actionSection}>
          <Pressable
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Ionicons name="cloud-upload-outline" size={20} color={colors.white} />
            )}
            <Text style={styles.saveBtnText}>
              {saving ? 'Publishing to Cloud...' : 'Save & Publish to Website'}
            </Text>
          </Pressable>

          {isClosed && (
            <Pressable
              style={styles.reopenBtn}
              onPress={handleInstantReopen}
              disabled={saving}
            >
              <Ionicons name="lock-open-outline" size={18} color={colors.green} />
              <Text style={styles.reopenBtnText}>Reopen Shop Immediately</Text>
            </Pressable>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: spacing.md,
  },
  backBtn: {
    padding: spacing.xs,
  },
  headerTitleBox: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.navy,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    gap: 5,
  },
  statusPillOpen: {
    backgroundColor: '#DCFCE7',
  },
  statusPillClosed: {
    backgroundColor: '#FEE2E2',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
  },
  cardOpenBorder: {
    borderColor: '#86EFAC',
  },
  cardClosedBorder: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFFBFB',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  switchTextBox: {
    flex: 1,
  },
  switchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  reopenHighlightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: radii.sm,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  calendarBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reopenInfo: {
    flex: 1,
  },
  reopenLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E40AF',
    letterSpacing: 0.5,
  },
  reopenDateBig: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.navy,
    marginVertical: 2,
  },
  durationNote: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  boldText: {
    fontWeight: '700',
    color: colors.navy,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepperBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.navySoft,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    gap: 4,
  },
  stepperBtnDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  stepperBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
  },
  stepperBtnTextDisabled: {
    color: colors.textMuted,
  },
  currentDaysBox: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.navy,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentDaysNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
  },
  currentDaysLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  autoGenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.navySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.xs,
    gap: 4,
  },
  autoGenText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.navy,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
  },
  optionTextBox: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  optionDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  previewSinglePageBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  previewSinglePageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.xs,
    alignSelf: 'flex-start',
  },
  previewSinglePageHeaderTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#991B1B',
    letterSpacing: 0.3,
  },
  previewMandatoryMessageBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    borderRadius: radii.sm,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewMandatoryMessageText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#7F1D1D',
    flex: 1,
    lineHeight: 18,
  },
  previewReopenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  previewReopenText: {
    fontSize: 12,
    color: '#475569',
  },
  previewSinglePageNote: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    paddingHorizontal: 4,
  },
  previewOpenBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 6,
  },
  previewOpenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewOpenBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  previewOpenText: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 16,
  },
  actionSection: {
    gap: spacing.md,
  },
  saveBtn: {
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radii.sm,
    gap: 8,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  reopenBtn: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radii.sm,
    gap: 6,
  },
  reopenBtnText: {
    color: '#15803D',
    fontSize: 14,
    fontWeight: '700',
  },
});
