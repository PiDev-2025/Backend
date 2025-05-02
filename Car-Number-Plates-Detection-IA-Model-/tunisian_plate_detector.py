import cv2
import easyocr
import numpy as np
import re
import os
import argparse
import torch
import sys

class TunisianPlateDetector:
    def __init__(self):
        try:
            # Initialize CUDA if available
            if not torch.cuda.is_available():
                print("WARNING: CUDA is not available. Using CPU instead.")
                self.device = 'cpu'
            else:
                torch.cuda.init()
                self.device = 'cuda'
                torch.backends.cudnn.benchmark = True
                print(f"Using GPU: {torch.cuda.get_device_name(0)}")
                
            # Initialize EasyOCR with proper GPU settings
            gpu_status = True if self.device == 'cuda' else False
            self.reader = easyocr.Reader(['ar', 'en'], gpu=gpu_status, 
                                       recog_network='arabic_g1')
            
            # Rest of initialization
            cascade_path = os.path.join(os.path.dirname(__file__), "model/haarcascade_russian_plate_number.xml")
            self.plate_cascade = cv2.CascadeClassifier(cascade_path)
            self.tunisia_letters = ['ت', 'و', 'ن', 'س']
            
            # Optimized video parameters
            self.skip_frames = 1  # Reduced for better detection
            self.frame_count = 0
            self.batch_size = 2  # Smaller batch for real-time processing
            self.min_area = 1000  # Minimum plate area
            
        except Exception as e:
            print(f"Error during initialization: {str(e)}")
            sys.exit(1)

    def detect_plate(self, img):
        """Enhanced plate detection with better parameters"""
        try:
            # Resize image if too large
            height, width = img.shape[:2]
            max_dimension = 1200
            if max(height, width) > max_dimension:
                scale = max_dimension / max(height, width)
                img = cv2.resize(img, None, fx=scale, fy=scale)

            img_gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Apply preprocessing to improve detection
            img_gray = cv2.equalizeHist(img_gray)
            img_gray = cv2.GaussianBlur(img_gray, (5, 5), 0)
            
            plates = self.plate_cascade.detectMultiScale(
                img_gray, 
                scaleFactor=1.1,  # Less aggressive scaling
                minNeighbors=3,   # Less strict detection
                minSize=(60, 20), # Smaller minimum size
                maxSize=(300, 100) # Maximum size limit
            )
            
            plate_regions = []
            for (x, y, w, h) in plates:
                area = w * h
                aspect_ratio = w / float(h)
                
                # Filter by aspect ratio and area
                if 2.0 <= aspect_ratio <= 5.0 and area > self.min_area:
                    plate_regions.append((x, y, w, h))
                    print(f"Found plate: area={area}, ratio={aspect_ratio:.2f}")
                    
            return plate_regions
        except Exception as e:
            print(f"Error in plate detection: {str(e)}")
            return []

    def preprocess_image(self, img):
        """Apply multiple preprocessing techniques to improve Arabic detection"""
        try:
            # Ensure image is in correct format
            if img is None or img.size == 0:
                raise ValueError("Invalid input image")
            
            # Convert to BGR if grayscale
            if len(img.shape) == 2:
                img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
            
            # Create a list of preprocessed variants
            preprocessed_images = []
            
            # 1. Original image
            preprocessed_images.append(img.copy())
            
            # 2. Grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            preprocessed_images.append(cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR))
            
            # 3. Bilateral filter
            bilateral = cv2.bilateralFilter(gray, 11, 17, 17)
            preprocessed_images.append(cv2.cvtColor(bilateral, cv2.COLOR_GRAY2BGR))
            
            # 4. Enhanced contrast
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            enhanced = clahe.apply(gray)
            preprocessed_images.append(cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR))
            
            return preprocessed_images
        except Exception as e:
            print(f"Error in preprocessing: {str(e)}")
            return [img.copy()]

    def detect_tunisia_text(self, text):
        """Detect if text contains تونس or its letters and replace if needed"""
        # Check if the text already contains تونس
        if 'تونس' in text:
            return text, False
            
        # Check for any Arabic text
        arabic_pattern = re.compile(r'[\u0600-\u06FF]+')
        if not arabic_pattern.search(text):
            return text, False
            
        # Look for individual letters from تونس
        matches = []
        for letter in self.tunisia_letters:
            if letter in text:
                matches.append(letter)
                
        # If we found any letters, replace with full word
        if matches:
            print(f"Found letters {', '.join(matches)} from تونس in '{text}'")
            return "تونس", True
            
        return text, False

    def process_plate_text(self, ocr_results):
        """Process OCR results to extract plate information"""
        # Look for تونس or Arabic letters
        tunisia_text = ""
        tunisia_bbox = None
        was_replaced = False
        
        # First check for exact تونس match
        for bbox, text, prob in ocr_results:
            if 'تونس' in text:
                tunisia_text = text
                tunisia_bbox = bbox
                break
        
        # If no exact match, look for letters
        if not tunisia_text:
            for bbox, text, prob in ocr_results:
                text, replaced = self.detect_tunisia_text(text)
                if replaced:
                    tunisia_text = text
                    tunisia_bbox = bbox
                    was_replaced = True
                    break
        
        # Extract all numbers
        all_text = ' '.join([item[1] for item in ocr_results])
        numbers = re.findall(r'\d+', all_text)
        
        # Format the complete plate text
        if tunisia_text and numbers:
            if len(numbers) >= 2:
                formatted_text = f"{numbers[0]} {tunisia_text} {numbers[1]}"
            else:
                formatted_text = f"{tunisia_text} {' '.join(numbers)}"
        elif numbers:
            formatted_text = f"Plate: {' '.join(numbers)}"
        else:
            formatted_text = tunisia_text if tunisia_text else "Unknown plate"
            
        return formatted_text, tunisia_text, numbers, tunisia_bbox, was_replaced

    def create_plate_visualization(self, plate_text, numbers, tunisia_text):
        """Create a clean visual representation of the license plate"""
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
        
        return plate_img

    def save_results(self, img_roi, plate_text, plate_viz, count=0):
        """Save detection results to files"""
        # Create output directory if it doesn't exist
        if not os.path.exists("output"):
            os.makedirs("output")
            
        # Save the plate ROI
        roi_path = os.path.join("output", f"plate_roi_{count}.jpg")
        cv2.imwrite(roi_path, img_roi)
        
        # Save the visualization
        viz_path = os.path.join("output", f"plate_viz_{count}.jpg")
        cv2.imwrite(viz_path, plate_viz)
        
        print(f"Saved detection results:")
        print(f"- ROI: {roi_path}")
        print(f"- Visualization: {viz_path}")
        print(f"- Text: {plate_text}")

    def process_image(self, img_path):
        """Process an image from file path"""
        img = cv2.imread(img_path)
        if img is None:
            print(f"Error: Could not read image at {img_path}")
            return None
        return self.process_image_array(img)

    def process_image_array(self, img):
        """Process an image array directly"""
        if img is None:
            print("Error: Invalid image array")
            return None, None, None, None
            
        # Detect plate regions
        plate_regions = self.detect_plate(img)
        if not plate_regions:
            print("No license plates detected")
            return img, None, None, None
            
        result_img = img.copy()
        
        for (x, y, w, h) in plate_regions:
            # Extract and preprocess plate region
            plate_roi = img[y:y+h, x:x+w]
            preprocessed_variants = self.preprocess_image(plate_roi)
            
            # Apply OCR to all variants
            all_results = []
            for variant in preprocessed_variants:
                results = self.reader.readtext(variant)
                if results:
                    all_results.extend(results)
            
            if all_results:
                # Process the text
                plate_text, tunisia_text, numbers, tunisia_bbox, was_replaced = self.process_plate_text(all_results)
                
                # Draw plate rectangle
                cv2.rectangle(result_img, (x, y), (x+w, y+h), (0, 255, 0), 2)
                
                # Draw plate text
                text_color = (0, 255, 255) if was_replaced else (255, 0, 255)
                cv2.putText(result_img, plate_text, (x, y-10), 
                           cv2.FONT_HERSHEY_COMPLEX_SMALL, 1, text_color, 2)
                
                # Create clean plate visualization
                plate_viz = self.create_plate_visualization(plate_text, numbers, tunisia_text)
                
                return result_img, plate_roi, plate_viz, plate_text
        
        return result_img, None, None, None

    def process_video(self, video_source=0):
        """Process video with improved error handling"""
        try:
            cap = cv2.VideoCapture(video_source)
            if not cap.isOpened():
                raise ValueError("Failed to open video source")

            # Improved video settings
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
            cap.set(cv2.CAP_PROP_FPS, 30)
            
            print("Press 'q' to quit, 's' to save detected plate")
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    print("Failed to grab frame")
                    break

                # Process single frame using array-based method
                result_img, plate_roi, plate_viz, plate_text = self.process_image_array(frame)
                
                if result_img is not None:
                    cv2.imshow("Plate Detection", result_img)
                    if plate_viz is not None:
                        cv2.imshow("Plate Visualization", plate_viz)
                
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    break
                elif key == ord('s') and plate_roi is not None:
                    self.save_results(plate_roi, plate_text, plate_viz)

        except Exception as e:
            print(f"Error in video processing: {str(e)}")
        finally:
            if 'cap' in locals():
                cap.release()
            cv2.destroyAllWindows()

    def _process_roi_batch(self, img, roi_batch):
        """Process a batch of ROIs together"""
        preprocessed_batches = [self.preprocess_image(roi[0]) for roi in roi_batch]
        
        # Batch OCR processing
        for idx, (roi, (x, y, w, h)) in enumerate(roi_batch):
            all_results = []
            for variant in preprocessed_batches[idx]:
                # Update to new autocast syntax
                with torch.amp.autocast('cuda') if self.device == 'cuda' else nullcontext():
                    results = self.reader.readtext(variant)
                    if results:
                        all_results.extend(results)

            if all_results:
                plate_text, tunisia_text, numbers, tunisia_bbox, was_replaced = self.process_plate_text(all_results)
                
                # Draw results
                cv2.rectangle(img, (x, y), (x+w, y+h), (0, 255, 0), 2)
                text_color = (0, 255, 255) if was_replaced else (255, 0, 255)
                cv2.putText(img, plate_text, (x, y-10), 
                          cv2.FONT_HERSHEY_COMPLEX_SMALL, 1, text_color, 2)

class nullcontext:
    def __enter__(self): return None
    def __exit__(self, *args): return None

def main():
    parser = argparse.ArgumentParser(description='Tunisian License Plate Detection')
    parser.add_argument('-i', '--image', type=str, required=True, help='Path to image file')
    
    try:
        args = parser.parse_args()
        detector = TunisianPlateDetector()
        
        # Handle image path with proper quotes
        img_path = args.image.strip('"').strip("'")
        if not os.path.exists(img_path):
            raise ValueError(f"Image file not found: {img_path}")
            
        # Process image
        result_img, plate_roi, plate_viz, plate_text = detector.process_image(img_path)
        
        if plate_text:
            print(f"Detected Text: {plate_text}")
            return 0
        else:
            print("No plate detected")
            return 1
            
    except Exception as e:
        print(f"Error: {str(e)}")
        return 1

if __name__ == "__main__":
    main()