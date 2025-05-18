import * as tf from "@tensorflow/tfjs";
import { decodeJpeg } from "@tensorflow/tfjs-react-native";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";

const modelWeights =
  "https://cdn.jsdelivr.net/gh/kichu12348/BiryAI@master/assets/model/weights.bin";
const modelJson =
  "https://cdn.jsdelivr.net/gh/kichu12348/BiryAI@master/assets/model/model.json";

async function downloadAndCacheModel() {
  try {
    async function downloadFile() {
      const fileDir = FileSystem.documentDirectory;
      const modelJsonUri = `${fileDir}model.json`;
      const modelWeightsUri = `${fileDir}weights.bin`;
      const { uri } = await FileSystem.downloadAsync(modelJson, modelJsonUri);
      await FileSystem.downloadAsync(modelWeights, modelWeightsUri);
      await AsyncStorage.setItem("modelJson", uri);
      return uri;
    }
    const modelJsonUri = await AsyncStorage.getItem("modelJson");
    if (!modelJsonUri) {
      const uri = await downloadFile();
      return uri;
    }

    return modelJsonUri;
  } catch (error) {
    console.error("Error downloading model:", error);
    throw error;
  }
}

async function loadModel() {
  try {
    await tf.ready();
    const modelJsonUri = await downloadAndCacheModel();
    const model = await tf.loadLayersModel(modelJsonUri);
    return model;
  } catch (error) {
    console.error("Error loading model:", error);
    throw error;
  }
}

async function transformImageToTensor(uri) {
  const img64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const imgBuffer = tf.util.encodeString(img64, "base64").buffer;
  const raw = new Uint8Array(imgBuffer);
  let imgTensor = decodeJpeg(raw);
  const scalar = tf.scalar(255);

  imgTensor = tf.image.resizeNearestNeighbor(imgTensor, [224, 224]);
  const tensorScaled = imgTensor.div(scalar);

  const img = tf.reshape(tensorScaled, [1, 224, 224, 3]);
  return img;
}

async function predict(batch, model, imageTensor) {
  if (!model) {
    throw new Error("Model is not loaded");
  }
  const prediction = model.predict(imageTensor);
  const pred = prediction.dataSync();
  prediction.dispose();
  return pred;
}

async function getPrediction(uri, model) {
  try {
    const imageTensor = await transformImageToTensor(uri);
    const prediction = await predict(1, model, imageTensor);

    tf.dispose(imageTensor);

    return prediction;
  } catch (error) {
    console.error("Error in prediction:", error);
    throw error;
  }
}

export { loadModel, getPrediction };
