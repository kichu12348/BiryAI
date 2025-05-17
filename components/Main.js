import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Pressable,
  ActivityIndicator,
  ImageBackground,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { loadModel, getPrediction } from "./brain/biri";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import * as SplashScreen from "expo-splash-screen";
import { colors } from "./constants/colors";
import {
  Entypo,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import Animated, {
  Easing,
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from "react-native-reanimated";

const { width, height: ScreenHeight } = Dimensions.get("window");

const Main = () => {
  const [isModelReady, setIsModelReady] = useState(false);
  const modelRef = useRef(null);
  const [imageUri, setImageUri] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [isBottomBarExpanded, setIsBottomBarExpanded] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [Permission, requestPermision] = useCameraPermissions();
  const [isFocusing, setIsFocusing] = useState(false);
  const [isTakingPicture, setIsTakingPicture] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isBiryani, setIsBiryani] = useState(false);
  const [focusSquareLocation, setFocusSquareLocation] = useState({
    x: 0,
    y: 0,
  });

  const cameraRef = useRef(null);

  const insets = useSafeAreaInsets();
  const height = useSharedValue(0);
  const borderRadius = useSharedValue(30);
  const animatedStyle = useAnimatedStyle(() => {
    return {
      minHeight: height.value,
      borderTopEndRadius: borderRadius.value,
      borderTopStartRadius: borderRadius.value,
    };
  });

  const expandBottomBar = () => {
    if (isBottomBarExpanded) return;
    setIsBottomBarExpanded(true);
    height.value = withTiming(ScreenHeight, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
    borderRadius.value = withTiming(0, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
  };

  const collapseBottomBar = () => {
    if (!isBottomBarExpanded) return;
    setIsBottomBarExpanded(false);
    height.value = withTiming(100, {
      duration: 300,
      easing: Easing.inOut(Easing.ease),
    });
    borderRadius.value = withTiming(30, {
      duration: 300,
      easing: Easing.inOut(Easing.ease),
    });
    setTimeout(() => {
      setImageUri(null);
      setPrediction(null);
      setError(null);
    }, 300);
  };

  useEffect(() => {
    loadModel()
      .then((model) => {
        modelRef.current = model;
        setIsModelReady(true);
        SplashScreen.hideAsync();
      })
      .catch((error) => {
        console.log("Error loading model:", error.message);
        setError("Failed to load the model");
      });
  }, []);

  async function convertImageToJpeg(uri) {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: 224,
            height: 224,
          },
        },
      ],
      {
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    return result.uri;
  }

  const handlePressLocation = (event) => {
    const { locationX, locationY } = event.nativeEvent;
    setFocusSquareLocation({ x: locationX, y: locationY });
    setIsFocusing(true);

    setTimeout(() => {
      setIsFocusing(false);
    }, 1000);
  };

  const handleTakePicture = async () => {
    if (!isCameraReady || isTakingPicture) return;
    setIsTakingPicture(true);
    const photo = await cameraRef?.current?.takePictureAsync({
      quality: 1,
      imageType: "jpg",
    });
    setIsTakingPicture(false);
    if (photo.uri) {
      setImageUri(photo.uri);
      expandBottomBar();
      setPrediction(null);
      setError(null);
    }
  };

  const handleImageProcessing = async (imgUri) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setPrediction(null);
    setError(null);
    try {
      const uri = await convertImageToJpeg(imgUri);
      const pred = await getPrediction(uri, modelRef.current);
      setPrediction(pred);
      setIsBiryani(pred[0] > pred[1]);
    } catch (error) {
      console.log("Error getting prediction:", error.message);
      setError("Failed to process the image " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImagePicker = async () => {
    try {
      if (isTakingPicture) return;
      setIsTakingPicture(true);
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        alert("Permission to access camera roll is required!");
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        aspect: [4, 3],
        quality: 1,
      });

      if (
        !pickerResult.canceled &&
        pickerResult.assets &&
        pickerResult.assets.length > 0
      ) {
        const asset = pickerResult.assets[0];
        setImageUri(asset.uri);
        expandBottomBar();
        setPrediction(null);
        setError(null);
      }
    } catch (error) {
      console.error("Error in image picker:", error);
      setError("An unexpected error occurred");
      setIsProcessing(false);
    } finally {
      setIsTakingPicture(false);
    }
  };

  const handleTorchToggle = () => {
    if (!isCameraReady) return;
    setIsTorchOn((prev) => !prev);
  };

  if (!Permission?.granted) {
    return (
      <View style={styles.noPerContainer}>
        <TouchableOpacity
          onPress={requestPermision}
          style={styles.button}
          activeOpacity={0.8}
        >
          <LinearGradient
            // colors={["#FF0046", "#FF4D00"]}
            colors={[colors.primary, colors.secondary]}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Text style={styles.btnText}>Grant Permission</Text>
          <Entypo name="camera" size={24} color="white" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        cameraMode="picture"
        FocusMode={isFocusing ? "on" : "off"}
        FlashMode={isTorchOn ? "on" : "off"}
        onCameraReady={() => setIsCameraReady(true)}
        ref={cameraRef}
      />
      <View style={styles.cameraControlContainer}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handlePressLocation}
        />
        {isFocusing && (
          <View
            style={[
              styles.focusCircle,
              {
                top: focusSquareLocation.y - 20,
                left: focusSquareLocation.x - 20,
              },
            ]}
          />
        )}
        <Animated.View
          style={[
            styles.cameraControls,
            animatedStyle,
            { paddingBottom: insets.bottom + 20 },
          ]}
        >
          <BlurView
            intensity={30}
            style={StyleSheet.absoluteFill}
            tint="dark"
            experimentalBlurMethod="dimezisBlurView"
            blurReductionFactor={12}
          />
          {!isBottomBarExpanded ? (
            <>
              <TouchableOpacity
                style={styles.controlBtn}
                onPress={handleImagePicker}
                activeOpacity={0.8}
              >
                <MaterialIcons name="insert-photo" size={40} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.controlBtn}
                onPress={handleTakePicture}
                disabled={isTakingPicture}
                activeOpacity={0.5}
              >
                <Ionicons
                  name="radio-button-on-sharp"
                  size={80}
                  color="white"
                />
              </TouchableOpacity>
              <View style={styles.controlBtn}/>
              {/* <TouchableOpacity
                style={[
                  styles.controlBtn,
                  {
                    position: "relative",
                  },
                ]}
                onPress={handleTorchToggle}
                activeOpacity={0.8}
              >
                {isTorchOn && <View style={styles.torchOn} />}
                <MaterialIcons
                  name="flashlight-on"
                  size={35}
                  color="white"
                  style={{
                    zIndex: 10,
                  }}
                />
              </TouchableOpacity> */}
            </>
          ) : (
            <View
              style={[
                styles.bottomBarExpandedContainer,
                { paddingTop: insets.top },
              ]}
            >
              <View style={styles.bottomBarExpandedHeader}>
                <TouchableOpacity
                  onPress={collapseBottomBar}
                  style={styles.controlBtn}
                  activeOpacity={0.8}
                >
                  <Entypo name="cross" size={40} color="white" />
                </TouchableOpacity>
              </View>
              {imageUri && (
                <View style={styles.bottomBarExpandedContent}>
                  <ImageBackground
                    source={{ uri: imageUri }}
                    style={styles.bottomBarExpandedImage}
                    resizeMode="contain"
                  >
                    {prediction && (
                      <View style={styles.predictionOverLay}>
                        <Text style={styles.predictionText}>
                          {isBiryani
                            ? "Dis is a Biryani!😎"
                            : "Dat not a Biryani😞"}
                        </Text>
                        <Text style={styles.predictionTextSecondary}>
                          {isBiryani
                            ? `Biryani: ${(prediction[0] * 100).toFixed(2)}%`
                            : `Not Biryani: ${(prediction[1] * 100).toFixed(
                                2
                              )}%`}
                        </Text>
                      </View>
                    )}
                  </ImageBackground>
                  <TouchableOpacity
                    onPress={() => {
                      handleImageProcessing(imageUri);
                    }}
                    style={styles.button}
                    activeOpacity={0.8}
                    disabled={isProcessing}
                  >
                    <LinearGradient
                      colors={[colors.primary, colors.secondary]}
                      style={styles.buttonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                    {!isProcessing ? (
                      <>
                        <Text style={styles.btnText}>Check If Biryani</Text>
                        <MaterialCommunityIcons
                          name="image-search"
                          size={24}
                          color="white"
                        />
                      </>
                    ) : (
                      <ActivityIndicator
                        size="small"
                        color={colors.textPrimary}
                        style={{ marginLeft: 10 }}
                      />
                    )}
                  </TouchableOpacity>
                  {error && <Text style={styles.errorText}>{error}</Text>}
                </View>
              )}
            </View>
          )}
        </Animated.View>
      </View>
    </View>
  );
};

export default Main;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  noPerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    padding: 20,
  },
  text: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  buttonGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    ...StyleSheet.absoluteFillObject,
  },
  button: {
    marginTop: 20,
    padding: 15,
    borderRadius: 35,
    minWidth: 200,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 20,
    position: "relative",
    overflow: "hidden",
  },
  btnText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  cameraControlContainer: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    position: "relative",
  },
  cameraControls: {
    width,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 10,
    position: "relative",
  },
  controlBtn: {
    minWidth: 50,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  focusCircle: {
    position: "absolute",
    zIndex: 10,
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: colors.textPrimary,
  },
  bottomBarExpandedContainer: {
    height: "100%",
    width: "100%",
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  bottomBarExpandedHeader: {
    height: 50,
    width: "100%",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 5,
  },
  bottomBarExpandedContent: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-start",
    alignItems: "center",
    marginTop: 20,
  },
  bottomBarExpandedImage: {
    width: "100%",
    height: "80%",
    alignItems: "center",
    justifyContent: "center",
  },
  torchOn: {
    position: "absolute",
    top: "5%",
    left: 0,
    backgroundColor: colors.secondary,
    borderRadius: 50,
    height: 10,
    width: 18,
    alignSelf: "center",
    transform: [{ translateX: "88%" }],
    zIndex: 1,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 1,
    shadowRadius: 5.84,
    elevation: 5,
  },
  errorText: {
    color: colors.danger,
    fontSize: 24,
    textAlign: "center",
    marginTop: 10,
  },
  predictionOverLay: {
    justifyContent: "center",
    alignItems: "center",
    height: "30%",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    maxWidth: "90%",
    zIndex: 10,
    borderRadius: 10,
    transform: [{ translateY: -50 }],
    padding: 10,
    gap: 10,
  },
  predictionText: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  predictionTextSecondary: {
    color: colors.textSecondary,
    fontSize: 18,
    textAlign: "center",
  },
});
