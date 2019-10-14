var Webcam = (function () {

  class Webcam extends Camera {

    constructor(camType) {
      if (arguments.length == 0) {
        camType = 0;
      }
      super(camType);
      this.setCamType(camType);
      this.setFlip(false);
      this.autoScale = false;
      this.setRotate(0);
    }

    setAutoScale(autoScale) {
      this.autoScale = autoScale;
    }

    setCamType(camType) {
      this.cameraList = [];
      this.camType = 0;
      this.webCamSelect = camType;
    }

    setRotate(degrees) {
      this.rotate = degrees;
      return this;
    }

    setFlip(bool) {
      this.flip = bool;
      return this;
    }

    list(callback) {
      this.enumerateDevices(() => {
        callback(this.cameraList);
      });
    }

    async enumerateDevices(cb = function () {}) {
      try {
        let devices = await navigator.mediaDevices.enumerateDevices();
        this.gotDevices(devices);
        cb();
      } catch (err) {
        console.error(err);
        this.handleError && this.handleError(err);
      }
    }

    gotDevices(deviceInfos) {
      for (let i = 0; i !== deviceInfos.length; ++i) {
        let deviceInfo = deviceInfos[i];
        if (deviceInfo.kind === 'videoinput') {
          this.cameraList.push(deviceInfo);
        }
      }
    }

    async startCam() {
      await this.enumerateDevices();
      if (this.stream) {
        this.stream.getTracks().forEach(function (track) {
          track.stop();
        });
      }
      let deviceId = 0;
      try {
        deviceId = this.cameraList[this.webCamSelect].deviceId;
      } catch (e) {
        console.log("can't found camType:", this.camType, "error:", e);
        console.log(this.cameraList);
      }
      let constraints = {
        video: {
          deviceId: { exact: deviceId }
        }
      };
      try {
        let stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.stream = stream;
        if (this.video) {
          this.video.srcObject = stream;
        }
      } catch(err) {
        console.error(err);
      }
    }

    getEle(eleOrId) {
      return typeof eleOrId === 'object' ?
        eleOrId : document.getElementById(eleOrId);
    }

    onVideo(eleOrId, callback) {
      let video = this.getEle(eleOrId);
      video.autoplay = true;
      window.remoteVideo = this.video = this.getEle(eleOrId);
      this.rotateImg(this.rotate);
      this.startCam().then(callback);
      return this;
    }

    rotateImg(degrees) {
      if (!degrees) {
        this.video.style.transform = 'none';
        return this;
      }
      this.video.style.transform = `rotate(${degrees}deg)`;
      return this;
    }
  }
  return Webcam;
})();