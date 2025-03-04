const video = document.getElementById("video");

Promise.all([
  faceapi.nets.ssdMobilenetv1.loadFromUri("/src/webcam/models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("/src/webcam/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/src/webcam/models"),
])
  .then(startWebcam)
  .catch((error) => {
    console.error("Error loading face-api.js models:", error);
  });

function startWebcam() {
  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: false,
    })
    .then((stream) => {
      video.srcObject = stream;
    })
    .catch((error) => {
      console.error("Error accessing webcam:", error);
    });
}

async function getLabeledFaceDescriptions() {
  const labels = ["yassine", "mustpha", "mouheb"];

  return Promise.all(
    labels.map(async (label) => {
      const descriptions = [];
      try {
        const img = await faceapi.fetchImage(`./labels/${label}.jpg`);
        const detections = await faceapi
          .detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detections) {
          descriptions.push(detections.descriptor);
        } else {
          console.warn(`No face detected in image for ${label}.`);
        }
      } catch (error) {
        console.error(`Error loading image for ${label}:`, error);
      }
      return new faceapi.LabeledFaceDescriptors(label, descriptions);
    })
  );
}

video.addEventListener("play", async () => {
  const labeledFaceDescriptors = await getLabeledFaceDescriptions();
  console.log("Labeled Face Descriptors Loaded:", labeledFaceDescriptors);

  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.5);

  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);

  const displaySize = { width: video.videoWidth, height: video.videoHeight };
  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video)
      .withFaceLandmarks()
      .withFaceDescriptors();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

    let recognized = false;

    resizedDetections.forEach((detection) => {
      const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
      console.log("Best Match:", bestMatch);

      const box = detection.detection.box;

      let label = bestMatch.label;
      if (bestMatch.distance > 0.5) {
        label = "Unknown";
      } else {
        recognized = true;
      }

      const drawBox = new faceapi.draw.DrawBox(box, { label });
      drawBox.draw(canvas);
    });

    if (recognized) {
      window.location.href = "http://localhost:3000";
    }
  }, 1000);
});
