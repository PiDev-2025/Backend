import cv2
import easyocr
import numpy as np
import re
import os
import argparse
import torch
import sys
import time
from pathlib import Path
import math
from PIL import Image

# Try importing YOLO, but don't fail if not available
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
    print("YOLO module loaded successfully")
except ImportError:
    YOLO_AVAILABLE = False
    print("YOLO module not available. Falling back to traditional detection methods.")

# Try importing PaddleOCR but don't fail if not available
try:
    import paddleocr
    from paddleocr import PaddleOCR
    PADDLE_AVAILABLE = True
    print("PaddleOCR module loaded successfully")
except ImportError:
    PADDLE_AVAILABLE = False
    print("PaddleOCR not available. Using EasyOCR only.")

class TunisianPlateDetector:
    def __init__(self):
        try:
            # Initialize CUDA if available
            if not torch.cuda.is_available():
                print("WARNING: CUDA is not available. Using CPU instead.")
                self.device = 'cpu'
            else:
                try:
                    torch.cuda.init()
                    self.device = 'cuda'
                    torch.backends.cudnn.benchmark = True
                    print(f"Using GPU: {torch.cuda.get_device_name(0)}")
                except Exception as e:
                    print(f"CUDA initialization failed: {e}")
                    self.device = 'cpu'
            
            # Initialize EasyOCR with proper GPU settings
            gpu_status = True if self.device == 'cuda' else False
            self.reader = easyocr.Reader(['ar', 'en'], gpu=gpu_status, 
                                       recog_network='arabic_g1')
            
            # Initialize PaddleOCR if available
            self.paddle_ocr = None
            if PADDLE_AVAILABLE:
                try:
                    self.paddle_ocr = PaddleOCR(use_angle_cls=True, lang='ar', use_gpu=gpu_status)
                    print("PaddleOCR initialized successfully")
                except Exception as e:
                    print(f"PaddleOCR initialization failed: {e}")
            
            # Initialize YOLO model for license plate detection if available
            self.plate_detector = None
            if YOLO_AVAILABLE:
                try:
                    model_path = os.path.join(os.path.dirname(__file__), "model/license_plate_yolov8n.pt")
                    if os.path.exists(model_path):
                        self.plate_detector = YOLO(model_path)
                        print(f"YOLO model loaded from: {model_path}")
                    else:
                        print(f"YOLO model not found at {model_path}. Using general object detection.")
                        self.plate_detector = YOLO('yolov8n.pt')
                except Exception as e:
                    print(f"YOLO initialization failed: {e}")
            
            # Always initialize cascade classifier as backup or primary
            cascade_path = os.path.join(os.path.dirname(__file__), "model/haarcascade_russian_plate_number.xml")
            if not os.path.exists(cascade_path):
                # Try to use the default OpenCV cascade file
                cascade_path = cv2.data.haarcascades + "haarcascade_russian_plate_number.xml"
                if not os.path.exists(cascade_path):
                    # Fall back to another common cascade
                    cascade_path = cv2.data.haarcascades + "haarcascade_license_plate_rus_16stages.xml"
                
            if os.path.exists(cascade_path):
                self.plate_cascade = cv2.CascadeClassifier(cascade_path)
                print(f"Cascade classifier loaded from: {cascade_path}")
            else:
                # Create an empty directory for model files if it doesn't exist
                os.makedirs(os.path.join(os.path.dirname(__file__), "model"), exist_ok=True)
                
                # Download a basic cascade file
                cascade_url = "https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_russian_plate_number.xml"
                cascade_path = os.path.join(os.path.dirname(__file__), "model/haarcascade_russian_plate_number.xml")
                
                try:
                    import urllib.request
                    print(f"Downloading cascade file from {cascade_url}...")
                    urllib.request.urlretrieve(cascade_url, cascade_path)
                    self.plate_cascade = cv2.CascadeClassifier(cascade_path)
                    print("Downloaded cascade file successfully")
                except Exception as download_error:
                    print(f"Failed to download cascade file: {download_error}")
                    # Create a basic empty cascade
                    self.plate_cascade = cv2.CascadeClassifier()
            
            # Tunisia letters and patterns
            self.tunisia_letters = ['ت', 'و', 'ن', 'س']
            self.tunisia_pattern = re.compile(r'[تونس]+')
            self.number_pattern = re.compile(r'\d+')
            
            # Parameters - adjusted to be more sensitive for clearer images
            self.min_plate_area = 500  # Reduced from 800 to detect smaller plates
            self.min_confidence = 0.2  # Reduced from 0.25 to detect more candidates
            self.batch_size = 2
            self.skip_frames = 1
            self.frame_count = 0
            self.debug_mode = False  # Set to true to enable saving debug images
            
        except Exception as e:
            print(f"Error during initialization: {str(e)}")
            sys.exit(1)

    def ensure_image_format(self, img):
        """Make sure image is in the correct format for processing"""
        try:
            # Check if image is valid
            if img is None or img.size == 0:
                print("Invalid image input")
                return None
            
            # Check image depth and convert if needed
            if len(img.shape) == 3 and img.shape[2] == 4:  # RGBA image
                print("Converting RGBA image to BGR")
                img = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR)
            elif len(img.shape) == 2:  # Grayscale image
                print("Converting grayscale image to BGR")
                img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
            
            # Check data type
            if img.dtype != np.uint8:
                print(f"Converting image from {img.dtype} to uint8")
                img = img.astype(np.uint8)
                
            return img
        except Exception as e:
            print(f"Error in image format conversion: {e}")
            # Return a blank valid image as fallback
            return np.ones((100, 100, 3), dtype=np.uint8) * 255

    def detect_plate(self, img):
        """Detect license plates using available methods"""
        try:
            # Resize image if too large (keep higher resolution for clearer images)
            height, width = img.shape[:2]
            max_dimension = 1600  # Increased from 1200 for better resolution
            if max(height, width) > max_dimension:
                scale = max_dimension / max(height, width)
                img = cv2.resize(img, None, fx=scale, fy=scale)
            
            detected_plates = []
            
            # Try YOLO detection if available
            if YOLO_AVAILABLE and self.plate_detector is not None:
                try:
                    detected_plates = self.detect_with_yolo(img)
                except Exception as e:
                    print(f"YOLO detection failed: {e}")
            
            # If no plates found or YOLO not available, try cascade
            if not detected_plates:
                try:
                    detected_plates = self.detect_with_cascade(img)
                except Exception as e:
                    print(f"Cascade detection failed: {e}")
            
            # If still no plates, try contour detection with relaxed parameters
            if not detected_plates:
                try:
                    detected_plates = self.detect_quadrilateral_plates(img)
                except Exception as e:
                    print(f"Contour detection failed: {e}")
                    
            # If still no plates, try direct OCR on the full image
            if not detected_plates:
                try:
                    print("Attempting direct OCR on full image...")
                    # Create a region covering the whole image
                    h, w = img.shape[:2]
                    detected_plates.append((0, 0, w, h, 0.3))  # Lower confidence score
                except Exception as e:
                    print(f"Direct OCR preparation failed: {e}")
            
            return detected_plates
            
        except Exception as e:
            print(f"Error in plate detection: {str(e)}")
            return []
    
    def detect_with_yolo(self, img):
        """Detect license plates using YOLO"""
        if not YOLO_AVAILABLE or self.plate_detector is None:
            return []
        
        try:
            results = self.plate_detector(img, conf=self.min_confidence)
            yolo_plates = []
            
            # Extract license plate regions from YOLO results
            for result in results:
                boxes = result.boxes
                for box in boxes:
                    if box.conf.item() > self.min_confidence:
                        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                        w, h = x2 - x1, y2 - y1
                        aspect_ratio = w / float(h) if h > 0 else 0
                        
                        # Filter based on aspect ratio and area
                        if 1.5 <= aspect_ratio <= 6.0 and w * h >= self.min_plate_area:
                            yolo_plates.append((x1, y1, w, h, box.conf.item()))
                                    
            if yolo_plates:
                print(f"YOLO detected {len(yolo_plates)} license plates")
            return yolo_plates
        except Exception as e:
            print(f"Error in YOLO detection: {e}")
            return []
    
    def detect_with_cascade(self, img):
        """Detect license plates using Haar cascade"""
        if self.plate_cascade is None:
            return []
        
        try:
            img_gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            img_gray = cv2.equalizeHist(img_gray)
            img_gray = cv2.GaussianBlur(img_gray, (5, 5), 0)
            
            # Try multiple scale factors and parameter combinations
            all_detections = []
            
            # Original parameters
            cascade_plates = self.plate_cascade.detectMultiScale(
                img_gray, 
                scaleFactor=1.1,
                minNeighbors=3,
                minSize=(60, 20),
                maxSize=(300, 100)
            )
            all_detections.extend(cascade_plates)
            
            # More aggressive parameters for clearer images
            cascade_plates2 = self.plate_cascade.detectMultiScale(
                img_gray, 
                scaleFactor=1.05,  # Smaller scale factor to detect more candidates
                minNeighbors=2,    # Fewer neighbors for clearer images
                minSize=(40, 15),  # Smaller minimum size
                maxSize=(400, 150) # Larger maximum size
            )
            all_detections.extend(cascade_plates2)
            
            # Filter cascade detections to remove duplicates and low-quality detections
            filtered_plates = []
            seen_regions = set()
            
            for (x, y, w, h) in all_detections:
                # Create a region identifier to detect duplicates
                region_id = f"{x//10}_{y//10}_{w//10}_{h//10}"  # Quantized coordinates
                
                if region_id in seen_regions:
                    continue
                
                seen_regions.add(region_id)
                area = w * h
                aspect_ratio = w / float(h)
                
                # More relaxed aspect ratio conditions
                if 1.5 <= aspect_ratio <= 6.0 and area > self.min_plate_area:
                    filtered_plates.append((x, y, w, h, 0.5))  # Add default confidence
                    
            if filtered_plates:
                print(f"Cascade detected {len(filtered_plates)} license plates")
            return filtered_plates
        except Exception as e:
            print(f"Error in cascade detection: {e}")
            return []
    
    def detect_quadrilateral_plates(self, img):
        """Detect potential license plates using contour detection"""
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Apply bilateral filter to reduce noise while keeping edges sharp
            blur = cv2.bilateralFilter(gray, 11, 17, 17)
            
            # Try multiple edge detection parameters and thresholds
            potential_plates = []
            
            # Method 1: Standard Canny edge detection
            edged1 = cv2.Canny(blur, 30, 200)
            potential_plates.extend(self._find_contours(img, edged1))
            
            # Method 2: More aggressive edge detection for clearer images
            edged2 = cv2.Canny(blur, 10, 100)
            potential_plates.extend(self._find_contours(img, edged2))
            
            # Method 3: Using adaptive thresholding instead of Canny
            thresh = cv2.adaptiveThreshold(blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                          cv2.THRESH_BINARY_INV, 11, 2)
            potential_plates.extend(self._find_contours(img, thresh))
            
            # Save debug images only if debug mode is enabled
            if self.debug_mode:
                debug_dir = os.path.join(os.path.dirname(__file__), "debug")
                os.makedirs(debug_dir, exist_ok=True)
                timestamp = int(time.time())
                cv2.imwrite(os.path.join(debug_dir, f"edges1_{timestamp}.jpg"), edged1)
                cv2.imwrite(os.path.join(debug_dir, f"edges2_{timestamp}.jpg"), edged2)
                cv2.imwrite(os.path.join(debug_dir, f"thresh_{timestamp}.jpg"), thresh)
            
            # Remove duplicates using the same approach as in cascade detection
            filtered_plates = []
            seen_regions = set()
            
            for plate in potential_plates:
                x, y, w, h, conf = plate
                region_id = f"{x//10}_{y//10}_{w//10}_{h//10}"  # Quantized coordinates
                
                if region_id not in seen_regions:
                    seen_regions.add(region_id)
                    filtered_plates.append(plate)
            
            if filtered_plates:
                print(f"Contour method detected {len(filtered_plates)} potential plates")
            
            return filtered_plates
        except Exception as e:
            print(f"Error in quadrilateral detection: {str(e)}")
            return []
    
    def _find_contours(self, img, edged):
        """Helper function to find contours in an edge image"""
        contours, _ = cv2.findContours(edged.copy(), cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)[:15]  # Increased from 10
        
        potential_plates = []
        for contour in contours:
            # Approximate the contour
            peri = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, 0.018 * peri, True)
            
            # Accept contours with 4 corners (rectangles) or those with 6-8 corners (plates with rounded edges)
            if len(approx) >= 4 and len(approx) <= 8:
                x, y, w, h = cv2.boundingRect(contour)
                aspect_ratio = w / float(h)
                
                # More relaxed aspect ratio for detection
                if 1.5 <= aspect_ratio <= 6.0 and w * h > self.min_plate_area:
                    potential_plates.append((x, y, w, h, 0.3))  # Lower confidence
        
        return potential_plates
    
    def correct_plate_perspective(self, img, points):
        """Apply perspective correction to a tilted license plate"""
        try:
            # Convert points to the right format
            if len(points) != 4:
                raise ValueError("Four points are required for perspective correction")
                
            # Order points: top-left, top-right, bottom-right, bottom-left
            rect = np.zeros((4, 2), dtype=np.float32)
            
            # Sum of coordinates gives top-left (smallest) and bottom-right (largest)
            s = points.sum(axis=1)
            rect[0] = points[np.argmin(s)]  # Top-left
            rect[2] = points[np.argmax(s)]  # Bottom-right
            
            # Difference gives top-right (smallest) and bottom-left (largest)
            diff = np.diff(points, axis=1)
            rect[1] = points[np.argmin(diff)]  # Top-right
            rect[3] = points[np.argmax(diff)]  # Bottom-left
            
            # Compute width and height of the destination image
            widthA = np.sqrt(((rect[2][0] - rect[3][0]) ** 2) + ((rect[2][1] - rect[3][1]) ** 2))
            widthB = np.sqrt(((rect[1][0] - rect[0][0]) ** 2) + ((rect[1][1] - rect[0][1]) ** 2))
            maxWidth = max(int(widthA), int(widthB))
            
            heightA = np.sqrt(((rect[1][0] - rect[2][0]) ** 2) + ((rect[1][1] - rect[2][1]) ** 2))
            heightB = np.sqrt(((rect[0][0] - rect[3][0]) ** 2) + ((rect[0][1] - rect[3][1]) ** 2))
            maxHeight = max(int(heightA), int(heightB))
            
            # Set destination points
            dst = np.array([
                [0, 0],
                [maxWidth - 1, 0],
                [maxWidth - 1, maxHeight - 1],
                [0, maxHeight - 1]
            ], dtype=np.float32)
            
            # Compute perspective transform and apply it
            M = cv2.getPerspectiveTransform(rect, dst)
            warped = cv2.warpPerspective(img, M, (maxWidth, maxHeight))
            
            return warped
        except Exception as e:
            print(f"Error in perspective correction: {str(e)}")
            return img
    
    def preprocess_image(self, img):
        """Apply multiple preprocessing techniques to improve Arabic detection"""
        try:
            # First ensure the image is in correct format
            img = self.ensure_image_format(img)
            if img is None:
                return [np.ones((100, 100, 3), dtype=np.uint8) * 255]  # Return white image as fallback
            
            # Create a list of preprocessed variants
            preprocessed_images = []
            
            # 1. Original image
            preprocessed_images.append(img.copy())
            
            # Save the original for reference
            debug_dir = os.path.join(os.path.dirname(__file__), "debug")
            os.makedirs(debug_dir, exist_ok=True)
            timestamp = int(time.time())
            cv2.imwrite(os.path.join(debug_dir, f"roi_original_{timestamp}.jpg"), img)
            
            # 2. Convert to grayscale safely
            try:
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                gray_3ch = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
                preprocessed_images.append(gray_3ch)
            except Exception as e:
                print(f"Grayscale conversion error: {e}")
            
            # 3. Bilateral filter for noise reduction while preserving edges
            try:
                if 'gray' in locals():
                    bilateral = cv2.bilateralFilter(gray, 11, 17, 17)
                    bilateral_3ch = cv2.cvtColor(bilateral, cv2.COLOR_GRAY2BGR)
                    preprocessed_images.append(bilateral_3ch)
            except Exception as e:
                print(f"Bilateral filter error: {e}")
            
            # 4. Enhanced contrast with CLAHE
            try:
                if 'gray' in locals():
                    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
                    enhanced = clahe.apply(gray)
                    enhanced_3ch = cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)
                    preprocessed_images.append(enhanced_3ch)
            except Exception as e:
                print(f"CLAHE enhancement error: {e}")

            # 5. Thresholded image for better text extraction
            try:
                if 'bilateral' in locals():
                    _, thresh = cv2.threshold(bilateral, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
                    thresh_3ch = cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR)
                    preprocessed_images.append(thresh_3ch)
            except Exception as e:
                print(f"Thresholding error: {e}")

            # 6. Adaptive thresholding for varying illumination
            try:
                if 'bilateral' in locals():
                    adaptive_thresh = cv2.adaptiveThreshold(
                        bilateral, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
                    adaptive_thresh_3ch = cv2.cvtColor(adaptive_thresh, cv2.COLOR_GRAY2BGR)
                    preprocessed_images.append(adaptive_thresh_3ch)
            except Exception as e:
                print(f"Adaptive thresholding error: {e}")

            # 7. Sharpened image
            try:
                if 'gray' in locals():
                    kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
                    sharpened = cv2.filter2D(gray, -1, kernel)
                    sharpened_3ch = cv2.cvtColor(sharpened, cv2.COLOR_GRAY2BGR)
                    preprocessed_images.append(sharpened_3ch)
            except Exception as e:
                print(f"Sharpening error: {e}")

            # 8. Edge-enhanced image
            try:
                if 'gray' in locals():
                    blurred = cv2.GaussianBlur(gray, (0, 0), 10)
                    edge_enhanced = cv2.addWeighted(gray, 1.5, blurred, -0.5, 0)
                    edge_enhanced_3ch = cv2.cvtColor(edge_enhanced, cv2.COLOR_GRAY2BGR)
                    preprocessed_images.append(edge_enhanced_3ch)
            except Exception as e:
                print(f"Edge enhancement error: {e}")

            # Additional preprocessing techniques for clearer images
            
            # 9. Increase contrast using histogram equalization on color channels
            try:
                img_yuv = cv2.cvtColor(img, cv2.COLOR_BGR2YUV)
                img_yuv[:,:,0] = cv2.equalizeHist(img_yuv[:,:,0])
                img_equ = cv2.cvtColor(img_yuv, cv2.COLOR_YUV2BGR)
                preprocessed_images.append(img_equ)
            except Exception as e:
                print(f"YUV histogram equalization error: {e}")
            
            # Save debug images if preprocessing wasn't entirely successful
            if len(preprocessed_images) < 5:  # If we got fewer than 5 variants, something went wrong
                try:
                    for i, variant in enumerate(preprocessed_images):
                        cv2.imwrite(os.path.join(debug_dir, f"preprocess_debug_{i}_{timestamp}.jpg"), variant)
                except Exception as e:
                    print(f"Error saving debug images: {e}")
            
            # Make sure we have at least the original image
            if not preprocessed_images:
                preprocessed_images.append(img.copy())
            
            return preprocessed_images
        except Exception as e:
            print(f"Critical error in preprocessing: {str(e)}")
            # Return at least the original image or a blank one as fallback
            if img is not None and img.size > 0:
                return [img.copy()]
            return [np.ones((100, 100, 3), dtype=np.uint8) * 255]  # White image as fallback
    
    def combine_ocr_results(self, img_variants):
        """Combine results from OCR engines with additional settings for clearer images"""
        all_results = []
        
        # Try different OCR configurations
        allowlist = '0123456789تونس'  # Restrict to digits and تونس
        
        # Apply EasyOCR to all variants
        for i, variant in enumerate(img_variants):
            try:
                # Verify the image format is valid for EasyOCR
                if variant is None or variant.size == 0:
                    print(f"Skipping variant {i}: Invalid image")
                    continue
                
                # Ensure image has correct channels and format
                if len(variant.shape) != 3 or variant.shape[2] != 3:
                    print(f"Skipping variant {i}: Invalid shape {variant.shape}")
                    continue

                # First try without allowlist (more general)
                try:
                    # Use direct reader method without extra processing
                    results = self.reader.readtext(variant)
                    if results:
                        all_results.extend(results)
                        print(f"OCR variant {i} found text: {[res[1] for res in results]}")
                except Exception as e:
                    print(f"Error in EasyOCR for variant {i}: {str(e)}")
                    
                    # Try with a safe grayscale conversion
                    try:
                        print(f"Trying grayscale conversion for variant {i}")
                        # Save the variant for debugging
                        debug_dir = os.path.join(os.path.dirname(__file__), "debug")
                        os.makedirs(debug_dir, exist_ok=True)
                        timestamp = int(time.time())
                        cv2.imwrite(os.path.join(debug_dir, f"ocr_variant_{i}_{timestamp}.jpg"), variant)
                        
                        # Convert to grayscale (8-bit, 1-channel)
                        gray = cv2.cvtColor(variant, cv2.COLOR_BGR2GRAY)
                        results = self.reader.readtext(gray)
                        if results:
                            all_results.extend(results)
                            print(f"OCR on grayscale variant {i} found text: {[res[1] for res in results]}")
                    except Exception as inner_e:
                        print(f"Grayscale OCR also failed for variant {i}: {str(inner_e)}")
            except Exception as e:
                print(f"Critical error processing variant {i}: {str(e)}")
        
        # Apply PaddleOCR if available
        if PADDLE_AVAILABLE and self.paddle_ocr:
            for variant in img_variants:
                try:
                    # Convert CV2 image to RGB for PaddleOCR
                    rgb_variant = cv2.cvtColor(variant, cv2.COLOR_BGR2RGB)
                    results = self.paddle_ocr.ocr(rgb_variant, cls=True)
                    
                    if results and results[0]:
                        for line in results[0]:
                            if len(line) >= 2:
                                bbox_points = line[0]
                                text = line[1][0]
                                prob = line[1][1]
                                
                                # Convert to format compatible with EasyOCR
                                # EasyOCR format: [[x1,y1],[x2,y2],[x3,y3],[x4,y4]], text, prob
                                bbox = np.array(bbox_points).reshape(4, 2).tolist()
                                all_results.append((bbox, text, prob))
                except Exception as e:
                    print(f"Error in PaddleOCR: {str(e)}")
        
        return all_results
    
    def detect_tunisia_text(self, text):
        """Detect if text contains تونس or its letters and replace if needed"""
        # Pre-normalize the text to handle common OCR errors
        normalized_text = text.replace(' ', '')
        
        # Direct match for تونس (most confident)
        if 'تونس' in normalized_text:
            return "تونس", True, 1.0
        
        # Check for variants with small spelling errors
        variants = ['ٹونس', 'توسن', 'نوست', 'ونست', 'تؤنس', 'ٺونس']
        for variant in variants:
            if variant in normalized_text:
                print(f"Found variant '{variant}' of تونس")
                return "تونس", True, 0.9
        
        # Check for individual letters from تونس
        matches = []
        for letter in self.tunisia_letters:
            if letter in normalized_text:
                matches.append(letter)
        
        # Calculate confidence based on how many letters were found
        if matches:
            match_ratio = len(matches) / len(self.tunisia_letters)
            confidence = min(0.8, 0.4 + match_ratio * 0.4)  # Scale between 0.4-0.8
            print(f"Found letters {', '.join(matches)} from تونس in '{text}'")
            return "تونس", True, confidence
        
        # Check if there's any Arabic text at all (might be تونس with OCR errors)
        arabic_pattern = re.compile(r'[\u0600-\u06FF]+')
        if arabic_pattern.search(normalized_text):
            if len(normalized_text) >= 2 and len(normalized_text) <= 6:
                return "تونس", True, 0.3  # Low confidence
        
        return text, False, 0.0
    
    def process_plate_text(self, ocr_results):
        """Process OCR results to extract plate information with confidence scoring"""
        # Sort results by confidence
        sorted_results = sorted(ocr_results, key=lambda x: x[2], reverse=True)
        
        # Look for تونس or Arabic letters with confidence scores
        tunisia_text = ""
        tunisia_bbox = None
        was_replaced = False
        confidence = 0.0
        
        # First check for exact تونس match
        for bbox, text, prob in sorted_results:
            if 'تونس' in text:
                tunisia_text = "تونس"
                tunisia_bbox = bbox
                confidence = prob
                break
        
        # If no exact match, look for letters or variants
        if not tunisia_text:
            for bbox, text, prob in sorted_results:
                cleaned_text, replaced, match_conf = self.detect_tunisia_text(text)
                if replaced:
                    tunisia_text = cleaned_text
                    tunisia_bbox = bbox
                    was_replaced = True
                    confidence = match_conf * prob  # Combined confidence
                    break
        
        # Extract all numbers using regex
        all_text = ' '.join([item[1] for item in sorted_results])
        numbers = re.findall(r'\d+', all_text)
        
        # Sort numbers by length (longer numbers are more likely to be part of the plate)
        numbers.sort(key=len, reverse=True)
        
        # Format the complete plate text
        if tunisia_text and numbers:
            if len(numbers) >= 2:
                # Try to determine which number goes first based on typical Tunisia format
                # Number format: [1-3 digits] تونس [2-4 digits]
                first_candidates = [n for n in numbers if len(n) <= 3]
                second_candidates = [n for n in numbers if len(n) >= 2 and len(n) <= 4]
                
                # Use the first valid candidate for each position
                first_num = first_candidates[0] if first_candidates else numbers[0]
                second_num = second_candidates[0] if second_candidates else (
                    numbers[1] if len(numbers) > 1 else "")
                formatted_text = f"{first_num} {tunisia_text} {second_num}"
                confidence_score = confidence * 0.8  # Scale confidence
            else:
                formatted_text = f"{tunisia_text} {' '.join(numbers)}"
                confidence_score = confidence * 0.6  # Lower confidence for incomplete format
        elif numbers:
            formatted_text = f"Plate: {' '.join(numbers)}"
            confidence_score = 0.3  # Low confidence without تونس
        else:
            formatted_text = tunisia_text if tunisia_text else "Unknown plate"
            confidence_score = 0.2 if tunisia_text else 0.1  # Very low confidence
        
        # Standard format check
        is_standard_format = bool(
            tunisia_text and 
            len(numbers) >= 2 and
            any(len(n) <= 3 for n in numbers) and
            any(len(n) >= 2 and len(n) <= 4 for n in numbers)
        )
        
        return formatted_text, tunisia_text, numbers, tunisia_bbox, was_replaced, confidence_score, is_standard_format
    
    def create_plate_visualization(self, plate_text, numbers, tunisia_text, confidence=0.0):
        """Create a clean visual representation of the license plate with confidence indicator"""
        height, width = 180, 500
        plate_img = np.ones((height, width, 3), dtype=np.uint8) * 255
        
        # Add border
        cv2.rectangle(plate_img, (1, 1), (width-2, height-2), (0, 0, 0), 2)
        
        # Format numbers
        first_num = numbers[0] if numbers else ""
        second_num = numbers[1] if len(numbers) > 1 else ""
        
        # Draw the Tunisia text in the center
        tunisia = tunisia_text if tunisia_text else "تونس"
        cv2.putText(plate_img, tunisia, (width//2-40, height//2+15), 
                   cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 150), 2)
        
        # Draw numbers
        if first_num:
            cv2.putText(plate_img, first_num, (width//4-30, height//2+15), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 0), 2)
        if second_num:
            cv2.putText(plate_img, second_num, (3*width//4-30, height//2+15), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 0), 2)
        
        # Add "TUNISIA" text at the bottom
        cv2.putText(plate_img, "TUNISIA", (width//2-50, height-20), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
        
        # Add confidence indicator
        conf_text = f"Confidence: {confidence:.2f}"
        cv2.putText(plate_img, conf_text, (10, 20), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, 
                   self.get_confidence_color(confidence), 1)
        
        return plate_img
    
    def get_confidence_color(self, confidence):
        """Get color based on confidence level"""
        if confidence >= 0.7:
            return (0, 150, 0)  # Green
        elif confidence >= 0.4:
            return (0, 150, 150)  # Yellow
        else:
            return (0, 0, 150)  # Red

    def save_results(self, img_roi, plate_text, plate_viz, confidence=0.0, count=0):
        """Save detection results to files with confidence info"""
        # Create output directory path (but don't create it)
        output_dir = "output"
        
        # Generate paths (but don't save files)
        roi_path = os.path.join(output_dir, f"plate_roi_{count}.jpg")
        viz_path = os.path.join(output_dir, f"plate_viz_{count}.jpg")
        meta_path = os.path.join(output_dir, f"plate_meta_{count}.txt")
        
        # Print debug message indicating saving was skipped
        print("File saving skipped as requested.")
        print(f"Would have saved detection results to:")
        print(f"- ROI: {roi_path}")
        print(f"- Visualization: {viz_path}")
        print(f"- Text: {plate_text} (Confidence: {confidence:.2f})")
        
        # Return the paths as if files were saved
        return roi_path, viz_path

    def process_image(self, img_path):
        """Process an image from file path"""
        img = cv2.imread(img_path)
        if img is None:
            print(f"Error: Could not read image at {img_path}")
            return None, None, None, None, 0.0
        return self.process_image_array(img)
    
    def process_image_array(self, img):
        """Process an image array directly with improved detection and OCR"""
        if img is None:
            print("Error: Invalid image array")
            return None, None, None, None, 0.0
            
        try:
            # First ensure valid image format
            img = self.ensure_image_format(img)
            if img is None:
                return None, None, None, None, 0.0
            
            # Detect plate regions with confidence scores
            plate_regions = self.detect_plate(img)
            if not plate_regions:
                print("No license plates detected")
                return img, None, None, None, 0.0
                
            result_img = img.copy()
            best_confidence = 0.0
            best_result = None
            
            for idx, (x, y, w, h, detection_conf) in enumerate(plate_regions):
                try:
                    # Make sure coordinates are valid
                    x, y, w, h = int(x), int(y), int(w), int(h)
                    if x < 0: x = 0
                    if y < 0: y = 0
                    if w <= 0 or h <= 0 or x+w > img.shape[1] or y+h > img.shape[0]:
                        print(f"Invalid plate region #{idx}: ({x}, {y}, {w}, {h}) for image of size {img.shape}")
                        continue
                    
                    # Extract plate region
                    plate_roi = img[y:y+h, x:x+w].copy()
                    
                    # Save the ROI for debugging
                    debug_dir = os.path.join(os.path.dirname(__file__), "debug")
                    os.makedirs(debug_dir, exist_ok=True)
                    timestamp = int(time.time())
                    cv2.imwrite(os.path.join(debug_dir, f"plate_roi_{idx}_{timestamp}.jpg"), plate_roi)
                    
                    # Apply preprocessing to get multiple variants
                    preprocessed_variants = self.preprocess_image(plate_roi)
                    
                    # Apply OCR with both engines
                    ocr_results = self.combine_ocr_results(preprocessed_variants)
                    
                    if ocr_results:
                        # Process the text with confidence scoring
                        plate_text, tunisia_text, numbers, tunisia_bbox, was_replaced, text_conf, is_standard = self.process_plate_text(ocr_results)
                        
                        # Combine detection and OCR confidence
                        combined_conf = detection_conf * 0.3 + text_conf * 0.7
                        
                        # Draw plate rectangle
                        cv2.rectangle(result_img, (x, y), (x+w, y+h), (0, 255, 0), 2)
                        
                        # Draw plate text with confidence-based color
                        color = self.get_confidence_color(combined_conf)
                        cv2.putText(result_img, plate_text, (x, y-10), 
                                   cv2.FONT_HERSHEY_COMPLEX_SMALL, 1, color, 2)
                        cv2.putText(result_img, f"{combined_conf:.2f}", (x, y+h+20), 
                                   cv2.FONT_HERSHEY_COMPLEX_SMALL, 0.8, color, 2)
                        
                        # Create clean plate visualization
                        plate_viz = self.create_plate_visualization(plate_text, numbers, tunisia_text, combined_conf)
                        
                        # Keep track of best result based on confidence
                        if combined_conf > best_confidence:
                            best_confidence = combined_conf
                            best_result = (result_img, plate_roi, plate_viz, plate_text, combined_conf)
                except Exception as e:
                    print(f"Error processing plate region #{idx}: {e}")
                    continue
                        
            if best_result:
                return best_result
            
            return result_img, None, None, None, 0.0
        except Exception as e:
            print(f"Error in image processing: {e}")
            return img, None, None, None, 0.0

    def process_video(self, video_source=0):
        """Process video with improved error handling and confidence threshold"""
        try:
            cap = cv2.VideoCapture(video_source)
            if not cap.isOpened():
                raise ValueError("Failed to open video source")

            # Improved video settings
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
            cap.set(cv2.CAP_PROP_FPS, 30)
            
            print("Press 'q' to quit, 's' to save detected plate")
            
            last_saved_text = ""
            frame_counter = 0
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    print("Failed to grab frame")
                    break

                # Only process every nth frame for efficiency
                if frame_counter % self.skip_frames == 0:
                    # Process single frame using array-based method
                    result_img, plate_roi, plate_viz, plate_text, confidence = self.process_image_array(frame)
                    
                    if result_img is not None:
                        cv2.imshow("Plate Detection", result_img)
                        if plate_viz is not None and confidence > 0.4:  # Only show reasonably confident detections
                            cv2.imshow("Plate Visualization", plate_viz)
                            
                            # Auto-save if we found a high-confidence plate different from last saved
                            if confidence > 0.7 and plate_text != last_saved_text:
                                self.save_results(plate_roi, plate_text, plate_viz, confidence)
                                last_saved_text = plate_text
                frame_counter += 1
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    break
                elif key == ord('s') and plate_roi is not None:
                    self.save_results(plate_roi, plate_text, plate_viz, confidence)

        except Exception as e:
            print(f"Error in video processing: {str(e)}")
        finally:
            if 'cap' in locals() and cap is not None:
                cap.release()
            cv2.destroyAllWindows()

class nullcontext:
    def __enter__(self): return None
    def __exit__(self, *args): return None

def main():
    parser = argparse.ArgumentParser(description='Tunisian License Plate Detection')
    parser.add_argument('-i', '--image', type=str, help='Path to image file')
    parser.add_argument('-v', '--video', type=str, help='Path to video file')
    parser.add_argument('-c', '--camera', action='store_true', help='Use camera')
    parser.add_argument('-o', '--output', type=str, default='output', help='Output directory')
    parser.add_argument('--no-display', action='store_true', help='Do not display windows (for server usage)')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode to save intermediate images')
    
    try:
        args = parser.parse_args()
        detector = TunisianPlateDetector()
        
        if args.output:
            os.makedirs(args.output, exist_ok=True)
        
        if args.image:
            # Handle image path with proper quotes
            img_path = args.image.strip('"').strip("'")
            if not os.path.exists(img_path):
                raise ValueError(f"Image file not found: {img_path}")
            
            # Process image
            result_img, plate_roi, plate_viz, plate_text, confidence = detector.process_image(img_path)
            if plate_text:
                print(f"Detected Text: {plate_text} (Confidence: {confidence:.2f})")
                
                # Save results
                if plate_roi is not None and plate_viz is not None:
                    detector.save_results(plate_roi, plate_text, plate_viz, confidence)
                
                # Don't show windows in production backend use
                if not args.no_display:
                    cv2.imshow("Result", result_img)
                    if plate_viz is not None:
                        cv2.imshow("Plate", plate_viz)
                    cv2.waitKey(0)
                    cv2.destroyAllWindows()
                
                return 0
            else:
                # Return success (0) even when no plate is detected
                # This prevents the Node.js service from treating this as an error
                print("No plate detected")
                print("STATUS:NO_PLATE_DETECTED")  # Special status for the Node.js service
                return 0  # Changed from 1 to 0
        elif args.video:
            video_path = args.video.strip('"').strip("'")
            detector.process_video(video_path)
            return 0
        elif args.camera:
            detector.process_video(0)  # Use default camera
            return 0
        else:
            parser.print_help()
            return 1
    except Exception as e:
        print(f"Error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
