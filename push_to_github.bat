@echo off
REM Run this script to push the initial base project to GitHub

echo [1/5] Initializing local Git repository...
git init
git remote add origin https://github.com/parthgohil1110/Incursion.git

echo [2/5] Creating main branch...
git branch -M main

echo [3/5] Adding all files...
git add .

echo [4/5] Committing initial foundation...
git commit -m "feat: initial project setup with Next.js, Prisma schema, and API contracts"

echo [5/5] Pushing to GitHub main...
git push -u origin main

echo Done! The repository is now initialized on GitHub.
pause
