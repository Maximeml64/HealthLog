// src/components/PhotoPicker.tsx

import React from 'react';
import {
  Image,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as PhotoService from '../services/PhotoService';
import { Colors, Spacing, Radius } from '../utils/theme';

interface PhotoPickerProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
}

export const PhotoPicker: React.FC<PhotoPickerProps> = ({
  photos,
  onChange,
  maxPhotos = 5,
}) => {
  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission refusée',
        "L'accès à la caméra est nécessaire pour prendre une photo."
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      const saved = await PhotoService.savePhoto(result.assets[0].uri);
      onChange([...photos, saved]);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission refusée',
        "L'accès à la galerie est nécessaire pour choisir une photo."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      const saved = await PhotoService.savePhoto(result.assets[0].uri);
      onChange([...photos, saved]);
    }
  };

  const handleAdd = () => {
    Alert.alert('Ajouter une photo', undefined, [
      { text: 'Prendre une photo', onPress: pickFromCamera },
      { text: 'Choisir dans la galerie', onPress: pickFromGallery },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const handleTap = (uri: string) => {
    Alert.alert('Photo', undefined, [
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await PhotoService.deletePhoto(uri);
          onChange(photos.filter((p) => p !== uri));
        },
      },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {photos.map((uri) => (
        <TouchableOpacity key={uri} onPress={() => handleTap(uri)} style={styles.thumb}>
          <Image source={{ uri }} style={styles.thumbImage} resizeMode="cover" />
        </TouchableOpacity>
      ))}
      {photos.length < maxPhotos && (
        <TouchableOpacity onPress={handleAdd} style={styles.addBtn} activeOpacity={0.7}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: Spacing.xs },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  thumbImage: { width: 80, height: 80 },
  addBtn: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceAlt,
  },
  addBtnText: { fontSize: 28, color: Colors.textMuted },
});
