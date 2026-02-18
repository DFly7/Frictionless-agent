from pypdf import PdfReader
import sys

try:
    reader = PdfReader("/root/.nanobot/workspace/files_uploaded/DarraghFlynnCV.pdf")
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    print(text)
except Exception as e:
    print(f"Error reading PDF: {e}")
