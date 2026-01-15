#!/bin/bash

# Check if a directory argument is provided
if [ -z "$1" ]; then
  echo "Usage: ./install.sh <target_directory>"
  echo "Example: ./install.sh /Users/username/Vault/.obsidian/plugins/obsidian-gemini-latex-gen"
  exit 1
fi

TARGET_DIR="$1"

echo "Building plugin..."
bun run build

if [ $? -ne 0 ]; then
    echo "Build failed. Exiting."
    exit 1
fi

echo "Creating target directory if not exists: $TARGET_DIR"
mkdir -p "$TARGET_DIR"

echo "Copying files to $TARGET_DIR..."
cp main.js manifest.json styles.css "$TARGET_DIR"

echo "Installation complete!"
