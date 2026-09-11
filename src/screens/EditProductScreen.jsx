import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { categories, classGroups, schoolsList } from '../data/mockData';
import { colors, radii, spacing, typography } from '../theme/colors';
import { uploadImageToCloudinary, updateProduct, deleteProduct } from '../services/api';

export default function EditProductScreen({ navigation, product }) {
  const insets = useSafeAreaInsets();

  if (!product) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No product selected for editing.</Text>
          <Pressable style={styles.backBtn} onPress={() => navigation?.navigate('Inventory')}>
            <Text style={styles.backBtnText}>Back to Inventory</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const [productName, setProductName] = useState(product.name || '');
  const [selectedCategory, setSelectedCategory] = useState(product.category || '');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [description, setDescription] = useState(product.details || product.description || '');
  const [price, setPrice] = useState(String(product.basePrice || 400));
  const [stockQuantity, setStockQuantity] = useState(String(product.stockQuantity ?? 50));
  const [schoolQuery, setSchoolQuery] = useState(product.school || '');
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);

  // Initialize selected class pill
  const initialClassId = classGroups.find((c) => c.label === product.applicableClass)?.id || '2';
  const [selectedClass, setSelectedClass] = useState(initialClassId);

  // Size-Price row builder state
  const [sizePricePairs, setSizePricePairs] = useState(() => {
    if (product.sizePrices && Object.keys(product.sizePrices).length > 0) {
      return Object.entries(product.sizePrices).map(([sz, pr]) => ({
        size: String(sz),
        price: String(pr),
      }));
    } else if (Array.isArray(product.sizes) && product.sizes.length > 0) {
      return product.sizes.map((sz) => ({
        size: String(sz),
        price: String(product.basePrice || 400),
      }));
    }
    return [
      { size: '26', price: '400' },
      { size: '28', price: '420' },
      { size: '30', price: '450' },
      { size: '32', price: '480' },
      { size: '34', price: '510' },
      { size: '36', price: '540' },
    ];
  });

  const [images, setImages] = useState(
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : product.imageSrc
      ? [product.imageSrc]
      : []
  );

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Size Price Pair Row Handlers
  const handleAddPairRow = () => {
    setSizePricePairs((prev) => [...prev, { size: '', price: '' }]);
  };

  const handleUpdatePairRow = (index, field, value) => {
    setSizePricePairs((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemovePairRow = (index) => {
    setSizePricePairs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApplyPreset = (presetType) => {
    if (presetType === 'standard') {
      setSizePricePairs([
        { size: '26', price: '400' },
        { size: '28', price: '420' },
        { size: '30', price: '450' },
        { size: '32', price: '480' },
        { size: '34', price: '510' },
        { size: '36', price: '540' },
      ]);
    } else if (presetType === 'senior') {
      setSizePricePairs([
        { size: '28', price: '649' },
        { size: '30', price: '699' },
        { size: '32', price: '749' },
        { size: '34', price: '799' },
        { size: '36', price: '849' },
      ]);
    }
  };

  // Image Upload
  const handlePickAndUploadImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Access to photos is required to update product images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        setIsUploading(true);

        let imagePayload = selectedAsset.uri;
        if (selectedAsset.base64) {
          imagePayload = `data:image/jpeg;base64,${selectedAsset.base64}`;
        }

        const cloudinaryData = await uploadImageToCloudinary(imagePayload);
        const cloudinaryUrl = cloudinaryData.optimizedUrl || cloudinaryData.url;
        setImages((prev) => [...prev, cloudinaryUrl]);
        Alert.alert('Cloudinary Upload Success', 'Image uploaded to Cloudinary successfully!');
      }
    } catch (error) {
      Alert.alert('Upload Error', error.message || 'Could not upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // Save Changes Handler
  const handleSaveChanges = async () => {
    if (!productName.trim()) {
      Alert.alert('Validation Error', 'Please enter a product name');
      return;
    }

    try {
      setIsSubmitting(true);
      const selectedClassObj = classGroups.find((c) => c.id === selectedClass);
      
      const finalImages = images.length > 0 ? images : [
        product.imageSrc || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=600'
      ];

      const validPairs = sizePricePairs.filter((p) => p.size.trim() !== '');
      const sizes = [];
      const sizePrices = {};
      const formattedPills = [];

      for (const pair of validPairs) {
        const sz = pair.size.trim();
        const pr = parseFloat(pair.price) || parseFloat(price) || 400;
        sizes.push(sz);
        sizePrices[sz] = pr;
        formattedPills.push(`${sz} (₹${pr})`);
      }

      if (sizes.length === 0) {
        sizes.push('26', '28', '30', '32', '34', '36');
        sizePrices['26'] = 400; sizePrices['28'] = 420; sizePrices['30'] = 450;
        sizePrices['32'] = 480; sizePrices['34'] = 510; sizePrices['36'] = 540;
      }

      const priceValues = Object.values(sizePrices);
      const minPrice = priceValues.length > 0 ? Math.min(...priceValues) : parseFloat(price) || 400;
      const cleanSizesText =
        sizes.length > 1
          ? `Sizes: ${sizes[0]}-${sizes[sizes.length - 1]}`
          : sizes.length === 1
          ? `Size: ${sizes[0]}`
          : 'Sizes Available';

      const updatePayload = {
        name: productName.trim(),
        category: selectedCategory || product.category || 'General',
        school: schoolQuery.trim() || product.school || 'General School',
        applicableClass: selectedClassObj ? selectedClassObj.label : product.applicableClass || 'All Classes',
        description: description.trim(),
        details: description.trim(),
        basePrice: minPrice,
        stockQuantity: parseInt(stockQuantity, 10) || 50,
        images: finalImages,
        imageSrc: finalImages[0],
        sizes: sizes,
        sizePrices: sizePrices,
        sizesText: cleanSizesText,
      };

      console.log('Updating product payload...', updatePayload);
      await updateProduct(product.id, updatePayload);

      Alert.alert(
        'Product Updated 🎉',
        `"${productName}" details and rates have been saved live to Supabase & User website!`,
        [
          {
            text: 'OK',
            onPress: () => navigation?.navigate('Inventory'),
          },
        ]
      );
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Update Error', error.message || 'Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Handler
  const handleDelete = () => {
    Alert.alert(
      'Delete Product ⚠️',
      `Are you sure you want to delete "${product.name}"? This action is permanent.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await deleteProduct(product.id);
              Alert.alert('Deleted 🎉', `"${product.name}" has been deleted.`);
              navigation?.navigate('Inventory');
            } catch (error) {
              Alert.alert('Delete Error', error.message || 'Could not delete product');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      {/* Top Header Navigation Bar */}
      <View style={[styles.headerBar, { paddingTop: insets.top, height: 54 + insets.top }]}>
        <Pressable
          style={styles.backTouch}
          onPress={() => navigation?.navigate('Inventory')}
        >
          <Ionicons name="arrow-back" size={22} color={colors.navy} />
          <Text style={styles.backTouchText}>Inventory</Text>
        </Pressable>

        <Text style={styles.headerTitle} numberOfLines={1}>Edit Product</Text>

        <Pressable style={styles.headerDeleteBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color={colors.red} />
        </Pressable>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Card 1: Basic Details */}
        <View style={styles.formCard}>
          <Text style={styles.sectionHeader}>BASIC INFORMATION</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Product Name <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              value={productName}
              onChangeText={setProductName}
              placeholder="Product Name"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Category <Text style={styles.requiredStar}>*</Text>
            </Text>
            <Pressable
              style={styles.dropdownSelect}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <Text style={styles.dropdownSelectText}>
                {selectedCategory || 'Select Category'}
              </Text>
              <Ionicons
                name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textMuted}
              />
            </Pressable>

            {showCategoryPicker && (
              <View style={styles.dropdownList}>
                {categories.map((cat) => (
                  <Pressable
                    key={cat}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedCategory(cat);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{cat}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={styles.formGroupRow}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Base Rate (₹) *</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
                placeholder="400"
              />
            </View>

            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Stock Quantity *</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={stockQuantity}
                onChangeText={setStockQuantity}
                placeholder="50"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter product description..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Card 2: Custom Size & Price Pairs */}
        <View style={styles.formCard}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.sectionHeader}>DYNAMIC SIZE & PRICE BUILDER</Text>
              <Text style={styles.inputHelperText}>
                Configure custom rates for each size (e.g. Size: 26, Rate: 400)
              </Text>
            </View>
            <Ionicons name="pricetags" size={20} color={colors.navy} />
          </View>

          {/* Quick Presets */}
          <View style={styles.presetButtonsRow}>
            <Pressable style={styles.presetBtn} onPress={() => handleApplyPreset('standard')}>
              <Ionicons name="flash" size={14} color={colors.navy} />
              <Text style={styles.presetBtnText}>Load 26: ₹400 → 36: ₹540</Text>
            </Pressable>
            <Pressable style={styles.presetBtn} onPress={() => handleApplyPreset('senior')}>
              <Ionicons name="options" size={14} color={colors.navy} />
              <Text style={styles.presetBtnText}>Load Senior 28-36</Text>
            </Pressable>
          </View>

          {/* Row-by-Row Pair Inputs */}
          <View style={styles.pairRowsContainer}>
            {sizePricePairs.map((pair, idx) => (
              <View key={idx} style={styles.pairRowItem}>
                <View style={styles.pairInputCol}>
                  <Text style={styles.pairFieldLabel}>Size Name</Text>
                  <TextInput
                    style={styles.pairTextInput}
                    placeholder="Size (e.g. 26)"
                    placeholderTextColor={colors.textMuted}
                    value={pair.size}
                    onChangeText={(val) => handleUpdatePairRow(idx, 'size', val)}
                  />
                </View>

                <View style={styles.pairInputCol}>
                  <Text style={styles.pairFieldLabel}>Rate (₹)</Text>
                  <TextInput
                    style={styles.pairTextInput}
                    placeholder="Rate (e.g. 400)"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={pair.price}
                    onChangeText={(val) => handleUpdatePairRow(idx, 'price', val)}
                  />
                </View>

                <Pressable
                  style={styles.removeRowBtn}
                  onPress={() => handleRemovePairRow(idx)}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.red} />
                </Pressable>
              </View>
            ))}
          </View>

          <Pressable style={styles.addPairRowBtn} onPress={handleAddPairRow}>
            <Ionicons name="add-circle" size={20} color={colors.navy} />
            <Text style={styles.addPairRowBtnText}>+ Add Custom Size &amp; Price Row</Text>
          </Pressable>

          {/* Website Preview */}
          <View style={styles.previewBox}>
            <Text style={styles.previewTitle}>Live Website Rate Preview:</Text>
            <View style={styles.previewChipsContainer}>
              {sizePricePairs
                .filter((p) => p.size.trim() !== '')
                .map((pair, idx) => (
                  <View key={idx} style={styles.sizePriceChip}>
                    <Text style={styles.sizeChipKey}>Size {pair.size}</Text>
                    <Text style={styles.sizeChipPrice}>₹{pair.price || '0'}</Text>
                  </View>
                ))}
            </View>
          </View>
        </View>

        {/* Card 3: School & Target */}
        <View style={styles.formCard}>
          <Text style={styles.sectionHeader}>SCHOOL & TARGET</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Associated School *</Text>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search school name..."
                placeholderTextColor={colors.textMuted}
                value={schoolQuery}
                onChangeText={(q) => {
                  setSchoolQuery(q);
                  setShowSchoolDropdown(q.length > 0);
                }}
              />
            </View>
            {showSchoolDropdown && (
              <View style={styles.dropdownList}>
                {schoolsList
                  .filter((s) => s.toLowerCase().includes(schoolQuery.toLowerCase()))
                  .map((school) => (
                    <Pressable
                      key={school}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSchoolQuery(school);
                        setShowSchoolDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{school}</Text>
                    </Pressable>
                  ))}
              </View>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Applicable Class</Text>
            <View style={styles.pillGroup}>
              {classGroups.map((cls) => {
                const isSelected = selectedClass === cls.id;
                return (
                  <Pressable
                    key={cls.id}
                    style={[styles.classPill, isSelected && styles.selectedClassPill]}
                    onPress={() => setSelectedClass(cls.id)}
                  >
                    <Text style={[styles.classPillText, isSelected && styles.selectedClassPillText]}>
                      {cls.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Card 4: Images */}
        <View style={styles.formCard}>
          <Text style={styles.sectionHeader}>PRODUCT IMAGES (CLOUDINARY)</Text>

          <Pressable
            style={[styles.dashedUploadBox, isUploading && styles.uploadBoxDisabled]}
            onPress={handlePickAndUploadImage}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color={colors.navy} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={28} color={colors.navy} />
                <Text style={styles.uploadMainText}>Tap to upload custom image</Text>
              </>
            )}
          </Pressable>

          <View style={styles.thumbnailsRow}>
            {images.map((imgUri, index) => (
              <View key={index} style={styles.thumbWrapper}>
                <Image source={{ uri: imgUri }} style={styles.thumbImage} />
                <Pressable
                  style={styles.removeBadge}
                  onPress={() => handleRemoveImage(index)}
                >
                  <Ionicons name="close" size={12} color={colors.white} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        {/* Save Footer Bar */}
        <View style={styles.actionsFooter}>
          <Pressable
            style={[styles.saveBtn, isSubmitting && { opacity: 0.7 }]}
            onPress={handleSaveChanges}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes &amp; Sync to Web</Text>
            )}
          </Pressable>
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    height: 54,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  backTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backTouchText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerDeleteBtn: {
    padding: 4,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  inputHelperText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  formGroupRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  requiredStar: {
    color: colors.red,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.card,
  },
  multilineInput: {
    minHeight: 80,
  },
  dropdownSelect: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
  },
  dropdownSelectText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.sm,
    marginTop: 4,
    backgroundColor: colors.card,
  },
  dropdownItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  dropdownItemText: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    gap: 8,
    backgroundColor: colors.card,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md - 2,
    fontSize: 14,
    color: colors.textPrimary,
  },
  pillGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  classPill: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
  },
  selectedClassPill: {
    borderColor: colors.navy,
    borderWidth: 2,
    backgroundColor: colors.navySoft,
  },
  classPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  selectedClassPillText: {
    color: colors.navy,
  },
  presetButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  presetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF08A',
    borderWidth: 1,
    borderColor: '#FACC15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    gap: 4,
  },
  presetBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.navy,
  },
  pairRowsContainer: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  pairRowItem: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radii.sm,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  pairInputCol: {
    flex: 1,
  },
  pairFieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  pairTextInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  removeRowBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: radii.xs,
    width: 36,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPairRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navySoft,
    borderWidth: 1.5,
    borderColor: colors.navy,
    borderStyle: 'dashed',
    borderRadius: radii.sm,
    paddingVertical: spacing.sm + 2,
    gap: 6,
    marginBottom: spacing.md,
  },
  addPairRowBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.navy,
  },
  previewBox: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: radii.sm,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  previewTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B21A8',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  previewChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sizePriceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: '#C084FC',
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  sizeChipKey: {
    fontSize: 12,
    fontWeight: '900',
    color: '#581C87',
  },
  sizeChipPrice: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.red,
  },
  dashedUploadBox: {
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    borderRadius: radii.md,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
  },
  uploadBoxDisabled: {
    opacity: 0.7,
  },
  uploadMainText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
    marginTop: 4,
  },
  thumbnailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  thumbWrapper: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: radii.sm,
  },
  thumbImage: {
    width: 64,
    height: 64,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  removeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.red,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsFooter: {
    marginTop: spacing.md,
  },
  saveBtn: {
    backgroundColor: colors.navy,
    paddingVertical: spacing.md + 2,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.white,
  },
});
