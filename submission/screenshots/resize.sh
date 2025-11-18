#!/bin/bash

# Requires: ImageMagick (brew install imagemagick)

TARGET_W=1280
TARGET_H=800

for f in Screenshot*.png; do
    out="${f%.png}_${TARGET_W}x${TARGET_H}.png"

    echo "Processing $f -> $out"

    convert "$f" \
        -resize "${TARGET_W}x${TARGET_H}" \
        -background white -alpha remove -alpha off \
        -gravity center \
        -extent "${TARGET_W}x${TARGET_H}" \
        "$out"
done

echo "Done."