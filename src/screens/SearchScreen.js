import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, Image, StyleSheet, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { DataFilter } from '../utils/DataFilter';
import { ItemArchiveService } from '../services/ItemArchiveService';
import { AdvancedSearchService } from '../services/AdvancedSearchService';

export default function SearchScreen({ navigation }) {
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCondition, setSelectedCondition] = useState('All');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedTimePosted, setSelectedTimePosted] = useState('All');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [savedSearches, setSavedSearches] = useState([]);
  const [searchSuggestions, setSearchSuggestions] = useState(null);

  const categories = ['All', 'Electronics', 'Clothing', 'Books', 'Sports', 'Home', 'Other'];
  const conditions = ['All', 'New', 'Like New', 'Good', 'Fair', 'Poor'];
  const timePostedOptions = ['All', '24h', '7d', '30d'];
  const brands = ['All', ...Object.keys(AdvancedSearchService.BRAND_PATTERNS).slice(0, 15)];

  useEffect(() => {
    loadItems();
    loadSavedSearches();
  }, []);

  useEffect(() => {
    if (searchText.length > 2) {
      loadSearchSuggestions();
    } else {
      setSearchSuggestions(null);
    }
  }, [searchText]);

  const loadItems = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const filters = {
        searchText,
        category: selectedCategory,
        condition: selectedCondition,
        brand: selectedBrand,
        timePosted: selectedTimePosted,
        minPrice: priceRange.min > 0 ? priceRange.min : undefined,
        maxPrice: priceRange.max < 1000 ? priceRange.max : undefined
      };

      const searchResults = await AdvancedSearchService.advancedSearch(filters);
      
      // Filter out archived items first, then test items
      const activeItems = ItemArchiveService.filterActiveItems(searchResults);
      const realItems = DataFilter.filterTestItems(activeItems);
      setItems(realItems);
      
      console.log(`🔍 Advanced search returned ${searchResults.length} items, ${activeItems.length} active, showing ${realItems.length} real items`);
      
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const loadSavedSearches = async () => {
    try {
      // Would load from user context in production
      setSavedSearches([]);
    } catch (error) {
      console.error('Error loading saved searches:', error);
    }
  };

  const loadSearchSuggestions = async () => {
    try {
      // Would load from user context in production
      const suggestions = await AdvancedSearchService.getSearchSuggestions('user_id', searchText);
      setSearchSuggestions(suggestions);
    } catch (error) {
      console.error('Error loading search suggestions:', error);
    }
  };

  const onRefresh = () => {
    loadItems(true);
  };

  const handleSearch = async () => {
    await loadItems();
  };

  const handleSaveSearch = async () => {
    try {
      const filters = {
        searchText,
        category: selectedCategory,
        condition: selectedCondition,
        brand: selectedBrand,
        timePosted: selectedTimePosted,
        minPrice: priceRange.min > 0 ? priceRange.min : undefined,
        maxPrice: priceRange.max < 1000 ? priceRange.max : undefined
      };

      // Would save with user context in production
      console.log('Saving search:', filters);
      alert('Search saved! (Feature requires user authentication)');
    } catch (error) {
      console.error('Error saving search:', error);
    }
  };

  const handleApplyFilters = () => {
    setShowFilters(false);
    loadItems();
  };

  const handleResetFilters = () => {
    setSelectedCategory('All');
    setSelectedCondition('All');
    setSelectedBrand('All');
    setSelectedTimePosted('All');
    setPriceRange({ min: 0, max: 1000 });
    setShowFilters(false);
    loadItems();
  };

  const hasActiveFilters = () => {
    return selectedCategory !== 'All' ||
           selectedCondition !== 'All' ||
           selectedBrand !== 'All' ||
           selectedTimePosted !== 'All' ||
           priceRange.min > 0 ||
           priceRange.max < 1000;
  };

  const renderCategory = (category) => (
    <TouchableOpacity
      key={category}
      style={[
        styles.categoryButton,
        selectedCategory === category && styles.categoryButtonActive
      ]}
      onPress={() => {
        setSelectedCategory(category);
        loadItems();
      }}
    >
      <Text style={[
        styles.categoryText,
        selectedCategory === category && styles.categoryTextActive
      ]}>
        {category}
      </Text>
    </TouchableOpacity>
  );

  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Advanced Filters</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.filterSectionTitle}>Condition</Text>
            <View style={styles.filterOptions}>
              {conditions.map(condition => (
                <TouchableOpacity
                  key={condition}
                  style={[
                    styles.filterOption,
                    selectedCondition === condition && styles.filterOptionActive
                  ]}
                  onPress={() => setSelectedCondition(condition)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    selectedCondition === condition && styles.filterOptionTextActive
                  ]}>
                    {condition}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterSectionTitle}>Brand</Text>
            <View style={styles.filterOptions}>
              {brands.slice(0, 8).map(brand => (
                <TouchableOpacity
                  key={brand}
                  style={[
                    styles.filterOption,
                    selectedBrand === brand && styles.filterOptionActive
                  ]}
                  onPress={() => setSelectedBrand(brand)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    selectedBrand === brand && styles.filterOptionTextActive
                  ]}>
                    {brand === 'All' ? 'All Brands' : brand.charAt(0).toUpperCase() + brand.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterSectionTitle}>Time Posted</Text>
            <View style={styles.filterOptions}>
              {timePostedOptions.map(option => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.filterOption,
                    selectedTimePosted === option && styles.filterOptionActive
                  ]}
                  onPress={() => setSelectedTimePosted(option)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    selectedTimePosted === option && styles.filterOptionTextActive
                  ]}>
                    {option === 'All' ? 'Any Time' : option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterSectionTitle}>Price Range</Text>
            <View style={styles.priceInputsContainer}>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.priceInputLabel}>Min</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="0"
                  value={priceRange.min > 0 ? priceRange.min.toString() : ''}
                  onChangeText={(text) => setPriceRange({ ...priceRange, min: parseInt(text) || 0 })}
                  keyboardType="numeric"
                />
              </View>
              <Text style={styles.priceSeparator}>-</Text>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.priceInputLabel}>Max</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="1000"
                  value={priceRange.max < 1000 ? priceRange.max.toString() : ''}
                  onChangeText={(text) => setPriceRange({ ...priceRange, max: parseInt(text) || 1000 })}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.resetButton]}
              onPress={handleResetFilters}
            >
              <Text style={styles.resetButtonText}>Reset All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.applyButton]}
              onPress={handleApplyFilters}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => navigation.navigate('ItemDetails', { item })}
    >
      {item.images && item.images.length > 0 ? (
        <Image source={{ uri: item.images[0] }} style={styles.itemImage} />
      ) : (
        <View style={styles.noImage}>
          <Ionicons name="image-outline" size={40} color="#ccc" />
        </View>
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.itemPrice}>${item.price}</Text>
        <Text style={styles.itemCategory}>{item.category} • {item.condition}</Text>
        <Text style={styles.itemLocation}>{item.location}</Text>
        {item.detectedBrand && (
          <View style={styles.brandBadge}>
            <Text style={styles.brandText}>{item.detectedBrand.charAt(0).toUpperCase() + item.detectedBrand.slice(1)}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={handleSaveSearch}
          >
            <Ionicons name="bookmark-outline" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="options-outline" size={24} color="white" />
            {hasActiveFilters() && (
              <View style={styles.activeFilterIndicator} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search items..."
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchText('');
              loadItems();
            }}>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {hasActiveFilters() && (
        <View style={styles.activeFiltersContainer}>
          <Text style={styles.activeFiltersText}>Active Filters:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedCategory !== 'All' && (
              <View style={styles.activeFilterTag}>
                <Text style={styles.activeFilterTagText}>{selectedCategory}</Text>
                <TouchableOpacity onPress={() => { setSelectedCategory('All'); loadItems(); }}>
                  <Ionicons name="close" size={16} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            )}
            {selectedCondition !== 'All' && (
              <View style={styles.activeFilterTag}>
                <Text style={styles.activeFilterTagText}>{selectedCondition}</Text>
                <TouchableOpacity onPress={() => { setSelectedCondition('All'); loadItems(); }}>
                  <Ionicons name="close" size={16} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            )}
            {selectedBrand !== 'All' && (
              <View style={styles.activeFilterTag}>
                <Text style={styles.activeFilterTagText}>{selectedBrand}</Text>
                <TouchableOpacity onPress={() => { setSelectedBrand('All'); loadItems(); }}>
                  <Ionicons name="close" size={16} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            )}
            {selectedTimePosted !== 'All' && (
              <View style={styles.activeFilterTag}>
                <Text style={styles.activeFilterTagText}>{selectedTimePosted}</Text>
                <TouchableOpacity onPress={() => { setSelectedTimePosted('All'); loadItems(); }}>
                  <Ionicons name="close" size={16} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      <View style={styles.categoriesContainer}>
        <FlatList
          data={categories}
          renderItem={({ item }) => renderCategory(item)}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          {loading ? 'Loading...' : `${items.length} items found`}
        </Text>
        
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.itemsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#FF6B6B']} // Android
              tintColor="#FF6B6B" // iOS
              title="Pull to refresh..."
              titleColor="#666"
            />
          }
        />
      </View>

      {renderFilterModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FF6B6B',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
    marginLeft: 12,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    position: 'relative',
  },
  activeFilterIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
    marginRight: 12,
    color: '#1A1A1A',
  },
  categoriesContainer: {
    backgroundColor: 'white',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  categoriesList: {
    paddingHorizontal: 16,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  categoryButtonActive: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: 'white',
    fontWeight: '700',
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  resultsText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    fontWeight: '500',
  },
  itemsList: {
    paddingBottom: 16,
  },
  itemCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 6,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  itemImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#F8F9FA',
  },
  noImage: {
    width: '100%',
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  itemInfo: {
    padding: 12,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
    lineHeight: 18,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FF6B6B',
    marginBottom: 6,
  },
  itemCategory: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  itemLocation: {
    fontSize: 12,
    color: '#999',
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  brandText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1976D2',
    textTransform: 'uppercase',
  },
  activeFiltersContainer: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
  },
  activeFiltersText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 8,
  },
  activeFilterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  activeFilterTagText: {
    fontSize: 13,
    color: '#E65100',
    marginRight: 6,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxHeight: '60%',
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 16,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterOptionActive: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  filterOptionText: {
    fontSize: 12,
    color: '#666',
  },
  filterOptionTextActive: {
    color: 'white',
  },
  priceInputsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  priceInputWrapper: {
    flex: 1,
  },
  priceInputLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  priceInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  priceSeparator: {
    fontSize: 16,
    color: '#666',
    marginHorizontal: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  resetButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  applyButton: {
    backgroundColor: '#FF6B6B',
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});