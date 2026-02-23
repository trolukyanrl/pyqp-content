import React, { useState, useEffect } from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  TextInput,
  ActivityIndicator, 
  Platform,
  Alert,
  KeyboardAvoidingView,
  Text,
  Dimensions
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import TextCustom from '../../components/TextCustom';
import AdminTabBar from '../../components/AdminTabBar';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { database, storage } from '../../../lib/appwriteConfig';
import { ID, Query, Models } from 'react-native-appwrite';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Picker } from '@react-native-picker/picker';

// Get screen dimensions
const screenHeight = Dimensions.get('window').height;

// Appwrite config constants
const DATABASE_ID = '67f3615a0027484c95d5';
const COLLECTION_ID = '67f630fb0019582e45ac'; // Exams collection
const VIDEOS_COLLECTION_ID = '6825ae40002771eaf8c0'; // Videos collection
const BUCKET_ID = '6805d851000f17ea756f';

// 2GB in bytes
const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024;

interface Exam extends Models.Document {
  $id: string;
  name: string;
}

interface VideoFormData {
  title: string;
  description: string;
  examId: string;
  subject: string;
  thumbnailUri?: string;
  videoUri?: string;
  videoName?: string;
  videoSize?: number;
  videoType?: string;
}

const AddVideoLectureScreen: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<VideoFormData>({
    title: '',
    description: '',
    examId: '',
    subject: '',
  });
  const [exams, setExams] = useState<Exam[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [thumbnailResponse, setThumbnailResponse] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [videoPickerResponse, setVideoPickerResponse] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setIsLoading(true);
    try {
      const response = await database.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [Query.orderDesc('$createdAt')]
      );
      
      // Cast the documents to Exam type
      setExams(response.documents as unknown as Exam[]);
      
      // Set default exam if available
      if (response.documents.length > 0) {
        setFormData(prev => ({
          ...prev,
          examId: response.documents[0].$id
        }));
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
      Alert.alert('Error', 'Failed to load exams. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof VideoFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const pickThumbnail = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'You need to grant permission to access your photos');
        return;
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        setThumbnailResponse(selectedAsset);
        setFormData(prev => ({
          ...prev,
          thumbnailUri: selectedAsset.uri
        }));
      }
    } catch (error) {
      console.error('Error picking thumbnail:', error);
      Alert.alert('Error', 'Failed to pick thumbnail. Please try again.');
    }
  };

  const pickVideo = async () => {
    try {
      // Launch document picker for video
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });
      
      if (result.canceled === false && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        
        // Check file size (limit to 2GB)
        if (selectedAsset.size && selectedAsset.size > MAX_VIDEO_SIZE) {
          Alert.alert('File Too Large', 'Please select a video smaller than 2GB');
          return;
        }
        
        setVideoPickerResponse(selectedAsset);
        setFormData(prev => ({
          ...prev,
          videoUri: selectedAsset.uri,
          videoName: selectedAsset.name,
          videoSize: selectedAsset.size || 0,
          videoType: selectedAsset.mimeType
        }));
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video. Please try again.');
    }
  };

  const handleSubmit = async () => {
    // Validate form
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Video title is required');
      return;
    }
    
    if (!formData.examId) {
      Alert.alert('Error', 'Please select an exam');
      return;
    }

    if (!formData.subject.trim()) {
      Alert.alert('Error', 'Subject is required');
      return;
    }
    
    if (!formData.thumbnailUri) {
      Alert.alert('Error', 'Thumbnail image is required');
      return;
    }
    
    if (!formData.videoUri) {
      Alert.alert('Error', 'Video file is required');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let thumbnailId = null;
      let videoId = null;
      
      // Upload thumbnail
      if (thumbnailResponse && formData.thumbnailUri) {
        try {
          const fileId = ID.unique();
          const fileInfo = await FileSystem.getInfoAsync(formData.thumbnailUri);
          
          if (fileInfo.exists) {
            await storage.createFile(
              BUCKET_ID,
              fileId,
              {
                name: thumbnailResponse.fileName || `video_thumbnail_${Date.now()}.jpg`,
                type: thumbnailResponse.mimeType || 'image/jpeg',
                size: fileInfo.size,
                uri: formData.thumbnailUri
              }
            );
            
            thumbnailId = fileId;
          }
        } catch (uploadError) {
          console.error('Error uploading thumbnail:', uploadError);
          Alert.alert('Error', 'Failed to upload thumbnail. Please try again.');
          setIsSubmitting(false);
          return;
        }
      }
      
      // Upload video
      if (videoPickerResponse && formData.videoUri) {
        try {
          const fileId = ID.unique();
          
          await storage.createFile(
            BUCKET_ID,
            fileId,
            {
              name: formData.videoName || `video_${Date.now()}.mp4`,
              type: formData.videoType || 'video/mp4',
              size: formData.videoSize || 0,
              uri: formData.videoUri
            }
          );
          
          videoId = fileId;
        } catch (uploadError) {
          console.error('Error uploading video:', uploadError);
          Alert.alert('Error', 'Failed to upload video. Please try again.');
          setIsSubmitting(false);
          return;
        }
      }
      
      // Create video document
      const videoData = {
        title: formData.title,
        description: formData.description || '',
        examId: formData.examId,
        subject: formData.subject,
        thumbnailId: thumbnailId,
        videoId: videoId,
        createdBy: user?.$id || 'unknown',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: 0,
        duration: 0, // This would be calculated server-side or from the video metadata
        isActive: true
      };
      
      // Save video to database
      await database.createDocument(
        DATABASE_ID,
        VIDEOS_COLLECTION_ID,
        ID.unique(),
        videoData
      );
      
      Alert.alert(
        'Success', 
        'Video lecture added successfully!',
        [
          { 
            text: 'OK', 
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Error adding video lecture:', error);
      Alert.alert('Error', 'Failed to add video lecture. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6B46C1" />
        <TextCustom style={styles.loadingText}>Loading exams...</TextCustom>
      </View>
    );
  }

  return (
    <View style={styles.safeContainer}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={20} color="#333" />
        </TouchableOpacity>
        <TextCustom style={styles.headerTitle}>Add Video Lecture</TextCustom>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        bounces={true}
      >
        <View style={styles.formContainer}>
          {/* Exam Selection */}
          <View style={styles.inputGroup}>
            <TextCustom style={styles.label}>Select Exam*</TextCustom>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.examId}
                onValueChange={(itemValue) => handleChange('examId', itemValue)}
                style={styles.picker}
              >
                {exams.map((exam) => (
                  <Picker.Item key={exam.$id} label={exam.name} value={exam.$id} />
                ))}
              </Picker>
            </View>
          </View>
          
          {/* Subject Field */}
          <View style={styles.inputGroup}>
            <TextCustom style={styles.label}>Subject*</TextCustom>
            <TextInput
              style={styles.input}
              value={formData.subject}
              onChangeText={(text) => handleChange('subject', text)}
              placeholder="Enter subject name"
              placeholderTextColor="#999"
            />
          </View>
          
          {/* Video Title */}
          <View style={styles.inputGroup}>
            <TextCustom style={styles.label}>Video Title*</TextCustom>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(text) => handleChange('title', text)}
              placeholder="Enter video title"
              placeholderTextColor="#999"
            />
          </View>
          
          {/* Description */}
          <View style={styles.inputGroup}>
            <TextCustom style={styles.label}>Description</TextCustom>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => handleChange('description', text)}
              placeholder="Enter video description"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
          
          {/* Thumbnail Upload */}
          <View style={styles.inputGroup}>
            <TextCustom style={styles.label}>Thumbnail Image*</TextCustom>
            <TouchableOpacity
              style={styles.thumbnailPickerButton}
              onPress={pickThumbnail}
            >
              {formData.thumbnailUri ? (
                <Image 
                  source={{ uri: formData.thumbnailUri }} 
                  style={styles.thumbnailPreview} 
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.placeholderContainer}>
                  <FontAwesome name="image" size={24} color="#666" />
                  <TextCustom style={styles.placeholderText}>
                    Upload Thumbnail (16:9 recommended)
                  </TextCustom>
                </View>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Video Upload */}
          <View style={styles.inputGroup}>
            <TextCustom style={styles.label}>Video File*</TextCustom>
            <TouchableOpacity
              style={styles.videoPickerButton}
              onPress={pickVideo}
            >
              {formData.videoUri ? (
                <View style={styles.videoInfoContainer}>
                  <View style={styles.videoIconContainer}>
                    <FontAwesome name="file-video-o" size={24} color="#fff" />
                  </View>
                  <View style={styles.videoDetails}>
                    <TextCustom style={styles.videoFileName}>
                      {formData.videoName || "Selected video"}
                    </TextCustom>
                    <TextCustom style={styles.videoFileSize}>
                      {formData.videoSize 
                        ? `${(formData.videoSize / (1024 * 1024)).toFixed(2)} MB` 
                        : ""}
                    </TextCustom>
                  </View>
                  <TouchableOpacity 
                    style={styles.changeButton}
                    onPress={pickVideo}
                  >
                    <TextCustom style={styles.changeButtonText}>Change</TextCustom>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.placeholderContainer}>
                  <FontAwesome name="file-video-o" size={24} color="#666" />
                  <TextCustom style={styles.placeholderText}>
                    Upload Video File (Max 2GB)
                  </TextCustom>
                </View>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Spacer to ensure content isn't hidden behind fixed buttons */}
          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      {/* Fixed Submit Button */}
      <View style={styles.fixedButtonContainer}>
        <TouchableOpacity
          style={[styles.fixedSubmitButton, isSubmitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <FontAwesome name="save" size={18} color="#fff" />
              <TextCustom style={styles.submitButtonText}>
                Save Video Lecture
              </TextCustom>
            </>
          )}
        </TouchableOpacity>
      </View>

      <AdminTabBar activeTab="manage" />
    </View>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Padding for bottom tab bar and fixed button
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    zIndex: 10,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  formContainer: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 100,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  thumbnailPickerButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
    height: 180,
  },
  thumbnailPreview: {
    width: '100%',
    height: '100%',
  },
  videoPickerButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  placeholderContainer: {
    height: '100%',
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  placeholderText: {
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  videoInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  videoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6B46C1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  videoDetails: {
    flex: 1,
  },
  videoFileName: {
    fontSize: 14,
    color: '#333',
  },
  videoFileSize: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  changeButton: {
    backgroundColor: '#6B46C1',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  changeButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  disabledButton: {
    opacity: 0.7,
  },
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 70, // Position above the tab bar
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(245, 245, 245, 0.9)', // Semi-transparent background
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    zIndex: 999,
  },
  fixedSubmitButton: {
    backgroundColor: '#6B46C1',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  bottomSpacer: {
    height: 60, // Additional space at the bottom to prevent content being hidden
  },
});

export default AddVideoLectureScreen; 
