

echo "Setting up DocSmith application..."


echo "Checking dependencies..."
command -v go >/dev/null 2>&1 || { echo "Go is not installed. Please install Go first."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is not installed. Please install Node.js and npm first."; exit 1; }
command -v electron >/dev/null 2>&1 || npm install -g electron


echo "Setting up backend..."
cd backend
go mod download
go build -o docsmith


echo "Setting up frontend..."
cd ../frontend
npm install


echo "Starting DocSmith..."
echo "1. In one terminal, run: cd backend && ./docsmith"
echo "2. In another terminal, run: cd frontend && npm run dev"

cd ..
echo "Setup complete!"