import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '../theme/colors';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  fetchSchools,
  createSchool,
  updateSchool,
  deleteSchool,
  fetchClasses,
  createClass,
  updateClass,
  deleteClass,
} from '../services/api';
import { categories as defaultCategories, schoolsList as defaultSchools, classesList as defaultClasses } from '../data/mockData';

export default function ManageMastersScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'schools' | 'classes'
  const [categoriesList, setCategoriesList] = useState(defaultCategories);
  const [schoolsListState, setSchoolsListState] = useState(defaultSchools);
  const [classesListState, setClassesListState] = useState(defaultClasses || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [newItemInput, setNewItemInput] = useState('');

  // Editing state: { type: 'category'|'school'|'class', oldName: string, newName: string }
  const [editingItem, setEditingItem] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load all categories, schools, and classes
  const loadData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const [remoteCats, remoteSchools, remoteClasses] = await Promise.all([
        fetchCategories(),
        fetchSchools(),
        fetchClasses(),
      ]);

      if (remoteCats && Array.isArray(remoteCats)) {
        setCategoriesList(remoteCats);
      }
      if (remoteSchools && Array.isArray(remoteSchools)) {
        setSchoolsListState(remoteSchools);
      }
      if (remoteClasses && Array.isArray(remoteClasses)) {
        setClassesListState(remoteClasses);
      }
    } catch (err) {
      console.warn('Error loading masters data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadData(false);
  };

  // -------------------------------------------------------------
  // Category CRUD Handlers
  // -------------------------------------------------------------

  const handleAddCategory = async () => {
    const trimmed = newItemInput.trim();
    if (!trimmed) {
      Alert.alert('Required', 'Please enter a category name.');
      return;
    }

    if (categoriesList.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert('Duplicate', 'This category already exists.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createCategory(trimmed);
      setCategoriesList((prev) => [trimmed, ...prev.filter((c) => c.toLowerCase() !== trimmed.toLowerCase())]);
      setNewItemInput('');
      Alert.alert('Success', `Category "${trimmed}" added successfully.`);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to add category.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEditCategory = (catName) => {
    setEditingItem({ type: 'category', oldName: catName, newName: catName });
  };

  const handleSaveEditCategory = async () => {
    if (!editingItem || !editingItem.newName.trim()) return;
    const oldName = editingItem.oldName;
    const newName = editingItem.newName.trim();

    if (oldName === newName) {
      setEditingItem(null);
      return;
    }

    setIsSubmitting(true);
    try {
      await updateCategory(oldName, newName);
      setCategoriesList((prev) => prev.map((c) => (c === oldName ? newName : c)));
      setEditingItem(null);
      Alert.alert('Updated', `Category renamed to "${newName}". All products in Supabase have been updated.`);
    } catch (err) {
      Alert.alert('Update Error', err.message || 'Failed to update category.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = (catName) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${catName}"?\n\nProducts currently under this category will automatically be kept safe under "General".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await deleteCategory(catName);
              setCategoriesList((prev) => prev.filter((c) => c.toLowerCase() !== catName.toLowerCase()));
              Alert.alert('Deleted', `Category "${catName}" has been removed.`);
            } catch (err) {
              Alert.alert('Delete Error', err.message || 'Failed to delete category.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  // -------------------------------------------------------------
  // School CRUD Handlers
  // -------------------------------------------------------------

  const handleAddSchool = async () => {
    const trimmed = newItemInput.trim();
    if (!trimmed) {
      Alert.alert('Required', 'Please enter a school name.');
      return;
    }

    if (schoolsListState.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert('Duplicate', 'This school is already registered.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createSchool(trimmed);
      setSchoolsListState((prev) => [trimmed, ...prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())]);
      setNewItemInput('');
      Alert.alert('Success', `School "${trimmed}" registered successfully.`);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to register school.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEditSchool = (schoolName) => {
    setEditingItem({ type: 'school', oldName: schoolName, newName: schoolName });
  };

  const handleSaveEditSchool = async () => {
    if (!editingItem || !editingItem.newName.trim()) return;
    const oldName = editingItem.oldName;
    const newName = editingItem.newName.trim();

    if (oldName === newName) {
      setEditingItem(null);
      return;
    }

    setIsSubmitting(true);
    try {
      await updateSchool(oldName, newName);
      setSchoolsListState((prev) => prev.map((s) => (s === oldName ? newName : s)));
      setEditingItem(null);
      Alert.alert('Updated', `School renamed to "${newName}". All products in Supabase have been updated.`);
    } catch (err) {
      Alert.alert('Update Error', err.message || 'Failed to update school.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSchool = (schoolName) => {
    Alert.alert(
      'Delete School',
      `Are you sure you want to delete "${schoolName}"?\n\nProducts currently assigned to this school will safely be set to "General School".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await deleteSchool(schoolName);
              setSchoolsListState((prev) => prev.filter((s) => s.toLowerCase() !== schoolName.toLowerCase()));
              Alert.alert('Deleted', `School "${schoolName}" has been deleted.`);
            } catch (err) {
              Alert.alert('Delete Error', err.message || 'Failed to delete school.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  // -------------------------------------------------------------
  // Class CRUD Handlers
  // -------------------------------------------------------------

  const handleAddClass = async () => {
    const trimmed = newItemInput.trim();
    if (!trimmed) {
      Alert.alert('Required', 'Please enter a class name (e.g. NUR - II, I - VIII).');
      return;
    }

    if (classesListState.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert('Duplicate', 'This class already exists.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createClass(trimmed);
      setClassesListState((prev) => [trimmed, ...prev.filter((c) => c.toLowerCase() !== trimmed.toLowerCase())]);
      setNewItemInput('');
      Alert.alert('Success', `Class "${trimmed}" created successfully.`);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to create class.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEditClass = (className) => {
    setEditingItem({ type: 'class', oldName: className, newName: className });
  };

  const handleSaveEditClass = async () => {
    if (!editingItem || !editingItem.newName.trim()) return;
    const oldName = editingItem.oldName;
    const newName = editingItem.newName.trim();

    if (oldName === newName) {
      setEditingItem(null);
      return;
    }

    setIsSubmitting(true);
    try {
      await updateClass(oldName, newName);
      setClassesListState((prev) => prev.map((c) => (c === oldName ? newName : c)));
      setEditingItem(null);
      Alert.alert('Updated', `Class renamed to "${newName}". All products in Supabase have been updated.`);
    } catch (err) {
      Alert.alert('Update Error', err.message || 'Failed to update class.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClass = (className) => {
    Alert.alert(
      'Delete Class',
      `Are you sure you want to delete "${className}"?\n\nProducts currently assigned to this class will safely be reset to "All Classes".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await deleteClass(className);
              setClassesListState((prev) => prev.filter((c) => c.toLowerCase() !== className.toLowerCase()));
              Alert.alert('Deleted', `Class "${className}" has been deleted.`);
            } catch (err) {
              Alert.alert('Delete Error', err.message || 'Failed to delete class.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  // Filter items by search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categoriesList;
    return categoriesList.filter((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [categoriesList, searchQuery]);

  const filteredSchools = useMemo(() => {
    if (!searchQuery.trim()) return schoolsListState;
    return schoolsListState.filter((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [schoolsListState, searchQuery]);

  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return classesListState;
    return classesListState.filter((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [classesListState, searchQuery]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Screen Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Masters Manager</Text>
          <Text style={styles.headerSubtitle}>
            Full CRUD: Add, Edit &amp; Delete Categories, Schools &amp; Classes
          </Text>
        </View>
        <Pressable
          style={styles.refreshIconBtn}
          onPress={onRefresh}
          disabled={isRefreshing || isLoading}
        >
          <Ionicons
            name="refresh-outline"
            size={20}
            color={colors.navy}
            style={isRefreshing && { transform: [{ rotate: '45deg' }] }}
          />
        </Pressable>
      </View>

      {/* Segmented Switcher Tabs */}
      <View style={styles.tabSwitcher}>
        <Pressable
          style={[styles.switcherBtn, activeTab === 'categories' && styles.switcherBtnActive]}
          onPress={() => {
            setActiveTab('categories');
            setEditingItem(null);
            setNewItemInput('');
          }}
        >
          <Ionicons
            name="pricetags-outline"
            size={16}
            color={activeTab === 'categories' ? '#FFFFFF' : colors.textSecondary}
          />
          <Text
            style={[
              styles.switcherBtnText,
              activeTab === 'categories' && styles.switcherBtnTextActive,
            ]}
          >
            Categories ({categoriesList.length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.switcherBtn, activeTab === 'schools' && styles.switcherBtnActive]}
          onPress={() => {
            setActiveTab('schools');
            setEditingItem(null);
            setNewItemInput('');
          }}
        >
          <Ionicons
            name="school-outline"
            size={16}
            color={activeTab === 'schools' ? '#FFFFFF' : colors.textSecondary}
          />
          <Text
            style={[
              styles.switcherBtnText,
              activeTab === 'schools' && styles.switcherBtnTextActive,
            ]}
          >
            Schools ({schoolsListState.length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.switcherBtn, activeTab === 'classes' && styles.switcherBtnActive]}
          onPress={() => {
            setActiveTab('classes');
            setEditingItem(null);
            setNewItemInput('');
          }}
        >
          <Ionicons
            name="layers-outline"
            size={16}
            color={activeTab === 'classes' ? '#FFFFFF' : colors.textSecondary}
          />
          <Text
            style={[
              styles.switcherBtnText,
              activeTab === 'classes' && styles.switcherBtnTextActive,
            ]}
          >
            Classes ({classesListState.length})
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* ADD NEW ITEM CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleGroup}>
              <Ionicons
                name={
                  activeTab === 'categories'
                    ? 'add-circle'
                    : activeTab === 'schools'
                      ? 'business'
                      : 'layers'
                }
                size={18}
                color={colors.navy}
              />
              <Text style={styles.cardTitle}>
                {activeTab === 'categories'
                  ? 'ADD NEW CATEGORY'
                  : activeTab === 'schools'
                    ? 'ADD NEW SCHOOL'
                    : 'ADD NEW CLASS'}
              </Text>
            </View>
            <Text style={styles.badgeInfo}>Admin Live Sync</Text>
          </View>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder={
                activeTab === 'categories'
                  ? 'e.g. Scarf, Sports Jersey, Tracksuit, Blazer...'
                  : activeTab === 'schools'
                    ? 'e.g. Cambridge International School, Bathinda...'
                    : 'e.g. NUR - II, NUR - V, I - VIII, IX - X...'
              }
              placeholderTextColor={colors.textMuted}
              value={newItemInput}
              onChangeText={setNewItemInput}
            />
            <Pressable
              style={[styles.addBtn, (!newItemInput.trim() || isSubmitting) && styles.addBtnDisabled]}
              onPress={
                activeTab === 'categories'
                  ? handleAddCategory
                  : activeTab === 'schools'
                    ? handleAddSchool
                    : handleAddClass
              }
              disabled={!newItemInput.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text style={styles.addBtnText}>
                    {activeTab === 'categories'
                      ? 'Add Category'
                      : activeTab === 'schools'
                        ? 'Add School'
                        : 'Add Class'}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={17} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              activeTab === 'categories'
                ? 'Search categories by name...'
                : activeTab === 'schools'
                  ? 'Search schools institution...'
                  : 'Search classes (e.g. NUR, VIII)...'
            }
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

        {/* LIST SECTION */}
        <View style={styles.card}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.sectionTitle}>
              {activeTab === 'categories'
                ? `ACTIVE CATEGORIES (${filteredCategories.length})`
                : activeTab === 'schools'
                  ? `REGISTERED SCHOOLS (${filteredSchools.length})`
                  : `APPLICABLE CLASSES (${filteredClasses.length})`}
            </Text>
            <Text style={styles.hintText}>Tap pen to edit • trash to delete</Text>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.navy} />
              <Text style={styles.loadingText}>Loading masters catalog...</Text>
            </View>
          ) : (
            <View style={styles.itemsListContainer}>
              {activeTab === 'categories' ? (
                filteredCategories.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="pricetag-outline" size={36} color={colors.textMuted} />
                    <Text style={styles.emptyStateTitle}>No categories found</Text>
                    <Text style={styles.emptyStateSubtitle}>
                      {searchQuery ? 'Try clearing your search query' : 'Add a new category above'}
                    </Text>
                  </View>
                ) : (
                  filteredCategories.map((cat, idx) => {
                    const isEditingThis =
                      editingItem && editingItem.type === 'category' && editingItem.oldName === cat;

                    return (
                      <View key={cat || idx} style={styles.masterItemRow}>
                        {isEditingThis ? (
                          /* Inline Edit Row */
                          <View style={styles.inlineEditContainer}>
                            <TextInput
                              style={styles.inlineInput}
                              value={editingItem.newName}
                              onChangeText={(val) =>
                                setEditingItem((prev) => ({ ...prev, newName: val }))
                              }
                              autoFocus
                            />
                            <View style={styles.inlineButtonsRow}>
                              <Pressable
                                style={styles.inlineSaveBtn}
                                onPress={handleSaveEditCategory}
                                disabled={isSubmitting}
                              >
                                {isSubmitting ? (
                                  <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                                )}
                              </Pressable>
                              <Pressable
                                style={styles.inlineCancelBtn}
                                onPress={() => setEditingItem(null)}
                                disabled={isSubmitting}
                              >
                                <Ionicons name="close" size={16} color="#4B5563" />
                              </Pressable>
                            </View>
                          </View>
                        ) : (
                          /* Normal Display Row */
                          <>
                            <View style={styles.masterNameGroup}>
                              <View style={styles.itemBullet}>
                                <Ionicons name="pricetag" size={12} color={colors.navy} />
                              </View>
                              <Text style={styles.masterItemText}>{cat}</Text>
                            </View>

                            <View style={styles.itemActionsRow}>
                              <Pressable
                                style={styles.actionBtnEdit}
                                onPress={() => handleStartEditCategory(cat)}
                                title="Edit Category"
                              >
                                <Ionicons name="pencil" size={14} color="#1D4ED8" />
                              </Pressable>
                              <Pressable
                                style={styles.actionBtnDelete}
                                onPress={() => handleDeleteCategory(cat)}
                                title="Delete Category"
                              >
                                <Ionicons name="trash-outline" size={14} color="#DC2626" />
                              </Pressable>
                            </View>
                          </>
                        )}
                      </View>
                    );
                  })
                )
              ) : activeTab === 'schools' ? (
                filteredSchools.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="school-outline" size={36} color={colors.textMuted} />
                    <Text style={styles.emptyStateTitle}>No schools found</Text>
                    <Text style={styles.emptyStateSubtitle}>
                      {searchQuery ? 'Try clearing your search query' : 'Register a new school above'}
                    </Text>
                  </View>
                ) : (
                  filteredSchools.map((school, idx) => {
                    const isEditingThis =
                      editingItem && editingItem.type === 'school' && editingItem.oldName === school;

                    return (
                      <View key={school || idx} style={styles.masterItemRow}>
                        {isEditingThis ? (
                          /* Inline Edit Row */
                          <View style={styles.inlineEditContainer}>
                            <TextInput
                              style={styles.inlineInput}
                              value={editingItem.newName}
                              onChangeText={(val) =>
                                setEditingItem((prev) => ({ ...prev, newName: val }))
                              }
                              autoFocus
                            />
                            <View style={styles.inlineButtonsRow}>
                              <Pressable
                                style={styles.inlineSaveBtn}
                                onPress={handleSaveEditSchool}
                                disabled={isSubmitting}
                              >
                                {isSubmitting ? (
                                  <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                                )}
                              </Pressable>
                              <Pressable
                                style={styles.inlineCancelBtn}
                                onPress={() => setEditingItem(null)}
                                disabled={isSubmitting}
                              >
                                <Ionicons name="close" size={16} color="#4B5563" />
                              </Pressable>
                            </View>
                          </View>
                        ) : (
                          /* Normal Display Row */
                          <>
                            <View style={styles.masterNameGroup}>
                              <View style={[styles.itemBullet, { backgroundColor: '#FEF3C7' }]}>
                                <Ionicons name="school" size={12} color="#B45309" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.masterItemText}>{school}</Text>
                                <Text style={styles.allClassesSubtext}>All Classes Assigned</Text>
                              </View>
                            </View>

                            <View style={styles.itemActionsRow}>
                              <Pressable
                                style={styles.actionBtnEdit}
                                onPress={() => handleStartEditSchool(school)}
                                title="Edit School"
                              >
                                <Ionicons name="pencil" size={14} color="#1D4ED8" />
                              </Pressable>
                              <Pressable
                                style={styles.actionBtnDelete}
                                onPress={() => handleDeleteSchool(school)}
                                title="Delete School"
                              >
                                <Ionicons name="trash-outline" size={14} color="#DC2626" />
                              </Pressable>
                            </View>
                          </>
                        )}
                      </View>
                    );
                  })
                )
              ) : (
                /* Classes Tab */
                filteredClasses.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="layers-outline" size={36} color={colors.textMuted} />
                    <Text style={styles.emptyStateTitle}>No classes found</Text>
                    <Text style={styles.emptyStateSubtitle}>
                      {searchQuery ? 'Try clearing your search query' : 'Add a new class above'}
                    </Text>
                  </View>
                ) : (
                  filteredClasses.map((cls, idx) => {
                    const isEditingThis =
                      editingItem && editingItem.type === 'class' && editingItem.oldName === cls;

                    return (
                      <View key={cls || idx} style={styles.masterItemRow}>
                        {isEditingThis ? (
                          /* Inline Edit Row */
                          <View style={styles.inlineEditContainer}>
                            <TextInput
                              style={styles.inlineInput}
                              value={editingItem.newName}
                              onChangeText={(val) =>
                                setEditingItem((prev) => ({ ...prev, newName: val }))
                              }
                              autoFocus
                            />
                            <View style={styles.inlineButtonsRow}>
                              <Pressable
                                style={styles.inlineSaveBtn}
                                onPress={handleSaveEditClass}
                                disabled={isSubmitting}
                              >
                                {isSubmitting ? (
                                  <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                                )}
                              </Pressable>
                              <Pressable
                                style={styles.inlineCancelBtn}
                                onPress={() => setEditingItem(null)}
                                disabled={isSubmitting}
                              >
                                <Ionicons name="close" size={16} color="#4B5563" />
                              </Pressable>
                            </View>
                          </View>
                        ) : (
                          /* Normal Display Row */
                          <>
                            <View style={styles.masterNameGroup}>
                              <View style={[styles.itemBullet, { backgroundColor: '#EDE9FE' }]}>
                                <Ionicons name="ribbon" size={12} color="#6D28D9" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.masterItemText}>{cls}</Text>
                                <Text style={styles.allClassesSubtext}>Uniform Grade Section</Text>
                              </View>
                            </View>

                            <View style={styles.itemActionsRow}>
                              <Pressable
                                style={styles.actionBtnEdit}
                                onPress={() => handleStartEditClass(cls)}
                                title="Edit Class"
                              >
                                <Ionicons name="pencil" size={14} color="#1D4ED8" />
                              </Pressable>
                              <Pressable
                                style={styles.actionBtnDelete}
                                onPress={() => handleDeleteClass(cls)}
                                title="Delete Class"
                              >
                                <Ionicons name="trash-outline" size={14} color="#DC2626" />
                              </Pressable>
                            </View>
                          </>
                        )}
                      </View>
                    );
                  })
                )
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  refreshIconBtn: {
    padding: 8,
    borderRadius: radii.md,
    backgroundColor: '#F1F5F9',
  },
  tabSwitcher: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  switcherBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radii.lg,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  switcherBtnActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  switcherBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  switcherBtnTextActive: {
    color: '#FFFFFF',
  },
  contentScroll: {
    flex: 1,
  },
  scrollContainer: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.navy,
    letterSpacing: 0.5,
  },
  badgeInfo: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  inputRow: {
    flexDirection: 'column',
    gap: 8,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.navy,
    borderRadius: radii.lg,
    paddingVertical: 11,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addBtnDisabled: {
    opacity: 0.5,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
    padding: 0,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  hintText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  itemsListContainer: {
    gap: 8,
  },
  masterItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  masterNameGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  itemBullet: {
    width: 24,
    height: 24,
    borderRadius: radii.md,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  masterItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  allClassesSubtext: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
    marginTop: 1,
  },
  itemActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtnEdit: {
    padding: 7,
    borderRadius: radii.md,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  actionBtnDelete: {
    padding: 7,
    borderRadius: radii.md,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  inlineEditContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inlineInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    borderRadius: radii.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  inlineButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineSaveBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineCancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emptyStateTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
    marginTop: 6,
  },
  emptyStateSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
  },
});
