import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, StyleSheet, Alert, Switch, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { collection, addDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

export default function PostScreen({ navigation }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [condition, setCondition] = useState('Good');
  const [photos, setPhotos] = useState([]);
  const [photoUrls, setPhotoUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [showPhotoInfo, setShowPhotoInfo] = useState(false);
  
  // SwipeIt-specific fields
  const [wantedItems, setWantedItems] = useState('');
  const [acceptsCash, setAcceptsCash] = useState(true);
  const [acceptsTrade, setAcceptsTrade] = useState(true);
  const [acceptsBarter, setAcceptsBarter] = useState(false);
  const [isOpenToAnything, setIsOpenToAnything] = useState(false);
  const [maxDistance, setMaxDistance] = useState('25');
  
  // Draft state
  const [isDraft, setIsDraft] = useState(false);

  const categories = ['Electronics', 'Clothing', 'Books', 'Sports', 'Home', 'Other'];
  const conditions = ['New', 'Like New', 'Good', 'Fair', 'Poor'];

  // Load draft on component mount
  useEffect(() => {
    loadDraft();
  }, []);

  // Auto-save draft when form changes
  useEffect(() => {
    if (title || description || price || estimatedValue || wantedItems || photos.length > 0) {
      saveDraft();
    }
  }, [title, description, price, estimatedValue, wantedItems, category, condition, photos]);

  // Draft management functions
  const saveDraft = async () => {
    try {
      const draftData = {
        title,
        description,
        price,
        estimatedValue,
        category,
        condition,
        photos: photos.map(p => p.uri),
        wantedItems,
        acceptsCash,
        acceptsTrade,
        acceptsBarter,
        isOpenToAnything,
        maxDistance,
        savedAt: new Date().toISOString(),
        isComplete: false
      };
      
      await AsyncStorage.setItem(`draft_${user?.uid}`, JSON.stringify(draftData));
      setIsDraft(true);
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const loadDraft = async () => {
    try {
      const draftJson = await AsyncStorage.getItem(`draft_${user?.uid}`);
      if (draftJson) {
        const draftData = JSON.parse(draftJson);
        setTitle(draftData.title || '');
        setDescription(draftData.description || '');
        setPrice(draftData.price || '');
        setEstimatedValue(draftData.estimatedValue || '');
        setCategory(draftData.category || 'Electronics');
        setCondition(draftData.condition || 'Good');
        if (draftData.photos && draftData.photos.length > 0) {
          setPhotos(draftData.photos.map(uri => ({ uri })));
        }
        setWantedItems(draftData.wantedItems || '');
        setAcceptsCash(draftData.acceptsCash !== undefined ? draftData.acceptsCash : true);
        setAcceptsTrade(draftData.acceptsTrade !== undefined ? draftData.acceptsTrade : true);
        setAcceptsBarter(draftData.acceptsBarter !== undefined ? draftData.acceptsBarter : false);
        setIsOpenToAnything(draftData.isOpenToAnything !== undefined ? draftData.isOpenToAnything : false);
        setMaxDistance(draftData.maxDistance || '25');
        setIsDraft(true);
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const clearDraft = async () => {
    try {
      await AsyncStorage.removeItem(`draft_${user?.uid}`);
      setIsDraft(false);
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  };

  // Photo upload functions
  const pickPhotos = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        aspect: [4, 3],
        quality: 0.8,
        maxResults: 3,
      });

      if (!result.canceled) {
        const selectedPhotos = result.assets.slice(0, 3); // Limit to 3 photos
        setPhotos(selectedPhotos);
      }
    } catch (error) {
      console.error('Error picking photos:', error);
      Alert.alert('Error', 'Failed to pick photos');
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setPhotos([...photos, result.assets[0]].slice(0, 3));
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const uploadPhotos = async () => {
    if (photos.length === 0) {
      Alert.alert('No Photos', 'Please add at least one photo');
      return null;
    }

    if (photos.length !== 3) {
      Alert.alert(
        'Photo Requirement',
        'Exactly 3 photos are required for item verification',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add More', onPress: pickPhotos }
        ]
      );
      return null;
    }

    setUploadingPhotos(true);
    try {
      const uploadedUrls = [];
      
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        
        // Convert URI to base64 using expo-file-system
        const base64 = await FileSystem.readAsStringAsync(photo.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        // Create a blob from base64
        const response = await fetch(`data:image/jpeg;base64,${base64}`);
        const blob = await response.blob();
        
        // Upload to Firebase Storage
        const filename = `${user.uid}_item_${Date.now()}_${i}.jpg`;
        const storageRef = ref(storage, `item_photos/${filename}`);
        
        const metadata = {
          contentType: 'image/jpeg',
          customMetadata: {
            uploadedBy: user.uid,
            uploadedAt: Date.now().toString()
          }
        };
        
        const snapshot = await uploadBytes(storageRef, blob, metadata);
        const downloadURL = await getDownloadURL(snapshot.ref);
        uploadedUrls.push(downloadURL);
      }
      
      setPhotoUrls(uploadedUrls);
      return uploadedUrls;
    } catch (error) {
      console.error('Error uploading photos:', error);
      Alert.alert('Error', 'Failed to upload photos. Please try again.');
      return null;
    } finally {
      setUploadingPhotos(false);
    }
  };

  const removePhoto = (index) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
  };

  // Sample image URLs for different categories (for testing without photos)
  const sampleImages = {
    Electronics: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500',
    Clothing: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500',
    Books: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500',
    Sports: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500',
    Home: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500',
    Other: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=500'
  };

  const handlePost = async () => {
    if (!title || !description || !price || !estimatedValue) {
      Alert.alert('Error', 'Please fill in all required fields including estimated trade value');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'Please login to post items');
      return;
    }

    // Make photos optional for testing (comment out the photo requirement check)
    // if (photos.length === 0) {
    //   Alert.alert(
    //     'Photos Required',
    //     'Please add exactly 3 photos for item verification',
    //     [
    //       { text: 'Cancel', style: 'cancel' },
    //       { text: 'Add Photos', onPress: pickPhotos }
    //     ]
    //   );
    //   return;
    // }

    // if (photos.length !== 3) {
    //   Alert.alert(
    //     'Photo Requirement',
    //     'Exactly 3 photos are required for item verification',
    //     [
    //       { text: 'Cancel', style: 'cancel' },
    //       { text: 'Add More', onPress: pickPhotos }
    //     ]
    //   );
    //   return;
    // }

    // Validate estimated value
    const priceNum = parseFloat(price);
    const valueNum = parseFloat(estimatedValue);
    
    if (isNaN(priceNum) || isNaN(valueNum)) {
      Alert.alert('Error', 'Please enter valid numbers for price and estimated value');
      return;
    }

    // Warn if values are very different
    const valueDifference = Math.abs(priceNum - valueNum) / Math.max(priceNum, valueNum);
    if (valueDifference > 0.5) {
      Alert.alert(
        'Value Check',
        `Your asking price ($${price}) and estimated trade value ($${estimatedValue}) are quite different. This might affect matching. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => proceedWithPost() }
        ]
      );
      return;
    }

    proceedWithPost();
  };

  const proceedWithPost = async () => {
    setLoading(true);
    try {
      // Upload photos if they exist, otherwise use placeholder
      let finalImageUrls = [];
      if (photos.length > 0) {
        const uploadedUrls = await uploadPhotos();
        if (!uploadedUrls) {
          setLoading(false);
          return;
        }
        finalImageUrls = uploadedUrls;
      } else {
        // Use placeholder image if no photos
        finalImageUrls = [sampleImages[category]];
      }

      // Use uploaded photo URLs or placeholder
      const finalImageUrlsToUse = finalImageUrls;

      // Process wanted items
      const wantedItemsList = wantedItems
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);

      // Create enhanced item document with SwipeIt features
      await addDoc(collection(db, 'items'), {
        // Basic item info
        title,
        description,
        price: parseFloat(price),
        estimatedValue: parseFloat(estimatedValue),
        category,
        condition,
        images: finalImageUrlsToUse,
        
        // User info
        userId: user.uid,
        userEmail: user.email,
        userName: user.name || 'Anonymous',
        location: user.location || 'Unknown',
        
        // SwipeIt-specific fields
        wantedItems: wantedItemsList,
        isOpenToAnything,
        tradePreferences: {
          acceptsCash,
          acceptsTrade,
          acceptsBarter,
          maxDistance: parseInt(maxDistance)
        },
        
        // Matching algorithm fields
        valueTolerancePercent: 20, // 20% tolerance for value matching
        priorityScore: 0, // Will be calculated by algorithm
        
        // Status and metadata
        status: 'available',
        createdAt: new Date(),
        views: 0,
        likes: 0,
        swipeRightCount: 0,
        swipeLeftCount: 0,
        
        // Draft completion
        isComplete: true,
        publishedAt: new Date()
      });

      // Clear draft after successful post
      await clearDraft();

      Alert.alert('Success', 'Item posted successfully! It will now appear in the discovery feed.', [
        { text: 'OK', onPress: () => {
          // Reset form
          setTitle('');
          setDescription('');
          setPrice('');
          setEstimatedValue('');
          setWantedItems('');
          setPhotos([]);
          setIsOpenToAnything(false);
          navigation.navigate('Home');
        }}
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to post item: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginPrompt}>
          <Text style={styles.loginText}>Please login to post items</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Post an Item</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="What are you selling?"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your item..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>Price *</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Estimated Trade Value * 🔄</Text>
          <TextInput
            style={styles.input}
            placeholder="What's this worth in trades? (e.g., 150.00)"
            value={estimatedValue}
            onChangeText={setEstimatedValue}
            keyboardType="numeric"
          />
          <Text style={styles.helpText}>
            This helps our algorithm find fair trades. Can be different from your asking price.
          </Text>

          <Text style={styles.label}>Category</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={category}
              onValueChange={setCategory}
              style={styles.picker}
            >
              {categories.map(cat => (
                <Picker.Item key={cat} label={cat} value={cat} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Condition</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={condition}
              onValueChange={setCondition}
              style={styles.picker}
            >
              {conditions.map(cond => (
                <Picker.Item key={cond} label={cond} value={cond} />
              ))}
            </Picker>
          </View>

          {/* Photo Upload Section */}
          <View style={styles.photoSection}>
            <View style={styles.photoHeader}>
              <Text style={styles.label}>Photos (Optional for Testing)</Text>
              <TouchableOpacity onPress={() => setShowPhotoInfo(true)}>
                <Ionicons name="information-circle" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.photoCount}>
              {photos.length}/3 photos (optional)
            </Text>

            <View style={styles.photoButtons}>
              <TouchableOpacity style={styles.photoButton} onPress={pickPhotos}>
                <Ionicons name="images" size={20} color="#666" />
                <Text style={styles.photoButtonText}>Pick from Gallery</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                <Ionicons name="camera" size={20} color="#666" />
                <Text style={styles.photoButtonText}>Take Photo</Text>
              </TouchableOpacity>
            </View>

            {photos.length > 0 && (
              <View style={styles.photoPreviewContainer}>
                {photos.map((photo, index) => (
                  <View key={index} style={styles.photoPreview}>
                    <Image source={{ uri: photo.uri }} style={styles.previewImage} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => removePhoto(index)}
                    >
                      <Ionicons name="close-circle" size={24} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {uploadingPhotos && (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="large" color="#FF6B6B" />
                <Text style={styles.uploadingText}>Uploading photos...</Text>
              </View>
            )}
          </View>

          {/* SwipeIt-specific fields */}
          <View style={styles.swipeItSection}>
            <Text style={styles.sectionTitle}>🎯 What Are You Looking For?</Text>
            
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Open to anything</Text>
              <Switch
                value={isOpenToAnything}
                onValueChange={setIsOpenToAnything}
                trackColor={{ false: '#767577', true: '#FF6B6B' }}
                thumbColor={isOpenToAnything ? '#fff' : '#f4f3f4'}
              />
            </View>

            {!isOpenToAnything && (
              <>
                <Text style={styles.label}>Wanted Items (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="What specific items are you looking for? (e.g., iPhone 13, Gaming Chair, Vintage Camera)"
                  value={wantedItems}
                  onChangeText={setWantedItems}
                  multiline
                  numberOfLines={3}
                />
                <Text style={styles.helpText}>
                  Separate multiple items with commas. Leave blank if you're open to offers.
                </Text>
              </>
            )}

            <Text style={styles.sectionTitle}>💱 Trade Preferences</Text>
            
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Accept cash offers</Text>
              <Switch
                value={acceptsCash}
                onValueChange={setAcceptsCash}
                trackColor={{ false: '#767577', true: '#4CAF50' }}
                thumbColor={acceptsCash ? '#fff' : '#f4f3f4'}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Accept item trades</Text>
              <Switch
                value={acceptsTrade}
                onValueChange={setAcceptsTrade}
                trackColor={{ false: '#767577', true: '#2196F3' }}
                thumbColor={acceptsTrade ? '#fff' : '#f4f3f4'}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Accept services/barter</Text>
              <Switch
                value={acceptsBarter}
                onValueChange={setAcceptsBarter}
                trackColor={{ false: '#767577', true: '#FF9500' }}
                thumbColor={acceptsBarter ? '#fff' : '#f4f3f4'}
              />
            </View>

            <Text style={styles.label}>Max Distance (miles)</Text>
            <TextInput
              style={styles.input}
              placeholder="25"
              value={maxDistance}
              onChangeText={setMaxDistance}
              keyboardType="numeric"
            />
            <Text style={styles.helpText}>
              How far are you willing to travel for a trade?
            </Text>

            {isDraft && (
              <View style={styles.draftIndicator}>
                <Ionicons name="save-outline" size={16} color="#FF9500" />
                <Text style={styles.draftText}>Draft saved automatically</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.postButton, loading && styles.buttonDisabled]}
            onPress={handlePost}
            disabled={loading}
          >
            <Text style={styles.postButtonText}>
              {loading ? 'Posting...' : 'Post Item'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Photo Info Modal */}
      <Modal
        visible={showPhotoInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoInfo(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Photo Requirements</Text>
            <Text style={styles.modalMessage}>
              To ensure item authenticity and build trust, we require exactly 3 photos for each item:
            </Text>
            <View style={styles.modalList}>
              <Text style={styles.modalListItem}>✓ Brand tag/label photo</Text>
              <Text style={styles.modalListItem}>✓ All angles (front, back, sides)</Text>
              <Text style={styles.modalListItem}>✓ Clear, well-lit photos</Text>
              <Text style={styles.modalListItem}>✓ Show any defects clearly</Text>
            </View>
            <Text style={styles.modalNote}>
              Photos help buyers verify the item's condition and authenticity.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowPhotoInfo(false)}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#FF6B6B',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  picker: {
    height: 50,
  },
  sampleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
    marginTop: 8,
  },
  sampleButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
    marginLeft: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  imagePreview: {
    marginTop: 16,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  postButton: {
    backgroundColor: '#FF6B6B',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  postButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  loginPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  // Photo upload styles
  photoSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  photoButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  photoPreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoPreview: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  uploadingText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 24,
  },
  modalList: {
    marginBottom: 16,
  },
  modalListItem: {
    fontSize: 15,
    color: '#333',
    marginBottom: 8,
  },
  modalNote: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#FF6B6B',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // SwipeIt-specific styles
  swipeItSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    marginTop: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  draftIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 8,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  draftText: {
    fontSize: 14,
    color: '#856404',
    marginLeft: 8,
  },
});