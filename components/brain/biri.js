import * as tf from '@tensorflow/tfjs';
import { bundleResourceIO,decodeJpeg} from '@tensorflow/tfjs-react-native';
import * as FileSystem from 'expo-file-system';

const modelJson = require('./model/model.json');
const modelWeights = require('./model/weights.bin');

async function loadModel() {
    await tf.ready();
    const model= await tf.loadLayersModel(
        bundleResourceIO(modelJson, modelWeights)
    ).catch((error) => {
        console.log('Error loading model:', error.message);
    });
    return model;
}

async function transformImageToTensor(uri){
    const img64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
    });
    const imgBuffer = tf.util.encodeString(img64, 'base64').buffer;
    const raw = new Uint8Array(imgBuffer);
    let imgTensor = decodeJpeg(raw);
    const scalar = tf.scalar(255);

    imgTensor = tf.image.resizeNearestNeighbor(imgTensor,[224,224]);
    const tensorScaled= imgTensor.div(scalar);

    const img = tf.reshape(tensorScaled,[1,224,224,3]);
    return img;
}

async function predict(batch, model, imageTensor) {
    if (!model) {
        throw new Error('Model is not loaded');
    }
    const prediction = model.predict(imageTensor);
    const pred= prediction.dataSync();
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
        console.error('Error in prediction:', error);
        throw error;
    }
}

export { loadModel, getPrediction };