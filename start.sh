#!/bin/bash

if [ ! -d "./pgbot_venv" ]; then
  echo "creating virtual environment..."
    python3 -m venv pgbot_venv
fi

source ./pgbot_venv/bin/activate
echo "Installing requirements..."
pip install -r ./requirements.txt

echo "Starting Supabase..."
cd ./db || exit 1
docker compose up -d

echo "Load articles..."
cd ../ || exit 1
python scripts/load_data.py
