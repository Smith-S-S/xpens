import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, Alert,
  StyleSheet, Modal, TextInput, ScrollView, Platform,
} from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useApp } from '@/lib/AppContext';
import { useColors } from '@/hooks/use-colors';
import { Category } from '@/lib/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import UUID from 'react-native-uuid';
import * as Haptics from 'expo-haptics';
import { CATEGORY_ICONS, CATEGORY_COLORS } from '@/lib/defaults';

// ─── Category Form Modal ──────────────────────────────────────────────────────

function CategoryFormModal({
  visible,
  category,
  defaultType,
  onClose,
  onSaved,
}: {
  visible: boolean;
  category?: Category | null;
  defaultType: 'expense' | 'income';
  onClose: () => void;
  onSaved: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addCategory, updateCategory } = useApp();
  const isEdit = !!category;

  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>(defaultType);
  const [icon, setIcon] = useState('🛒');
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!visible) return;
    if (category) {
      setName(category.name);
      setType(category.type);
      setIcon(category.icon);
      setColor(category.color);
    } else {
      setName('');
      setType(defaultType);
      setIcon('🛒');
      setColor(CATEGORY_COLORS[0]);
    }
    setErrors({});
  }, [visible, category, defaultType]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Category name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const cat: Category = {
      id: category?.id || String(UUID.v4()),
      name: name.trim(),
      type,
      icon,
      color,
      isDefault: category?.isDefault || false,
      sortOrder: category?.sortOrder || 99,
      createdAt: category?.createdAt || new Date().toISOString(),
    };
    if (isEdit) await updateCategory(cat);
    else await addCategory(cat);
    onSaved();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable style={styles.headerBtn} onPress={onClose}>
              <Text style={[styles.headerBtnText, { color: colors.muted }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {isEdit ? 'Edit Category' : 'Add Category'}
            </Text>
            <View style={styles.headerBtn} />
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.formContent}>
              {/* Preview */}
              <View style={styles.categoryPreview}>
                <View style={[styles.categoryPreviewIcon, { backgroundColor: color + '25' }]}>
                  <Text style={{ fontSize: 40 }}>{icon}</Text>
                </View>
                <Text style={[styles.categoryPreviewName, { color: colors.foreground }]}>
                  {name || 'Category Name'}
                </Text>
              </View>

              {/* Type */}
              {!isEdit && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.muted }]}>Type</Text>
                  <View style={[styles.typeToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {(['expense', 'income'] as const).map(t => (
                      <Pressable
                        key={t}
                        style={[
                          styles.typeToggleBtn,
                          type === t && { backgroundColor: t === 'expense' ? colors.expense : colors.income },
                        ]}
                        onPress={() => setType(t)}
                      >
                        <Text style={[styles.typeToggleBtnText, { color: type === t ? '#fff' : colors.muted }]}>
                          {t.toUpperCase()}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              {/* Name */}
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Category Name *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, borderColor: errors.name ? colors.expense : colors.border, color: colors.foreground }]}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Coffee"
                placeholderTextColor={colors.muted}
                returnKeyType="done"
              />
              {errors.name && <Text style={[styles.errorText, { color: colors.expense }]}>{errors.name}</Text>}

              {/* Icon Picker */}
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Icon</Text>
              <View style={styles.iconGrid}>
                {CATEGORY_ICONS.map(ic => (
                  <Pressable
                    key={ic}
                    style={[
                      styles.iconOption,
                      { backgroundColor: colors.surface },
                      icon === ic && { backgroundColor: color + '30', borderColor: color, borderWidth: 2 },
                    ]}
                    onPress={() => setIcon(ic)}
                  >
                    <Text style={{ fontSize: 24 }}>{ic}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Color Picker */}
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Color</Text>
              <View style={styles.colorGrid}>
                {CATEGORY_COLORS.map(c => (
                  <Pressable
                    key={c}
                    style={[
                      styles.colorOption,
                      { backgroundColor: c },
                      color === c && styles.colorOptionSelected,
                    ]}
                    onPress={() => setColor(c)}
                  >
                    {color === c && <IconSymbol name="checkmark" size={14} color="#fff" />}
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={[styles.saveContainer, { borderTopColor: colors.border }]}>
            <Pressable
              style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.85 }]}
              onPress={handleSave}
            >
              <Text style={styles.saveBtnText}>{isEdit ? 'UPDATE' : 'ADD CATEGORY'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Categories Screen ────────────────────────────────────────────────────────

export default function CategoriesScreen() {
  const colors = useColors();
  const { state, removeCategory } = useApp();
  const [activeType, setActiveType] = useState<'expense' | 'income'>('expense');
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const filteredCategories = state.categories.filter(c => c.type === activeType);

  const handleLongPress = useCallback((category: Category) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      category.name,
      'What would you like to do?',
      [
        { text: 'Edit', onPress: () => { setEditingCategory(category); setShowForm(true); } },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (category.isDefault) {
              Alert.alert('Cannot Delete', 'Default categories cannot be deleted.');
              return;
            }
            Alert.alert(
              'Delete Category',
              `Delete "${category.name}"?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => removeCategory(category.id) },
              ]
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [removeCategory]);

  const renderCategory = ({ item }: { item: Category }) => (
    <Pressable
      style={({ pressed }) => [
        styles.categoryCard,
        { backgroundColor: colors.background },
        pressed && { opacity: 0.7 },
      ]}
      onPress={() => { setEditingCategory(item); setShowForm(true); }}
      onLongPress={() => handleLongPress(item)}
      delayLongPress={500}
    >
      <View style={[styles.categoryIconCircle, { backgroundColor: item.color + '20' }]}>
        <Text style={styles.categoryEmoji}>{item.icon}</Text>
      </View>
      <Text style={[styles.categoryName, { color: colors.foreground }]} numberOfLines={1}>
        {item.name}
      </Text>
      {item.isDefault && (
        <View style={[styles.defaultBadge, { backgroundColor: colors.border }]}>
          <Text style={[styles.defaultBadgeText, { color: colors.muted }]}>default</Text>
        </View>
      )}
    </Pressable>
  );

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Type Toggle */}
      <View style={[styles.typeToggleContainer, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <View style={[styles.typeToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {(['expense', 'income'] as const).map(t => (
            <Pressable
              key={t}
              style={[
                styles.typeToggleBtn,
                activeType === t && { backgroundColor: t === 'expense' ? colors.expense : colors.income },
              ]}
              onPress={() => setActiveType(t)}
            >
              <Text style={[styles.typeToggleBtnText, { color: activeType === t ? '#fff' : colors.muted }]}>
                {t.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredCategories}
        keyExtractor={item => item.id}
        numColumns={3}
        renderItem={renderCategory}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🏷️</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>No categories yet</Text>
          </View>
        }
        ListFooterComponent={
          <Pressable
            style={({ pressed }) => [
              styles.addCategoryBtn,
              { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => { setEditingCategory(null); setShowForm(true); }}
          >
            <IconSymbol name="plus.circle.fill" size={22} color={colors.primary} />
            <Text style={[styles.addCategoryBtnText, { color: colors.primary }]}>Add Category</Text>
          </Pressable>
        }
      />

      <CategoryFormModal
        visible={showForm}
        category={editingCategory}
        defaultType={activeType}
        onClose={() => { setShowForm(false); setEditingCategory(null); }}
        onSaved={() => { setShowForm(false); setEditingCategory(null); }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  typeToggleContainer: {
    padding: 16,
    borderBottomWidth: 0.5,
  },
  typeToggle: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  typeToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  typeToggleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  grid: {
    padding: 12,
    paddingBottom: 24,
  },
  row: {
    gap: 8,
    marginBottom: 8,
  },
  categoryCard: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    minHeight: 100,
    justifyContent: 'center',
    position: 'relative',
  },
  categoryIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryEmoji: {
    fontSize: 28,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  defaultBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 9,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
  },
  addCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingVertical: 16,
    gap: 8,
    marginTop: 4,
    marginHorizontal: 4,
  },
  addCategoryBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  // Form modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  headerBtn: {
    minWidth: 60,
  },
  headerBtnText: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  formContent: {
    padding: 16,
  },
  categoryPreview: {
    alignItems: 'center',
    marginBottom: 20,
  },
  categoryPreviewIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryPreviewName: {
    fontSize: 18,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  saveContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
