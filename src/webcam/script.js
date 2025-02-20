const video = document.getElementById("video");

Promise.all([
  faceapi.nets.ssdMobilenetv1.loadFromUri("/src/webcam/models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("/src/webcam/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/src/webcam/models"),
]).then(startWebcam);

function startWebcam() {
  navigator.mediaDevices
    .getUserMedia({ video: true, audio: false })
    .then((stream) => {
      video.srcObject = stream;
    })
    .catch((error) => {
      console.error(error);
    });
}

async function getLabeledFaceDescriptions() {
  const labels = ["nassim"]; // Nom du dossier contenant les photos
  return Promise.all(
    labels.map(async (label) => {
      const descriptions = [];
      for (let i = 1; i <= 3; i++) {
        // Charge plusieurs images
        try {
          const img = await faceapi.fetchImage(
            `./assets/${label}/${label}${i}.jpg`
          );
          const detections = await faceapi
            .detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();
          if (detections) {
            descriptions.push(detections.descriptor);
          }
        } catch (error) {
          console.warn(`Erreur de chargement pour ${label}${i}.jpg`);
        }
      }
      return new faceapi.LabeledFaceDescriptors(label, descriptions);
    })
  );
}

video.addEventListener("play", async () => {
  const labeledFaceDescriptors = await getLabeledFaceDescriptions();
  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6); // Tolérance ajustable

  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);

  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video)
      .withFaceLandmarks()
      .withFaceDescriptors();
    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

    const results = resizedDetections.map((d) =>
      faceMatcher.findBestMatch(d.descriptor)
    );

    results.forEach((result, i) => {
      const box = resizedDetections[i].detection.box;
      const label =
        result.label === "unknown"
          ? "Visage inconnu ❌"
          : `✅ Reconnu : ${result.label}`;

      if (result.label === "unknown") {
        alert("⚠ Visage inconnu !");
      } else {
        alert(`🎉 Visage reconnu : ${result.label}`);
      }

      new faceapi.draw.DrawBox(box, { label }).draw(canvas);
    });
  }, 1000); // Vérification toutes les 1s
});
