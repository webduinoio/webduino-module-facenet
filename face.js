/**
 * face-api.js API: https://justadudewhohacks.github.io/face-api.js/docs/globals.html#euclideandistance
 * 2019-10 之前，原先的設計，只會載入載入某一種 model，所以承其設計，先不考慮一個畫面上，同時使用一個以上的 model
 */

+(function (factory) {

  if (typeof exports === 'undefined') {
    factory(webduino || {});
  } else {
    module.exports = factory;
  }
}(function (scope) {
  'use strict';
  var proto;
  var Module = scope.Module;

  const SSD_MOBILENETV1 = 'ssd_mobilenetv1';
  const TINY_FACE_DETECTOR = 'tiny_face_detector';
  const MTCNN = 'mtcnn';

  function toImage(imgBase64) {
    var img = new Image();
    img.src = imgBase64;
    return img;
  }

  async function handleImage(image) {
    let tmpData = ("" + image);
    let imageType = tmpData.substring(0, 4);
    let isBase64 = imageType === "data";
    let isURL = imageType === "http";
    let input = isURL ? await faceapi.fetchImage(image) : image;
    if (isBase64) {
      input = toImage(input);
    }
    return input;
  }

  function face(MODEL_URL) {
    console.log("MODEL_URL:", MODEL_URL);
    Module.call(this);
    this.MODEL_URL = MODEL_URL;
    this.processing = false;
    this.lastFaceDescriptor = [];
    this.detector = SSD_MOBILENETV1;
    this.lastFaceExpression = "";
    this.lastFaceDescriptor = [];

    // for debug
    this.debug = false;
    this.forwardTimes = []; // debug

    // ssd_mobilenetv1 options
    this.minConfidence = 0.5

    // tiny_face_detector options
    this.inputSize = 512
    this.scoreThreshold = 0.5

    //mtcnn options
    this.minFaceSize = 20
  }

  face.prototype = proto =
    Object.create(Module.prototype, {
      constructor: {
        value: face
      }
    });

  proto.euclideanDistance = async function (face1, face2) {
    if (typeof face1 === 'string') {
      face1 = face1.split(',').length == 128 ? JSON.parse("[" + face1 + "]") : this.getDescription(face1);
    }
    if (typeof face2 === 'string') {
      face2 = face2.split(',').length == 128 ? JSON.parse("[" + face2 + "]") : this.getDescription(face2);
    }
    try {
      return faceapi.euclideanDistance(face1, face2);
    } catch (e) {
      return 1;
    }
  };

  /**
   * 相容舊的寫法，取得特徵值或情緒
   *
   * @param {string | object} image
   * @param {boolean} detectEmotion
   * @returns {array | string}
   */
  proto.getDescription = async function (image, detectEmotion = false) {
    if (image == null) {
      return [];
    }
    if (this.processing) {
      return detectEmotion ? this.lastFaceExpression : this.lastFaceDescriptor;
    }
    this.processing = true;

    // 處理 input
    let tmpData = ("" + image);
    if (tmpData.split(',').length == 128) {
      return tmpData.split(',');
    }
    let input = await handleImage(image);

    // 開始偵測
    try {
      let self = this;
      let detectorOptions = this.getFaceDetectorOptions();
      let handler = {
        async expressions() {
          let result = await faceapi.detectSingleFace(input, detectorOptions).withFaceLandmarks().withFaceExpressions();
          if (result) {
            let expressions = result.expressions;
            let val = Object.keys(expressions).reduce((cur, key) => {
              cur = expressions[key] > expressions[cur] ? key : cur;
              return cur;
            }, 'neutral');
            return self.getEmotionMapping(val);
          }
          return "";
        },
        async descriptor() {
          let result = await faceapi.detectSingleFace(input, detectorOptions).withFaceLandmarks().withFaceDescriptor();
          if (result) {
            return result.descriptor;
          }
          return [];
        }
      };

      let data;
      this.processing = false;
      if (detectEmotion) {
        data = await handler.expressions();
        this.lastFaceExpression = data || this.lastFaceExpression;
      } else {
        data = await handler.descriptor();
        this.lastFaceDescriptor = data || this.lastFaceDescriptor;
      }

      return data;
    } catch(e) {
      console.log("face detect Error:", e);
      this.processing = false;
      return [];
    }
  };

  proto.fpsInfo = function (timeInMs) {
    if (this.debug) {
      this.forwardTimes = [timeInMs].concat(this.forwardTimes).slice(0, 30);
      const avgTimeInMs = this.forwardTimes.reduce((total, t) => total + t) / this.forwardTimes.length;
      console.log(`time: ${Math.round(avgTimeInMs)} ms, fps: ${faceapi.round(1000 / avgTimeInMs)}, `);
    }
  };

  proto.getEmotion = async function (image) {
    if (image == null) {
      return [];
    }
    if (this.processing) {
      return this.lastFaceExpression;
    }
    this.processing = true;

    // 處理 input
    let input = await handleImage(image);

    // 開始偵測
    try {
      let handler = async () => {
        let detectorOptions = this.getFaceDetectorOptions();

        const ts = Date.now();
        let result = await faceapi.detectSingleFace(input, detectorOptions).withFaceLandmarks().withFaceExpressions();
        this.fpsInfo(Date.now() - ts);

        if (result) {
          let expressions = result.expressions;
          let val = Object.keys(expressions).reduce((cur, key) => {
            cur = expressions[key] > expressions[cur] ? key : cur;
            return cur;
          }, 'neutral');
          return this.getEmotionMapping(val);
        }
        return "";
      };

      let data = await handler();
      this.lastFaceExpression = data || this.lastFaceExpression;
      this.processing = false;
      return data;

    } catch(e) {
      console.log("face expression detect Error:", e);
      this.processing = false;
      return [];
    }
  };

  /**
   * 原來是載入所有的 model
   * 從 2019-10 後，調整為載入指定的 model，但且設定為接下來使用的 model
   */
  proto.loadModel = async function (modelName) {
    console.log("load face model...", modelName);
    switch (modelName) {
      case TINY_FACE_DETECTOR:
        await faceapi.loadTinyFaceDetectorModel(this.MODEL_URL);
        this.detector = TINY_FACE_DETECTOR;
        break;

      case MTCNN:
        await faceapi.loadMtcnnModel(this.MODEL_URL);
        this.detector = MTCNN;
        break;

      default:
        await faceapi.loadSsdMobilenetv1Model(this.MODEL_URL);
        this.detector = SSD_MOBILENETV1;
        break;
    }
    await faceapi.loadFaceExpressionModel(this.MODEL_URL);
    await faceapi.loadFaceLandmarkModel(this.MODEL_URL);
    await faceapi.loadFaceRecognitionModel(this.MODEL_URL);
    console.log("done.");
  };

  proto.getFaceDetectorOptions = function () {
    if (this.detectorOptions) {
      return this.detectorOptions;
    }
    switch (this.detector) {
      case TINY_FACE_DETECTOR:
        this.detectorOptions = new faceapi.TinyFaceDetectorOptions({
          inputSize: this.inputSize,
          scoreThreshold: this.scoreThreshold
        });
        break;

      case MTCNN:
        this.detectorOptions = new faceapi.MtcnnOptions({
          minFaceSize: this.minFaceSize
        });
        break;

      case SSD_MOBILENETV1:
      default:
        this.detectorOptions = new faceapi.SsdMobilenetv1Options({
          minConfidence: this.minConfidence
        });
        break;
    }
    return this.detectorOptions;
  };

  /**
   * 新舊版本的情緒字串轉換
   * faceAPI 的情緒字串 ["angry", "disgusted", "fearful", "happy", "sad", "surprised", "neutral"]
   * 舊的字串 ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"]
   * @param {string} val
   * @return {string}
   */
  proto.getEmotionMapping = function (val) {
    let newString = ["angry", "disgusted", "fearful", "happy", "sad", "surprised", "neutral"];
    let oldString = ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"];
    let idx = newString.findIndex(str => str === val);
    return oldString[idx];
  };

  scope.module.face = face;
}));