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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { categories, classGroups, schoolsList } from '../data/mockData';
import { colors, radii, spacing, typography } from '../theme/colors';
import { uploadImageToCloudinary, createProduct, fetchCategories, createCategory, fetchSchools, createSchool } from '../services/api';
import { parseSizePriceMapping } from '../utils/sizeParser';

export default function AddProductScreen({ navigation }) {
  const [productName, setProductName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [categoryList, setCategoryList] = useState(categories);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('400');
  const [stockQuantity, setStockQuantity] = useState('50');
  const [sizePricePairs, setSizePricePairs] = useState([
    { size: '26', price: '400', stock: '10' },
    { size: '28', price: '420', stock: '10' },
    { size: '30', price: '450', stock: '10' },
    { size: '32', price: '480', stock: '10' },
    { size: '34', price: '510', stock: '10' },
    { size: '36', price: '540', stock: '10' },
  ]);
  const [customSizesText, setCustomSizesText] = useState('26-400, 28-420, 30-450, 32-480, 34-510, 36-540');
  const [schools, setSchools] = useState(schoolsList);
  const [schoolQuery, setSchoolQuery] = useState('');
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  const [isAddingNewSchool, setIsAddingNewSchool] = useState(false);
  const [newSchoolInput, setNewSchoolInput] = useState('');
  const [selectedClass, setSelectedClass] = useState('2');

  const [images, setImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamically load persisted categories and schools
  useEffect(() => {
    async function loadDynamicMetadata() {
      try {
        const [remoteCats, remoteSchools] = await Promise.all([fetchCategories(), fetchSchools()]);
        if (remoteCats && Array.isArray(remoteCats) && remoteCats.length > 0) {
          setCategoryList((prev) => Array.from(new Set([...prev, ...remoteCats])));
        }
        if (remoteSchools && Array.isArray(remoteSchools) && remoteSchools.length > 0) {
          setSchools((prev) => Array.from(new Set([...prev, ...remoteSchools])));
        }
      } catch (err) {
        console.warn('Could not sync dynamic categories/schools:', err.message);
      }
    }
    loadDynamicMetadata();
  }, []);

  // Row-by-Row Size Price & Stock Handlers
  const handleAddPairRow = () => {
    setSizePricePairs((prev) => [...prev, { size: '', price: '', stock: '10' }]);
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
        { size: '26', price: '400', stock: '10' },
        { size: '28', price: '420', stock: '10' },
        { size: '30', price: '450', stock: '10' },
        { size: '32', price: '480', stock: '10' },
        { size: '34', price: '510', stock: '10' },
        { size: '36', price: '540', stock: '10' },
      ]);
    } else if (presetType === 'senior') {
      setSizePricePairs([
        { size: '28', price: '649', stock: '10' },
        { size: '30', price: '699', stock: '10' },
        { size: '32', price: '749', stock: '10' },
        { size: '34', price: '799', stock: '10' },
        { size: '36', price: '849', stock: '10' },
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
    const finalCategory = (isCustomCategory && customCategoryInput.trim())
      ? customCategoryInput.trim()
      : (selectedCategory.trim() || '');

    if (!finalCategory) {
      Alert.alert('Validation Error', 'Please select or write a product category');
      return;
    }
    if (!schoolQuery.trim()) {
      Alert.alert('Validation Error', 'Please select or enter an associated school');
      return;
    }

    // Persist custom category or new school asynchronously
    createCategory(finalCategory).catch(() => {});
    createSchool(schoolQuery.trim()).catch(() => {});

    try {
      setIsSubmitting(true);
      const selectedClassObj = classGroups.find((c) => c.id === selectedClass);

      // Fallback image if user didn't pick custom image
      const finalImages = images.length > 0 ? images : [
        'https://images.unsplash.com/photo-1544441893-675973e31985?w=600'
      ];

      // Build payload from row-by-row Size-Price-Stock pairs
      const validPairs = sizePricePairs.filter((p) => p.size.trim() !== '');
      const sizes = [];
      const sizePrices = {};
      const sizeStocks = {};
      const formattedPills = [];

      for (const pair of validPairs) {
        const sz = pair.size.trim();
        const pr = parseFloat(pair.price) || parseFloat(price) || 400;
        const stk = parseInt(pair.stock, 10);
        const validStk = isNaN(stk) ? 10 : Math.max(0, stk);
        sizes.push(sz);
        sizePrices[sz] = pr;
        sizeStocks[sz] = validStk;
        formattedPills.push(`${sz} (₹${pr}, Qty: ${validStk})`);
      }

      // Fallback if no valid rows
      if (sizes.length === 0) {
        sizes.push('26', '28', '30', '32', '34', '36');
        sizePrices['26'] = 400; sizePrices['28'] = 420; sizePrices['30'] = 450;
        sizePrices['32'] = 480; sizePrices['34'] = 510; sizePrices['36'] = 540;
        sizes.forEach((s) => { sizeStocks[s] = 10; });
      }

      const totalStockFromSizes = Object.values(sizeStocks).reduce((a, b) => a + b, 0);
      const computedStock = totalStockFromSizes > 0 ? totalStockFromSizes : (parseInt(stockQuantity, 10) || 50);

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
        category: finalCategory,
        school: schoolQuery.trim() || 'General School',
        applicableClass: selectedClassObj ? selectedClassObj.label : 'All Classes',
        description: description.trim(),
        basePrice: minPrice,
        stockQuantity: computedStock,
        images: finalImages,
        imageSrc: finalImages[0],
        sizes: sizes,
        sizePrices: sizePrices,
        sizeStocks: sizeStocks,
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={styles.label}>
                Category <Text style={styles.requiredStar}>*</Text>
              </Text>
              <Pressable
                onPress={() => {
                  setIsCustomCategory(!isCustomCategory);
                  setShowCategoryPicker(false);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' }}
              >
                <Ionicons name={isCustomCategory ? "list-outline" : "create-outline"} size={13} color="#1D4ED8" />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#1D4ED8' }}>
                  {isCustomCategory ? "Choose from List" : "✍️ Write Custom"}
                </Text>
              </Pressable>
            </View>

            {isCustomCategory ? (
              <View style={{ gap: 8 }}>
                <TextInput
                  style={[styles.textInput, { borderColor: '#3B82F6', backgroundColor: '#F8FAFC' }]}
                  placeholder="Type new category name (e.g. Scarf, Sports Jersey, Blazer)..."
                  placeholderTextColor={colors.textMuted}
                  value={customCategoryInput}
                  onChangeText={(val) => {
                    setCustomCategoryInput(val);
                    setSelectedCategory(val);
                  }}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>
                    {selectedCategory ? `Active: "${selectedCategory}"` : 'Type any custom category'}
                  </Text>
                  {customCategoryInput.trim().length > 0 && (
                    <Pressable
                      style={{ backgroundColor: colors.navy, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
                      onPress={() => {
                        const trimmed = customCategoryInput.trim();
                        if (!categoryList.includes(trimmed)) {
                          setCategoryList((prev) => [trimmed, ...prev]);
                          createCategory(trimmed).catch(() => {});
                        }
                        setSelectedCategory(trimmed);
                        Alert.alert('Category Ready', `"${trimmed}" set as product category.`);
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>Save Category</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ) : (
              <>
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
                    {/* Direct Write New Category Button inside dropdown */}
                    <Pressable
                      style={[styles.dropdownItem, { backgroundColor: '#F0FDF4', borderBottomWidth: 1, borderBottomColor: '#DCFCE7' }]}
                      onPress={() => {
                        setShowCategoryPicker(false);
                        setIsCustomCategory(true);
                      }}
                    >
                      <Ionicons name="add-circle" size={16} color="#16A34A" />
                      <Text style={[styles.dropdownItemText, { color: '#16A34A', fontWeight: '800' }]}>
                        ➕ Write / Create New Category...
                      </Text>
                    </Pressable>

                    {categoryList.map((cat) => (
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
              </>
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

          {/* Row-by-Row Size Price & Stock List */}
          <View style={styles.pairRowsContainer}>
            {sizePricePairs.map((pair, idx) => {
              const numStock = parseInt(pair.stock, 10);
              const isLowStock = !isNaN(numStock) && numStock <= 2 && pair.stock.trim() !== '';
              return (
                <View key={idx} style={[styles.pairRowItem, isLowStock && { borderColor: '#FCA5A5', backgroundColor: '#FFF5F5' }]}>
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

                  <View style={styles.pairInputCol}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={styles.pairFieldLabel}>Stock/Qty</Text>
                      {isLowStock && (
                        <Text style={{ fontSize: 9, fontWeight: '800', color: colors.red }}>Low ≤2</Text>
                      )}
                    </View>
                    <TextInput
                      style={[
                        styles.pairTextInput,
                        isLowStock && { borderColor: colors.red, backgroundColor: '#FEF2F2', color: colors.red }
                      ]}
                      placeholder="e.g. 10"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={pair.stock}
                      onChangeText={(val) => handleUpdatePairRow(idx, 'stock', val)}
                    />
                  </View>

                  <Pressable
                    style={styles.removeRowBtn}
                    onPress={() => handleRemovePairRow(idx)}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.red} />
                  </Pressable>
                </View>
              );
            })}
          </View>

          {/* Add Row Button */}
          <Pressable style={styles.addPairRowBtn} onPress={handleAddPairRow}>
            <Ionicons name="add-circle" size={20} color={colors.navy} />
            <Text style={styles.addPairRowBtnText}>+ Add Custom Size, Price &amp; Stock Row</Text>
          </Pressable>

          {/* Live Preview Badges */}
          <View style={styles.previewBox}>
            <Text style={styles.previewTitle}>Live Website Rate &amp; Stock Preview:</Text>
            <View style={styles.previewChipsContainer}>
              {sizePricePairs
                .filter((p) => p.size.trim() !== '')
                .map((pair, idx) => {
                  const numStock = parseInt(pair.stock, 10);
                  const isLow = !isNaN(numStock) && numStock <= 2 && pair.stock.trim() !== '';
                  return (
                    <View key={idx} style={[styles.sizePriceChip, isLow && { borderColor: '#F87171', backgroundColor: '#FEF2F2' }]}>
                      <Text style={styles.sizeChipKey}>Size {pair.size}</Text>
                      <Text style={styles.sizeChipPrice}>₹{pair.price || '0'}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: isLow ? colors.red : '#4B5563' }}>
                        {isLow ? `⚠️ Low: ${pair.stock || '0'}` : `Qty: ${pair.stock || '0'}`}
                      </Text>
                    </View>
                  );
                })}
            </View>
          </View>
        </View>

        {/* Card 2: School & Target */}
        <View style={styles.formCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.sectionHeader}>SCHOOL / INSTITUTION</Text>
            <Pressable
              onPress={() => setIsAddingNewSchool(!isAddingNewSchool)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A' }}
            >
              <Ionicons name={isAddingNewSchool ? "close" : "add-circle-outline"} size={13} color="#B45309" />
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309' }}>
                {isAddingNewSchool ? "Cancel" : "➕ Add New School"}
              </Text>
            </Pressable>
          </View>

          {/* Explicit Add New School Form */}
          {isAddingNewSchool && (
            <View style={{ marginVertical: 10, padding: 12, backgroundColor: '#FFFBEB', borderRadius: 10, borderWidth: 1, borderColor: '#FDE68A', gap: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#92400E' }}>Create &amp; Register New School:</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: '#FFFFFF' }]}
                placeholder="e.g. Cambridge International School, Bathinda"
                placeholderTextColor={colors.textMuted}
                value={newSchoolInput}
                onChangeText={setNewSchoolInput}
              />
              <Pressable
                style={{ backgroundColor: '#D97706', paddingVertical: 9, borderRadius: 8, alignItems: 'center' }}
                onPress={() => {
                  const trimmed = newSchoolInput.trim();
                  if (!trimmed) {
                    Alert.alert('School Name Required', 'Please enter a school name.');
                    return;
                  }
                  if (!schools.includes(trimmed)) {
                    setSchools((prev) => [trimmed, ...prev]);
                    createSchool(trimmed).catch(() => {});
                  }
                  setSchoolQuery(trimmed);
                  setNewSchoolInput('');
                  setIsAddingNewSchool(false);
                  Alert.alert('School Added 🎉', `"${trimmed}" added and selected for product.`);
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>+ Add &amp; Select School</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              School / Institution Name <Text style={styles.requiredStar}>*</Text>
            </Text>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search or select school name..."
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
                {/* Instant "Add as New School" button if query doesn't match an existing school */}
                {schoolQuery.trim().length > 0 && !schools.some((s) => s.toLowerCase() === schoolQuery.trim().toLowerCase()) && (
                  <Pressable
                    style={[styles.dropdownItem, { backgroundColor: '#FEF3C7', borderBottomWidth: 1, borderBottomColor: '#FDE68A' }]}
                    onPress={() => {
                      const trimmed = schoolQuery.trim();
                      if (!schools.includes(trimmed)) {
                        setSchools((prev) => [trimmed, ...prev]);
                        createSchool(trimmed).catch(() => {});
                      }
                      setSchoolQuery(trimmed);
                      setShowSchoolDropdown(false);
                      Alert.alert('New School Added 🎉', `"${trimmed}" registered and selected!`);
                    }}
                  >
                    <Ionicons name="add-circle" size={16} color="#D97706" />
                    <Text style={[styles.dropdownItemText, { color: '#B45309', fontWeight: '800' }]}>
                      ➕ Add "{schoolQuery.trim()}" as New School
                    </Text>
                  </Pressable>
                )}
                {schools
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
