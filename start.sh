#!/bin/bash

# running=$(docker compose ps | grep -i healthy | wc -l)
echo "starting supabase..."
docker compose up -d

# if [[ $running == "0" ]]; then
# # first time docker compose run doesn't get the database ready. I don't know why this is a workaround
#   echo "This is a cold start, refreshing docker containers as a wrorkaround..."
#   docker compose up -d
# fi

echo 'injesting data...'
if [ ! -d "./pgbot_venv" ]; then
  echo "creating virtual environment..."
    python3 -m venv pgbot_venv
fi
source ./pgbot_venv/bin/activate
pip install -r ./requirements.txt
python scripts/injest_data.py

echo "Starting webapp..."
npm install
npm run build
npm run start
