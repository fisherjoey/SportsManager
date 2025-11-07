@echo off
REM Quick Setup Script for School Project (Team/Coach/Player Portal)
REM Windows version

echo.
echo 🎓 Setting up SENG513 School Project - Team/Coach/Player Portal
echo ================================================================
echo.

REM 1. Create school project branch
echo 📌 Step 1: Creating school project branch...
git checkout -b school/seng513-team-portal 2>nul || git checkout school/seng513-team-portal
git tag school-project-start -f

echo ✅ Branch created: school/seng513-team-portal
echo.

REM 2. Create school-specific environment file
echo 📝 Step 2: Creating school project environment file...
(
echo # =========================================
echo # SENG513 School Project Configuration
echo # Team/Coach/Player Portal
echo # =========================================
echo.
echo # Project Mode
echo SCHOOL_PROJECT_MODE=true
echo PROJECT_FOCUS=team_coach_player
echo PROJECT_NAME="Team/Coach/Player Management System"
echo NODE_ENV=development
echo.
echo # Feature Toggles
echo ENABLE_REFEREE_PORTAL=false
echo ENABLE_TEAM_PORTAL=true
echo ENABLE_COACH_PORTAL=true
echo ENABLE_PLAYER_PORTAL=true
echo.
echo # Database
echo DB_HOST=postgres
echo DB_PORT=5432
echo DB_NAME=sports_management_school
echo DB_USER=postgres
echo DB_PASSWORD=postgres123
echo DATABASE_URL=postgresql://postgres:postgres123@postgres:5432/sports_management_school
echo.
echo # JWT
echo JWT_SECRET=school-project-secret-key-change-this-in-production
echo JWT_EXPIRES_IN=7d
echo.
echo # API
echo PORT=3001
echo NEXT_PUBLIC_API_URL=http://localhost:3001/api
echo NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
echo.
echo # Cerbos
echo CERBOS_HOST=cerbos:3593
echo CERBOS_TLS=false
echo.
echo # Frontend
echo FRONTEND_URL=http://localhost:3000
echo NEXT_PUBLIC_ENV=development
echo NEXT_PUBLIC_SCHOOL_PROJECT_MODE=true
echo.
echo # Redis ^(disabled for simplicity^)
echo DISABLE_REDIS=true
echo.
echo # Location Services
echo LOCATION_SERVICE=openroute
echo OPENROUTE_API_KEY=your-key-here
echo.
echo # Debug
echo NEXT_PUBLIC_ENABLE_DEBUG=true
) > .env.school

copy .env.school .env >nul
echo ✅ Created .env.school and copied to .env
echo.

REM 3. Create school project directory structure
echo 📁 Step 3: Creating school project directories...
if not exist docs\school-project mkdir docs\school-project
if not exist backend\src\routes\school mkdir backend\src\routes\school
if not exist frontend\app\school-portal mkdir frontend\app\school-portal
if not exist frontend\app\school-portal\team mkdir frontend\app\school-portal\team
if not exist frontend\app\school-portal\coach mkdir frontend\app\school-portal\coach
if not exist frontend\app\school-portal\player mkdir frontend\app\school-portal\player

echo ✅ Directory structure created
echo.

REM 4. Create initial documentation
(
echo # SENG513 School Project
echo ## Team/Coach/Player Management Portal
echo.
echo This is a school project branching off from the main Sports Manager application.
echo Focus: Team roster management, coach dashboards, and player statistics.
echo.
echo ## Branch
echo `school/seng513-team-portal`
echo.
echo ## Features to Implement
echo.
echo ### Team Portal
echo - [ ] Team roster management
echo - [ ] Team schedule view
echo - [ ] Team statistics dashboard
echo.
echo ### Coach Portal
echo - [ ] Player management
echo - [ ] Game planning
echo - [ ] Team communications
echo - [ ] Performance tracking
echo.
echo ### Player Portal
echo - [ ] Player profile
echo - [ ] Personal schedule
echo - [ ] Personal statistics
echo - [ ] Team information
echo.
echo ## Setup
echo.
echo ```bash
echo # Use school project environment
echo cp .env.school .env
echo.
echo # Start with Docker
echo docker-compose -f docker-compose.school.yml up -d
echo ```
echo.
echo ## Database
echo.
echo Using separate database: `sports_management_school`
echo.
echo ## Submission
echo.
echo Tag: `school-seng513-submission`
) > docs\school-project\README.md

echo ✅ Created school project documentation
echo.

echo ════════════════════════════════════════════════════════════
echo ✅ School Project Setup Complete!
echo ════════════════════════════════════════════════════════════
echo.
echo 📋 Next Steps:
echo.
echo 1. Review the separation strategy:
echo    SCHOOL_PROJECT_SEPARATION.md
echo.
echo 2. Create docker-compose.school.yml if needed
echo    ^(or use existing docker-compose.yml^)
echo.
echo 3. Start building features in:
echo    - backend\src\routes\school\
echo    - frontend\app\school-portal\
echo.
echo 4. See docs\school-project\README.md for feature list
echo.
echo 🎓 Happy coding! Good luck with your school project!
echo.
pause
