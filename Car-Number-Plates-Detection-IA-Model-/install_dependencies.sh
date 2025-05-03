#!/bin/bash

echo "Creating Python virtual environment..."
python -m venv venv

echo "Activating virtual environment..."
source venv/bin/activate

echo "Installing dependencies..."
python -m pip install --upgrade pip

# Install PyTorch with CUDA support for NVIDIA RTX 3050
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Install other dependencies
pip install opencv-python>=4.5.5
pip install easyocr>=1.6.2
pip install numpy>=1.22.0
pip install ultralytics>=8.0.0
pip install pillow>=9.0.0

# Install PaddlePaddle and PaddleOCR (optional, can be commented out if not needed)
pip install paddlepaddle-gpu>=2.4.0 -i https://mirror.baidu.com/pypi/simple
pip install paddleocr>=2.6.0

echo "Installation complete!"
echo "To activate the environment in the future, run: source venv/bin/activate"
