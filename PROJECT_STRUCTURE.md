# FarmLens Project Structure

## 📁 Project Overview
Complete AI-powered crop disease detection system with FastAPI backend and React frontend.

---

## 🗂️ Root Directory Structure

```
FARMLENS/
├── seed-to-insight-ui/              # Main project folder
│   ├── backend/                     # FastAPI Backend
│   ├── src/                         # React Frontend
│   ├── public/                      # Static assets
│   ├── .kiro/                       # Kiro specs
│   ├── .vscode/                     # VSCode settings
│   ├── Configuration Files
│   └── Package Management
```

---

## 📂 Backend Structure (`/backend`)

### Main Files
```
backend/
├── main.py                          # FastAPI app entry point
├── requirements.txt                 # Python dependencies
├── .env                             # Environment variables
├── .env.example                     # Environment template
├── supabase_client.py              # Supabase integration
├── class_names.json                 # ML model class names
├── disease_info.json                # 66 disease database
├── best_farmlens_finetuned.keras   # Fine-tuned ML model
├── mobilenetv2_plant.pth           # Legacy PyTorch model
├── restart_server.sh               # Server restart script
├── setup_venv.sh                   # Virtual env setup
└── setup_venv312.sh                # Python 3.12 venv setup
```

### Routes (`/backend/routes`)
```
routes/
├── auth.py                          # Authentication endpoints
│   ├── POST /register
│   ├── POST /login
│   ├── POST /logout
│   ├── GET /me
│   ├── POST /change-password
│   └── POST /refresh
│
├── analyze.py                       # Image analysis endpoint
│   └── POST /analyze (Image upload & disease detection)
│
├── disease.py                       # Disease information API
│   ├── GET /api/disease/disease (List all diseases)
│   ├── GET /api/disease/disease/{disease_key} (Get specific disease)
│   ├── GET /api/disease/crops (List crops)
│   ├── GET /api/disease/disease-by-crop/{crop}
│   └── POST /api/disease/disease/search
│
├── chatbot.py                       # AI chatbot
│   └── POST /api/chatbot/chat
│
├── feedback.py                      # User feedback
│   └── POST /feedback
│
└── history.py                       # Analysis history
    ├── GET /history
    ├── POST /history
    └── DELETE /history/{id}
```

### Services (`/backend/services`)
```
services/
├── ai_service.py                    # AI prediction pipeline
│   ├── predict() - Main prediction function
│   ├── _torch_predict() - ML model inference
│   ├── _claude_predict() - Claude AI backup
│   ├── _color_based_predict() - Fallback analysis
│   └── generate_heatmap() - Grad-CAM visualization
│
├── gradcam_plus.py                  # Grad-CAM++ implementation
│   ├── GradCAMPlus class
│   └── generate_heatmap_b64() - Heatmap generation
│
└── storage_service.py               # Image storage (Supabase)
    └── upload_image() - Store images
```

### Utils (`/backend/utils`)
```
utils/
└── auth.py                          # Auth utilities
    ├── JWT token generation
    ├── Password hashing
    └── Token verification
```

---

## 🎨 Frontend Structure (`/src`)

### Main Files
```
src/
├── main.tsx                         # React entry point
├── App.tsx                          # Root component
├── App.css                          # Global styles
├── vite-env.d.ts                    # Vite environment types
└── index.css                        # Base styles
```

### Pages (`/src/pages`)
```
pages/
├── Index.tsx                        # Home/Upload page
├── Login.tsx                        # Authentication page
├── Result.tsx                       # Disease analysis results
│   ├── Disease info display
│   ├── Heatmap visualization
│   ├── Treatment recommendations
│   └── DiseaseInfoPanel integration
├── Profile.tsx                      # User profile
├── Feedback.tsx                     # Feedback form
├── GuideDetail.tsx                  # Disease guide details
└── NotFound.tsx                     # 404 page
```

### Components (`/src/components`)

#### Core Components
```
components/
├── Navbar.tsx                       # Navigation bar
├── Footer.tsx                       # Footer
├── Chatbot.tsx                      # AI chatbot interface
├── ProtectedRoute.tsx               # Route protection
├── NavLink.tsx                      # Navigation link
└── DiseaseInfoPanel.tsx             # Disease information display
    ├── Symptoms section
    ├── Prevention section
    ├── Treatment section
    └── Healthy plant guidance
```

#### Landing Page Components (`/src/components/landing`)
```
landing/
├── HeroSection.tsx                  # Hero banner
├── UploadSection.tsx                # Image upload area
├── FeaturesSection.tsx              # Features showcase
└── CropGuideSection.tsx             # Crop guides
```

#### UI Components (`/src/components/ui`)
```
ui/
├── button.tsx                       # Button component
├── card.tsx                         # Card component
├── badge.tsx                        # Badge/tag component
├── input.tsx                        # Input field
├── dialog.tsx                       # Modal dialog
├── alert.tsx                        # Alert messages
├── progress.tsx                     # Progress bar
├── separator.tsx                    # Separator line
├── tabs.tsx                         # Tab component
├── select.tsx                       # Dropdown select
├── slider.tsx                       # Range slider
├── toggle.tsx                       # Toggle switch
├── tooltip.tsx                      # Tooltip
├── avatar.tsx                       # User avatar
├── carousel.tsx                     # Image carousel
└── [30+ more UI components]         # shadcn/ui components
```

### Contexts (`/src/contexts`)
```
contexts/
├── AuthContext.tsx                  # Authentication state
│   ├── useAuth() hook
│   └── User session management
└── I18nContext.tsx                  # Internationalization
    ├── Language switching
    ├── Disease name translation
    └── Crop name translation
```

### Hooks (`/src/hooks`)
```
hooks/
├── useAuth.ts                       # Auth hook
├── useI18n.ts                       # i18n hook
└── [custom hooks]
```

### Utilities (`/src/lib`)
```
lib/
└── api-config.ts                    # API configuration
    └── Base URL setup
```

---

## 🗂️ Public Assets (`/public`)

### Images
```
public/
├── logo.png                         # FarmLens logo
├── favicon.ico                      # Browser favicon
├── main.png                         # Main image
├── placeholder.svg                  # Placeholder graphic
│
├── Hero Images (Language versions)
├── bengali-hero.png
├── englsih-hero.png
├── gujarati-hero.png
├── hindi-hero.png
├── kannada-hero.png
├── malayalam-hero.png
├── marathi-hero.png
├── odia-hero.png
├── punjabi-hero.png
├── tamil-hero.png
└── telugu-hero.png
│
├── UI Images
├── left side.png
├── right side.png
├── login-left.png
│
└── Social Icons
    ├── icon-instagram.png
    ├── icon-linkedin.png
    └── icon-twitter.png
```

---

## ⚙️ Configuration Files (Root)

```
Project Root/
├── package.json                     # Node.js dependencies & scripts
├── package-lock.json                # Dependency lock file
├── bun.lock / bun.lockb            # Bun package manager lock
├── tsconfig.json                    # TypeScript config
├── tsconfig.app.json               # App TypeScript config
├── tsconfig.node.json              # Node TypeScript config
├── vite.config.ts                  # Vite build config
├── vitest.config.ts                # Vitest testing config
├── tailwind.config.ts              # Tailwind CSS config
├── postcss.config.js               # PostCSS config
├── eslint.config.js                # ESLint config
├── components.json                 # shadcn/ui config
│
├── Deployment Configs
├── Dockerfile                       # Docker container
├── docker-compose.yml              # Docker compose
├── netlify.toml                    # Netlify deployment
├── vercel.json                     # Vercel deployment
├── railway.json                    # Railway deployment
├── render.yaml                     # Render deployment
│
├── Environment
├── .env.example                    # Example env vars
├── .env.local                      # Local env (ignored)
├── .env.production.example         # Production env
│
├── Development
├── .gitignore                      # Git ignore rules
├── README.md                       # Project documentation
├── playwright.config.ts            # E2E testing config
├── playwright-fixture.ts           # Test fixtures
├── index.html                      # HTML entry point
│
└── Version Control
    └── .vscode/settings.json       # VSCode workspace settings
```

---

## 📋 Data Files

### Disease Database
```
backend/disease_info.json
├── 66 disease entries
├── Each with:
│   ├── crop name
│   ├── disease name
│   ├── symptoms (array)
│   ├── prevention (array)
│   └── treatment (array)
└── Example: Rice_Brown_Spot, Tomato_Early_Blight, etc.
```

### ML Models
```
backend/
├── best_farmlens_finetuned.keras   # Primary model (66 classes)
├── mobilenetv2_plant.pth           # Legacy model (PyTorch)
├── class_names.json                # Model class mappings
└── model_demo.ipynb                # Model training notebook
```

---

## 🔑 Key Features by File

### Authentication
- `backend/routes/auth.py` - User registration & login
- `backend/utils/auth.py` - JWT & password utilities
- `src/contexts/AuthContext.tsx` - Auth state management
- `src/pages/Login.tsx` - Login UI

### Disease Detection
- `backend/routes/analyze.py` - Image upload endpoint
- `backend/services/ai_service.py` - ML prediction pipeline
- `backend/services/gradcam_plus.py` - Heatmap visualization
- `src/pages/Result.tsx` - Results display

### Disease Information
- `backend/routes/disease.py` - Disease API endpoints
- `backend/disease_info.json` - 66 disease database
- `src/components/DiseaseInfoPanel.tsx` - Disease info display

### Internationalization
- `src/contexts/I18nContext.tsx` - i18n state
- Language support: Bengali, English, Gujarati, Hindi, Kannada, Malayalam, Marathi, Odia, Punjabi, Tamil, Telugu

### Chatbot
- `backend/routes/chatbot.py` - Chatbot API
- `src/components/Chatbot.tsx` - Chat UI

---

## 📊 File Statistics

- **Total Backend Files:** ~15
- **Total Frontend Components:** ~40+
- **UI Components:** 30+
- **Configuration Files:** 15+
- **Asset Images:** 20+
- **Disease Entries:** 66

---

## 🚀 Tech Stack by Folder

### Backend (`/backend`)
- **Framework:** FastAPI
- **Language:** Python 3.12
- **ML:** TensorFlow, PyTorch, Keras
- **Visualization:** Grad-CAM++
- **Database:** Supabase
- **Server:** Uvicorn

### Frontend (`/src`)
- **Framework:** React 18
- **Build Tool:** Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui (Radix UI)
- **Routing:** React Router
- **State:** Context API
- **HTTP:** Fetch API / TanStack Query

---

## 🔗 Important Connections

1. **Upload Flow:** 
   - `UploadSection.tsx` → Backend `/analyze` → `ai_service.py` → `Result.tsx`

2. **Disease Info Flow:**
   - `Result.tsx` → `DiseaseInfoPanel.tsx` → `/api/disease/disease/{key}` → `disease.py`

3. **Auth Flow:**
   - `Login.tsx` → `/auth/login` → `AuthContext` → Protected pages

4. **ML Pipeline:**
   - Image → `analyze.py` → `ai_service.py` → Model → Heatmap → Results

---

## 📌 Important Notes

- **Models:** Located in `/backend` (not in git, too large)
- **Disease Database:** `/backend/disease_info.json` (66 diseases)
- **Environment Variables:** Check `.env.example` files
- **Virtual Environments:** `/backend/venv*` folders (not in git)
- **Dependencies:** `requirements.txt` (Python), `package.json` (Node.js)

---

## 🎯 Quick File Locations

| Feature | Location |
|---------|----------|
| Login | `src/pages/Login.tsx` |
| Upload | `src/components/landing/UploadSection.tsx` |
| Results | `src/pages/Result.tsx` |
| Disease Info | `src/components/DiseaseInfoPanel.tsx` |
| API Routes | `backend/routes/` |
| ML Model | `backend/services/ai_service.py` |
| Heatmap | `backend/services/gradcam_plus.py` |
| Database | `backend/disease_info.json` |
| Auth | `backend/routes/auth.py` |
| Chatbot | `backend/routes/chatbot.py` |

