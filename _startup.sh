#!/bin/bash

cd /site

echo "Running from: $(pwd)"
echo "With files:"
find .
echo ""
echo ""
echo "Installing dependencies..."
bundle install

echo ""
echo "Running jekyll..."
bundle exec jekyll serve --trace -H 0.0.0.0 -P 8080
