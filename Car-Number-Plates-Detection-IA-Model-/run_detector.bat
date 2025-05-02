@echo off
REM This script activates the virtual environment before running the Python script

REM Get the directory of this script
SET SCRIPT_DIR=%~dp0

REM Activate the virtual environment
IF EXIST "%SCRIPT_DIR%venv\Scripts\activate.bat" (
    CALL "%SCRIPT_DIR%venv\Scripts\activate.bat"
) ELSE (
    echo Virtual environment not found. Running with system Python.
)

REM Run the Python script with all arguments passed to this batch file
python "%SCRIPT_DIR%tunisian_plate_detector.py" %*

REM Deactivate the virtual environment
IF EXIST "%SCRIPT_DIR%venv\Scripts\deactivate.bat" (
    CALL "%SCRIPT_DIR%venv\Scripts\deactivate.bat"
)
