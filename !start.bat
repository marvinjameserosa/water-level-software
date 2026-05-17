@echo off
echo Installing dependencies...
call npm i

echo Opening browser to localhost:3000...
start http://localhost:3000

echo Starting development server...
npm run dev
pause