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

    // onCanvas(eleOrId, callback) {
    //   var self = this;
    //   var canvas = self.getEle(eleOrId);
    //   self.canvas = canvas;
    //   self.ctx = canvas.getContext("2d");

    //   this.buttonTrigger(canvas, function () {
    //     self.startCam();
    //     var video = self.createVideo();
    //     window.remoteVideo = self.video = video;
    //     video.onloadeddata = function () {
    //       var loop = function () {
    //         self.rotateImg(video, canvas, self.rotate, true);
    //         if (typeof callback == 'function') {
    //           callback(canvas, video);
    //         }
    //         requestAnimationFrame(loop);
    //       }
    //       requestAnimationFrame(loop);
    //     }
    //   });
    //   return this;
    // }

    // toVideo(eleOrId) {
    //   var self = this;
    //   window.remoteVideo = self.video = this.getEle(eleOrId);
    //   this.buttonTrigger(self.video, function () {
    //     self.startCam();
    //   });
    // }

    // createVideo() {
    //   var video = document.createElement('video');
    //   video.autoplay = true;
    //   return video;
    // }

    rotateImg(degrees) {
      if (!degrees) {
        this.video.style.transform = 'none';
        return this;
      }
      this.video.style.transform = `rotate(${degrees}deg)`;
      return this;
    }


    // drawImg(i, c, isVideo) {
    //   var ctx = c.getContext("2d");
    //   var iw = isVideo ? i.videoWidth : i.naturalWidth;
    //   var ih = isVideo ? i.videoHeight : i.naturalHeight;
    //   var cw = c.width;
    //   var ch = c.height;
    //   var sx = 0;
    //   var sy = 0;
    //   var cRatio = cw / ch;
    //   if (iw >= ih) {
    //     sx = (iw - (ih * cRatio)) / 2;
    //     iw = ih * cRatio;
    //   } else {
    //     sy = (ih - (iw * cRatio)) / 2;
    //     ih = iw * cRatio;
    //   }
    //   ctx.drawImage(i, sx, sy, iw, ih, 0, 0, cw, ch);
    // }

    // buttonTrigger(ele, callback) {
    //   if (this.camType != 0 && this.camType != jpgCam && this.camType != imgStreamCam) {
    //     var btn = document.createElement("BUTTON");
    //     btn.setAttribute("style", "background-color: #e0f0e0;position: fixed;z-index:2;top:5px;left:5px;font-size:96px");
    //     document.getElementsByTagName("body")[0].append(btn);
    //     var rect = ele.getBoundingClientRect();
    //     btn.style.top = rect.top;
    //     btn.style.left = rect.left;
    //     btn.style.width = rect.width;
    //     btn.style.height = rect.height;
    //     btn.innerHTML = "Start Camera";
    //     btn.addEventListener('click', function (e) {
    //       btn.parentNode.removeChild(btn);
    //       callback();
    //     });
    //   } else {
    //     callback();
    //   }
    // }

    // upload(url) {
    //   this.canvas.toBlob(
    //     function (blob) {
    //       var fd = new FormData();
    //       fd.append('file', blob, "img.jpg");
    //       fetch(url, {
    //         method: 'POST',
    //         mode: 'cors',
    //         body: fd
    //       }).then(res => {
    //         console.log("upload res:", res.status);
    //       });
    //     }, 'image/jpeg');
    // }
  }
  return Webcam;
})();