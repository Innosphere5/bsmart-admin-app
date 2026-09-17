import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import StatusBadge from '../components/StatusBadge';
import { ProductsSkeletonList } from '../components/Skeleton';
import { colors, radii, spacing, typography } from '../theme/colors';
import { fetchProducts } from '../services/api';

export default function InventoryScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadLiveInventory = async () => {
    try {
      const data = await fetchProducts();
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLiveInventory();
    const interval = setInterval(loadLiveInventory, 3000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadLiveInventory();
  };

  const filteredItems = products.filter(
    (item) =>
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.school?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.navy]} />
        }
      >
        {/* Title & Responsive Add Product Button Row */}
        <View style={styles.headerRow}>
          <View style={styles.headerTitleCol}>
            <Text style={typography.h1}>Inventory</Text>
            <Text style={typography.subtitle}>Tap any product card to edit details &amp; rates.</Text>
          </View>

          <Pressable
            style={styles.addNewBtn}
            onPress={() => navigation?.navigate('AddProduct')}
          >
            <Ionicons name="add-circle" size={18} color={colors.white} />
            <Text style={styles.addNewBtnText}>Add Product</Text>
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products by name, school, category..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {loading ? (
          <ProductsSkeletonList count={6} />
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cube-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Products Found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your search query or tap Add Product.</Text>
          </View>
        ) : (
          <View style={styles.itemsList}>
            {filteredItems.map((item) => {
              const stock = item.stockQuantity ?? 50;
              let status = 'In Stock';
              if (stock === 0) status = 'Out of Stock';
              else if (stock <= 2) status = 'Low Stock';

              const imageUri =
                item.imageSrc || item.images?.[0] || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=600';

              return (
                <Pressable
                  key={item.id}
                  style={styles.simpleCard}
                  onPress={() => navigation?.navigate('EditProduct', { product: item })}
                >
                  <View style={styles.cardHeaderRow}>
                    <Image source={{ uri: imageUri }} style={styles.cardThumb} />

                    <View style={styles.cardMetaCol}>
                      <View style={styles.cardTopBar}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <StatusBadge status={status} />
                      </View>

                      <View style={styles.schoolRow}>
                        <Ionicons name="school-outline" size={12} color={colors.navy} />
                        <Text style={styles.schoolText} numberOfLines={1}>
                          {item.school || 'General School'} • {item.applicableClass || 'All Classes'}
                        </Text>
                      </View>

                      <View style={styles.cardPillsRow}>
                        <View style={styles.categoryPill}>
                          <Text style={styles.categoryPillText}>{item.category || 'General'}</Text>
                        </View>

                        <View style={styles.pricePill}>
                          <Text style={styles.pricePillText}>₹{item.basePrice}</Text>
                        </View>

                        <Text style={styles.stockCountText}>{stock} units</Text>
                      </View>
                    </View>
                  </View>

                  {/* Size-Price Rates Horizontal Strip */}
                  {item.sizePrices && Object.keys(item.sizePrices).length > 0 && (
                    <View style={styles.sizeStripContainer}>
                      <Ionicons name="pricetags" size={11} color="#6B21A8" />
                      <Text style={styles.sizeStripText} numberOfLines={1}>
                        {Object.entries(item.sizePrices)
                          .map(([sz, pr]) => `${sz}: ₹${pr}`)
                          .join('  •  ')}
                      </Text>
                    </View>
                  )}

                  {/* Tap to Edit Prompt Bar */}
                  <View style={styles.tapToEditFooter}>
                    <Text style={styles.tapToEditText}>Tap card to edit product details &amp; rates</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.navy} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerTitleCol: {
    flex: 1,
    minWidth: 160,
  },
  addNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.navy,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.sm,
    gap: 6,
    shrink: 0,
  },
  addNewBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.white,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.lg,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  loadingBox: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.xxl,
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  itemsList: {
    gap: spacing.md,
  },
  simpleCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cardThumb: {
    width: 64,
    height: 64,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardMetaCol: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  schoolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  schoolText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  cardPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  categoryPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.navy,
  },
  pricePill: {
    backgroundColor: '#FEF08A',
    borderWidth: 1,
    borderColor: '#FACC15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  pricePillText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.navy,
  },
  stockCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    marginLeft: 'auto',
  },
  sizeStripContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: radii.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginTop: spacing.sm,
    gap: 6,
  },
  sizeStripText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#6B21A8',
  },
  tapToEditFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: spacing.sm,
    paddingTop: 8,
  },
  tapToEditText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.navy,
  },
});
