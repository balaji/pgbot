echo "starting supabase..."
docker compose up -d

echo 'injesting data...'
if (-Not (Test-Path -Path "./pgbot_venv")) {
    python3 -m venv "./pgbot_env"
}
./pgbot_venv/Scripts/Activate.ps1
python -m pip install -r ./requirements.txt
python scripts/injest_data.py

echo "Starting webapp..."
npm install
npm run build
npm run start
