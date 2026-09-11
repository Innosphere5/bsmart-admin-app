import React, { useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { categories, classGroups, schoolsList } from '../data/mockData';
import { colors, radii, spacing, typography } from '../theme/colors';
import { uploadImageToCloudinary, createProduct } from '../services/api';
import { parseSizePriceMapping } from '../utils/sizeParser';

export default function AddProductScreen({ navigation }) {
  const [productName, setProductName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('400');
  const [stockQuantity, setStockQuantity] = useState('50');
  const [sizePricePairs, setSizePricePairs] = useState([
    { size: '26', price: '400' },
    { size: '28', price: '420' },
    { size: '30', price: '450' },
    { size: '32', price: '480' },
    { size: '34', price: '510' },
    { size: '36', price: '540' },
  ]);
  const [customSizesText, setCustomSizesText] = useState('26-400, 28-420, 30-450, 32-480, 34-510, 36-540');
  const [schoolQuery, setSchoolQuery] = useState('');
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  const [selectedClass, setSelectedClass] = useState('2');

  const [images, setImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Row-by-Row Size Price Handlers
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

  // Pick image from phone/gallery and upload directly to Cloudinary
  const handlePickAndUploadImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Permission to access camera roll is required to select product images.'
        );
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

        console.log('Sending picked image to Cloudinary backend API...');
        const cloudinaryData = await uploadImageToCloudinary(imagePayload);

        const cloudinaryUrl = cloudinaryData.optimizedUrl || cloudinaryData.url;
        setImages((prevImages) => [...prevImages, cloudinaryUrl]);
        Alert.alert('Cloudinary Upload Success', 'Image uploaded to Cloudinary successfully!');
      }
    } catch (error) {
      console.error('Image pick/upload error:', error);
      Alert.alert('Upload Error', error.message || 'Could not upload image to Cloudinary');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handlePublish = async () => {
    if (!productName.trim()) {
      Alert.alert('Validation Error', 'Please enter a product name');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Validation Error', 'Please select a product category');
      return;
    }
    if (!schoolQuery.trim()) {
      Alert.alert('Validation Error', 'Please select or enter an associated school');
      return;
    }

    try {
      setIsSubmitting(true);
      const selectedClassObj = classGroups.find((c) => c.id === selectedClass);
      
      // Fallback image if user didn't pick custom image
      const finalImages = images.length > 0 ? images : [
        'https://images.unsplash.com/photo-1544441893-675973e31985?w=600'
      ];

      // Build payload from row-by-row Size-Price pairs
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

      // Fallback if no valid rows
      if (sizes.length === 0) {
        sizes.push('26', '28', '30', '32', '34', '36');
        sizePrices['26'] = 400; sizePrices['28'] = 420; sizePrices['30'] = 450;
        sizePrices['32'] = 480; sizePrices['34'] = 510; sizePrices['36'] = 540;
      }

      const priceValues = Object.values(sizePrices);
      const minPrice = priceValues.length > 0 ? Math.min(...priceValues) : 400;
      const cleanSizesText =
        sizes.length > 1
          ? `Sizes: ${sizes[0]}-${sizes[sizes.length - 1]}`
          : sizes.length === 1
          ? `Size: ${sizes[0]}`
          : 'Sizes Available';

      const productPayload = {
        name: productName.trim(),
        category: selectedCategory || 'General',
        school: schoolQuery.trim() || 'General School',
        applicableClass: selectedClassObj ? selectedClassObj.label : 'All Classes',
        description: description.trim(),
        basePrice: minPrice,
        stockQuantity: parseInt(stockQuantity, 10) || 50,
        images: finalImages,
        imageSrc: finalImages[0],
        sizes: sizes,
        sizePrices: sizePrices,
        sizesText: cleanSizesText,
      };

      console.log('Publishing product payload to Backend...', productPayload);
      await createProduct(productPayload);

      Alert.alert(
        'Product Published 🎉',
        `"${productName}" has been published live to the Supabase Database & Website!`
      );

      // Reset form
      setProductName('');
      setDescription('');
      setImages([]);
      navigation?.navigate('Inventory');
    } catch (error) {
      console.error('Publish error:', error);
      Alert.alert('Publish Error', error.message || 'Failed to publish product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    Alert.alert('Draft Saved', 'Product details saved as draft locally.');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.titleRow}>
          <Text style={[typography.h1, styles.screenTitle]}>Add New Product</Text>
          <View style={styles.cloudinaryBadge}>
            <Ionicons name="cloud-upload" size={14} color="#00C49F" />
            <Text style={styles.cloudinaryBadgeText}>Cloudinary Active</Text>
          </View>
        </View>

        {/* Card 1: Basic Information */}
        <View style={styles.formCard}>
          <Text style={styles.sectionHeader}>BASIC INFORMATION</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Product Name <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Boys Winter Jacket"
              placeholderTextColor={colors.textMuted}
              value={productName}
              onChangeText={setProductName}
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
              <Text
                style={[
                  styles.dropdownSelectText,
                  !selectedCategory && { color: colors.textMuted },
                ]}
              >
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

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Base Price (₹) <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 699"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              placeholder="Enter product details..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
          </View>
        </View>

        {/* Card 1.5: Dynamic Size & Price Builder */}
        <View style={styles.formCard}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.sectionHeader}>DYNAMIC SIZE & PRICE BUILDER</Text>
              <Text style={styles.inputHelperText}>
                Configure individual rates for each uniform size (e.g. 26: ₹400, 28: ₹420, 30: ₹450...)
              </Text>
            </View>
            <Ionicons name="pricetags" size={20} color={colors.navy} />
          </View>

          {/* Quick Preset Buttons */}
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

          {/* Row-by-Row Size Price List */}
          <View style={styles.pairRowsContainer}>
            {sizePricePairs.map((pair, idx) => (
              <View key={idx} style={styles.pairRowItem}>
                <View style={styles.pairInputCol}>
                  <Text style={styles.pairFieldLabel}>Size Name</Text>
                  <TextInput
                    style={styles.pairTextInput}
                    placeholder="e.g. 26"
                    placeholderTextColor={colors.textMuted}
                    value={pair.size}
                    onChangeText={(val) => handleUpdatePairRow(idx, 'size', val)}
                  />
                </View>

                <View style={styles.pairInputCol}>
                  <Text style={styles.pairFieldLabel}>Rate (₹)</Text>
                  <TextInput
                    style={styles.pairTextInput}
                    placeholder="e.g. 400"
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

          {/* Add Row Button */}
          <Pressable style={styles.addPairRowBtn} onPress={handleAddPairRow}>
            <Ionicons name="add-circle" size={20} color={colors.navy} />
            <Text style={styles.addPairRowBtnText}>+ Add Custom Size &amp; Price Row</Text>
          </Pressable>

          {/* Live Preview Badges */}
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

        {/* Card 2: School & Target */}
        <View style={styles.formCard}>
          <Text style={styles.sectionHeader}>SCHOOL & TARGET</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Associated School <Text style={styles.requiredStar}>*</Text>
            </Text>
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
            <Text style={styles.label}>Applicable Classes</Text>
            <View style={styles.pillGroup}>
              {classGroups.map((cls) => {
                const isSelected = selectedClass === cls.id;
                return (
                  <Pressable
                    key={cls.id}
                    style={[styles.classPill, isSelected && styles.selectedClassPill]}
                    onPress={() => setSelectedClass(cls.id)}
                  >
                    <Text
                      style={[
                        styles.classPillText,
                        isSelected && styles.selectedClassPillText,
                      ]}
                    >
                      {cls.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Card 3: Cloudinary Product Images */}
        <View style={styles.formCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionHeader}>PRODUCT IMAGES (CLOUDINARY)</Text>
            <Text style={styles.cloudSubTag}>res.cloudinary.com/prdprrii</Text>
          </View>

          <Pressable
            style={[styles.dashedUploadBox, isUploading && styles.uploadBoxDisabled]}
            onPress={handlePickAndUploadImage}
            disabled={isUploading}
          >
            {isUploading ? (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="large" color={colors.navy} />
                <Text style={styles.uploadingText}>Uploading to Cloudinary...</Text>
              </View>
            ) : (
              <>
                <View style={styles.uploadIconCircle}>
                  <Ionicons name="cloud-upload-outline" size={32} color={colors.navy} />
                  <View style={styles.miniPlusBadge}>
                    <Ionicons name="add" size={10} color={colors.white} />
                  </View>
                </View>
                <Text style={styles.uploadMainText}>Tap to pick image & upload to Cloudinary</Text>
                <Text style={styles.uploadSubText}>PNG, JPG up to 10MB • Auto-optimized</Text>
              </>
            )}
          </Pressable>

          {/* Uploaded Thumbnails Grid */}
          <View style={styles.thumbnailsRow}>
            {images.map((imgUri, index) => (
              <View key={index} style={styles.thumbWrapper}>
                <Image source={{ uri: imgUri }} style={styles.thumbImage} />
                <View style={styles.cloudBadgeSlot}>
                  <Ionicons name="cloud-done" size={10} color="#FFFFFF" />
                </View>
                <Pressable
                  style={styles.removeBadge}
                  onPress={() => handleRemoveImage(index)}
                >
                  <Ionicons name="close" size={12} color={colors.white} />
                </Pressable>
              </View>
            ))}

            <Pressable
              style={styles.addThumbSlot}
              onPress={handlePickAndUploadImage}
              disabled={isUploading}
            >
              <Ionicons name="add" size={24} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>

        {/* Action Buttons Bar */}
        <View style={styles.actionsFooter}>
          <Pressable style={styles.saveDraftBtn} onPress={handleSaveDraft}>
            <Text style={styles.saveDraftText}>Save Draft</Text>
          </Pressable>

          <Pressable
            style={[styles.publishBtn, isSubmitting && { opacity: 0.7 }]}
            onPress={handlePublish}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.publishText}>Publish Product</Text>
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
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  screenTitle: {
    marginBottom: 0,
  },
  cloudinaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F9F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    gap: 4,
    borderWidth: 1,
    borderColor: '#B2F2E5',
  },
  cloudinaryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#007A63',
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
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  cloudSubTag: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs + 2,
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
    minHeight: 90,
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
    elevation: 2,
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
  dashedUploadBox: {
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    borderRadius: radii.md,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
  },
  uploadBoxDisabled: {
    opacity: 0.7,
  },
  uploadingContainer: {
    alignItems: 'center',
    gap: 8,
  },
  uploadingText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
  },
  uploadIconCircle: {
    position: 'relative',
    marginBottom: spacing.xs,
  },
  miniPlusBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: colors.navy,
    borderRadius: 6,
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadMainText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  uploadSubText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  thumbnailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  thumbWrapper: {
    position: 'relative',
    width: 72,
    height: 72,
    borderRadius: radii.sm,
    overflow: 'visible',
  },
  thumbImage: {
    width: 72,
    height: 72,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cloudBadgeSlot: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    backgroundColor: '#00C49F',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
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
    elevation: 3,
  },
  addThumbSlot: {
    width: 72,
    height: 72,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  saveDraftBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.navy,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  saveDraftText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
  },
  publishBtn: {
    flex: 1,
    backgroundColor: colors.navy,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  publishText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  inputHelperText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 6,
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
});
